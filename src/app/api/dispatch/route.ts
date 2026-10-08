import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper: Reliably broadcast over Supabase Realtime with subscription handshake & teardown
async function broadcastToWorker(workerId: string, payload: any): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const channel = supabase.channel(`radar_${workerId}`, {
      config: { broadcast: { ack: true } },
    });

    const timeout = setTimeout(() => {
      supabase.removeChannel(channel);
      resolve(false);
    }, 5000);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel.send({
            type: "broadcast",
            event: "new_gig",
            payload,
          });
          clearTimeout(timeout);
          supabase.removeChannel(channel);
          resolve(true);
        } catch (err) {
          console.error(`[Broadcast Error] Specialist ${workerId}:`, err);
          clearTimeout(timeout);
          supabase.removeChannel(channel);
          resolve(false);
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        supabase.removeChannel(channel);
        resolve(false);
      }
    });
  });
}

// Helper: Run the exclusive cascade across matched candidates
async function runCascade(
  realGigId: string,
  workers: any[],
  jobCategory: string,
  budget: number
): Promise<boolean> {
  for (const worker of workers) {
    // 1. Verify gig is still open and unassigned
    const { data: gig } = await supabase
      .from("gigs")
      .select("status, worker_id")
      .eq("id", realGigId)
      .maybeSingle();

    if (gig?.worker_id || gig?.status === "locked" || gig?.status === "in_progress") {
      console.log(`[Cascade] Gig ${realGigId} is already locked. Halting cascade.`);
      return true;
    }

    // 2. Broadcast exclusive alert to this specific worker's Live Radar
    console.log(`[Cascade] Broadcasting to specialist ID: ${worker.worker_id}`);
    await broadcastToWorker(worker.worker_id, {
      gigId: realGigId,
      category: jobCategory,
      budget,
      matchScore: worker.match_percentage || 100,
    });

    // 3. Poll for claim (up to 60 seconds, checking every 3 seconds)
    for (let t = 0; t < 20; t++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const { data: checkGig } = await supabase
        .from("gigs")
        .select("status, worker_id")
        .eq("id", realGigId)
        .maybeSingle();

      if (checkGig?.worker_id || checkGig?.status === "locked" || checkGig?.status === "in_progress") {
        console.log(`[Cascade] Worker ${checkGig.worker_id} successfully claimed ${realGigId}.`);
        return true;
      }
    }

    console.log(`[Cascade] Worker ${worker.worker_id} timed out. Escalating to next candidate...`);
  }

  return false;
}

export async function POST(req: Request) {
  try {
    const { gigId, jobCategory, jobSkills, jobTier, paymentId } = await req.json();

    if (!gigId || !jobCategory || !jobSkills || !jobTier) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Resolve gig by UUID or Razorpay Order ID
    const isOrderId = typeof gigId === "string" && gigId.startsWith("order_");
    let gigQuery = supabase.from("gigs").select("id, base_budget, status, worker_id");

    if (isOrderId) {
      gigQuery = gigQuery.eq("razorpay_order_id", gigId);
    } else {
      gigQuery = gigQuery.eq("id", gigId);
    }

    const { data: gigRecord, error: gigFetchErr } = await gigQuery.maybeSingle();

    if (gigFetchErr || !gigRecord) {
      console.error("[Dispatcher] Gig record lookup failed:", gigFetchErr);
      return NextResponse.json({ error: "Gig record not found" }, { status: 404 });
    }

    const realGigId = gigRecord.id;
    const realBudget = Number(gigRecord.base_budget) || 0;

    // Persist paymentId if sent from client checkout
    if (paymentId) {
      await supabase
        .from("gigs")
        .update({ razorpay_payment_id: paymentId })
        .eq("id", realGigId);
    }

    // Return 200 immediately to avoid blocking client UI
    const response = NextResponse.json(
      { success: true, message: "Dispatcher started", gigId: realGigId },
      { status: 200 }
    );

    // Run cascade in background
    (async () => {
      try {
        let matchedWorkers: any[] = [];

        // 1. Try matching via RPC
        try {
          const { data: rpcWorkers, error: rpcErr } = await supabase.rpc("get_elite_matches", {
            job_category: jobCategory,
            job_skills: jobSkills,
            job_tier: jobTier,
          }).limit(3);

          if (!rpcErr && rpcWorkers && rpcWorkers.length > 0) {
            matchedWorkers = rpcWorkers;
          }
        } catch (rpcEx) {
          console.warn("[Dispatcher] RPC get_elite_matches failed, falling back to direct query:", rpcEx);
        }

        // 2. Fallback: Query workers table directly if RPC yielded no matches
        if (matchedWorkers.length === 0) {
          console.log("[Dispatcher] Running direct worker table fallback query...");
          const { data: directWorkers } = await supabase
            .from("workers")
            .select("worker_id, categories, skills, tier, capacity")
            .eq("terms_accepted", true)
            .gt("capacity", 0)
            .contains("categories", [jobCategory])
            .limit(3);

          if (directWorkers && directWorkers.length > 0) {
            matchedWorkers = directWorkers.map((w) => ({
              ...w,
              match_percentage: 95,
            }));
          }
        }

        // 3. Execute Cascade
        let locked = false;
        if (matchedWorkers.length > 0) {
          locked = await runCascade(realGigId, matchedWorkers, jobCategory, realBudget);
        }

        // 4. Safe Network Handling: Retain searching status so gig remains in active pool
        if (!locked) {
          console.log(`[Dispatcher] No immediate specialist claim for ${realGigId}. Retaining 'searching' status in pool.`);
          await supabase
            .from("gigs")
            .update({ status: "searching", lifecycle_state: "searching" })
            .eq("id", realGigId)
            .is("worker_id", null);
        }
      } catch (bgError) {
        console.error("[Dispatcher Background Error]:", bgError);
      }
    })();

    return response;
  } catch (error: any) {
    console.error("[Dispatcher Route Error]:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}