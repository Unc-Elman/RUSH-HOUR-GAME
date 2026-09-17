/**
 * Local player persistence (no accounts / no sign-in).
 * Progress is stored on this device under a fixed player key.
 * In-memory maps keep the game working if localStorage is blocked.
 */
const SESSION_KEY = 'getaway-rush-session-v2';
const USERS_KEY = 'getaway-rush-users-v2';
const LEGACY_KEY = 'getaway-rush-v1';

/** Fallback when localStorage throws (private mode / quota / file:// quirks) */
const memUsers = Object.create(null);
let memSession = null;

export function defaultProfile() {
  return {
    username: '',
    displayName: '',
    bestDistance: 0,
    bestCoins: 0,
    bestScore: 0,
    wallet: 50, // starter coins so store is usable
    totalRuns: 0,
    unlocked: ['runner'],
    equipped: 'runner',
    muted: false,
    createdAt: 0,
    lastLoginAt: 0,
  };
}

function readUsersMap() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) || {};
      // merge disk over memory keys so reloads win
      return { ...memUsers, ...parsed };
    }
  } catch {
    /* use memory */
  }
  return { ...memUsers };
}

function writeUsersMap(map) {
  // Always keep memory copy
  for (const k of Object.keys(map)) memUsers[k] = map[k];
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode — memory still works this session */
  }
}

export function loadUserProfile(username) {
  const map = readUsersMap();
  const key = String(username || '').toLowerCase();
  if (!map[key] && !memUsers[key]) return null;
  const raw = map[key] || memUsers[key];
  return { ...defaultProfile(), ...raw, username: key };
}

export function saveUserProfile(profile) {
  if (!profile?.username) return;
  const map = readUsersMap();
  const key = String(profile.username).toLowerCase();
  const saved = { ...defaultProfile(), ...profile, username: key };
  map[key] = saved;
  memUsers[key] = saved;
  writeUsersMap(map);
}

export function getSession() {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    if (s) {
      memSession = s;
      return s;
    }
  } catch {
    /* memory */
  }
  return memSession;
}

export function setSession(username) {
  const name = String(username).toLowerCase();
  memSession = name;
  try {
    localStorage.setItem(SESSION_KEY, name);
  } catch {
    /* memory only */
  }
}

/** Update local player's progress after a run; coins go to wallet */
export function recordRunForUser(profile, distance, coins, score) {
  if (!profile) return { profile: null, isRecord: false, earned: 0 };

  const earned = Math.floor(coins);
  const isRecord =
    score > profile.bestScore ||
    distance > profile.bestDistance ||
    coins > profile.bestCoins;

  profile.bestDistance = Math.max(profile.bestDistance, Math.floor(distance));
  profile.bestCoins = Math.max(profile.bestCoins, Math.floor(coins));
  profile.bestScore = Math.max(profile.bestScore, Math.floor(score));
  profile.wallet = (profile.wallet || 0) + earned;
  profile.totalRuns = (profile.totalRuns || 0) + 1;
  saveUserProfile(profile);
  return { profile, isRecord, earned };
}

export function setMutedForUser(profile, muted) {
  if (!profile) return;
  profile.muted = !!muted;
  saveUserProfile(profile);
}

export function buyCharacter(profile, characterId, price) {
  if (!profile) return { ok: false, error: 'No player profile.' };
  if (profile.unlocked.includes(characterId)) {
    return { ok: false, error: 'Already owned.' };
  }
  if ((profile.wallet || 0) < price) {
    return { ok: false, error: 'Not enough coins.' };
  }
  profile.wallet -= price;
  profile.unlocked = [...profile.unlocked, characterId];
  saveUserProfile(profile);
  return { ok: true, profile };
}

export function equipCharacter(profile, characterId) {
  if (!profile) return { ok: false, error: 'No player profile.' };
  if (!profile.unlocked.includes(characterId)) {
    return { ok: false, error: 'Not unlocked.' };
  }
  profile.equipped = characterId;
  saveUserProfile(profile);
  return { ok: true, profile };
}

// Legacy helpers
export function loadSave() {
  const name = getSession();
  if (name) {
    const p = loadUserProfile(name);
    if (p) return p;
  }
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) return { ...defaultProfile(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultProfile();
}

export function writeSave() {
  /* no-op: use saveUserProfile */
}

export function recordRun(distance, coins, score) {
  const name = getSession();
  if (!name) return { save: defaultProfile(), isRecord: false, earned: 0 };
  const profile = loadUserProfile(name);
  return recordRunForUser(profile, distance, coins, score);
}

export function setMuted(muted) {
  const name = getSession();
  if (!name) return;
  const profile = loadUserProfile(name);
  setMutedForUser(profile, muted);
}
