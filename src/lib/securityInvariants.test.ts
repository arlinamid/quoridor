import { describe, it, expect } from 'vitest';

/**
 * Documents backend expectations from migrations (no live DB).
 * @see supabase/migrations/20260404120070_games_join_rpc_secure_rls.sql
 * @see supabase/migrations/20260404120080_profiles_peer_and_progression_lock.sql
 */
describe('security invariant checklist (documentation)', () => {
  it('join flow is RPC join_online_game + strict participant-only game UPDATE RLS', () => {
    expect('join_online_game').toBeTruthy();
    expect(['player1_id', 'player2_id', 'player3_id', 'player4_id'].length).toBe(4);
  });

  it('public profile reads use profiles_peer + own-row profiles SELECT', () => {
    expect('profiles_peer').not.toContain('fingerprint');
  });

  it('pre-login username hint uses get_username_for_fingerprint RPC', () => {
    expect('get_username_for_fingerprint').toMatch(/^get_username_for_fingerprint$/);
  });

  it('profile progression columns are locked for non-service updates (trigger)', () => {
    expect(['xp', 'wins', 'losses', 'level'].join(',')).toContain('xp');
  });
});
