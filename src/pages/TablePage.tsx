import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WORLD_CUP_2026_ROUNDS, Match } from '../lib/matches';
import { KNOCKOUT_MATCHES } from '../lib/knockout';
import { getKnockoutTeam } from '../lib/scoring';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getFlagUrl } from '../lib/flags';
import { Edit3 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

const TABS = [...WORLD_CUP_2026_ROUNDS.map(r => r.name), "Mata-Mata"];

export default function TablePage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("1ª Rodada");
  const [results, setResults] = useState<Record<string, { home: number; away: number; penalty_winner?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'primary';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'primary'
  });

  useEffect(() => {
    const fetchResults = async () => {
      const { data } = await supabase.from('results').select('*');
      if (data) {
        const resMap: Record<string, { home: number; away: number; penalty_winner?: string }> = {};
        data.forEach(r => resMap[r.match_id] = { home: r.home_score, away: r.away_score, penalty_winner: r.penalty_winner });
        setResults(resMap);
      }
      setLoading(false);
    };

    fetchResults();

    const sub = supabase.channel('table_results').on('postgres_changes' as any, { event: '*', table: 'results' }, fetchResults).subscribe();

    return () => {
      sub.unsubscribe();
    };
  }, []);

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  const activeRound = WORLD_CUP_2026_ROUNDS.find(r => r.name === activeTab);
  const currentMatches = activeTab === "Mata-Mata"
    ? KNOCKOUT_MATCHES.map(m => ({
      id: m.id,
      group: m.phase,
      homeTeam: m.homeTeam || getKnockoutTeam(m.homePlaceholder, results, KNOCKOUT_MATCHES),
      awayTeam: m.awayTeam || getKnockoutTeam(m.awayPlaceholder, results, KNOCKOUT_MATCHES),
      date: m.date,
      time: m.time
    }))
    : activeRound?.matches || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white font-lexend tracking-tight uppercase mb-2">
            Tabela de <span className="text-primary">Resultados</span>
          </h1>
          <p className="text-white/50 font-medium">
            {isAdmin ? 'Área do Administrador: Insira os resultados oficiais.' : 'Acompanhe os resultados oficiais de cada partida.'}
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap border ${activeTab === tab
                  ? 'bg-primary text-dark border-primary glow-primary'
                  : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-4"
        >
          {/* Desktop Table View */}
          <div className="hidden md:block glass-dark rounded-[2.5rem] overflow-hidden border-white/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/40 w-32">Data/Hora</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/40 text-center">Partida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentMatches.map((match, idx) => {
                  const showPhase = activeTab === "Mata-Mata" && (idx === 0 || currentMatches[idx - 1].group !== match.group);
                  return (
                    <React.Fragment key={match.id}>
                      {showPhase && (
                        <tr>
                          <td colSpan={2} className="bg-white/10 px-6 py-4">
                            <h3 className="text-sm font-black text-primary font-lexend uppercase tracking-widest flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                              {match.group}
                            </h3>
                          </td>
                        </tr>
                      )}
                      <ResultRow 
                        match={match as any} 
                        savedResult={results[match.id]} 
                      />
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-4">
            {currentMatches.map((match, idx) => {
              const showPhase = activeTab === "Mata-Mata" && (idx === 0 || currentMatches[idx - 1].group !== match.group);
              return (
                <React.Fragment key={match.id}>
                  {showPhase && (
                    <h3 className="text-sm font-black text-primary font-lexend uppercase tracking-widest mt-8 mb-4 pl-4 border-l-4 border-primary">
                      {match.group}
                    </h3>
                  )}
                  <ResultCard
                    match={match as any}
                    savedResult={results[match.id]}
                  />
                </React.Fragment>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </div>
  );
}

function ResultCard({ match, savedResult }: { match: Match; savedResult: { home: number; away: number; penalty_winner?: string } | undefined; }) {
  const isKnockout = isNaN(Number(match.id));
  return (
    <div className="glass-dark p-6 rounded-[2rem] border-white/5 space-y-6">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
          {isKnockout ? match.group : `Grupo ${match.group}`}
        </span>
        <div className="text-right">
          <p className="text-xs font-bold text-white/80">{match.date.split('-').reverse().join('/')}</p>
          <p className="text-[10px] font-medium text-white/40 uppercase">{match.time}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 flex flex-col items-center gap-2">
          <img src={getFlagUrl(match.homeTeam)} className="w-10 h-6 object-cover rounded shadow-sm flag-3d" alt="" />
          <span className="text-xs font-bold text-white text-center line-clamp-1">{match.homeTeam}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center bg-white/5 px-4 py-2 rounded-xl border border-white/5 gap-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-white">{savedResult?.home ?? '-'}</span>
              <span className="text-white/20">-</span>
              <span className="text-lg font-black text-white">{savedResult?.away ?? '-'}</span>
            </div>
            {savedResult && savedResult.home === savedResult.away && savedResult.penalty_winner && (
              <span className="text-[8px] font-black text-yellow-400 uppercase tracking-widest">
                Pen: {savedResult.penalty_winner}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-2">
          <img src={getFlagUrl(match.awayTeam)} className="w-10 h-6 object-cover rounded shadow-sm flag-3d" alt="" />
          <span className="text-xs font-bold text-white text-center line-clamp-1">{match.awayTeam}</span>
        </div>
      </div>
    </div>
  );
}

function ResultRow({ match, savedResult }: { match: Match; savedResult: { home: number; away: number; penalty_winner?: string } | undefined; }) {
  return (
    <tr className="hover:bg-white/[0.02] transition-colors group">
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white/80">{match.date.split('-').reverse().join('/')}</span>
          <span className="text-[10px] font-medium text-white/40 uppercase">{match.time}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          <div className="flex flex-col items-center gap-1.5 w-24 sm:w-28">
            <img src={getFlagUrl(match.homeTeam)} className="w-10 h-6 object-cover rounded shadow-sm flag-3d" alt="" />
            <span className="text-xs font-bold text-white/80 text-center truncate w-full">{match.homeTeam}</span>
          </div>
          
          <div className="flex items-center justify-center gap-2 min-w-[140px]">
            <div className="flex flex-col items-center gap-1 bg-white/5 px-4 py-2 rounded-xl border border-white/5 w-full">
              <div className="flex items-center gap-3">
                <span className="text-xl font-black text-white">{savedResult?.home ?? '-'}</span>
                <span className="text-white/20 font-bold">-</span>
                <span className="text-xl font-black text-white">{savedResult?.away ?? '-'}</span>
              </div>
              {savedResult && savedResult.home === savedResult.away && savedResult.penalty_winner && (
                <span className="text-[8px] font-black text-yellow-400 uppercase tracking-widest text-center">
                  Pen: {savedResult.penalty_winner}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5 w-24 sm:w-28">
            <img src={getFlagUrl(match.awayTeam)} className="w-10 h-6 object-cover rounded shadow-sm flag-3d" alt="" />
            <span className="text-xs font-bold text-white/80 text-center truncate w-full">{match.awayTeam}</span>
          </div>
        </div>
      </td>
    </tr>
  );
}
