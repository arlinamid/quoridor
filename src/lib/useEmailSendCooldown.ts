import { useState, useEffect, useCallback } from 'react';

const RATE_LIMIT_COOLDOWN_SEC = 15 * 60;

/**
 * Megakadályozza a gyors többszöri OTP / megerősítő email kérést (Supabase rate limit).
 */
export function useEmailSendCooldown(successCooldownSec = 60) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = window.setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => window.clearTimeout(t);
  }, [remaining]);

  const startCooldown = useCallback(() => {
    setRemaining(successCooldownSec);
  }, [successCooldownSec]);

  const penalizeRateLimit = useCallback(() => {
    setRemaining((r) => Math.max(r, RATE_LIMIT_COOLDOWN_SEC));
  }, []);

  const blockMessage =
    remaining > 0
      ? `Várj még ${remaining} másodpercet az újraküldés előtt — így kevésbé ütközöl a szolgáltató email-limitjébe.`
      : null;

  return { remaining, startCooldown, penalizeRateLimit, blockMessage };
}
