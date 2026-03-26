import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { query, queryOne, ensureTeacher, getUserRole } from "@/lib/db";
import type { DBStudent, DBLesson, DBWeakness, DBHomework } from "@/types";

// GET — teacher gets a specific student with their lessons, weaknesses, homework
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const neonAuth = requireAuth();
    const { data: session } = await neonAuth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: studentId } = await params;
    const role = await getUserRole(session.user.id);

    if (role === "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let student: DBStudent | null;

    if (role === "admin") {
      student = await queryOne<DBStudent>(
        "SELECT * FROM students WHERE id = $1",
        [studentId]
      );
    } else {
      const teacher = await ensureTeacher(session);
      student = await queryOne<DBStudent>(
        "SELECT * FROM students WHERE id = $1 AND teacher_id = $2",
        [studentId, teacher.id]
      );
    }

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const lessons = await query<DBLesson>(
      "SELECT * FROM lessons WHERE student_id = $1 ORDER BY created_at DESC",
      [student.id]
    );

    // Aggregate all weaknesses across this student's lessons
    const weaknesses = await query<DBWeakness & { lesson_created_at: string }>(
      `SELECT w.*, l.created_at AS lesson_created_at
       FROM weaknesses w
       JOIN lessons l ON l.id = w.lesson_id
       WHERE l.student_id = $1
       ORDER BY w.confidence DESC`,
      [student.id]
    );

    // All homework across this student's lessons
    const homework = await query<DBHomework & { lesson_created_at: string }>(
      `SELECT h.*, l.created_at AS lesson_created_at
       FROM homework h
       JOIN lessons l ON l.id = h.lesson_id
       WHERE l.student_id = $1
       ORDER BY l.created_at DESC, h.difficulty`,
      [student.id]
    );

    return NextResponse.json({ student, lessons, weaknesses, homework });
  } catch (err) {
    console.error("[API] Student detail error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
