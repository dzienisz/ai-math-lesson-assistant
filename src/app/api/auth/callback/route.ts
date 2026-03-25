import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { query, queryOne } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Ensure user + teacher records exist
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const existing = await queryOne(
          "SELECT id FROM users WHERE id = $1",
          [user.id]
        );

        if (!existing) {
          await query(
            "INSERT INTO users (id, email, role) VALUES ($1, $2, 'teacher')",
            [user.id, user.email]
          );
          await query(
            "INSERT INTO teachers (user_id, name) VALUES ($1, $2)",
            [user.id, user.email?.split("@")[0] ?? "Teacher"]
          );
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
