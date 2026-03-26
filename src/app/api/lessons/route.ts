import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { query, queryOne, ensureTeacher, getUserRole, getStudentByUserId } from "@/lib/db";
import type { DBLesson, DBWeakness, DBHomework } from "@/types";

export async function GET(request: Request) {
  try {
    const neonAuth = requireAuth();
    const { data: session } = await neonAuth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("id");

    // Check role — students get routed to their own lessons
    const role = await getUserRole(session.user.id);

    if (role === "student") {
      const student = await getStudentByUserId(session.user.id);
      if (!student) {
        return NextResponse.json({ lessons: [] });
      }

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
    }

    // Admin — sees ALL lessons across all teachers
    if (role === "admin") {
      if (lessonId) {
        const lesson = await queryOne<DBLesson>(
          "SELECT * FROM lessons WHERE id = $1",
          [lessonId]
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
        "SELECT * FROM lessons ORDER BY created_at DESC"
      );
      return NextResponse.json({ lessons });
    }

    // Teacher — ensureTeacher handles provisioning
    const teacher = await ensureTeacher(session);

    if (lessonId) {
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
