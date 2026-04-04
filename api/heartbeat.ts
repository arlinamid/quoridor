import { createClient } from '@supabase/supabase-js';

// POST /api/heartbeat  { gameId, userId }
// Called every 30 s by each connected player (and the host on behalf of bots).
// Updates last_heartbeat so cleanup-games knows the game is still alive.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { gameId, userId } = req.body ?? {};
  if (!gameId || !userId) return res.status(400).json({ error: 'gameId and userId required' });

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(503).json({ error: 'Supabase not configured' });

  const supabase = createClient(supabaseUrl, supabaseKey);

  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  // Update heartbeat (only if caller is a valid player in this game)
  const { error } = await supabase
    .from('games')
    .update({ last_heartbeat: now })
    .eq('id', gameId)
    .eq('status', 'playing')
    .or(`player1_id.eq.${userId},player2_id.eq.${userId},player3_id.eq.${userId},player4_id.eq.${userId}`);

  if (error) return res.status(500).json({ error: error.message });

  // Piggyback: sweep stale games on every heartbeat (backup for pg_cron)
  await supabase
    .from('games')
    .update({ status: 'abandoned' })
    .eq('status', 'playing')
    .lt('last_heartbeat', cutoff);

  return res.json({ ok: true });
}
