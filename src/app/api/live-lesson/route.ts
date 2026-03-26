import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { query, queryOne } from "@/lib/db";
import { createBot } from "@/services/meeting/recall";
import type { DBTeacher } from "@/types";

export async function POST(request: Request) {
  try {
    const neonAuth = requireAuth();
    const { data: session } = await neonAuth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { meetingUrl, studentId } = await request.json();
    if (!meetingUrl) {
      return NextResponse.json(
        { error: "Meeting URL is required" },
        { status: 400 }
      );
    }

    // Validate meeting URL
    const validPrefixes = [
      "https://meet.google.com/",
      "https://zoom.us/j/",
      "https://us02web.zoom.us/j/",
      "https://us04web.zoom.us/j/",
      "https://us05web.zoom.us/j/",
      "https://us06web.zoom.us/j/",
      "https://teams.microsoft.com/",
    ];
    const isValid = validPrefixes.some((p) => meetingUrl.startsWith(p));
    if (!isValid) {
      return NextResponse.json(
        { error: "Unsupported meeting URL. Use Google Meet, Zoom, or Teams." },
        { status: 400 }
      );
    }

    // Ensure teacher record exists
    const userId = session.user.id;
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

    const teacher = await queryOne<DBTeacher>(
      "SELECT * FROM teachers WHERE user_id = $1",
      [userId]
    );
    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 403 }
      );
    }

    // Create lesson record
    const lessonRows = await query<{ id: string }>(
      `INSERT INTO lessons (teacher_id, student_id, source, meeting_url, status)
       VALUES ($1, $2, 'live', $3, 'bot_joining')
       RETURNING id`,
      [teacher.id, studentId || null, meetingUrl]
    );

    const lessonId = lessonRows[0]?.id;
    if (!lessonId) {
      throw new Error("Failed to create lesson record");
    }

    // Create Recall.ai bot
    const bot = await createBot({
      meetingUrl,
      lessonId,
      botName: "MathLessonAI Recorder",
    });

    // Store bot ID
    await query("UPDATE lessons SET recall_bot_id = $1 WHERE id = $2", [
      bot.id,
      lessonId,
    ]);

    return NextResponse.json({
      success: true,
      lessonId,
      botId: bot.id,
      status: "bot_joining",
    });
  } catch (err) {
    console.error("[API] Live lesson error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start live lesson" },
      { status: 500 }
    );
  }
}
