  function primaryHexFromCss(): string {
    try {
      const hsl = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
      // hsl is like: "221 83% 53%" (no wrapper). Convert to hex.
      const [h, s, l] = hsl.split(/\s+/);
      const H = parseFloat(h);
      const S = parseFloat(s.replace("%", "")) / 100;
      const L = parseFloat(l.replace("%", "")) / 100;
      const c = (1 - Math.abs(2 * L - 1)) * S;
      const x = c * (1 - Math.abs(((H / 60) % 2) - 1));
      const m = L - c / 2;
      let r = 0, g = 0, b = 0;
      if (H < 60) { r = c; g = x; b = 0; }
      else if (H < 120) { r = x; g = c; b = 0; }
      else if (H < 180) { r = 0; g = c; b = x; }
      else if (H < 240) { r = 0; g = x; b = c; }
      else if (H < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      const toHex = (v: number) => {
        const n = Math.round((v + m) * 255);
        return n.toString(16).padStart(2, "0");
      };
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } catch {
      return "#2563EB";
    }
  }
import { useMutation, useQuery } from "@tanstack/react-query";
import { createSubscription, getActiveSubscription, getPlans, verifyPayment } from "@/services/billingService";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Billing() {
  const { data, refetch, isFetching } = useQuery({ queryKey: ["billing", "active"], queryFn: getActiveSubscription });
  const { data: plansResp, isLoading: plansLoading } = useQuery({ queryKey: ["billing", "plans"], queryFn: getPlans });
  const plans = useMemo(() => {
    const serverPlans: Array<any> = plansResp?.plans || [];
    if (!Array.isArray(serverPlans)) return [];
    return serverPlans.map((p: any) => ({
      code: p.code || p.planType || p.id,
      name: p.name || p.label || p.title || String(p.code || p.planType || p.id),
      price: p.priceDisplay || p.price || "",
      desc: p.description || p.desc || "",
    }));
  }, [plansResp]);
  const [selected, setSelected] = useState<string | null>(null);

  async function loadRazorpay() {
    return new Promise<boolean>((resolve) => {
      if (typeof window !== "undefined" && (window as any).Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        console.log("[RZP 3] SDK script loaded");
        resolve(true);
      };
      script.onerror = () => {
        console.error("[RZP 3E] SDK script failed to load");
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  // Preload SDK as early as possible to minimize async gap from user gesture
  const [sdkReady, setSdkReady] = useState<boolean>(false);
  const navigate = useNavigate();
  useEffect(() => {
    console.log("[RZP 1] Preloading SDK");
    loadRazorpay().then((ok) => {
      const ready = ok && Boolean((window as any).Razorpay);
      setSdkReady(ready);
      console.log("[RZP 2] SDK preloaded status:", { ok, ready });
    });
  }, []);

  // Removed new-tab fallback by user request

  const startSub = useMutation({
    mutationFn: async () => {
      console.log("[RZP 4] Subscribe clicked, selected:", selected);
      if (!selected) throw new Error("Please select a plan");
      console.log("[RZP 5] Calling /billing/create with planType", selected);
      const res = await createSubscription({ planType: selected });
      console.log("[RZP 6] /billing/create response", res);
      const key = import.meta.env.VITE_RAZORPAY_KEY_ID as string;
      const subscription_id = res?.razorpaySub?.id;
      const short_url = res?.razorpaySub?.short_url;
      console.log("[RZP 7] Key and subscription id", { keyPresent: Boolean(key), subscription_id, hasShortUrl: Boolean(short_url) });

      if (!key) {
        console.error("[RZP 7E] Missing VITE_RAZORPAY_KEY_ID env");
        throw new Error("Payment key missing. Contact support.");
      }
      if (!subscription_id) {
        console.error("[RZP 7E] Missing subscription_id from /billing/create response", res);
        throw new Error("Unable to initiate payment. Try again.");
      }

      if (!sdkReady) {
        console.warn("[RZP 8] SDK not ready at click. Loading SDK now.");
        const ok = await loadRazorpay();
        if (!ok || !(window as any).Razorpay) {
          console.error("[RZP 8E] Razorpay SDK failed to load");
          throw new Error("Failed to load payment SDK. Try again.");
        }
      }

      const options: any = {
        key,
        subscription_id,
        name: "CodeCollab",
        description: `Subscribe: ${selected}`,
        theme: { color: primaryHexFromCss() },
        handler: async (response: any) => {
          console.log("[RZP 12] Payment success handler payload", response);
          try {
            console.log("[RZP 13] Calling /billing/verify");
            await verifyPayment({
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            console.log("[RZP 14] /billing/verify success");
          } catch (e) {
            console.error("[RZP 14E] Verification failed", e);
          } finally {
            console.log("[RZP 15] Refetching /billing/active");
            try {
              const r = await refetch();
              const rd: any = r?.data;
              const isActive = Boolean(rd?.isActive || rd?.active || rd?.data?.active || rd?.data?.isActive);
              console.log("[RZP 15A] Refetch result", rd, { isActive });
              if (isActive) {
                console.log("[RZP 15B] Navigating to /dashboard");
                navigate("/dashboard");
              } else {
                console.log("[RZP 15C] Still not active after verify; staying on billing");
              }
            } catch (e) {
              console.warn("[RZP 15E] Refetch failed", e);
            }
          }
        },
        modal: {
          ondismiss: () => {
            console.warn("[RZP 16] Payment modal dismissed");
          },
        },
      };

      try {
        console.log("[RZP 9] Opening modal", { keyPresent: Boolean(key), subscription_id });
        const rzp = new (window as any).Razorpay(options);
        rzp.on?.("payment.failed", (resp: any) => {
          console.error("[RZP 10E] Payment failed", resp);
        });
        rzp.open();
      } catch (e) {
        console.error("[RZP 9E] Failed to open Razorpay modal", e);
        throw e;
      }
    },
    onSuccess: () => {
      // refetch after handler; keep here as safety
      refetch();
    },
  });

  const active = Boolean((data as any)?.isActive || (data as any)?.active || (data as any)?.data?.active || (data as any)?.data?.isActive);
  useEffect(() => {
    console.log("[RZP 16A] Active state check", { active, data });
    if (active) {
      console.log("[RZP 17] Active true, redirecting to /dashboard");
      navigate("/dashboard");
    }
  }, [active, navigate]);

  return (
    <main className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your plan and billing</p>
      </div>
      {isFetching ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">Loading status...</CardContent>
        </Card>
      ) : active ? (
        <Card className="elevation-1">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="font-medium">You have an active subscription.</p>
            <Button asChild><Link to="/dashboard">Go to Dashboard</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select a plan</CardTitle>
              <CardDescription>No active plan. Choose a plan to continue.</CardDescription>
            </CardHeader>
            <CardContent>
              {plansLoading ? (
                <div className="text-sm text-muted-foreground">Loading plans...</div>
              ) : plans.length === 0 ? (
                <div className="text-sm">No plans available. Ensure backend exposes /billing/plans.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {plans.map((p) => (
                      <button
                        key={p.code}
                        onClick={() => setSelected(p.code)}
                        className={`text-left rounded border p-4 hover:shadow transition ${selected === p.code ? "ring-2 ring-primary border-primary" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{p.name}</h3>
                          <span className="text-primary">{p.price}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{p.desc}</p>
                        <p className="text-xs text-muted-foreground mt-1">Code: {p.code}</p>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Button onClick={() => startSub.mutate()} disabled={!selected || startSub.isPending}>
                      {startSub.isPending ? "Subscribing..." : selected ? `Subscribe to ${selected}` : "Select a plan"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
