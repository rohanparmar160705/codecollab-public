import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getActiveSubscription } from "@/services/billingService";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireSubscription({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["billing", "active"],
    queryFn: getActiveSubscription,
    staleTime: 60_000,
  });

  if (isLoading) return <div className="p-6">Checking subscription...</div>;

  // Treat errors or missing active subscription as not subscribed
  const active = Boolean((data as any)?.isActive || (data as any)?.active || (data as any)?.data?.active);
  if (isError || !active) {
    return <Navigate to="/billing" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
