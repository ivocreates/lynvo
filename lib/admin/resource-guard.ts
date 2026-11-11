import "server-only";

import { requireManager, requirePermission } from "@/lib/auth";
import { resourceAccess } from "@/lib/admin/resources";

export async function requireResourceAccess(key: string) {
  const access = resourceAccess(key);
  return "manager" in access ? requireManager() : requirePermission(access.permission);
}
