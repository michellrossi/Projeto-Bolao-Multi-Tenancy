import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { calculatePoints } from '../lib/scoring';
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
      const { data: resultsData } = await supabase.from('results').select('match_id, home_score, away_score');
      const resultsMap: ResultsMap = {};
      resultsData?.forEach(r => {
        resultsMap[r.match_id] = { home: r.home_score, away: r.away_score };
      });

      // 2. Nome da liga
      const { data: leagueData } = await supabase
        .from('leagues')
        .select('name')
        .eq('id', leagueId)
        .single();
      if (leagueData) setLeagueName(leagueData.name);

      // 3. Membros + perfis (join direto — sem buscar todos os usuários)
      const { data: membersData } = await supabase
        .from('league_members')
        .select('user_id, users(id, email, display_name, photo_url)')
        .eq('league_id', leagueId);

      // 4. Palpites da liga (filtrado por league_id — não busca toda a tabela)
      const { data: predsData } = await supabase
        .from('predictions')
        .select('user_id, match_id, home_score, away_score')
        .eq('league_id', leagueId);

      const allPredictions: PredictionsMap = {};
      predsData?.forEach(p => {
        if (!allPredictions[p.user_id]) allPredictions[p.user_id] = {};
        allPredictions[p.user_id][p.match_id] = { home: p.home_score, away: p.away_score };
      });

      // 5. Cálculo de pontos (inevitável no cliente por ora; escalável via SQL View/Edge Function)
      const rankingList: UserRanking[] = (membersData as LeagueMember[] ?? []).map(member => {
        const profile = member.users;
        const userId = profile.id;
        const userPreds = allPredictions[userId] ?? {};

        let totalPoints = 0;
        Object.entries(userPreds).forEach(([matchId, pred]) => {
          const result = resultsMap[matchId];
          if (result) {
            totalPoints += calculatePoints(
              { homeScore: pred.home, awayScore: pred.away },
              { homeScore: result.home, awayScore: result.away }
            );
          }
        });

        return {
          id: userId,
          name: profile.display_name || 'Competidor',
          photo: profile.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          points: totalPoints,
          trend: 'stable',
          trendValue: 0,
        };
      });

      rankingList.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return a.name.localeCompare(b.name);
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

    const resultsSub = supabase
      .channel('ranking_results')
      .on('postgres_changes', { event: '*', table: 'results' }, fetchData)
      .subscribe();

    const predsSub = supabase
      .channel('ranking_preds')
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
