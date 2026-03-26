import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { getUserRole } from "@/lib/db";

// GET — return the current user's role (used by client to route dashboards)
export async function GET() {
  try {
    const neonAuth = requireAuth();
    const { data: session } = await neonAuth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getUserRole(session.user.id);

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: role ?? "new",
      },
    });
  } catch (err) {
    console.error("[API] Me error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
