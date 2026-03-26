import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { acceptInvitation } from "@/lib/db";

// POST — authenticated user accepts an invitation (becomes a student)
export async function POST(request: Request) {
  try {
    const neonAuth = requireAuth();
    const { data: session } = await neonAuth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const student = await acceptInvitation(session, token);

    return NextResponse.json({ success: true, student });
  } catch (err) {
    console.error("[API] Accept invitation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
