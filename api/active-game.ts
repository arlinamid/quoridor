import { createClient } from '@supabase/supabase-js';

// Vercel serverless function — monitors active game state for a user.
// Called on app load so disconnected players can rejoin within 2 minutes.
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(503).json({ error: 'Supabase not configured' });

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'playing')
    .or(`player1_id.eq.${userId},player2_id.eq.${userId},player3_id.eq.${userId},player4_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ game: data ?? null });
}
