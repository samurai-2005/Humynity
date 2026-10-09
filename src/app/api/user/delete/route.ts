import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();

    // 1. Identify the authenticated user from the session cookie
    const supabaseUser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized session." }, { status: 401 });
    }

    const userId = user.id;

    // 2. Initialize Supabase Admin with Service Role Key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // 3. Delete database records linked to user
    await supabaseAdmin.from("workers").delete().eq("worker_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // 4. Cancel or detach any active searching gigs
    await supabaseAdmin
      .from("gigs")
      .update({ status: "cancelled" })
      .eq("poster_id", userId)
      .eq("status", "searching");

    // 5. Permanently remove the user from auth.users
    const { error: deleteAuthErr } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthErr) {
      console.error("[Account Deletion Error]:", deleteAuthErr);
      return NextResponse.json(
        { error: deleteAuthErr.message || "Failed to remove auth account." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Account deleted successfully." });
  } catch (err: any) {
    console.error("[Account Delete Route Error]:", err);
    return NextResponse.json(
      { error: err.message || "Server error processing deletion." },
      { status: 500 }
    );
  }
}