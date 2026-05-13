'use client';

import { useRole } from '@/lib/hooks/useRole';

interface IfRoleProps {
  minRole: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/** Renders children only if the current user meets the minimum role requirement. */
export function IfRole({ minRole, children, fallback = null }: IfRoleProps) {
  const { can } = useRole();
  return can(minRole) ? <>{children}</> : <>{fallback}</>;
}
