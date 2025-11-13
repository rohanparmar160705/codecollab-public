import { ReactNode, useEffect, useState } from "react";
import { getProfile } from "@/services/usersService";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await getProfile();
        const user = (res?.data ?? res) as any;
        const roles = user?.userRoles || [];
        const isAdmin = roles.some((ur: any) => String(ur?.role?.name || "").toUpperCase() === "ADMIN");
        // Or check permissions
        const hasAdminPerm = roles.some((ur: any) => (ur?.role?.rolePermissions || []).some((rp: any) => ["users","rooms","subscriptions"].includes(rp?.permission?.resource)));
        setOk(isAdmin || hasAdminPerm);
      } catch {
        setOk(false);
      }
    })();
  }, []);

  if (ok === null) return <div className="p-6">Checking access…</div>;
  if (!ok) return <div className="p-6">Forbidden</div>;
  return <>{children}</>;
}
