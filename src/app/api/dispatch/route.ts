import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase admin client with Service Role to bypass RLS for worker matching
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Helper: Safely parse array fields (handles PostgreSQL text[], jsonb, or raw JSON strings)
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

// Helper: Reliably broadcast over Supabase Realtime with network flush buffer
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
          // Wait 500ms before removing channel so packet flushes across network
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

    if (!gigId || !jobCategory || !jobSkills) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch Gig Record
    const isOrderId = typeof gigId === "string" && gigId.startsWith("order_");
    let gigQuery = supabase.from("gigs").select("id, poster_id, base_budget, status, worker_id");

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
    const realBudget = Number(gigRecord.base_budget) || 0;
    const posterId = gigRecord.poster_id;

    // Persist paymentId if provided from Razorpay checkout
    if (paymentId) {
      await supabase
        .from("gigs")
        .update({ razorpay_payment_id: paymentId })
        .eq("id", realGigId);
    }

    // 2. Fetch all active specialists (excluding the job poster)
    const { data: allWorkers, error: workersErr } = await supabase
      .from("workers")
      .select("worker_id, categories, skills, tier, capacity, tasks_completed, is_online, terms_accepted")
      .eq("terms_accepted", true)
      .eq("is_online", true)
      .gt("capacity", 0)
      .neq("worker_id", posterId);

    if (workersErr || !allWorkers || allWorkers.length === 0) {
      console.log(`[Dispatcher] No eligible specialists online for gig ${realGigId}`);
      return NextResponse.json({
        success: true,
        message: "No specialists online",
        gigId: realGigId,
      });
    }

    // 3. Category Filter & Dynamic Skill Overlap Calculation
    const requiredSkills: string[] = Array.isArray(jobSkills) ? jobSkills : [jobSkills];
    const candidateMatches: CandidateMatch[] = [];

    for (const worker of allWorkers) {
      const categories = parseArrayField(worker.categories);
      const skills = parseArrayField(worker.skills);

      // Must be enrolled in this project category
      if (!categories.includes(jobCategory)) continue;

      // Calculate exact skill overlap
      const matchingSkillCount = requiredSkills.filter((reqSkill) =>
        skills.some((wSkill) => wSkill.trim().toLowerCase() === reqSkill.trim().toLowerCase())
      ).length;

      const overlapPercentage = requiredSkills.length > 0
        ? Math.round((matchingSkillCount / requiredSkills.length) * 100)
        : 100;

      // Target threshold: 70%+ overlap
      if (overlapPercentage >= 70) {
        candidateMatches.push({
          worker_id: worker.worker_id,
          tier: worker.tier || "standard",
          tasks_completed: Number(worker.tasks_completed) || 0,
          matchScore: overlapPercentage,
        });
      }
    }

    if (candidateMatches.length === 0) {
      console.log(`[Dispatcher] No specialists met skill threshold for gig ${realGigId}`);
      return NextResponse.json({
        success: true,
        message: "No skill matches found",
        gigId: realGigId,
      });
    }

    // 4. TIER & WORK DISTRIBUTION ENGINE
    const isHighTierGig = realBudget >= 5000 || jobTier === "T4" || jobTier === "T3";
    const hasZeroJobCandidates = candidateMatches.some((c) => c.tasks_completed === 0);

    let eligibleCandidates: CandidateMatch[] = [];

    if (isHighTierGig) {
      // --- HIGH TIER GIG (>= ₹5,000) ---
      // Prioritize High-Tier Veterans (T3/T4 with >= 2 completed tasks)
      const highTierVeterans = candidateMatches.filter((c) => {
        const weight = TIER_WEIGHT[c.tier] || 1;
        return weight >= 3 && c.tasks_completed >= 2;
      });

      if (highTierVeterans.length > 0) {
        console.log(`[Dispatcher] High-tier gig: unleashing ${highTierVeterans.length} veteran(s) on reserve.`);
        eligibleCandidates = highTierVeterans;
      } else {
        // Fallback: If no veterans are online, use the general qualified pool
        console.log(`[Dispatcher] High-tier gig: no T3/T4 veterans online. Using general pool.`);
        eligibleCandidates = candidateMatches;
      }

      // Sort: Highest tier first, then highest tasks completed, then skill fit
      eligibleCandidates.sort((a, b) => {
        const tierDiff = (TIER_WEIGHT[b.tier] || 1) - (TIER_WEIGHT[a.tier] || 1);
        if (tierDiff !== 0) return tierDiff;
        if (b.tasks_completed !== a.tasks_completed) return b.tasks_completed - a.tasks_completed;
        return b.matchScore - a.matchScore;
      });
    } else {
      // --- STANDARD GIG (< ₹5,000) ---
      // If 0-job specialists exist in this skill pool, hold high-tier veterans on reserve
      eligibleCandidates = candidateMatches.filter((c) => {
        const weight = TIER_WEIGHT[c.tier] || 1;
        const isVeteran = weight >= 3 && c.tasks_completed >= 2;

        if (isVeteran && hasZeroJobCandidates) {
          console.log(`[Dispatcher] Specialist ${c.worker_id} held on reserve for high-tier jobs. Prioritizing unassigned specialists.`);
          return false;
        }
        return true;
      });

      // Fallback: If all candidates were filtered, release to anyone available
      if (eligibleCandidates.length === 0) {
        eligibleCandidates = candidateMatches;
      }

      // Sort: Highest skill score first, then prioritize specialists with lowest tasks_completed (0-job first)
      eligibleCandidates.sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return a.tasks_completed - b.tasks_completed;
      });
    }

    const bestCandidate = eligibleCandidates[0];
    const dispatchExpiry = new Date(Date.now() + 60 * 1000).toISOString();

    // 5. Persist the exclusive 60s offer to Supabase
    await supabase
      .from("gigs")
      .update({
        status: "searching",
        candidate_worker_id: bestCandidate.worker_id,
        dispatch_expires_at: dispatchExpiry,
        match_score: bestCandidate.matchScore,
      })
      .eq("id", realGigId);

    // 6. Broadcast real-time alert to specialist's live radar
    console.log(`[Dispatcher] Dispatched gig ${realGigId} to candidate ${bestCandidate.worker_id} (${bestCandidate.matchScore}% fit).`);
    await broadcastToWorker(bestCandidate.worker_id, {
      gigId: realGigId,
      category: jobCategory,
      budget: realBudget,
      matchScore: bestCandidate.matchScore,
    });

    return NextResponse.json({
      success: true,
      message: "Gig dispatched to candidate",
      gigId: realGigId,
      matchedWorkerId: bestCandidate.worker_id,
      matchScore: bestCandidate.matchScore,
    });
  } catch (error: any) {
    console.error("[Dispatcher Error]:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}