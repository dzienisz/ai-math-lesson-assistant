import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { query, queryOne } from "@/lib/db";
import type { DBTeacher, DBLesson, DBWeakness, DBHomework } from "@/types";

export async function GET(request: Request) {
  try {
    const neonAuth = requireAuth();
    const { data: session } = await neonAuth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await queryOne<DBTeacher>(
      "SELECT * FROM teachers WHERE user_id = $1",
      [session.user.id]
    );
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 403 });
    }

    // Check for specific lesson ID
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("id");

    if (lessonId) {
      // Return single lesson with weaknesses and homework
      const lesson = await queryOne<DBLesson>(
        "SELECT * FROM lessons WHERE id = $1 AND teacher_id = $2",
        [lessonId, teacher.id]
      );
      if (!lesson) {
        return NextResponse.json(
          { error: "Lesson not found" },
          { status: 404 }
        );
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

    // Return all lessons for this teacher
    const lessons = await query<DBLesson>(
      "SELECT * FROM lessons WHERE teacher_id = $1 ORDER BY created_at DESC",
      [teacher.id]
    );

    return NextResponse.json({ lessons });
  } catch (err) {
    console.error("[API] Lessons error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
