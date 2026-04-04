import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { supabase, joinGame } from './supabase';

describe('joinGame contract', () => {
  let rpcSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: [{ id: 'game-row' }],
      error: null,
    } as never);
  });

  afterEach(() => {
    rpcSpy.mockRestore();
  });

  it('calls join_online_game RPC with p_game_id and p_slot (never trusts client user id for auth)', async () => {
    await joinGame('11111111-1111-1111-1111-111111111111', 'evil-impersonated-uuid', 2);
    expect(rpcSpy).toHaveBeenCalledTimes(1);
    expect(rpcSpy).toHaveBeenCalledWith('join_online_game', {
      p_game_id: '11111111-1111-1111-1111-111111111111',
      p_slot: 2,
    });
  });

  it.each([1, 2, 3] as const)('forwards slot %i', async (slot) => {
    await joinGame('g', 'u', slot);
    expect(rpcSpy).toHaveBeenCalledWith('join_online_game', { p_game_id: 'g', p_slot: slot });
  });

  it('normalizes SETOF result to first row object', async () => {
    rpcSpy.mockResolvedValue({ data: [{ id: 'x', status: 'waiting' }], error: null } as never);
    const { data, error } = await joinGame('g', 'u', 1);
    expect(error).toBeNull();
    expect(data).toEqual({ id: 'x', status: 'waiting' });
  });

  it('handles single-object RPC payload', async () => {
    rpcSpy.mockResolvedValue({ data: { id: 'solo' }, error: null } as never);
    const { data } = await joinGame('g', 'u', 1);
    expect(data).toEqual({ id: 'solo' });
  });
});
