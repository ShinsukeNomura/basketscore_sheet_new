// ============================================================
// 基本ドメイン型
// ============================================================

export type Period = 1 | 2 | 3 | 4;
export type GameStatus = 'progress' | 'finished';

export type ActionType =
  | '2PT_MADE' | '2PT_MISS'
  | '3PT_MADE' | '3PT_MISS'
  | 'FT_MADE'  | 'FT_MISS'
  | 'ORBD' | 'DRBD' | 'AST' | 'STL' | 'BLK' | 'TOV' | 'FOUL';

// ============================================================
// データベースエンティティ
// ============================================================

export interface Game {
  id:             string;
  game_name:      string;
  date:           string;
  status:         GameStatus;
  current_period: Period;
  created_at:     string;
}

export interface Team {
  id:         string;
  game_id:    string;
  team_name:  string;
  is_ours:    boolean;
  color:      string;   // JerseyColorId ('white' | 'navy' | 'red' …)
  created_at: string;
}

export interface Player {
  id:          string;
  team_id:     string;
  back_number: string;
  name:        string;
  is_on_court: boolean;
  created_at:  string;
}

export interface StatsLog {
  id:          string;
  game_id:     string;
  team_id:     string;
  player_id:   string | null;
  period:      Period;
  timestamp:   string;
  action_type: ActionType;
  points:      number;
  is_deleted:  boolean;
  created_at:  string;
  /** 連動ログのグループID。STL と自動生成 TOV は同じ link_id を持つ */
  link_id?:    string;
  /** true = STL に連動して自動生成された TOV など */
  is_auto?:    boolean;
}

/** タイムライン表示用エントリ（primary + 連動ログを1セットに束ねる） */
export interface TimelineEntry {
  primary: StatsLog;
  linked:  StatsLog[];   // is_auto=true の連動ログ群
}

// ============================================================
// UI / 状態管理用
// ============================================================

/** スタッツボタン1つの定義 */
export interface StatDef {
  action:    ActionType;
  label:     string;      // 表示ラベル（日本語略称）
  points:    number;      // 加算ポイント（失敗系は0）
  variant:   'made' | 'miss' | 'neutral' | 'negative';
  color:     string;      // Tailwind bg クラス
  textColor: string;      // Tailwind text クラス
}

/** ゲーム全体の集約ビュー */
export interface GameView {
  game:        Game;
  ourTeam:     Team;
  theirTeam:   Team;
  allPlayers:  Player[];
  logs:        StatsLog[];
}

/** プレイヤーごとの集計 */
export interface PlayerStats {
  playerId: string;
  fouls:    number;
  points:   number;
}

/** ホーム画面一覧用のサマリー */
export interface GameSummary {
  id:           string;
  game_name:    string;
  date:         string;
  status:       GameStatus;
  ourTeamName:  string;
  theirTeamName:string;
  ourScore:     number;
  theirScore:   number;
}

/** localStorage に保存するゲーム本体データ */
export interface PersistedGameState {
  game:       Game;
  ourTeam:    Team;
  theirTeam:  Team;
  allPlayers: Player[];
  logs:       StatsLog[];
}

// ============================================================
// Supabase Database 型 (generated types の簡易版)
// ============================================================

export type Database = {
  public: {
    Tables: {
      games:      { Row: Game;      Insert: Omit<Game, 'id' | 'created_at'>;      Update: Partial<Omit<Game, 'id'>> };
      teams:      { Row: Team;      Insert: Omit<Team, 'id' | 'created_at'>;      Update: Partial<Omit<Team, 'id'>> };
      players:    { Row: Player;    Insert: Omit<Player, 'id' | 'created_at'>;    Update: Partial<Omit<Player, 'id'>> };
      stats_logs: { Row: StatsLog;  Insert: Omit<StatsLog, 'id' | 'created_at'>; Update: Partial<Omit<StatsLog, 'id'>> };
    };
  };
};
