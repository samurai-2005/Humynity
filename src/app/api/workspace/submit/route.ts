import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { gigId, workerId, previewUrl, sourceUrl } = await req.json();

    if (!gigId) {
      return NextResponse.json({ error: "Missing gigId" }, { status: 400 });
    }

    // 1. Validate that at least one deliverable URL is supplied
    const cleanPreview = previewUrl?.trim() || null;
    const cleanSource = sourceUrl?.trim() || null;

    if (!cleanPreview && !cleanSource) {
      return NextResponse.json(
        { error: "Please provide at least a preview URL or source repository link." },
        { status: 400 }
      );
    }

    // 2. Fetch the target gig and verify state
    const { data: gig, error: fetchErr } = await supabase
      .from("gigs")
      .select("*")
      .eq("id", gigId)
      .maybeSingle();

    if (fetchErr || !gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    // Guard: Gig must currently be locked / in-progress
    if (gig.status !== "locked") {
      return NextResponse.json(
        { error: `Cannot submit deliverables. Current task status is '${gig.status}'.` },
        { status: 400 }
      );
    }

    // Guard: Caller must be the assigned specialist
    if (workerId && gig.worker_id && gig.worker_id !== workerId) {
      return NextResponse.json(
        { error: "Unauthorized: You are not the assigned specialist for this task." },
        { status: 403 }
      );
    }

    const assignedWorkerId = gig.worker_id || workerId;

    // 3. Atomically advance gig status to 'delivered'
    const { data: updatedGig, error: updateErr } = await supabase
      .from("gigs")
      .update({
        status: "delivered",
        lifecycle_state: "delivered",
        delivered_at: new Date().toISOString(),
        preview_file_url: cleanPreview,
        source_file_url: cleanSource,
      })
      .eq("id", gigId)
      .select("*")
      .single();

    if (updateErr || !updatedGig) {
      console.error("[Workspace Submit] Failed to update gig:", updateErr);
      return NextResponse.json(
        { error: updateErr?.message || "Failed to update gig status." },
        { status: 500 }
      );
    }

    // 4. Restore worker capacity back to 1
    if (assignedWorkerId) {
      await supabase
        .from("workers")
        .update({ capacity: 1 })
        .eq("worker_id", assignedWorkerId);

      console.log(`[Workspace Submit] Worker ${assignedWorkerId} capacity restored to 1.`);
    }

    return NextResponse.json({
      success: true,
      message: "Work submitted successfully. Capacity restored to 1.",
      gig: updatedGig,
    });
  } catch (err: any) {
    console.error("[Workspace Submit] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}