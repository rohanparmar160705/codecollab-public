/**
 * ✅ Billing Controller
 * Handles REST API routes for creating & checking subscriptions.
 * We do not use Razorpay webhooks. Instead, we verify payment signatures directly.
 */

import { Request, Response } from "express";
import { BillingService } from "./billing.service";
import { ALLOWED_PLANS } from "../../config/razorpay.client";
import { createSubscriptionSchema } from "./billing.validation";
import { verifyOrderPaymentSignature } from "../../middlewares/verifyPayment.middleware";

export class BillingController {
  // POST /billing/create
  static async startSubscription(req: Request, res: Response) {
    try {
      const { error, value } = createSubscriptionSchema.validate(req.body);
      if (error) return res.status(400).json({ message: error.message });

      const { planType } = value;
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const result = await BillingService.createSubscription(userId, planType);
      return res.status(201).json(result);
    } catch (err: any) {
      // Razorpay SDK often returns structured error in err.error / err.response.data
      const rp = err?.error || err?.response?.data || err;
      console.error("Billing error:", rp);
      if (rp?.error || rp?.code || rp?.description) {
        return res.status(502).json({
          message: "Razorpay error",
          details: rp?.error || undefined,
          code: rp?.code || undefined,
          reason: rp?.reason || undefined,
          description: rp?.description || err?.message || "Subscription create failed",
        });
      }
      return res.status(500).json({ message: err?.message ?? "Internal server error" });
    }
  }

  // POST /billing/verify
  static async verifyPayment(req: Request, res: Response) {
    try {
      const isProd = (process.env.NODE_ENV || "development") === "production";
      const {
        razorpay_subscription_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body || {};

      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      if (isProd) {
        if (!razorpay_subscription_id || !razorpay_payment_id || !razorpay_signature) {
          return res.status(400).json({ message: "Missing required fields" });
        }
        const isValid = verifyOrderPaymentSignature(
          razorpay_subscription_id,
          razorpay_payment_id,
          razorpay_signature
        );
        if (!isValid) {
          return res.status(400).json({ message: "Invalid Razorpay signature" });
        }
      } else {
        // Dev mode: bypass signature validation but still require ids to activate a concrete subscription
        if (!razorpay_subscription_id || !razorpay_payment_id) {
          return res.status(200).json({ message: "Dev mode: verification skipped (no ids provided)" });
        }
      }

      const updatedSub = await BillingService.activateSubscription(
        userId,
        razorpay_subscription_id,
        razorpay_payment_id
      );

      return res.status(200).json({
        message: "Subscription activated successfully",
        subscription: updatedSub,
        active: Boolean(updatedSub?.isActive),
      });
    } catch (err: any) {
      console.error("Payment verification failed:", err?.message ?? err);
      return res.status(500).json({ message: err?.message ?? "Internal server error" });
    }
  }

  // GET /billing/active
  static async getActiveSubscription(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const sub = await BillingService.getActiveSubscription(userId);
      if (!sub) return res.json({ active: false, message: "No active subscription" });
      return res.json({ active: Boolean(sub.isActive), subscription: sub });
    } catch (err: any) {
      console.error("Get active subscription failed:", err?.message ?? err);
      return res.status(500).json({ message: err?.message ?? "Internal server error" });
    }
  }

  // GET /billing/plans
  static async getPlans(_req: Request, res: Response) {
    try {
      const entries = Object.entries(ALLOWED_PLANS || {});
      const plans = entries.map(([code, planId]) => ({ code, planId }));
      return res.json({ plans });
    } catch (err: any) {
      console.error("Get plans failed:", err?.message ?? err);
      return res.status(500).json({ message: err?.message ?? "Internal server error" });
    }
  }
}
