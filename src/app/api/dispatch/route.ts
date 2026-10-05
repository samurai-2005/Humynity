import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Service Role to bypass RLS for background matching
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to handle the 60-second exclusive cascade
async function runCascade(gigId: string, workers: any[]): Promise<boolean> {
  for (const worker of workers) {
    // 1. Check if the gig is still available (hasn't been locked or put in negotiation)
    const { data: gig } = await supabase
      .from("gigs")
      .select("status")
      .eq("id", gigId)
      .single();

    if (!gig || gig.status !== "searching") {
      return true; // Someone locked it or it is paused, stop the cascade
    }

    // 2. The Fast Track: Instantly ping this worker's Live Radar UI via WebSockets
    await supabase.channel(`worker_radar_${worker.worker_id}`).send({
      type: "broadcast",
      event: "exclusive_offer",
      payload: { gigId, matchScore: worker.match_percentage, expiresIn: 60 },
    });

    // 3. The Slow Track: Ping Phase 4 (WhatsApp Meta API) - Fire and Forget
    // TODO: We will wire the Meta WhatsApp POST request here tomorrow

    // 4. The Exclusive Lock: Sleep for exactly 60 seconds
    await new Promise((resolve) => setTimeout(resolve, 60000));
  }
  return false; // Exhausted this batch of workers without a lock
}

export async function POST(req: Request) {
  try {
    const { gigId, jobCategory, jobSkills, jobTier } = await req.json();

    if (!gigId || !jobCategory || !jobSkills || !jobTier) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Return a 200 OK immediately so the client's browser doesn't hang loading.
    // The cascade continues running asynchronously on the server.
    const response = NextResponse.json({ status: "Dispatcher started" }, { status: 200 });

    // --- BACKGROUND DISPATCHER LOOP ---
    (async () => {
      let locked = false;

      // PATH A: The Heavyweights (T4 & T5)
      if (jobTier === "T4" || jobTier === "T5") {
        const { data: elites } = await supabase.rpc("get_elite_matches", {
          job_category: jobCategory,
          job_skills: jobSkills,
          job_tier: jobTier,
        }).limit(4);

        if (elites && elites.length > 0) {
          locked = await runCascade(gigId, elites);
        }

        // Smart Fallback: If 4 Elites reject it, cascade to Top Underdogs
        if (!locked) {
          const { data: underdogs } = await supabase.rpc("get_elite_matches", {
            job_category: jobCategory,
            job_skills: jobSkills,
            job_tier: "T3", // Drop tier requirement to open the pool
          }).limit(10);

          if (underdogs && underdogs.length > 0) {
            locked = await runCascade(gigId, underdogs);
          }
        }
      } 
      // PATH B: The Standard Gigs (T1, T2, T3)
      else {
        const { data: standardWorkers } = await supabase.rpc("get_elite_matches", {
          job_category: jobCategory,
          job_skills: jobSkills,
          job_tier: jobTier,
        }).limit(10);

        if (standardWorkers && standardWorkers.length > 0) {
          locked = await runCascade(gigId, standardWorkers);
        }
      }

      // THE FAILSAFE: Total exhaustion of the network
      if (!locked) {
        // Mark gig as cancelled in the database
        await supabase.from("gigs").update({ status: "cancelled" }).eq("id", gigId);
        // TODO: Trigger Razorpay void/refund logic here tomorrow
      }
    })();

    return response;

  } catch (error) {
    console.error("Dispatcher Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}