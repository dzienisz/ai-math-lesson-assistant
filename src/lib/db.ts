import { Pool } from "@neondatabase/serverless";
import type { DBTeacher, DBStudent, DBUser, DBInvitation } from "@/types";

// Neon serverless Postgres client (Pool supports parameterized queries)
function getPool(): Pool {
  const url = process.env.ALEMATMA_DATABASE_URL;
  if (!url) {
    throw new Error("ALEMATMA_DATABASE_URL environment variable is not set");
  }
  return new Pool({ connectionString: url });
}

let _pool: Pool | null = null;

export function pool(): Pool {
  if (!_pool) {
    _pool = getPool();
  }
  return _pool;
}

// Helper: execute a parameterized query and return typed rows
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const { rows } = await pool().query(text, params);
  return rows as T[];
}

// Helper: execute a query and return the first row or null
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

// Resolve the current session into a { user, role } without auto-creating anything.
export async function getUserRole(userId: string): Promise<string | null> {
  const user = await queryOne<DBUser>("SELECT role FROM users WHERE id = $1", [userId]);
  return user?.role ?? null;
}

// Get the student record for an authenticated student user.
export async function getStudentByUserId(userId: string): Promise<DBStudent | null> {
  return queryOne<DBStudent>("SELECT * FROM students WHERE user_id = $1", [userId]);
}

// Ensure a user + teacher record exists for the authenticated user.
// Only auto-provisions for new users (self-registration) or existing teacher/admin roles.
// Uses ON CONFLICT to handle race conditions from concurrent requests.
export async function ensureTeacher(session: {
  user: { id: string; email?: string; name?: string };
}): Promise<DBTeacher> {
  const { id: userId, email, name } = session.user;

  // Fast path: teacher record already exists
  const existing = await queryOne<DBTeacher>(
    "SELECT * FROM teachers WHERE user_id = $1",
    [userId]
  );
  if (existing) return existing;

  // Check current role (if user exists in DB)
  const role = await getUserRole(userId);

  // Students must NOT be auto-provisioned as teachers
  if (role === "student") {
    throw new Error("Students cannot access teacher features");
  }

  // Create user row if missing (self-registration → defaults to teacher)
  await query(
    "INSERT INTO users (id, email, role) VALUES ($1, $2, 'teacher') ON CONFLICT (id) DO NOTHING",
    [userId, email ?? "unknown"]
  );

  // Create teacher row (ON CONFLICT guards against race conditions)
  const displayName = name || email?.split("@")[0] || "Teacher";
  await query(
    "INSERT INTO teachers (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
    [userId, displayName]
  );

  const teacher = await queryOne<DBTeacher>(
    "SELECT * FROM teachers WHERE user_id = $1",
    [userId]
  );
  if (!teacher) throw new Error("Failed to create teacher profile");
  return teacher;
}

// Accept a pending invitation: create user (student) + student record, mark invite accepted.
export async function acceptInvitation(
  session: { user: { id: string; email?: string; name?: string } },
  token: string
): Promise<DBStudent> {
  const { id: userId, email } = session.user;

  // Find the pending, non-expired invitation
  const invite = await queryOne<DBInvitation>(
    "SELECT * FROM invitations WHERE token = $1 AND status = 'pending' AND expires_at > NOW()",
    [token]
  );
  if (!invite) throw new Error("Invitation not found or expired");

  // Create user row with student role
  const userExists = await queryOne("SELECT id FROM users WHERE id = $1", [userId]);
  if (!userExists) {
    await query(
      "INSERT INTO users (id, email, role) VALUES ($1, $2, 'student')",
      [userId, email ?? invite.email]
    );
  } else {
    await query("UPDATE users SET role = 'student' WHERE id = $1", [userId]);
  }

  // Create student record linked to the inviting teacher
  await query(
    "INSERT INTO students (user_id, teacher_id, name, grade) VALUES ($1, $2, $3, $4)",
    [userId, invite.teacher_id, invite.student_name, invite.grade]
  );

  // Mark invitation as accepted
  await query(
    "UPDATE invitations SET status = 'accepted', accepted_by = $1 WHERE id = $2",
    [userId, invite.id]
  );

  const student = await queryOne<DBStudent>("SELECT * FROM students WHERE user_id = $1", [userId]);
  if (!student) throw new Error("Failed to create student profile");
  return student;
}
