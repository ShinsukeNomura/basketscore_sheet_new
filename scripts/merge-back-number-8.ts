/**
 * 指定ユーザーの #8 / #08 を同一選手としてクラウドデータを統合
 * 実行: npx tsx --env-file=.env.local scripts/merge-back-number-8.ts
 */
import { createClient } from '@supabase/supabase-js';
import { normalizeBackNumber } from '../src/lib/backNumber';

const TARGET_EMAIL = 'miyazakiselene@gmail.com';
const CANONICAL = '8';

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

type PlayerRow = {
  id: string;
  team_id: string;
  game_id: string;
  back_number: string;
  is_on_court: boolean;
};

async function main() {
  const admin = createClient(
    env('NEXT_PUBLIC_SUPABASE_URL'),
    env('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw listErr;
  const user = listData.users.find((u) => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase());
  if (!user) throw new Error(`User not found: ${TARGET_EMAIL}`);

  console.log(`User: ${user.id} (${user.email})`);

  const { data: games, error: gamesErr } = await admin
    .from('games')
    .select('id')
    .eq('user_id', user.id);
  if (gamesErr) throw gamesErr;
  const gameIds = (games ?? []).map((g) => g.id as string);
  console.log(`Games: ${gameIds.length}`);
  if (gameIds.length === 0) return;

  const { data: players, error: playersErr } = await admin
    .from('players')
    .select('id, team_id, game_id, back_number, is_on_court')
    .in('game_id', gameIds);
  if (playersErr) throw playersErr;

  const allPlayers = (players ?? []) as PlayerRow[];
  const byTeamGame = new Map<string, PlayerRow[]>();

  for (const p of allPlayers) {
    const norm = normalizeBackNumber(p.back_number);
    if (norm !== CANONICAL) continue;
    const key = `${p.game_id}::${p.team_id}`;
    const list = byTeamGame.get(key) ?? [];
    list.push(p);
    byTeamGame.set(key, list);
  }

  // 同一 game+team で #8 と #08 が別IDのまま残っている場合も統合
  const { data: allLogs } = await admin
    .from('stats_logs')
    .select('id, player_id')
    .in('game_id', gameIds)
    .eq('is_deleted', false);
  const logCountByPlayer = new Map<string, number>();
  for (const l of allLogs ?? []) {
    if (!l.player_id) continue;
    logCountByPlayer.set(l.player_id, (logCountByPlayer.get(l.player_id) ?? 0) + 1);
  }

  let mergedGroups = 0;
  let logsMoved = 0;
  let playersRemoved = 0;

  for (const [, group] of byTeamGame) {
    if (group.length < 2) {
      const only = group[0];
      if (only && only.back_number !== CANONICAL) {
        await admin.from('players').update({ back_number: CANONICAL }).eq('id', only.id);
        console.log(`Normalized back_number → ${CANONICAL} for player ${only.id}`);
      }
      continue;
    }

    const sorted = [...group].sort((a, b) => {
      const ca = logCountByPlayer.get(a.id) ?? 0;
      const cb = logCountByPlayer.get(b.id) ?? 0;
      if (cb !== ca) return cb - ca;
      if (a.back_number === CANONICAL) return -1;
      if (b.back_number === CANONICAL) return 1;
      return a.id.localeCompare(b.id);
    });

    const keeper = sorted[0]!;
    const duplicates = sorted.slice(1);
    mergedGroups++;

    if (keeper.back_number !== CANONICAL) {
      await admin.from('players').update({ back_number: CANONICAL }).eq('id', keeper.id);
    }

    for (const dup of duplicates) {
      const { data: updated, error: upErr } = await admin
        .from('stats_logs')
        .update({ player_id: keeper.id })
        .eq('player_id', dup.id)
        .select('id');
      if (upErr) throw upErr;
      logsMoved += updated?.length ?? 0;

      const { error: delErr } = await admin.from('players').delete().eq('id', dup.id);
      if (delErr) throw delErr;
      playersRemoved++;
      console.log(`Merged ${dup.back_number} (${dup.id}) → ${CANONICAL} (${keeper.id}), game ${dup.game_id}`);
    }
  }

  const { data: userTeams, error: utErr } = await admin
    .from('user_teams')
    .select('id, back_numbers')
    .eq('user_id', user.id);
  if (utErr) throw utErr;

  for (const row of userTeams ?? []) {
    const nums = Array.isArray(row.back_numbers) ? (row.back_numbers as string[]) : [];
    const normalized = [...new Set(nums.map((n) => normalizeBackNumber(String(n))))];
    if (JSON.stringify(nums) !== JSON.stringify(normalized)) {
      await admin.from('user_teams').update({ back_numbers: normalized }).eq('id', row.id);
      console.log(`Updated user_team ${row.id} back_numbers`);
    }
  }

  console.log('Done.', { mergedGroups, logsMoved, playersRemoved });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
