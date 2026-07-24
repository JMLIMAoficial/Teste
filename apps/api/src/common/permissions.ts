export const PERMISSIONS = {
  PROFILES_MODERATE: 'profiles:moderate',
  PHOTOS_MODERATE: 'photos:moderate',
  REPORTS_MANAGE: 'reports:manage',
  SETTINGS_MANAGE: 'settings:manage',
  USERS_BLOCK: 'users:block',
  HOTSCORE_MANAGE: 'hotscore:manage',
} as const;

export function mergeRolePermissions(
  roles: Array<{ name: string; permissions: unknown }>,
): string[] {
  for (const role of roles) {
    if (role.name === 'admin') return ['*'];
  }

  const set = new Set<string>();
  for (const role of roles) {
    const perms = role.permissions;
    if (Array.isArray(perms)) {
      for (const perm of perms) {
        if (typeof perm === 'string') set.add(perm);
      }
    }
  }
  return [...set];
}

export function hasPermission(userPermissions: string[] | undefined, required: string): boolean {
  if (!userPermissions?.length) return false;
  if (userPermissions.includes('*')) return true;
  return userPermissions.includes(required);
}
