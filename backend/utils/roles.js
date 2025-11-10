export function normalizeRole(role, id, email) {
  const rawRole = (role || '').toString().trim().toLowerCase();
  const normalizedEmail = (email || '').toString().trim().toLowerCase();

  if (id === -1 || normalizedEmail === 'admin') {
    return 'admin';
  }

  if (rawRole === 'admin' || rawRole === 'amministratore') {
    return 'supervisor';
  }

  if (!rawRole || rawRole === 'utente') {
    return 'user';
  }

  return rawRole;
}

export function normalizeUser(user) {
  if (!user) return user;
  const ruolo = normalizeRole(user.ruolo, user.id, user.email);
  return { ...user, ruolo };
}

