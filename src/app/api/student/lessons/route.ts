import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { query, queryOne, getStudentByUserId } from "@/lib/db";
import type { DBLesson, DBWeakness, DBHomework } from "@/types";

// GET — student views their own lessons
export async function GET(request: Request) {
  try {
    const neonAuth = requireAuth();
    const { data: session } = await neonAuth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await getStudentByUserId(session.user.id);
    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("id");

    if (lessonId) {
      const lesson = await queryOne<DBLesson>(
        "SELECT * FROM lessons WHERE id = $1 AND student_id = $2",
        [lessonId, student.id]
      );
      if (!lesson) {
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
      }

      const weaknesses = await query<DBWeakness>(
        "SELECT * FROM weaknesses WHERE lesson_id = $1 ORDER BY confidence DESC",
        [lessonId]
      );

      const homework = await query<DBHomework>(
        "SELECT * FROM homework WHERE lesson_id = $1 ORDER BY difficulty",
        [lessonId]
      );

      return NextResponse.json({ lesson, weaknesses, homework });
    }

    const lessons = await query<DBLesson>(
      "SELECT * FROM lessons WHERE student_id = $1 ORDER BY created_at DESC",
      [student.id]
    );

    return NextResponse.json({ lessons });
  } catch (err) {
    console.error("[API] Student lessons error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
