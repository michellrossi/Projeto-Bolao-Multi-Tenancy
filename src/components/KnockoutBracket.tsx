import React from 'react';
import { getFlagUrl } from '../lib/flags';

interface MatchData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  phase: string;
}

interface KnockoutBracketProps {
  matches: MatchData[];
  results: Record<string, { home: number; away: number; penalty_winner?: string }>;
}

export function KnockoutBracket({ matches, results }: KnockoutBracketProps) {
  // Agrupa os jogos por fase
  const getMatchesByPhase = (phase: string) => {
    return matches.filter(m => m.phase === phase);
  };

  const phases = [
    { name: "Mata-Mata", title: "16 avos de Final" },
    { name: "Oitavas", title: "Oitavas" },
    { name: "Quartas", title: "Quartas" },
    { name: "Semifinais", title: "Semifinais" },
    { name: "Final", title: "Finais" }
  ];

  const renderMatchCard = (match: MatchData) => {
    const res = results[match.id];
    const isFinished = res !== undefined;
    const isDraw = isFinished && res.home === res.away;

    return (
      <div 
        key={match.id}
        className="w-[240px] glass-dark rounded-2xl border border-white/5 p-4 flex flex-col justify-between hover:border-primary/40 transition-all shrink-0 select-none shadow-lg relative group"
      >
        {/* Match Header */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-[8px] font-black text-primary/70 uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded">
            Jogo {match.id}
          </span>
          <span className="text-[8px] font-bold text-white/30 uppercase">
            {match.date.split('-').slice(1).reverse().join('/')} - {match.time}
          </span>
        </div>

        {/* Home Team */}
        <div className={`flex items-center justify-between py-1.5 ${isFinished && res.home > res.away ? 'opacity-100 font-bold' : isFinished ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-2 truncate">
            <img src={getFlagUrl(match.homeTeam)} className="w-6 h-4 object-cover rounded shadow-sm shrink-0" alt="" />
            <span className="text-xs text-white truncate max-w-[140px]">{match.homeTeam || "A definir"}</span>
          </div>
          <span className="text-xs font-black text-white bg-white/5 w-6 h-6 rounded flex items-center justify-center">
            {isFinished ? res.home : '-'}
          </span>
        </div>

        {/* Separator */}
        <div className="h-px bg-white/5 my-1" />

        {/* Away Team */}
        <div className={`flex items-center justify-between py-1.5 ${isFinished && res.away > res.home ? 'opacity-100 font-bold' : isFinished ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-2 truncate">
            <img src={getFlagUrl(match.awayTeam)} className="w-6 h-4 object-cover rounded shadow-sm shrink-0" alt="" />
            <span className="text-xs text-white truncate max-w-[140px]">{match.awayTeam || "A definir"}</span>
          </div>
          <span className="text-xs font-black text-white bg-white/5 w-6 h-6 rounded flex items-center justify-center">
            {isFinished ? res.away : '-'}
          </span>
        </div>

        {/* Penalty winner badge */}
        {isDraw && res.penalty_winner && (
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-yellow-400 text-dark text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
            Pen: {res.penalty_winner}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full overflow-x-auto scrollbar-thin py-6">
      {/* Container horizontal com as colunas */}
      <div className="flex gap-12 min-w-[1300px] px-4 justify-start items-stretch">
        {phases.map((phase) => {
          const phaseMatches = getMatchesByPhase(phase.name);
          return (
            <div key={phase.name} className="flex flex-col gap-6 w-[240px] shrink-0">
              {/* Título da Coluna */}
              <div className="text-center py-2 bg-white/5 rounded-xl border border-white/5 mb-2">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest font-lexend">
                  {phase.title}
                </h4>
                <span className="text-[8px] font-bold text-white/30 uppercase">
                  {phaseMatches.length} {phaseMatches.length === 1 ? 'Jogo' : 'Jogos'}
                </span>
              </div>

              {/* Lista de jogos na coluna correspondente */}
              <div className="flex flex-col justify-around flex-1 gap-6">
                {phaseMatches.map(renderMatchCard)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
