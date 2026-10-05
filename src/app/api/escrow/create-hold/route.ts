import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { finalEscrow } = body; 

    // 1. Create the Razorpay Order (The Escrow Hold)
    const options = {
      amount: Math.round(finalEscrow * 100), // Razorpay expects paise (multiply by 100)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 0, // CRITICAL: 0 means HOLD the funds, do not capture yet
    };

    const order = await razorpay.orders.create(options);

    // 2. Return the order ID to the frontend checkout modal
    return NextResponse.json({ orderId: order.id, amount: options.amount });

  } catch (error) {
    console.error("Razorpay Error:", error);
    return NextResponse.json({ error: "Failed to create escrow hold" }, { status: 500 });
  }
}