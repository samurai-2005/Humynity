import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase Admin client with Service Role to bypass RLS for dispatch operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function parseArrayField(field: any): string[] {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  try {
    const parsed = typeof field === "string" ? JSON.parse(field) : field;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return typeof field === "string" ? [field] : [];
  }
}

async function broadcastToWorker(workerId: string, payload: any): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const channel = supabase.channel(`radar_${workerId}`);

    const timeout = setTimeout(() => {
      supabase.removeChannel(channel);
      resolve(false);
    }, 4000);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel.send({
            type: "broadcast",
            event: "new_gig",
            payload,
          });
          setTimeout(() => {
            clearTimeout(timeout);
            supabase.removeChannel(channel);
            resolve(true);
          }, 500);
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

interface CandidateMatch {
  worker_id: string;
  tier: string;
  tasks_completed: number;
  matchScore: number;
}

const TIER_WEIGHT: Record<string, number> = {
  standard: 1,
  T1: 1,
  T2: 2,
  T3: 3,
  T4: 4,
  expert: 4,
};

export async function POST(req: Request) {
  try {
    const { gigId, jobCategory, jobSkills, jobTier, paymentId } = await req.json();

    if (!gigId) {
      return NextResponse.json({ error: "Missing gigId parameter" }, { status: 400 });
    }

    // 1. Fetch Gig Record
    const isOrderId = typeof gigId === "string" && gigId.startsWith("order_");
    let gigQuery = supabase
      .from("gigs")
      .select("id, poster_id, base_budget, primary_category, required_skills, status, worker_id, created_at, search_started_at, declined_worker_ids, dispatch_round, razorpay_payment_id");

    if (isOrderId) {
      gigQuery = gigQuery.eq("razorpay_order_id", gigId);
    } else {
      gigQuery = gigQuery.eq("id", gigId);
    }

    const { data: gigRecord, error: gigFetchErr } = await gigQuery.maybeSingle();

    if (gigFetchErr || !gigRecord) {
      console.error("[Dispatcher] Gig lookup error:", gigFetchErr);
      return NextResponse.json({ error: "Gig record not found" }, { status: 404 });
    }

    const realGigId = gigRecord.id;
    const category = jobCategory || gigRecord.primary_category || "Code Review";
    const skillsToMatch = jobSkills || gigRecord.required_skills || [];
    const realBudget = Number(gigRecord.base_budget) || 0;
    const posterId = gigRecord.poster_id;

    // Helper: Safely expire gig with fallback if custom columns are missing
    const expireGig = async (reason: string) => {
      console.log(`[Dispatcher] Expiring gig ${realGigId}: ${reason}`);

      // Attempt full update
      const { error: fullUpdateErr } = await supabase
        .from("gigs")
        .update({
          status: "unmatched",
          lifecycle_state: "unmatched",
          candidate_worker_id: null,
          dispatch_expires_at: null,
        })
        .eq("id", realGigId);

      // Fallback: If custom columns are missing in schema cache, update status directly
      if (fullUpdateErr) {
        console.warn("[Dispatcher] Full expire update failed, executing fallback status update:", fullUpdateErr.message);
        const { error: fallbackErr } = await supabase
          .from("gigs")
          .update({ status: "unmatched" })
          .eq("id", realGigId);

        if (fallbackErr) {
          console.error("[Dispatcher Fatal Error] Could not update gig status to unmatched:", fallbackErr);
        }
      }

      return NextResponse.json({
        success: false,
        status: "unmatched",
        message: reason,
        gigId: realGigId,
      });
    };

    // If gig is already claimed or terminal, abort
    if (gigRecord.status !== "searching") {
      return NextResponse.json({
        success: true,
        status: gigRecord.status,
        gigId: realGigId,
      });
    }

    // Persist paymentId if provided
    if (paymentId && !gigRecord.razorpay_payment_id) {
      await supabase
        .from("gigs")
        .update({ razorpay_payment_id: paymentId })
        .eq("id", realGigId);
    }

    // 2. Global Timing Check (5-minute overall limit = 300 seconds)
    const searchStartTime = gigRecord.search_started_at
      ? new Date(gigRecord.search_started_at).getTime()
      : new Date(gigRecord.created_at).getTime();

    const elapsedSeconds = Math.floor((Date.now() - searchStartTime) / 1000);
    const remainingSeconds = 300 - elapsedSeconds;

    // HARD CUTOFF RULE: Cannot provide a full compulsory 60 seconds if less than 60s remain
    if (remainingSeconds < 60) {
      return await expireGig(
        `Global search window limit reached (${elapsedSeconds}s elapsed, only ${remainingSeconds}s remaining. Less than compulsory 60s).`
      );
    }

    // 3. Fetch all active specialists (excluding poster)
    const { data: allWorkers, error: workersErr } = await supabase
      .from("workers")
      .select("worker_id, categories, skills, tier, capacity, tasks_completed, is_online, terms_accepted")
      .eq("terms_accepted", true)
      .eq("is_online", true)
      .gt("capacity", 0)
      .neq("worker_id", posterId);

    if (workersErr || !allWorkers || allWorkers.length === 0) {
      return await expireGig("Zero specialists currently online in the platform.");
    }

    // 4. Filter already offered/declined specialists and check 70%+ match
    const declinedIds: string[] = parseArrayField(gigRecord.declined_worker_ids);
    const requiredSkills: string[] = Array.isArray(skillsToMatch) ? skillsToMatch : [skillsToMatch];
    const candidateMatches: CandidateMatch[] = [];

    for (const worker of allWorkers) {
      if (declinedIds.includes(worker.worker_id)) continue;

      const categories = parseArrayField(worker.categories);
      const skills = parseArrayField(worker.skills);

      if (!categories.includes(category)) continue;

      const matchingSkillCount = requiredSkills.filter((reqSkill) =>
        skills.some((wSkill) => wSkill.trim().toLowerCase() === reqSkill.trim().toLowerCase())
      ).length;

      const overlapPercentage =
        requiredSkills.length > 0
          ? Math.round((matchingSkillCount / requiredSkills.length) * 100)
          : 100;

      if (overlapPercentage >= 70) {
        candidateMatches.push({
          worker_id: worker.worker_id,
          tier: worker.tier || "standard",
          tasks_completed: Number(worker.tasks_completed) || 0,
          matchScore: overlapPercentage,
        });
      }
    }

    // If 0 specialists meet the match threshold or candidate queue is exhausted
    if (candidateMatches.length === 0) {
      return await expireGig("No eligible specialists available with 70%+ skill match.");
    }

    // 5. Rank Candidates (Tier & Skill Quality)
    const isHighTierGig = realBudget >= 5000 || jobTier === "T4" || jobTier === "T3";
    let eligibleCandidates = [...candidateMatches];

    if (isHighTierGig) {
      eligibleCandidates.sort((a, b) => {
        const tierDiff = (TIER_WEIGHT[b.tier] || 1) - (TIER_WEIGHT[a.tier] || 1);
        if (tierDiff !== 0) return tierDiff;
        if (b.tasks_completed !== a.tasks_completed) return b.tasks_completed - a.tasks_completed;
        return b.matchScore - a.matchScore;
      });
    } else {
      eligibleCandidates.sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return a.tasks_completed - b.tasks_completed;
      });
    }

    const bestCandidate = eligibleCandidates[0];

    // Exactly 60 seconds from right now
    const dispatchExpiry = new Date(Date.now() + 60 * 1000).toISOString();
    const updatedDeclined = [...declinedIds, bestCandidate.worker_id];

    // 6. Persist offer to Supabase with fallback
    const { error: offerErr } = await supabase
      .from("gigs")
      .update({
        status: "searching",
        candidate_worker_id: bestCandidate.worker_id,
        dispatch_expires_at: dispatchExpiry,
        match_score: bestCandidate.matchScore,
        declined_worker_ids: updatedDeclined,
        dispatch_round: (gigRecord.dispatch_round || 0) + 1,
      })
      .eq("id", realGigId);

    if (offerErr) {
      console.warn("[Dispatcher] Offer update fallback:", offerErr.message);
      await supabase
        .from("gigs")
        .update({ status: "searching" })
        .eq("id", realGigId);
    }

    // 7. Alert worker
    console.log(
      `[Dispatcher] Round ${(gigRecord.dispatch_round || 0) + 1}: Dispatched to ${bestCandidate.worker_id} (strict 60s timer).`
    );

    await broadcastToWorker(bestCandidate.worker_id, {
      gigId: realGigId,
      category,
      budget: realBudget,
      matchScore: bestCandidate.matchScore,
      expiresAt: dispatchExpiry,
    });

    return NextResponse.json({
      success: true,
      status: "dispatched",
      gigId: realGigId,
      candidateWorkerId: bestCandidate.worker_id,
      matchScore: bestCandidate.matchScore,
      remainingSeconds,
    });
  } catch (error: any) {
    console.error("[Dispatcher Error]:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}