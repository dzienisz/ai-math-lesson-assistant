import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { query, queryOne, getUserRole } from "@/lib/db";
import type { DBTeacher } from "@/types";

// Helper: verify admin session
async function requireAdmin() {
  const neonAuth = requireAuth();
  const { data: session } = await neonAuth.getSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = await getUserRole(session.user.id);
  if (role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 }) };
  }
  return { session };
}

// GET — admin fetches a single teacher with stats
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireAdmin();
    if ("error" in result && result.error) return result.error;

    const teacher = await queryOne<
      DBTeacher & { email: string; lesson_count: number; student_count: number }
    >(
      `SELECT t.*,
              u.email,
              (SELECT COUNT(*) FROM lessons l WHERE l.teacher_id = t.id)::int AS lesson_count,
              (SELECT COUNT(*) FROM students s WHERE s.teacher_id = t.id)::int AS student_count
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.id = $1`,
      [id]
    );

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json({ teacher });
  } catch (err) {
    console.error("[API] Admin get teacher error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

// PATCH — admin updates teacher name and/or school_name
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireAdmin();
    if ("error" in result && result.error) return result.error;

    const body = await request.json();
    const { name, school_name } = body as {
      name?: string;
      school_name?: string | null;
    };

    // Verify teacher exists
    const existing = await queryOne<DBTeacher>(
      "SELECT * FROM teachers WHERE id = $1",
      [id]
    );
    if (!existing) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Build dynamic update
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (school_name !== undefined) {
      updates.push(`school_name = $${idx++}`);
      values.push(school_name);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    await query(
      `UPDATE teachers SET ${updates.join(", ")} WHERE id = $${idx}`,
      values
    );

    const teacher = await queryOne<DBTeacher & { email: string }>(
      `SELECT t.*, u.email
       FROM teachers t JOIN users u ON u.id = t.user_id
       WHERE t.id = $1`,
      [id]
    );

    return NextResponse.json({ teacher });
  } catch (err) {
    console.error("[API] Admin update teacher error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

// DELETE — admin removes a teacher (cascades to students, lessons)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireAdmin();
    if ("error" in result && result.error) return result.error;

    const existing = await queryOne<DBTeacher>(
      "SELECT * FROM teachers WHERE id = $1",
      [id]
    );
    if (!existing) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Delete the teacher row (ON DELETE CASCADE handles students + lessons)
    await query("DELETE FROM teachers WHERE id = $1", [id]);

    // Optionally remove the user row too (downgrade to no role)
    await query("DELETE FROM users WHERE id = $1", [existing.user_id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API] Admin delete teacher error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
