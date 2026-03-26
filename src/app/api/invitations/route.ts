import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAuth } from "@/lib/auth/server";
import { query, ensureTeacher } from "@/lib/db";
import type { DBInvitation } from "@/types";

// POST — teacher creates an invitation
export async function POST(request: Request) {
  try {
    const neonAuth = requireAuth();
    const { data: session } = await neonAuth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await ensureTeacher(session);
    const { email, studentName, grade } = await request.json();

    if (!email || !studentName) {
      return NextResponse.json(
        { error: "email and studentName are required" },
        { status: 400 }
      );
    }

    const token = randomBytes(32).toString("hex");

    const rows = await query<DBInvitation>(
      `INSERT INTO invitations (teacher_id, email, student_name, grade, token)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [teacher.id, email, studentName, grade || null, token]
    );

    const invitation = rows[0];
    const appUrl = process.env.ALEMATMA_APP_URL || "http://localhost:3000";
    const inviteLink = `${appUrl}/login?invite=${token}`;

    return NextResponse.json({
      invitation,
      inviteLink,
    });
  } catch (err) {
    console.error("[API] Create invitation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create invitation" },
      { status: 500 }
    );
  }
}

// GET — teacher lists their invitations
export async function GET() {
  try {
    const neonAuth = requireAuth();
    const { data: session } = await neonAuth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await ensureTeacher(session);

    const invitations = await query<DBInvitation>(
      "SELECT * FROM invitations WHERE teacher_id = $1 ORDER BY created_at DESC",
      [teacher.id]
    );

    return NextResponse.json({ invitations });
  } catch (err) {
    console.error("[API] List invitations error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list invitations" },
      { status: 500 }
    );
  }
}
