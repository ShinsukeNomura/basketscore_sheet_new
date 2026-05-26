// ============================================================
// 基本ドメイン型
// ============================================================

export type Period = 1 | 2 | 3 | 4 | 5 | 6; // 5=OT1, 6=OT2
export type GameStatus = 'progress' | 'finished';
/** 試合作成フォームの白/紺スロットのどちらをマイチームとするか */
export type MyTeamSide = 'white' | 'dark';

export type ActionType =
  | '2PT_MADE' | '2PT_MISS'
  | '3PT_MADE' | '3PT_MISS'
  | 'FT_MADE'  | 'FT_MISS'
  | 'ORBD' | 'DRBD' | 'AST' | 'STL' | 'BLK' | 'TOV' | 'FOUL';

// TOV モード（簡略=従来通り / 12-grid=詳細記録12分類）
export type TovMode = 'simple' | '12-grid';

// TOV 詳細理由（12分類）
export type TovReason =
  | 'steal'           // スチールされた（GDF）
  | 'bad-pass'        // パスミス / バッドパス（GDF）
  | 'traveling'       // トラベリング
  | 'offensive-foul'  // オフェンスファウル（GDF）
  | 'violation'       // 時間・その他違反（後方互換用）
  | 'lost-ball'       // ハンドリングミス
  | 'double-dribble'  // ダブルドリブル
  | 'out-of-bounds'   // アウトオブバウンズ
  | '24sec'           // 24秒違反
  | '8sec'            // 8秒違反
  | '5sec'            // 5秒違反（GDF）
  | 'backcourt'       // バックコート
  | '3sec'            // 3秒違反
  | 'other';          // その他

/** ファウルペナルティ（P / P1 / P2） */
export type FoulPenalty = 'P' | 'P1' | 'P2' | 'UT';

export type CourtLocation =
  | 'restricted'
  | 'paint-left'       | 'paint-right'
  | 'mid-left-corner'  | 'mid-left-wing'  | 'mid-center' | 'mid-right-wing' | 'mid-right-corner'
  | '3pt-left-corner'  | '3pt-left-wing'  | '3pt-center' | '3pt-right-wing' | '3pt-right-corner';

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
  /** スコア記載者名（任意） */
  scorekeeper?:   string;
  /** マイチーム（白 or 紺スロット）。未設定は白=マイチーム */
  my_team_side?: MyTeamSide;
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
  id:             string;
  game_id:        string;
  team_id:        string;
  player_id:      string | null;
  period:         Period;
  timestamp:      string;
  action_type:    ActionType;
  points:         number;
  is_deleted:     boolean;
  created_at:     string;
  /** 連動ログのグループID。STL と自動生成 TOV は同じ link_id を持つ */
  link_id?:       string;
  /** true = STL に連動して自動生成された TOV など */
  is_auto?:       boolean;
  /** シュートエリア（2PT/3PT系のみ。ヒートマップ分析用） */
  court_location?: CourtLocation;
  /** TOV 詳細理由（プレミアム機能）*/
  tov_reason?: TovReason;
  /** ファウル種別（P / P1 / P2） */
  foul_penalty?: FoulPenalty;
  /** 個人STLなしのチーム守備成功（右スワイプ） */
  team_defense?: boolean;
  /** チームTOV時の責任選手（分析用） */
  responsible_player_id?: string | null;
  /** チームTOVを生んだ守備側チーム（分析用） */
  defense_team_id?: string | null;
  /** 守備貢献イベント（good defense） */
  good_defense?: boolean;
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
  labels?:      string[];
  user_id?:     string;   // ゲーム作成者のユーザーID（未ログイン作成分は undefined）
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

// ============================================================
// 協力記録モード
// ============================================================

/** 作業員の担当スタッツ役割 */
export type CollabRole = 'pts' | 'reb' | 'tov' | 'def';

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
