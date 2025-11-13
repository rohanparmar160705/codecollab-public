/**
 * ✅ Billing Routes
 * Handles subscription creation, verification, and status retrieval.
 * Uses Razorpay verification instead of webhook since same API keys are shared across projects.
 */

import { Router } from "express";
import { BillingController } from "./billing.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// 🔹 Create new subscription (requires login)
router.post("/create", authenticate, BillingController.startSubscription);

// 🔹 Verify payment (manual Razorpay signature verification)
router.post("/verify", authenticate, BillingController.verifyPayment);

// 🔹 Get current active subscription
router.get("/active", authenticate, BillingController.getActiveSubscription);

// 🔹 List available plans (from env-configured ALLOWED_PLANS)
router.get("/plans", authenticate, BillingController.getPlans);

// Optional cancel route (uncomment route if you want to enable cancellation)
// router.post("/cancel", authenticate, BillingController.cancelSubscription);

export default router;
