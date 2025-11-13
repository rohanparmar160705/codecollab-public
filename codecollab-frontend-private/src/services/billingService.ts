import { api } from "./apiClient";

export const getPlans = async () => (await api.get("/billing/plans")).data;
export const createSubscription = async (payload: { planType: string }) => (await api.post("/billing/create", payload)).data;
export const verifyPayment = async (payload: { razorpay_subscription_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
  (await api.post("/billing/verify", payload)).data;
export const getActiveSubscription = async () => (await api.get("/billing/active")).data;
