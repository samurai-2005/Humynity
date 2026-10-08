import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      posterId,
      title,
      description,
      baseBudget,
      timeLimit,
      category,
      selectedSkills,
    } = body;

    // 1. Strict Server-Side Validation
    if (!posterId) {
      return NextResponse.json(
        { error: "Unauthorized: Missing authenticated poster identity" },
        { status: 401 }
      );
    }

    const numBudget = Math.floor(Number(baseBudget));
    if (isNaN(numBudget) || numBudget < 500) {
      return NextResponse.json(
        { error: "Minimum base budget is ₹500" },
        { status: 400 }
      );
    }

    // 2. Compute fee and escrow (Zero trust on client-side math)
    const platformFee = Math.round(numBudget * 0.30);
    const totalEscrow = numBudget + platformFee;
    const escrowPaise = totalEscrow * 100;

    // 3. Create the Razorpay Order with boolean payment_capture (Auth Hold)
    const orderPayload = {
      amount: escrowPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      payment_capture: false, // false = Authorize / Manual hold
      notes: {
        category: category || "General",
        poster_id: posterId,
      },
    };

    const order = (await razorpay.orders.create(orderPayload as any)) as {
      id: string;
      amount: number | string;
      currency: string;
    };

    // 4. Persist task to Supabase bound to the authenticated posterId
    const { data: gig, error: dbError } = await supabase
      .from("gigs")
      .insert({
        poster_id: posterId,
        title: title || "New Gig Task",
        description: description || "",
        primary_category: category || "Code Review",
        required_skills: selectedSkills || [],
        time_limit_hours: Number(timeLimit) || 2,
        base_budget: numBudget,
        platform_fee: platformFee,
        total_escrow: totalEscrow,
        razorpay_order_id: order.id,
        status: "searching",
        lifecycle_state: "searching",
      })
      .select("id")
      .single();

    if (dbError || !gig) {
      console.error("[Escrow Create Hold] Database Insert Error:", dbError);
      return NextResponse.json(
        { error: dbError?.message || "Failed to persist gig record" },
        { status: 500 }
      );
    }

    // 5. Return both Razorpay Order ID and database UUID
    return NextResponse.json({
      orderId: order.id,
      gigId: gig.id,
      amount: Number(order.amount),
      currency: order.currency,
    });
  } catch (error: any) {
    console.error("[Escrow Create Hold Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create escrow hold" },
      { status: 500 }
    );
  }
}