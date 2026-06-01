import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { query, ensureTeacher, getUserRole } from "@/lib/db";
import type { DBStudent } from "@/types";

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

// POST — teacher adds a student manually (no invitation / account required)
export async function POST(request: Request) {
  try {
    const neonAuth = requireAuth();
    const { data: session } = await neonAuth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getUserRole(session.user.id);
    if (role === "student") {
      return NextResponse.json(
        { error: "Students cannot add students" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const grade =
      typeof body.grade === "string" && body.grade.trim() !== ""
        ? body.grade.trim()
        : null;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // A manually-added student belongs to the current teacher and has no
    // linked user account (user_id stays NULL until they accept an invitation).
    const teacher = await ensureTeacher(session);
    const rows = await query<DBStudent>(
      `INSERT INTO students (teacher_id, name, grade)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [teacher.id, name, grade]
    );

    return NextResponse.json({ student: rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[API] Create student error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create student" },
      { status: 500 }
    );
  }
}
