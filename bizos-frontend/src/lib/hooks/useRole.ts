import { useAuthStore } from '@/lib/stores/authStore';

const ROLE_RANK: Record<string, number> = {
  super_admin: 6,
  owner: 5,
  accountant: 4,
  technician: 3,
  staff: 2,
  viewer: 1,
};

export function useRole() {
  const { user } = useAuthStore();
  const role = user?.role ?? 'viewer';
  const rank = ROLE_RANK[role] ?? 1;

  return {
    role,
    /** true if the current user's role is at least `minRole` */
    can: (minRole: string) => rank >= (ROLE_RANK[minRole] ?? 99),
    isViewer: rank <= 1,
    isStaffOrAbove: rank >= 2,
    isTechnicianOrAbove: rank >= 3,
    isAccountantOrAbove: rank >= 4,
    isOwnerOrAbove: rank >= 5,
    isSuperAdmin: rank >= 6,
  };
}
