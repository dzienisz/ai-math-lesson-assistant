import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { query, getUserRole } from "@/lib/db";
import type { DBTeacher } from "@/types";

// GET — admin lists all teachers (with user email and lesson count)
export async function GET() {
  try {
    const neonAuth = requireAuth();
    const { data: session } = await neonAuth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getUserRole(session.user.id);
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const teachers = await query<
      DBTeacher & { email: string; lesson_count: number; student_count: number }
    >(
      `SELECT t.*,
              u.email,
              (SELECT COUNT(*) FROM lessons l WHERE l.teacher_id = t.id)::int AS lesson_count,
              (SELECT COUNT(*) FROM students s WHERE s.teacher_id = t.id)::int AS student_count
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       ORDER BY t.name`
    );

    return NextResponse.json({ teachers });
  } catch (err) {
    console.error("[API] Admin teachers error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
