// Freno a la fuerza bruta en el login: después de MAX_FAILURES intentos fallidos para un mismo email se
// bloquea ese email por LOCK_MS. En memoria del proceso (una instalación = un proceso PM2), alcanza
// para frenar a un script; no reemplaza un rate limit en Nginx.

export const MAX_FAILURES = 5;
export const LOCK_MS = 15 * 60_000;

type Entry = { failures: number; lockedUntil: number };

export function createLoginThrottle(now: () => number = Date.now) {
  const entries = new Map<string, Entry>();

  return {
    isLocked(key: string): boolean {
      const e = entries.get(key);
      if (!e) return false;
      if (e.lockedUntil && e.lockedUntil > now()) return true;
      if (e.lockedUntil) entries.delete(key); // venció el bloqueo: arranca de cero
      return false;
    },
    fail(key: string) {
      const e = entries.get(key) ?? { failures: 0, lockedUntil: 0 };
      e.failures += 1;
      if (e.failures >= MAX_FAILURES) e.lockedUntil = now() + LOCK_MS;
      entries.set(key, e);
    },
    succeed(key: string) {
      entries.delete(key);
    },
  };
}

export const loginThrottle = createLoginThrottle();
