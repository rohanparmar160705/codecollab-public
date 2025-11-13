export const hasPermission = (roles: any[], action: string, resource: string) => {
  const perms = roles.flatMap((r) =>
    r.role.rolePermissions.map((rp : any) => rp.permission)
  );
  return perms.some((p) => p.action === action && p.resource === resource);
};
