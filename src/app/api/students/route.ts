import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { query, ensureTeacher, getUserRole } from "@/lib/db";

interface StudentWithStats {
  id: string;
  user_id: string | null;
  teacher_id: string;
  name: string;
  grade: string | null;
  teacher_name: string;
  lesson_count: number;
  last_lesson_at: string | null;
  avg_score: number | null;
}

// GET — teacher lists their students (admin sees all)
export async function GET() {
  try {
    const neonAuth = requireAuth();
    const { data: session } = await neonAuth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getUserRole(session.user.id);

    if (role === "student") {
      return NextResponse.json({ error: "Students cannot list students" }, { status: 403 });
    }

    // Admin sees all students across all teachers
    if (role === "admin") {
      const students = await query<StudentWithStats>(
        `SELECT s.*,
                t.name AS teacher_name,
                (SELECT COUNT(*) FROM lessons l WHERE l.student_id = s.id)::int AS lesson_count,
                (SELECT MAX(l.created_at) FROM lessons l WHERE l.student_id = s.id) AS last_lesson_at,
                (SELECT ROUND(AVG(l.understanding_score), 1) FROM lessons l WHERE l.student_id = s.id AND l.understanding_score IS NOT NULL) AS avg_score
         FROM students s
         JOIN teachers t ON t.id = s.teacher_id
         ORDER BY s.name`
      );
      return NextResponse.json({ students });
    }

    // Teacher sees their own students
    const teacher = await ensureTeacher(session);
    const students = await query<StudentWithStats>(
      `SELECT s.*,
              t.name AS teacher_name,
              (SELECT COUNT(*) FROM lessons l WHERE l.student_id = s.id)::int AS lesson_count,
              (SELECT MAX(l.created_at) FROM lessons l WHERE l.student_id = s.id) AS last_lesson_at,
              (SELECT ROUND(AVG(l.understanding_score), 1) FROM lessons l WHERE l.student_id = s.id AND l.understanding_score IS NOT NULL) AS avg_score
       FROM students s
       JOIN teachers t ON t.id = s.teacher_id
       WHERE s.teacher_id = $1
       ORDER BY s.name`,
      [teacher.id]
    );

    return NextResponse.json({ students });
  } catch (err) {
    console.error("[API] Students error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
