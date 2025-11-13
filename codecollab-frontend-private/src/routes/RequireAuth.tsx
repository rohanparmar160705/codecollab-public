import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
