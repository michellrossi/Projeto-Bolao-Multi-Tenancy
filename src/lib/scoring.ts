import { WORLD_CUP_2026_ROUNDS, Match } from './matches';
import { WORLD_CUP_2026_GROUPS } from './groups';

export interface GameResult {
  homeScore: number;
  awayScore: number;
}

export interface TeamStats {
  name: string;
  group: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export function calculatePoints(prediction: GameResult, official: GameResult): number {
  const predHome = prediction.homeScore;
  const predAway = prediction.awayScore;
  const offHome = official.homeScore;
  const offAway = official.awayScore;

  if (predHome === offHome && predAway === offAway) return 3;

  const predResult = Math.sign(predHome - predAway);
  const offResult = Math.sign(offHome - offAway);

  return predResult === offResult ? 1 : 0;
}

export function isMatchLocked(matchDate: string, matchTime: string, isGroupStage: boolean = false): boolean {
  const now = new Date();

  if (isGroupStage) {
    const firstMatch = WORLD_CUP_2026_ROUNDS[0].matches[0];
    const targetDateTime = new Date(`${firstMatch.date}T${firstMatch.time}`);
    const LOCK_TIME = 30 * 60 * 1000;
    return (targetDateTime.getTime() - now.getTime()) <= LOCK_TIME;
  } else {
    const limitDateTime = new Date('2026-06-28T15:55:00');
    return now.getTime() >= limitDateTime.getTime();
  }
}

export function getGroupStandings(results: Record<string, GameResult>) {
  const allStats: Record<string, TeamStats> = {};
  
  // Initialize teams
  WORLD_CUP_2026_GROUPS.forEach(group => {
    group.teams.forEach(team => {
      allStats[team] = {
        name: team, group: group.id, points: 0, played: 0, wins: 0, draws: 0, losses: 0,
        goalsFor: 0, goalsAgainst: 0, goalDifference: 0
      };
    });
  });

  // Process matches
  const groupMatches = WORLD_CUP_2026_ROUNDS.flatMap(r => r.matches);
  groupMatches.forEach(match => {
    const res = results[match.id];
    if (res && allStats[match.homeTeam] && allStats[match.awayTeam]) {
      const h = res.homeScore;
      const a = res.awayScore;
      
      allStats[match.homeTeam].played++;
      allStats[match.awayTeam].played++;
      allStats[match.homeTeam].goalsFor += h;
      allStats[match.homeTeam].goalsAgainst += a;
      allStats[match.awayTeam].goalsFor += a;
      allStats[match.awayTeam].goalsAgainst += h;
      
      if (h > a) {
        allStats[match.homeTeam].points += 3;
        allStats[match.homeTeam].wins++;
        allStats[match.awayTeam].losses++;
      } else if (a > h) {
        allStats[match.awayTeam].points += 3;
        allStats[match.awayTeam].wins++;
        allStats[match.homeTeam].losses++;
      } else {
        allStats[match.homeTeam].points += 1;
        allStats[match.awayTeam].points += 1;
        allStats[match.homeTeam].draws++;
        allStats[match.awayTeam].draws++;
      }
      
      allStats[match.homeTeam].goalDifference = allStats[match.homeTeam].goalsFor - allStats[match.homeTeam].goalsAgainst;
      allStats[match.awayTeam].goalDifference = allStats[match.awayTeam].goalsFor - allStats[match.awayTeam].goalsAgainst;
    }
  });

  // Group by group and sort
  const standingsByGroup: Record<string, TeamStats[]> = {};
  WORLD_CUP_2026_GROUPS.forEach(group => {
    standingsByGroup[group.id] = group.teams
      .map(t => allStats[t])
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.wins - a.wins;
      });
  });

  return standingsByGroup;
}

export function getKnockoutTeam(
  placeholder: string,
  results: Record<string, { home: number; away: number; penalty_winner?: string }>,
  knockoutMatches: any[]
): string {
  if (!placeholder) return '';

  // 1. Vencedor de um jogo anterior
  const winnerMatch = placeholder.match(/Vencedor (?:Jogo )?([M-QF1-3]+)/i);
  if (winnerMatch) {
    const prevMatchId = winnerMatch[1];
    const prevMatch = knockoutMatches.find(m => m.id === prevMatchId);
    if (!prevMatch) return placeholder;

    const res = results[prevMatchId];
    if (!res) return placeholder; // Sem resultado ainda

    const homeTeamName = prevMatch.homeTeam || getKnockoutTeam(prevMatch.homePlaceholder, results, knockoutMatches);
    const awayTeamName = prevMatch.awayTeam || getKnockoutTeam(prevMatch.awayPlaceholder, results, knockoutMatches);

    if (res.home > res.away) {
      return homeTeamName;
    } else if (res.away > res.home) {
      return awayTeamName;
    } else {
      return res.penalty_winner || homeTeamName;
    }
  }

  // 2. Perdedor de um jogo anterior (Disputa de 3º lugar)
  const loserMatch = placeholder.match(/Perdedor (?:Semi )?([M-QF1-3]+)/i);
  if (loserMatch) {
    const prevMatchId = loserMatch[1];
    const prevMatch = knockoutMatches.find(m => m.id === prevMatchId);
    if (!prevMatch) return placeholder;

    const res = results[prevMatchId];
    if (!res) return placeholder;

    const homeTeamName = prevMatch.homeTeam || getKnockoutTeam(prevMatch.homePlaceholder, results, knockoutMatches);
    const awayTeamName = prevMatch.awayTeam || getKnockoutTeam(prevMatch.awayPlaceholder, results, knockoutMatches);

    if (res.home > res.away) {
      return awayTeamName;
    } else if (res.away > res.home) {
      return homeTeamName;
    } else {
      if (res.penalty_winner === homeTeamName) return awayTeamName;
      if (res.penalty_winner === awayTeamName) return homeTeamName;
      return awayTeamName;
    }
  }

  return placeholder;
}
