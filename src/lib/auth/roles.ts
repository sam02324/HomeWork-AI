export const APP_ROLES = ['teacher', 'student', 'admin'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function normalizeAppRole(value: unknown): AppRole {
  return typeof value === 'string' && APP_ROLES.includes(value as AppRole)
    ? (value as AppRole)
    : 'teacher';
}

export function isAdminRole(value: unknown): value is 'admin' {
  return value === 'admin';
}
