import { createClient } from '@supabase/supabase-js';

// GET /api/cleanup-games
// Vercel Cron: runs every 2 minutes.
// Finds all 'playing' games whose last_heartbeat is older than 2 minutes
// and marks them as 'abandoned'. Clients detect this via realtime and
// show a "game closed due to inactivity" message.
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(503).json({ error: 'Supabase not configured' });

  const supabase = createClient(supabaseUrl, supabaseKey);

  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('games')
    .update({ status: 'abandoned' })
    .eq('status', 'playing')
    .lt('last_heartbeat', cutoff)
    .select('id');

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ abandoned: data?.length ?? 0, cutoff });
}
