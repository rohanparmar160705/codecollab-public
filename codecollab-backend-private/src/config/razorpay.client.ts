/**
 * ✅ Razorpay Client Setup
 * We're reusing the same Razorpay Key ID and Secret across multiple projects.
 * To keep plans separate, we define specific PLAN IDs for this project only.
 * Example: Each project can use different Plan IDs even if using same credentials.
 */

import Razorpay from "razorpay";
import dotenv from "dotenv";
dotenv.config();

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// ✅ Define only this project's allowed plan IDs
export const ALLOWED_PLANS: Record<string, string> = {
  "1M": process.env.RAZORPAY_PLAN_1M!, // 1-Month Plan
  "3M": process.env.RAZORPAY_PLAN_3M!, // 3-Month Plan
  "6M": process.env.RAZORPAY_PLAN_6M!, // 6-Month Plan
  "12M": process.env.RAZORPAY_PLAN_12M!, // 12-Month Plan
};
