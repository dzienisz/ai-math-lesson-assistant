import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { query, queryOne, getUserRole } from "@/lib/db";
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

// POST — admin adds a new teacher (creates user + teacher rows)
export async function POST(request: Request) {
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

    const body = await request.json();
    const { email, name, school_name } = body as {
      email?: string;
      name?: string;
      school_name?: string;
    };

    if (!email || !name) {
      return NextResponse.json(
        { error: "email and name are required" },
        { status: 400 }
      );
    }

    // Check if user with this email already exists
    const existingUser = await queryOne<{ id: string; role: string }>(
      "SELECT id, role FROM users WHERE email = $1",
      [email]
    );

    let userId: string;

    if (existingUser) {
      // Check if they already have a teacher record
      const existingTeacher = await queryOne<DBTeacher>(
        "SELECT * FROM teachers WHERE user_id = $1",
        [existingUser.id]
      );
      if (existingTeacher) {
        return NextResponse.json(
          { error: "A teacher with this email already exists" },
          { status: 409 }
        );
      }
      // Update role to teacher if currently something else
      if (existingUser.role !== "teacher") {
        await query("UPDATE users SET role = 'teacher' WHERE id = $1", [existingUser.id]);
      }
      userId = existingUser.id;
    } else {
      // Create a new user row with teacher role
      const [newUser] = await query<{ id: string }>(
        "INSERT INTO users (email, role) VALUES ($1, 'teacher') RETURNING id",
        [email]
      );
      userId = newUser.id;
    }

    // Create teacher record
    await query(
      "INSERT INTO teachers (user_id, name, school_name) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING",
      [userId, name, school_name || null]
    );

    const teacher = await queryOne<DBTeacher & { email: string }>(
      `SELECT t.*, u.email
       FROM teachers t JOIN users u ON u.id = t.user_id
       WHERE t.user_id = $1`,
      [userId]
    );

    return NextResponse.json({ teacher }, { status: 201 });
  } catch (err) {
    console.error("[API] Admin create teacher error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
