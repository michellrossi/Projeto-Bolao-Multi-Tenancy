import { type Key } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useLeague } from '../hooks/useLeague';
import { useRanking } from '../hooks/useRanking';
import { Trophy, Crown } from 'lucide-react';
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
        <div className="flex justify-center text-center">
          <div className="space-y-1 p-3 px-6 rounded-2xl bg-primary/5 border border-primary/10 min-w-[200px]">
            <p className="text-[9px] font-black uppercase text-primary tracking-wider">1º Lugar</p>
            <p className="text-sm md:text-base font-black text-white">R$ 390,00</p>
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
            rankings.map((player: UserRanking, index: number) => (
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
        <p className="text-[8.5px] text-blue-400/80 font-black mt-1 uppercase tracking-wider">
          Times: {player.knockoutTeamsPoints}
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
  key?: Key;
  player: UserRanking;
  index: number;
  isCurrentUser: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative flex items-center justify-between p-3 sm:p-4 rounded-[1.5rem] sm:rounded-[1.75rem] border transition-all duration-300 ${
        isCurrentUser
          ? 'bg-primary/5 border-primary/30 shadow-[0_0_20px_rgba(0,148,64,0.1)]'
          : 'bg-[#0b0e14] border-white/5 hover:bg-white/[0.02]'
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Posição geral */}
        <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-black text-white/40">
          {index + 1}º
        </span>

        {/* Avatar circular maior */}
        <div className="relative flex-shrink-0">
          <img src={player.photo} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-white/10" alt="" />
          {isCurrentUser && (
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary rounded-full border-2 border-[#0b0e14]" />
          )}
        </div>

        {/* Informações principais */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <p className="font-bold text-xs sm:text-sm text-white truncate">
              {/* Nome completo em telas médias/grandes, apenas primeiro nome em telas pequenas */}
              <span className="hidden sm:inline">{player.name}</span>
              <span className="inline sm:hidden">{player.name.split(' ')[0]}</span>
            </p>
            {player.isOwner && (
              <span className="text-primary font-black text-[8px] sm:text-[9px] bg-primary/10 px-1 py-0.5 rounded uppercase tracking-wider border border-primary/20 flex-shrink-0">
                ADM
              </span>
            )}
            {isCurrentUser && !player.isOwner && (
              <span className="text-dark font-black text-[8px] sm:text-[9px] bg-primary px-1 py-0.5 rounded uppercase tracking-wider flex-shrink-0">
                Você
              </span>
            )}
          </div>
          
          {/* Indicador de tendência reposicionado para baixo do nome */}
          <TrendIndicator trend={player.trend} value={player.trendValue} />

          {/* Detalhes do último jogo */}
          <LastMatchPredictionDetails result={player.lastMatchResult} prediction={player.lastMatchPrediction} />
        </div>
      </div>

      {/* Lado Direito */}
      <div className="flex items-center gap-2.5 sm:gap-6 flex-shrink-0">
        {/* Bloco vertical de estatísticas */}
        <div className="flex flex-col text-right font-black text-[8.5px] sm:text-[10px] tracking-wider space-y-0.5 leading-tight">
          <div className="text-primary uppercase">CRAVOU: {player.exactCount}</div>
          <div className="text-yellow-400 uppercase">ACERTOU: {player.winnerCount}</div>
          <div className="text-red-500 uppercase">ERROU: {player.missCount}</div>
          <div className="text-blue-400 uppercase">TIMES: {player.knockoutTeamsPoints}</div>
        </div>

        {/* Linha divisória vertical sutil */}
        <div className="h-8 sm:h-10 w-px bg-white/10" />

        {/* Bloco de pontuação */}
        <div className="flex flex-col items-center justify-center min-w-[50px] sm:min-w-[65px]">
          <span className="text-lg sm:text-2xl font-black text-white leading-none">{player.points}</span>
          <span className="text-[7.5px] sm:text-[9px] font-black text-white/40 tracking-widest mt-0.5 sm:mt-1 uppercase">PONTOS</span>
        </div>
      </div>
    </motion.div>
  );
}

function TrendIndicator({ trend, value }: { trend: UserRanking['trend']; value: number }) {
  if (trend === 'up') {
    return (
      <div className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-wider flex items-center gap-0.5 sm:gap-1">
        <span>↱</span> SUBIU {value} {value === 1 ? 'POSIÇÃO' : 'POSIÇÕES'}
      </div>
    );
  }
  if (trend === 'down') {
    return (
      <div className="text-[9px] sm:text-[10px] font-black text-red-500 uppercase tracking-wider flex items-center gap-0.5 sm:gap-1">
        <span>↳</span> CAIU {value} {value === 1 ? 'POSIÇÃO' : 'POSIÇÕES'}
      </div>
    );
  }
  return (
    <div className="text-[9px] sm:text-[10px] font-black text-white/40 uppercase tracking-wider flex items-center gap-0.5 sm:gap-1">
      <span>–</span> MANTEVE POSIÇÃO
    </div>
  );
}

function LastMatchPredictionDetails({
  result,
  prediction,
}: {
  result: UserRanking['lastMatchResult'];
  prediction?: { home: number; away: number } | null;
}) {
  if (result === 'none' || !prediction) {
    return (
      <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white/20">
        –
      </div>
    );
  }

  const palpiteStr = `${prediction.home}X${prediction.away}`;

  if (result === 'exact') {
    return (
      <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
        <span className="text-primary">CRAVOU</span>
        <span className="text-white/45"> – PALPITE: {palpiteStr}</span>
      </div>
    );
  }
  if (result === 'winner') {
    return (
      <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
        <span className="text-yellow-400">ACERTOU VENCEDOR</span>
        <span className="text-white/45"> – PALPITE: {palpiteStr}</span>
      </div>
    );
  }
  
  return (
    <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
      <span className="text-red-500">ERROU</span>
      <span className="text-white/45"> – PALPITE: {palpiteStr}</span>
    </div>
  );
}
