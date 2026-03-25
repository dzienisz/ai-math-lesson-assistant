import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { supabaseStorage } from "@/lib/supabase/storage";
import { query, queryOne } from "@/lib/db";
import { triggerNextStep } from "@/utils/background";
import type { DBTeacher } from "@/types";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const neonAuth = requireAuth();
    const { data: session } = await neonAuth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const studentId = formData.get("studentId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (500MB max)
    const MAX_SIZE = 500 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 500MB limit" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/flac",
      "audio/mp4",
      "audio/x-m4a",
      "audio/webm",
      "video/mp4",
      "video/webm",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    // Ensure user + teacher records exist (auto-provision on first upload)
    const existingUser = await queryOne(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );
    if (!existingUser) {
      await query(
        "INSERT INTO users (id, email, role) VALUES ($1, $2, 'teacher')",
        [userId, session.user.email]
      );
      await query(
        "INSERT INTO teachers (user_id, name) VALUES ($1, $2)",
        [userId, session.user.name || session.user.email?.split("@")[0] || "Teacher"]
      );
    }

    // Get teacher record
    const teacher = await queryOne<DBTeacher>(
      "SELECT * FROM teachers WHERE user_id = $1",
      [userId]
    );
    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher profile not found. Please complete setup." },
        { status: 403 }
      );
    }

    // Upload to Supabase Storage
    const storage = supabaseStorage();
    if (!storage) {
      throw new Error("Storage is not configured. Check SUPABASE_URL and SERVICE_ROLE_KEY.");
    }

    const ext = file.name.split(".").pop() || "mp3";
    const fileName = `${uuidv4()}.${ext}`;
    const storagePath = `lessons/${teacher.id}/${fileName}`;

    const { error: uploadError } = await storage.storage
      .from("lesson-files")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = storage.storage.from("lesson-files").getPublicUrl(storagePath);

    // Create lesson record
    const lessonRows = await query<{ id: string }>(
      `INSERT INTO lessons (teacher_id, student_id, file_url, status)
       VALUES ($1, $2, $3, 'uploaded')
       RETURNING id`,
      [teacher.id, studentId || null, publicUrl]
    );

    const lessonId = lessonRows[0]?.id;
    if (!lessonId) {
      throw new Error("Failed to create lesson record");
    }

    // Trigger pipeline: start transcription
    await triggerNextStep("/api/pipeline/transcribe", { lessonId });

    return NextResponse.json({
      success: true,
      lessonId,
      fileUrl: publicUrl,
    });
  } catch (err) {
    console.error("[API] Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
