import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useLeague } from '../hooks/useLeague';
import { useRanking } from '../hooks/useRanking';
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Target, Check, X } from 'lucide-react';
import type { UserRanking } from '../lib/types';

export default function RankingPage() {
  const { user: currentUser } = useAuth();
  const { currentLeagueId } = useLeague();
  const { rankings, leagueName, loading } = useRanking(currentLeagueId);

  if (loading) return (
    <div className="flex justify-center p-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  const top3 = rankings.slice(0, 3);

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black text-primary font-lexend tracking-tighter uppercase">
          Ranking <span className="text-white">{leagueName || 'da Liga'}</span>
        </h1>
        <p className="text-white/40 font-medium">Os melhores competidores do seu grupo</p>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-2 md:gap-8 pt-12 pb-8">
        {/* 2nd */}
        {top3[1] && <PodiumCard player={top3[1]} position={2} />}
        {/* 1st */}
        {top3[0] && <PodiumCard player={top3[0]} position={1} elevated />}
        {/* 3rd */}
        {top3[2] && <PodiumCard player={top3[2]} position={3} />}
      </div>

      {/* Premios */}
      <div className="max-w-xl mx-auto glass-dark p-6 rounded-[2rem] border border-white/5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="flex items-center gap-2 justify-center text-xs font-black uppercase tracking-[0.2em] text-white/40">
          <Trophy size={14} className="text-primary animate-pulse" /> Premiação da Liga
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1 p-3 rounded-2xl bg-primary/5 border border-primary/10">
            <p className="text-[9px] font-black uppercase text-primary tracking-wider">1º Lugar</p>
            <p className="text-sm md:text-base font-black text-white">R$ 702,00</p>
          </div>
          <div className="space-y-1 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">2º Lugar</p>
            <p className="text-sm md:text-base font-black text-white">R$ 292,50</p>
          </div>
          <div className="space-y-1 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">3º Lugar</p>
            <p className="text-sm md:text-base font-black text-white">R$ 175,50</p>
          </div>
        </div>
      </div>

      {/* Full List */}
      <div className="space-y-6">
        <div className="flex justify-between items-end px-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Classificação Geral</h2>
          <span className="text-[10px] font-medium text-white/20">Atualizado agora</span>
        </div>

        <div className="space-y-3 px-2">
          {rankings.length > 0 ? (
            rankings.map((player, index) => (
              <RankingRow
                key={player.id}
                player={player}
                index={index}
                isCurrentUser={player.id === currentUser?.id}
              />
            ))
          ) : (
            <div className="text-center py-20 glass-dark rounded-[3rem] border-white/5 space-y-4">
              <Trophy className="w-12 h-12 text-white/5 mx-auto" />
              <p className="text-white/20 font-black uppercase tracking-widest">
                {!currentLeagueId || currentLeagueId === 'null'
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

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function PodiumCard({
  player,
  position,
  elevated = false,
}: {
  player: UserRanking;
  position: number;
  elevated?: boolean;
}) {
  const medals: Record<number, { bg: string; size: string; border: string }> = {
    1: { bg: 'bg-primary', size: 'w-28 h-28', border: 'border-primary' },
    2: { bg: 'bg-[#adb5bd]', size: 'w-20 h-20', border: 'border-white/10' },
    3: { bg: 'bg-[#cd7f32]', size: 'w-20 h-20', border: 'border-white/10' },
  };
  const m = medals[position];

  return (
    <div className={`flex flex-col items-center gap-4 ${elevated ? '-translate-y-8' : ''}`}>
      <div className="relative">
        <div className={`${m.size} rounded-full border-4 ${m.border} overflow-hidden shadow-2xl`}>
          <img src={player.photo} className="w-full h-full object-cover" alt="" />
        </div>
        {position === 1 && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-primary">
            <Crown size={32} className="fill-primary" />
          </div>
        )}
        <div className={`absolute -bottom-2 -right-2 ${position === 1 ? 'w-10 h-10 text-lg glow-primary' : 'w-8 h-8 text-sm'} ${m.bg} text-dark font-black rounded-full border-2 border-dark flex items-center justify-center`}>
          {position}
        </div>
      </div>
      <div className={`glass-dark ${position === 1 ? 'p-6 rounded-[2rem] w-36 border-primary/20 bg-primary/5' : 'p-4 rounded-2xl w-28 border-white/5'} text-center`}>
        <p className={`${position === 1 ? 'text-xs text-primary' : 'text-[10px] text-white/60'} font-bold truncate`}>
          {player.name} {player.isOwner && '(ADM)'}
        </p>
        <p className={`${position === 1 ? 'text-xl text-white' : 'text-sm text-primary'} font-black`}>
          {player.points} pts
        </p>
      </div>
    </div>
  );
}

function RankingRow({
  player,
  index,
  isCurrentUser,
}: {
  player: UserRanking;
  index: number;
  isCurrentUser: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all ${
        isCurrentUser
          ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(0,255,133,0.1)]'
          : 'glass-dark border-white/5 hover:bg-white/[0.03]'
      }`}
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
              {player.name}{' '}
              {player.isOwner && <span className="text-primary ml-1 text-[10px]">(ADM)</span>}
            </p>
            {isCurrentUser && (
              <span className="text-[8px] font-black bg-primary text-dark px-1.5 py-0.5 rounded uppercase">
                Você
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <TrendIndicator trend={player.trend} value={player.trendValue} />
            <LastMatchBadge result={player.lastMatchResult} />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10 uppercase tracking-wider">
              <Target size={10} /> {player.exactCount} {player.exactCount === 1 ? 'Cravada' : 'Cravadas'}
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-black text-yellow-400 bg-yellow-400/5 px-2 py-0.5 rounded-full border border-yellow-400/10 uppercase tracking-wider">
              <Check size={10} /> {player.winnerCount} {player.winnerCount === 1 ? 'Acertou Vencedor' : 'Acertou Vencedor'}
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-black text-red-400 bg-red-400/5 px-2 py-0.5 rounded-full border border-red-400/10 uppercase tracking-wider">
              <X size={10} /> {player.missCount} {player.missCount === 1 ? 'Não Acertou' : 'Não Acertou'}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-lg font-black ${isCurrentUser ? 'text-primary' : 'text-white'}`}>
          {player.points}
        </p>
        <p className="text-[8px] font-black text-white/60 uppercase tracking-widest">Pontos</p>
      </div>
    </motion.div>
  );
}

function TrendIndicator({ trend, value }: { trend: UserRanking['trend']; value: number }) {
  if (trend === 'up') {
    return (
      <div className="flex items-center gap-1 text-[9px] font-black text-primary uppercase">
        <TrendingUp size={10} /> Subiu {value} {value === 1 ? 'posição' : 'posições'}
      </div>
    );
  }
  if (trend === 'down') {
    return (
      <div className="flex items-center gap-1 text-[9px] font-black text-red-500 uppercase">
        <TrendingDown size={10} /> Caiu {value} {value === 1 ? 'posição' : 'posições'}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-[9px] font-black text-white/50 uppercase">
      <Minus size={10} /> Manteve posição
    </div>
  );
}

function LastMatchBadge({ result }: { result: UserRanking['lastMatchResult'] }) {
  if (result === 'none') return null;

  const config = {
    exact: {
      icon: <Target size={10} />,
      label: 'Cravou Placar',
      className: 'text-primary bg-primary/10 border-primary/20',
    },
    winner: {
      icon: <Check size={10} />,
      label: 'Acertou Vencedor',
      className: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    },
    miss: {
      icon: <X size={10} />,
      label: 'Não Acertou',
      className: 'text-red-400 bg-red-400/10 border-red-400/20',
    },
  };

  const c = config[result];

  return (
    <div className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${c.className}`}>
      {c.icon} {c.label}
    </div>
  );
}
