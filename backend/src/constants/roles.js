const ROLES = Object.freeze({
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
  BOOKING: 'BOOKING',
  SCANNER: 'SCANNER',
});

const ALL_ROLES = Object.freeze(Object.values(ROLES));

/** Roles that can be assigned from the Users UI (never SUPERADMIN). */
const ASSIGNABLE_ROLES = Object.freeze([ROLES.ADMIN, ROLES.BOOKING, ROLES.SCANNER]);

const MANAGERS = Object.freeze([ROLES.SUPERADMIN, ROLES.ADMIN]);
const BOOKING_STAFF = Object.freeze([ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.BOOKING]);
const SCAN_STAFF = Object.freeze([
  ROLES.SUPERADMIN,
  ROLES.ADMIN,
  ROLES.BOOKING,
  ROLES.SCANNER,
]);
const SHOW_READ_STAFF = SCAN_STAFF;
const SHOW_WRITE_STAFF = BOOKING_STAFF;

function normalizeRole(role) {
  const value = String(role || '')
    .trim()
    .toUpperCase();
  return ALL_ROLES.includes(value) ? value : ROLES.ADMIN;
}

function isManager(role) {
  return MANAGERS.includes(normalizeRole(role));
}

function isSuperAdmin(role) {
  return normalizeRole(role) === ROLES.SUPERADMIN;
}

function isAssignableRole(role) {
  return ASSIGNABLE_ROLES.includes(normalizeRole(role));
}

module.exports = {
  ROLES,
  ALL_ROLES,
  ASSIGNABLE_ROLES,
  MANAGERS,
  BOOKING_STAFF,
  SCAN_STAFF,
  SHOW_READ_STAFF,
  SHOW_WRITE_STAFF,
  normalizeRole,
  isManager,
  isSuperAdmin,
  isAssignableRole,
};
