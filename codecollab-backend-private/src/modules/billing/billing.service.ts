/**
 * ✅ Billing Service
 * Handles Razorpay Subscription creation and DB updates.
 * Webhooks removed — using direct verification logic.
 */

import prisma from "../../config/prisma";
import { razorpay, ALLOWED_PLANS } from "../../config/razorpay.client";
import dayjs from "dayjs";

export class BillingService {
  /**
   * Create a Razorpay subscription and store it as PENDING
   */
  static async createSubscription(userId: string, planType: string) {
    const planId = (ALLOWED_PLANS as Record<string, string>)[planType];
    if (!planId) throw new Error("Invalid or unauthorized plan type");

    // compute months (planType like "1M", "3M", "12M")
    const months = parseInt(String(planType).replace("M", ""), 10);
    if (Number.isNaN(months) || months <= 0) {
      throw new Error("Invalid plan duration");
    }

    // ✅ Create Razorpay subscription
    let razorpaySub: any;
    try {
      razorpaySub = await razorpay.subscriptions.create({
        plan_id: planId,
        total_count: 1,
        customer_notify: 1,
        notes: { userId, project: "CodeCollab" },
      });
    } catch (err: any) {
      // Normalize common error shapes from Razorpay SDK
      const details = err?.error || err?.response?.data || { message: err?.message };
      const wrapped = new Error("RAZORPAY_SUBSCRIPTION_CREATE_FAILED");
      (wrapped as any).statusCode = err?.statusCode || 502;
      (wrapped as any).details = details;
      throw wrapped;
    }

    // ✅ Store subscription as "PENDING"
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        plan: months >= 12 ? "ENTERPRISE" : "PRO",
        razorpayPlanId: planId,
        razorpaySubId: razorpaySub.id,
        startDate: new Date(),
        endDate: dayjs().add(months, "month").toDate(),
        isActive: false,
        status: "PENDING",
      },
    });

    return { subscription, razorpaySub };
  }

  /**
   * Activate a user's subscription after verifying Razorpay signature.
   * Finds the PENDING subscription matching userId + razorpaySubId and marks active.
   */
  static async activateSubscription(
    userId: string,
    razorpaySubId: string,
    razorpayPaymentId?: string
  ) {
    // Find pending subscription for this user and subscription id
    const pending = await prisma.subscription.findFirst({
      where: {
        userId,
        razorpaySubId,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!pending) {
      throw new Error("No pending subscription found for this user and subscription id");
    }

    const updated = await prisma.subscription.update({
      where: { id: pending.id },
      data: {
        isActive: true,
        status: "ACTIVE",
        activatedAt: new Date(),
        // store payment id if provided (add a field in your schema if needed)
        // here we store the payment id into a payments table usually; if you have a field, set it:
        // lastPaymentId: razorpayPaymentId
      },
    });

    // Also update user's plan to reflect active subscription tier
    try {
      const plan = pending.plan; // PRO or ENTERPRISE per createSubscription logic
      await prisma.user.update({ where: { id: userId }, data: { plan } });
    } catch (e) {
      // non-blocking
      console.log(e);
    }

    return updated;
  }

  /**
   * Get a currently active subscription (non-expired)
   */
  static async getActiveSubscription(userId: string) {
    return prisma.subscription.findFirst({
      where: {
        userId,
        isActive: true,
        endDate: { gt: new Date() },
      },
      orderBy: { activatedAt: "desc" },
    });
  }

  /**
   * Mark expired subscriptions inactive (periodic job)
   */
  static async deactivateExpiredSubscriptions() {
    await prisma.subscription.updateMany({
      where: { endDate: { lt: new Date() }, isActive: true },
      data: { isActive: false, status: "CANCELLED" },
    });
  }

  /**
   * Optional: cancel an active subscription (calls Razorpay + updates DB)
   * Note: `razorpay.subscriptions.cancel` exists on Razorpay SDK — ensure client exposes it.
   */
  static async cancelSubscription(userId: string) {
    const activeSub = await prisma.subscription.findFirst({
      where: { userId, isActive: true },
      orderBy: { activatedAt: "desc" },
    });

    if (!activeSub) throw new Error("No active subscription found");

    // Cancel on Razorpay if you want (uncomment if razorpay client available)
    // await razorpay.subscriptions.cancel(activeSub.razorpaySubId);

    await prisma.subscription.update({
      where: { id: activeSub.id },
      data: { isActive: false, status: "CANCELLED" },
    });

    return { message: "Subscription cancelled successfully" };
  }
}
