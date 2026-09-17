/**
 * Local player profile — no sign-in required.
 * Progress is saved on this device under a fixed local player key.
 */
import {
  loadUserProfile,
  saveUserProfile,
  defaultProfile,
  setSession,
} from './storage.js';

const LOCAL_PLAYER = 'player';

/** In-memory fallback when localStorage is blocked or unavailable */
let memoryUser = null;

/**
 * Ensure a local player profile exists and is active.
 * Called on boot so the game is always ready to play.
 */
export function ensureLocalPlayer() {
  let profile = loadUserProfile(LOCAL_PLAYER);
  if (!profile) {
    profile = {
      ...defaultProfile(),
      username: LOCAL_PLAYER,
      displayName: 'Player',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    saveUserProfile(profile);
  } else {
    profile.lastLoginAt = Date.now();
    if (!profile.displayName) profile.displayName = 'Player';
    saveUserProfile(profile);
  }
  setSession(LOCAL_PLAYER);
  memoryUser = profile;
  return profile;
}

export function getCurrentUser() {
  if (memoryUser) return memoryUser;
  const profile = loadUserProfile(LOCAL_PLAYER);
  if (profile) {
    memoryUser = profile;
    setSession(LOCAL_PLAYER);
    return profile;
  }
  return ensureLocalPlayer();
}

export function setMemoryUser(profile) {
  memoryUser = profile || null;
}

export function refreshCurrentUser() {
  return getCurrentUser();
}
