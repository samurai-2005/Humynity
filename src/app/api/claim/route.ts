import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { gigId, workerId } = await req.json();

    if (!gigId || !workerId) {
      return NextResponse.json(
        { error: "Missing required parameters: gigId and workerId" },
        { status: 400 }
      );
    }

    // 1. Verify claiming worker exists, accepted terms, and has available capacity
    const { data: worker, error: workerErr } = await supabase
      .from("workers")
      .select("worker_id, terms_accepted, capacity")
      .eq("worker_id", workerId)
      .maybeSingle();

    if (workerErr || !worker) {
      return NextResponse.json(
        { success: false, message: "Specialist record not found" },
        { status: 404 }
      );
    }

    if (!worker.terms_accepted) {
      return NextResponse.json(
        { success: false, message: "Worker must complete onboarding before accepting gigs" },
        { status: 403 }
      );
    }

    if ((worker.capacity ?? 0) <= 0) {
      return NextResponse.json(
        { success: false, message: "Specialist capacity is full (0 slots available)" },
        { status: 429 }
      );
    }

    // 2. Identify the target gig by UUID or Razorpay Order ID
    const isOrderId = typeof gigId === "string" && gigId.startsWith("order_");
    let lookupQuery = supabase.from("gigs").select("id, status, worker_id");

    if (isOrderId) {
      lookupQuery = lookupQuery.eq("razorpay_order_id", gigId);
    } else {
      lookupQuery = lookupQuery.eq("id", gigId);
    }

    const { data: targetGig, error: fetchErr } = await lookupQuery.maybeSingle();

    if (fetchErr || !targetGig) {
      return NextResponse.json(
        { success: false, message: "Gig not found" },
        { status: 404 }
      );
    }

    // 3. ATOMIC LOCK: Update row ONLY if worker_id is still NULL and status is 'searching'
    // This prevents race conditions at the Postgres level
    const { data: lockedGig, error: lockErr } = await supabase
      .from("gigs")
      .update({
        worker_id: workerId,
        status: "locked",
        lifecycle_state: "in_progress",
        locked_at: new Date().toISOString(),
      })
      .eq("id", targetGig.id)
      .is("worker_id", null)
      .eq("status", "searching")
      .select("id, time_limit_hours")
      .maybeSingle();

    if (lockErr) {
      console.error("[Claim API] Lock Error:", lockErr);
      return NextResponse.json(
        { success: false, message: lockErr.message },
        { status: 500 }
      );
    }

    if (!lockedGig) {
      // Another worker claimed this gig milliseconds prior
      return NextResponse.json(
        {
          success: false,
          message: "This task was claimed by another specialist in the dispatch queue",
        },
        { status: 409 }
      );
    }

    // 4. Enforce Hard Capacity Gate: decrement worker capacity to 0
    await supabase
      .from("workers")
      .update({ capacity: 0 })
      .eq("worker_id", workerId);

    console.log(`[Claim API] Task ${lockedGig.id} atomically locked to specialist ${workerId}`);

    return NextResponse.json({
      success: true,
      message: "Gig successfully locked and capacity allocated",
      gigId: lockedGig.id,
    });
  } catch (err: any) {
    console.error("[Claim API] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}