// =============================================================================
// TIPOS CENTRAIS DO DOMÍNIO — Single Source of Truth
// =============================================================================

/** Resultado oficial de uma partida */
export interface Result {
  match_id: string;
  home_score: number;
  away_score: number;
}

/** Palpite de um usuário para uma partida */
export interface Prediction {
  id?: string;
  league_id: string;
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
}

/** Perfil de usuário (tabela `users`) */
export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  photo_url: string;
  approved: boolean;
  has_license: boolean;
  max_participants_allowed: number;
  max_leagues_allowed: number;
  plan_type: string | null;
  last_login: string;
  created_at: string;
}

/** Liga */
export interface League {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at?: string;
}

/** Membro de uma liga (join de league_members → users) */
export interface LeagueMember {
  user_id: string;
  users: Pick<UserProfile, 'id' | 'email' | 'display_name' | 'photo_url'>;
}

/** Linha do ranking */
export interface UserRanking {
  id: string;
  name: string;
  photo: string;
  points: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  isOwner?: boolean;
  /** Resultado do palpite na última partida atualizada */
  lastMatchResult: 'exact' | 'winner' | 'miss' | 'none';
  lastMatchPrediction?: { home: number; away: number } | null;
  exactCount: number;
  winnerCount: number;
  missCount: number;
  knockoutTeamsPoints: number;
}

/** Mapa de resultados indexados por match_id */
export type ResultsMap = Record<string, { home: number; away: number }>;

/** Mapa de palpites indexados por userId → matchId */
export type PredictionsMap = Record<string, Record<string, { home: number; away: number }>>;

/** Input normalizado para cálculo de pontos */
export interface GameResult {
  homeScore: number;
  awayScore: number;
}
