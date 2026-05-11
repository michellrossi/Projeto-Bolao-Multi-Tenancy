import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useLeague } from '../hooks/useLeague';
import { calculatePoints } from '../lib/scoring';
import { Trophy, TrendingUp, TrendingDown, Minus, Crown } from 'lucide-react';

interface UserRanking {
  id: string;
  name: string;
  photo: string;
  points: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  isOwner?: boolean;
}

export default function RankingPage() {
  const { user: currentUser } = useAuth();
  const currentLeagueId = localStorage.getItem('currentLeagueId');
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [leagueName, setLeagueName] = useState('');

  useEffect(() => {
    const hasValidLeague = !!currentLeagueId && currentLeagueId !== 'null' && currentLeagueId !== 'undefined';
    if (!hasValidLeague) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // 1. Fetch Results
        const { data: resultsData } = await supabase.from('results').select('*');
        const resultsMap: any = {};
        resultsData?.forEach(r => resultsMap[r.match_id] = { home: r.home_score, away: r.away_score });

        // 2. Fetch League Name
        const { data: leagueData } = await supabase
          .from('leagues')
          .select('name')
          .eq('id', currentLeagueId)
          .single();
        if (leagueData) setLeagueName(leagueData.name);

        // 3. Fetch Members and their Profiles
        const { data: membersData } = await supabase
          .from('league_members')
          .select('user_id, users(id, email, display_name, photo_url)')
          .eq('league_id', currentLeagueId);

        // 4. Fetch All Predictions for this League
        const { data: predsData } = await supabase
          .from('predictions')
          .select('*')
          .eq('league_id', currentLeagueId);

        const allPredictions: any = {};
        predsData?.forEach(p => {
          if (!allPredictions[p.user_id]) allPredictions[p.user_id] = {};
          allPredictions[p.user_id][p.match_id] = { home: p.home_score, away: p.away_score };
        });

        // 5. Calculate Rankings
        const rankingList: UserRanking[] = (membersData || []).map((member: any) => {
          const profile = member.users;
          const userId = profile.id;
          const userPreds = allPredictions[userId] || {};

          let totalPoints = 0;
          Object.entries(userPreds).forEach(([matchId, pred]: any) => {
            const result = resultsMap[matchId];
            if (result) {
              totalPoints += calculatePoints(
                { homeScore: Number(pred.home), awayScore: Number(pred.away) },
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
            trendValue: 0
          };
        });

        // Sort by points (DESC) then by name (ASC) as tie-breaker
        rankingList.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return a.name.localeCompare(b.name);
        });

        setRankings(rankingList);
      } catch (error) {
        console.error("Error fetching rankings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Setup real-time listeners
    const resultsSub = supabase.channel('ranking_results').on('postgres_changes', { event: '*', table: 'results' }, fetchData).subscribe();
    const predsSub = supabase.channel('ranking_preds').on('postgres_changes', { event: '*', table: 'predictions', filter: `league_id=eq.${currentLeagueId}` }, fetchData).subscribe();

    return () => {
      resultsSub.unsubscribe();
      predsSub.unsubscribe();
    };
  }, [currentUser, currentLeagueId]);

if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

const top3 = rankings.slice(0, 3);
const others = rankings.slice(3);

return (
  <div className="space-y-12 pb-20 animate-in fade-in duration-700">
    {/* Header Section */}
    <div className="text-center space-y-2">
      <h1 className="text-4xl font-black text-primary font-lexend tracking-tighter uppercase">
        Ranking <span className="text-white">{leagueName || 'da Liga'}</span>
      </h1>
      <p className="text-white/40 font-medium">Os melhores competidores do seu grupo</p>
    </div>

    {/* Podium UI */}
    <div className="flex items-end justify-center gap-2 md:gap-8 pt-12 pb-8">
      {/* 2nd Place */}
      {top3[1] && (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-white/10 overflow-hidden shadow-2xl">
              <img src={top3[1].photo} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#adb5bd] text-dark font-black rounded-full border-2 border-dark flex items-center justify-center text-sm">
              2
            </div>
          </div>
          <div className="glass-dark p-4 rounded-2xl w-28 text-center border-white/5">
            <p className="text-[10px] font-bold text-white/60 truncate">
              {top3[1].name} {top3[1].isOwner && "(ADM)"}
            </p>
            <p className="text-sm font-black text-primary">{top3[1].points} pts</p>
          </div>
        </div>
      )}

      {/* 1st Place */}
      {top3[0] && (
        <div className="flex flex-col items-center gap-4 -translate-y-8">
          <div className="relative">
            <div className="w-28 h-28 rounded-full border-4 border-primary overflow-hidden shadow-[0_0_40px_rgba(0,255,133,0.3)]">
              <img src={top3[0].photo} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-primary">
              <Crown size={32} className="fill-primary" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-dark font-black rounded-full border-2 border-dark flex items-center justify-center text-lg glow-primary">
              1
            </div>
          </div>
          <div className="glass-dark p-6 rounded-[2rem] w-36 text-center border-primary/20 bg-primary/5">
            <p className="text-xs font-bold text-primary truncate">
              {top3[0].name} {top3[0].isOwner && "(ADM)"}
            </p>
            <p className="text-xl font-black text-white">{top3[0].points} pts</p>
          </div>
        </div>
      )}

      {/* 3rd Place */}
      {top3[2] && (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-white/10 overflow-hidden shadow-2xl">
              <img src={top3[2].photo} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#cd7f32] text-dark font-black rounded-full border-2 border-dark flex items-center justify-center text-sm">
              3
            </div>
          </div>
          <div className="glass-dark p-4 rounded-2xl w-28 text-center border-white/5">
            <p className="text-[10px] font-bold text-white/60 truncate">
              {top3[2].name} {top3[2].isOwner && "(ADM)"}
            </p>
            <p className="text-sm font-black text-secondary">{top3[2].points} pts</p>
          </div>
        </div>
      )}
    </div>

    {/* Full Ranking List */}
    <div className="space-y-6">
      <div className="flex justify-between items-end px-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Classificação Geral</h2>
        <span className="text-[10px] font-medium text-white/20">Atualizado agora</span>
      </div>

      <div className="space-y-3 px-2">
        {rankings.length > 0 ? (
          rankings.map((player, index) => {
            const isCurrentUser = player.id === currentUser?.id;
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                    relative flex items-center justify-between p-4 rounded-2xl border transition-all
                    ${isCurrentUser ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(0,255,133,0.1)]' : 'glass-dark border-white/5 hover:bg-white/[0.03]'}
                  `}
              >
                <div className="flex items-center gap-4">
                  <span className={`w-8 text-sm font-black ${isCurrentUser ? 'text-primary' : 'text-white/40'}`}>
                    {index + 1}º
                  </span>
                  <div className="relative">
                    <img src={player.photo} className="w-10 h-10 rounded-full object-cover" alt="" />
                    {isCurrentUser && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-dark" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-white">
                        {player.name} {player.isOwner && <span className="text-primary ml-1 text-[10px]">(ADM)</span>}
                      </p>
                      {isCurrentUser && (
                        <span className="text-[8px] font-black bg-primary text-dark px-1.5 py-0.5 rounded uppercase">Você</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {player.trend === 'up' ? (
                        <div className="flex items-center gap-1 text-[9px] font-black text-primary uppercase">
                          <TrendingUp size={10} /> Subiu {player.trendValue} {player.trendValue === 1 ? 'posição' : 'posições'}
                        </div>
                      ) : player.trend === 'down' ? (
                        <div className="flex items-center gap-1 text-[9px] font-black text-red-500 uppercase">
                          <TrendingDown size={10} /> Caiu {player.trendValue} {player.trendValue === 1 ? 'posição' : 'posições'}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[9px] font-black text-white/50 uppercase">
                          <Minus size={10} /> Manteve posição
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-lg font-black ${isCurrentUser ? 'text-primary' : 'text-white'}`}>{player.points}</p>
                  <p className="text-[8px] font-black text-white/60 uppercase tracking-widest">Pontos</p>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-20 glass-dark rounded-[3rem] border-white/5 space-y-4">
            <Trophy className="w-12 h-12 text-white/5 mx-auto" />
            <p className="text-white/20 font-black uppercase tracking-widest">
              {(!currentLeagueId || currentLeagueId === 'null')
                ? 'Selecione uma liga para ver o ranking'
                : 'Nenhum palpite registrado ainda'}
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
);
}
