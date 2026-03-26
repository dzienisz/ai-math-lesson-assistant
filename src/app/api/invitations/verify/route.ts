import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import type { DBInvitation } from "@/types";

// GET — verify an invitation token (public, used by login page)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const invite = await queryOne<DBInvitation>(
      "SELECT * FROM invitations WHERE token = $1 AND status = 'pending' AND expires_at > NOW()",
      [token]
    );

    if (!invite) {
      return NextResponse.json({ valid: false, error: "Invitation not found or expired" });
    }

    return NextResponse.json({
      valid: true,
      email: invite.email,
      studentName: invite.student_name,
      grade: invite.grade,
    });
  } catch (err) {
    console.error("[API] Verify invitation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 500 }
    );
  }
}
