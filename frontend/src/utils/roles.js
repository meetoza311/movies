export const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
  BOOKING: 'BOOKING',
  SCANNER: 'SCANNER',
};

export const ASSIGNABLE_ROLES = [ROLES.ADMIN, ROLES.BOOKING, ROLES.SCANNER];

export const ROLE_LABELS = {
  SUPERADMIN: 'Super admin',
  ADMIN: 'Admin',
  BOOKING: 'Booking',
  SCANNER: 'Scanner',
};

export function normalizeRole(role) {
  const value = String(role || '')
    .trim()
    .toUpperCase();
  return Object.values(ROLES).includes(value) ? value : ROLES.ADMIN;
}

/** Paths each role may open (prefix match). */
const ROLE_PATHS = {
  SUPERADMIN: ['*'],
  ADMIN: ['*'],
  BOOKING: ['/shows', '/bookings', '/verify'],
  SCANNER: ['/verify'],
};

export function roleHomePath(role) {
  const r = normalizeRole(role);
  if (r === ROLES.SCANNER) return '/verify';
  if (r === ROLES.BOOKING) return '/bookings';
  return '/';
}

export function canAccessPath(role, pathname) {
  const r = normalizeRole(role);
  const allowed = ROLE_PATHS[r] || [];
  if (allowed.includes('*')) return true;
  const path = pathname || '/';
  return allowed.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

export function canManageUsers(role) {
  const r = normalizeRole(role);
  return r === ROLES.SUPERADMIN || r === ROLES.ADMIN;
}

export function canSeeNav(role, to) {
  return canAccessPath(role, to);
}

export function canQuickAction(role, action) {
  const r = normalizeRole(role);
  if (r === ROLES.SUPERADMIN || r === ROLES.ADMIN) return true;
  if (r === ROLES.BOOKING) return action === 'booking';
  return false;
}

export function canManageCatalog(role) {
  const r = normalizeRole(role);
  return r === ROLES.SUPERADMIN || r === ROLES.ADMIN;
}
