import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { calculatePoints, getKnockoutTeam, getUserKnockoutTeam } from '../lib/scoring';
import { WORLD_CUP_2026_ROUNDS } from '../lib/matches';
import { KNOCKOUT_MATCHES } from '../lib/knockout';
import type { UserRanking, ResultsMap, PredictionsMap, LeagueMember } from '../lib/types';


/**
 * Hook que encapsula todo o fetching e cálculo do ranking da liga atual.
 * Expõe rankings tipados, o nome da liga e o estado de carregamento.
 */
export function useRanking(leagueId: string | null) {
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [leagueName, setLeagueName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!leagueId || leagueId === 'null' || leagueId === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      // 1. Resultados oficiais
      const { data: resultsData } = await supabase.from('results').select('match_id, home_score, away_score, penalty_winner');
      const resultsMap: Record<string, { home: number; away: number; penalty_winner?: string }> = {};
      resultsData?.forEach((r: any) => {
        resultsMap[r.match_id] = { home: r.home_score, away: r.away_score, penalty_winner: r.penalty_winner || undefined };
      });

      // 2. Nome da liga
      const { data: leagueData } = await supabase
        .from('leagues')
        .select('name')
        .eq('id', leagueId)
        .maybeSingle();
      if (leagueData) setLeagueName(leagueData.name);

      // 3. Membros + perfis (join direto — sem buscar todos os usuários)
      const { data: membersData } = await supabase
        .from('league_members')
        .select('user_id, users(id, email, display_name, photo_url)')
        .eq('league_id', leagueId);

      // 4. Palpites da liga (filtrado por league_id — não busca toda a tabela)
      let allPredsData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('predictions')
          .select('user_id, match_id, home_score, away_score, penalty_winner')
          .eq('league_id', leagueId)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error || !data) {
          hasMore = false;
        } else {
          allPredsData = [...allPredsData, ...data];
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }

      // Fallback para a Liga Demo caso o banco esteja vazio
      let finalMembers = (membersData as unknown as LeagueMember[]) ?? [];
      const isDemo = leagueId === '99999999-9999-9999-9999-999999999999';
      
      if (isDemo && finalMembers.length === 0) {
        finalMembers = [
          { user_id: 'd1', users: { id: 'd1', display_name: 'Carlos Silva', photo_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Carlos' } },
          { user_id: 'd2', users: { id: 'd2', display_name: 'Marina Ruy', photo_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Marina' } },
          { user_id: 'd3', users: { id: 'd3', display_name: 'Roberto Baggio', photo_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Roberto' } },
          { user_id: 'd4', users: { id: 'd4', display_name: 'Ana Clara', photo_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ana' } },
          { user_id: 'd5', users: { id: 'd5', display_name: 'Bruno Gagliasso', photo_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Bruno' } }
        ] as any;
      }

      const allPredictions: Record<string, Record<string, { home: number; away: number; penalty_winner?: string }>> = {};
      allPredsData.forEach(p => {
        if (!allPredictions[p.user_id]) allPredictions[p.user_id] = {};
        allPredictions[p.user_id][p.match_id] = { home: p.home_score, away: p.away_score, penalty_winner: p.penalty_winner || undefined };
      });

      // Mock predictions for demo fallback
      if (isDemo && Object.keys(allPredictions).length === 0) {
        allPredictions['d1'] = { 'g1-1': { home: 2, away: 0 }, 'g1-2': { home: 1, away: 1 } };
        allPredictions['d2'] = { 'g1-1': { home: 1, away: 0 }, 'g1-2': { home: 2, away: 2 } };
        allPredictions['d3'] = { 'g1-1': { home: 0, away: 0 }, 'g1-2': { home: 1, away: 1 } };
        allPredictions['d4'] = { 'g1-1': { home: 2, away: 1 }, 'g1-2': { home: 0, away: 0 } };
      }

      const finalResultsMap = { ...resultsMap };
      if (isDemo && Object.keys(finalResultsMap).length === 0) {
        finalResultsMap['g1-1'] = { home: 2, away: 0 };
        finalResultsMap['g1-2'] = { home: 1, away: 1 };
      }

      // Encontrar a última partida finalizada com base na data e hora dos jogos (calendário oficial)
      let lastUpdatedMatchId: string | null = null;
      let maxMatchDateTime = 0;

      const groupMatches = WORLD_CUP_2026_ROUNDS.flatMap(r => r.matches);
      const knockoutMatches = KNOCKOUT_MATCHES;
      const allMatches = [...groupMatches, ...knockoutMatches];

      allMatches.forEach(match => {
        if (finalResultsMap[match.id]) {
          const matchDateTime = new Date(`${match.date}T${match.time}`).getTime();
          if (matchDateTime > maxMatchDateTime) {
            maxMatchDateTime = matchDateTime;
            lastUpdatedMatchId = match.id;
          }
        }
      });

      // Se for a liga Demo e não achou no calendário oficial, pega a última da demo
      if (isDemo && !lastUpdatedMatchId) {
        lastUpdatedMatchId = 'g1-2';
      }

      // 5. Cálculo de pontos + tendência
      const rankingList: UserRanking[] = finalMembers.map(member => {
        const profile = member.users;
        const userId = profile.id;
        const userPreds = allPredictions[userId] ?? {};

        let totalPoints = 0;
        let prevPoints = 0;
        let exactCount = 0;
        let winnerCount = 0;
        let missCount = 0;

        Object.entries(userPreds).forEach(([matchId, pred]) => {
          // Zera a fase de grupos: só processa pontos se o jogo pertencer ao mata-mata (IDs que começam com M, O, Q, S, F)
          const isKnockoutMatch = isNaN(Number(matchId));
          if (!isKnockoutMatch) return;

          const result = finalResultsMap[matchId];
          if (result) {
            const pts = calculatePoints(
              { homeScore: pred.home, awayScore: pred.away },
              { homeScore: result.home, awayScore: result.away }
            );
            totalPoints += pts;
            
            if (pts === 3) exactCount++;
            else if (pts === 1) winnerCount++;
            else missCount++;

            if (matchId !== lastUpdatedMatchId) {
              prevPoints += pts;
            }
          }
        });

        // =====================================================================
        // PONTO EXTRA POR TIME ACERTADO NO CHAVEAMENTO DO MATA-MATA
        // Para cada jogo de Oitavas, Quartas, Semis e Finais:
        // Se o usuário previu o time correto que avançou para aquela vaga (independente
        // de ter acertado o placar do jogo anterior), ele ganha 1 ponto extra.
        // =====================================================================
        const KNOCKOUT_STAGES = ['Oitavas', 'Quartas', 'Semifinais', 'Final'];
        KNOCKOUT_MATCHES.forEach(m => {
          if (KNOCKOUT_STAGES.includes(m.phase)) {
            // 1. Time oficial que de fato chegou e jogou nessa vaga (home/away)
            const officialHome = m.homeTeam || getKnockoutTeam(m.homePlaceholder, finalResultsMap, KNOCKOUT_MATCHES);
            const officialAway = m.awayTeam || getKnockoutTeam(m.awayPlaceholder, finalResultsMap, KNOCKOUT_MATCHES);

            // 2. Time que o usuário projetou no seu chaveamento baseado em palpites
            const userHome = m.homeTeam || getUserKnockoutTeam(m.homePlaceholder, userPreds, KNOCKOUT_MATCHES);
            const userAway = m.awayTeam || getUserKnockoutTeam(m.awayPlaceholder, userPreds, KNOCKOUT_MATCHES);

            // Valida se o nó é válido (não é placeholder temporário não resolvido)
            const hasOfficialHome = officialHome && !officialHome.startsWith('Vencedor') && !officialHome.startsWith('Perdedor');
            const hasOfficialAway = officialAway && !officialAway.startsWith('Vencedor') && !officialAway.startsWith('Perdedor');
            const hasUserHome = userHome && !userHome.startsWith('Vencedor') && !userHome.startsWith('Perdedor');
            const hasUserAway = userAway && !userAway.startsWith('Vencedor') && !userAway.startsWith('Perdedor');

            if (hasOfficialHome && hasUserHome && userHome === officialHome) {
              totalPoints += 1;
            }
            if (hasOfficialAway && hasUserAway && userAway === officialAway) {
              totalPoints += 1;
            }
          }
        });

        // Determina resultado do palpite na última partida atualizada
        let lastMatchResult: 'exact' | 'winner' | 'miss' | 'none' = 'none';
        let lastMatchPrediction: { home: number; away: number } | null = null;
        if (lastUpdatedMatchId) {
          const lastPred = userPreds[lastUpdatedMatchId];
          const lastResult = finalResultsMap[lastUpdatedMatchId];
          if (lastPred && lastResult) {
            lastMatchPrediction = { home: lastPred.home, away: lastPred.away };
            const pts = calculatePoints(
              { homeScore: lastPred.home, awayScore: lastPred.away },
              { homeScore: lastResult.home, awayScore: lastResult.away }
            );
            if (pts === 3) lastMatchResult = 'exact';
            else if (pts === 1) lastMatchResult = 'winner';
            else lastMatchResult = 'miss';
          }
        }

        return {
          id: userId,
          name: profile.display_name || 'Competidor',
          photo: profile.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          points: totalPoints,
          trend: 'stable' as const,
          trendValue: 0,
          lastMatchResult,
          lastMatchPrediction,
          exactCount,
          winnerCount,
          missCount,
          prevPoints, // campo temporário para cálculo da tendência
        };
      });

      rankingList.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return a.name.localeCompare(b.name);
      });

      // Calcula tendência comparando a classificação atual com a classificação sem o último jogo
      if (lastUpdatedMatchId) {
        const prevRankingList = rankingList.map(p => ({
          id: p.id,
          name: p.name,
          points: (p as any).prevPoints,
        }));

        prevRankingList.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return a.name.localeCompare(b.name);
        });

        const prevPositions: Record<string, number> = {};
        prevRankingList.forEach((player, posIndex) => {
          prevPositions[player.id] = posIndex;
        });

        rankingList.forEach((player, currentPos) => {
          const prevPos = prevPositions[player.id];
          if (prevPos !== undefined) {
            const diff = prevPos - currentPos; // positivo = subiu
            if (diff > 0) {
              player.trend = 'up';
              player.trendValue = diff;
            } else if (diff < 0) {
              player.trend = 'down';
              player.trendValue = Math.abs(diff);
            } else {
              player.trend = 'stable';
              player.trendValue = 0;
            }
          }
        });
      }

      // Limpa a propriedade temporária prevPoints
      rankingList.forEach(p => {
        delete (p as any).prevPoints;
      });

      setRankings(rankingList);
    } catch (error) {
      console.error('useRanking — fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    fetchData();

    const resultsSub = (supabase
      .channel('ranking_results') as any)
      .on('postgres_changes', { event: '*', table: 'results' }, fetchData)
      .subscribe();

    const predsSub = (supabase
      .channel('ranking_preds') as any)
      .on('postgres_changes', {
        event: '*',
        table: 'predictions',
        filter: `league_id=eq.${leagueId}`,
      }, fetchData)
      .subscribe();

    return () => {
      resultsSub.unsubscribe();
      predsSub.unsubscribe();
    };
  }, [fetchData, leagueId]);

  return { rankings, leagueName, loading };
}
