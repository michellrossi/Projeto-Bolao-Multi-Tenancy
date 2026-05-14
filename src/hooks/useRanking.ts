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
        .maybeSingle();
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

      // Fallback para a Liga Demo caso o banco esteja vazio
      let finalMembers = membersData as LeagueMember[] ?? [];
      if (leagueId === '99999999-9999-9999-9999-999999999999' && finalMembers.length === 0) {
        finalMembers = [
          { user_id: 'd1', users: { id: 'd1', display_name: 'Carlos Silva', photo_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Carlos' } },
          { user_id: 'd2', users: { id: 'd2', display_name: 'Marina Ruy', photo_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Marina' } },
          { user_id: 'd3', users: { id: 'd3', display_name: 'Roberto Baggio', photo_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Roberto' } },
          { user_id: 'd4', users: { id: 'd4', display_name: 'Ana Clara', photo_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ana' } },
          { user_id: 'd5', users: { id: 'd5', display_name: 'Bruno Gagliasso', photo_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Bruno' } }
        ] as any;
      }

      const allPredictions: PredictionsMap = {};
      predsData?.forEach(p => {
        if (!allPredictions[p.user_id]) allPredictions[p.user_id] = {};
        allPredictions[p.user_id][p.match_id] = { home: p.home_score, away: p.away_score };
      });

      // 5. Cálculo de pontos + tendência
      const rankingList: UserRanking[] = finalMembers.map(member => {
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
          trend: 'stable' as const,
          trendValue: 0,
        };
      });

      rankingList.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return a.name.localeCompare(b.name);
      });

      // Calcula tendência comparando com snapshot anterior (localStorage)
      const snapshotKey = `ranking_snapshot_${leagueId}`;
      const prevSnapshotRaw = localStorage.getItem(snapshotKey);
      if (prevSnapshotRaw) {
        const prevPositions: Record<string, number> = JSON.parse(prevSnapshotRaw);
        rankingList.forEach((player, currentPos) => {
          const prevPos = prevPositions[player.id];
          if (prevPos === undefined) return;
          const diff = prevPos - currentPos; // positivo = subiu
          if (diff > 0) {
            player.trend = 'up';
            player.trendValue = diff;
          } else if (diff < 0) {
            player.trend = 'down';
            player.trendValue = Math.abs(diff);
          }
        });
      }

      // Salva snapshot atual para próxima comparação
      const newSnapshot: Record<string, number> = {};
      rankingList.forEach((p, i) => { newSnapshot[p.id] = i; });
      localStorage.setItem(snapshotKey, JSON.stringify(newSnapshot));

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
