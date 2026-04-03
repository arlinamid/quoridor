// Supabase Edge Function: award-xp
// Validates the caller's JWT, calculates XP server-side, and updates the profile.
// Prevents client-side XP manipulation.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const calculateLevel = (xp: number) => Math.floor(Math.sqrt(xp / 100)) + 1;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const { mode, won } = await req.json() as { mode: string; won: boolean };

    // Server-side XP rules — must match client-side display in WinOverlay
    let xpDelta: number;
    let winDelta = 0;
    let lossDelta = 0;

    const isOnline = mode === 'online' || mode === 'treasure-online';
    const isAI = mode === 'ai' || mode === 'treasure-ai';
    const isPvP = mode === 'pvp' || mode === 'treasure-pvp';

    if (isAI || isOnline) {
      if (won) { xpDelta = 50; winDelta = 1; }
      else { xpDelta = 10; lossDelta = 1; }
    } else if (isPvP) {
      xpDelta = 20; // both players get XP in local pvp
    } else {
      return new Response(JSON.stringify({ error: 'Invalid mode' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('xp, wins, losses')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const newXp = (profile.xp ?? 0) + xpDelta;
    const updates = {
      xp: newXp,
      level: calculateLevel(newXp),
      wins: (profile.wins ?? 0) + winDelta,
      losses: (profile.losses ?? 0) + lossDelta,
    };

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(updates), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
