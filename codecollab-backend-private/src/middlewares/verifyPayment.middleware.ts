// src/middlewares/verifyPayment.middleware.ts
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { ENV } from "../config/env";
import { AppError } from "../utils/appError";

/**
 * 🧾 Verify Razorpay Payment Signature (for client-side order verification)
 * Used for one-time payments (order-based).
 */
export const verifyOrderPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  const generatedSignature = crypto
    .createHmac("sha256", ENV.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return generatedSignature === signature;
};

/**
 * 💳 Verify Razorpay Subscription Payment Signature
 * Used when handling recurring subscription payment confirmation.
 *
 * Format: `${razorpay_subscription_id}|${razorpay_payment_id}`
 */
export const verifySubscriptionPaymentSignature = (
  razorpay_subscription_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
): boolean => {
  const keySecret = ENV.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET not set in environment");
  }

  const body = `${razorpay_subscription_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  return expectedSignature === razorpay_signature;
};
