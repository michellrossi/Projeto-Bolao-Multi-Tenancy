import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WORLD_CUP_2026_ROUNDS, Match } from '../lib/matches';
import { KNOCKOUT_MATCHES } from '../lib/knockout';
import { Calendar, Users, Trophy, Lock, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { getFlagUrl } from '../lib/flags';
import { useAuth } from '../hooks/useAuth';
import { useLeague } from '../hooks/useLeague';
import { supabase } from '../lib/supabase';
import { isMatchLocked, calculatePoints, calculateKnockoutMatchPoints, getGroupStandings, getKnockoutTeam, getUserKnockoutTeam } from '../lib/scoring';
import { Standings } from '../lib/groups';

const TABS = [...WORLD_CUP_2026_ROUNDS.map(r => r.name), "Mata-Mata"];

export default function PredictionsPage() {
  const { user } = useAuth();
  const { currentLeagueId, isApproved, loading: leagueLoading } = useLeague();
  const [activeTab, setActiveTab] = useState("1ª Rodada");
  const [predictions, setPredictions] = useState<Record<string, { home: number; away: number; penalty_winner?: string }>>({});
  const [results, setResults] = useState<Record<string, { home: number; away: number; penalty_winner?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { home: string; away: string; penalty_winner?: string }>>({});
  const [savingActive, setSavingActive] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const activeRound = WORLD_CUP_2026_ROUNDS.find(r => r.name === activeTab);
  const standings = useMemo(() => getGroupStandings(
    Object.entries(results).reduce((acc: Record<string, { homeScore: number; awayScore: number }>, [id, res]) => {
      const r = res as { home: number; away: number };
      acc[id] = { homeScore: r.home, awayScore: r.away };
      return acc;
    }, {})
  ), [results]);

  // Fetch results
  const fetchResults = useCallback(async () => {
    try {
      const { data } = await supabase.from('results').select('*').range(0, 199);
      if (data) {
        const resMap: Record<string, { home: number; away: number; penalty_winner?: string }> = {};
        data.forEach(r => resMap[r.match_id] = { home: r.home_score, away: r.away_score, penalty_winner: r.penalty_winner });
        
        // Fallback demo results
        const isDemo = currentLeagueId === '99999999-9999-9999-9999-999999999999';
        if (isDemo && Object.keys(resMap).length === 0) {
          resMap['g1-1'] = { home: 2, away: 0 };
          resMap['g1-2'] = { home: 1, away: 1 };
          resMap['g2-1'] = { home: 3, away: 0 };
        }
        
        setResults(resMap);
      }
    } finally {}
  }, [currentLeagueId]);

  // Fetch predictions
  const fetchPredictions = useCallback(async () => {
    if (!user || !currentLeagueId) return;
    
    setLoading(true);
    try {
      // Modo demo com usuário fake -> localStorage
      const isDemo = currentLeagueId === '99999999-9999-9999-9999-999999999999';
      if (isDemo && (!user || user.id === '00000000-0000-0000-0000-000000000000')) {
        const localPreds = localStorage.getItem(`demo_predictions_${currentLeagueId}`);
        if (localPreds) {
          const parsed = JSON.parse(localPreds);
          setPredictions(parsed);
        }
      } else {
        const { data } = await supabase
          .from('predictions')
          .select('*')
          .eq('league_id', currentLeagueId)
          .eq('user_id', user.id)
          .range(0, 199);

        if (data) {
          const predMap: Record<string, { home: number; away: number; penalty_winner?: string }> = {};
          data.forEach(p => predMap[p.match_id] = { home: p.home_score, away: p.away_score, penalty_winner: p.penalty_winner });
          setPredictions(predMap);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentLeagueId]);

  useEffect(() => {
    if (!user || !currentLeagueId) return;

    fetchResults();
    fetchPredictions();

    // Subscriptions
    const resultsSub = (supabase
      .channel(`results_${currentLeagueId}`) as any)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, fetchResults)
      .subscribe();

    const predsSub = (supabase
      .channel(`preds_${currentLeagueId}_${user.id}`) as any)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'predictions',
        filter: `user_id=eq.${user.id}`
      }, fetchPredictions)
      .subscribe();

    return () => {
      resultsSub.unsubscribe();
      predsSub.unsubscribe();
    };
  }, [user?.id, currentLeagueId, fetchResults, fetchPredictions]);

  const handleDraftChange = (matchId: string, team: 'home' | 'away' | 'penalty_winner', value: string) => {
    setDrafts(prev => ({
      ...prev,
      [matchId]: {
        home: team === 'home' ? value : (prev[matchId]?.home ?? predictions[matchId]?.home?.toString() ?? ''),
        away: team === 'away' ? value : (prev[matchId]?.away ?? predictions[matchId]?.away?.toString() ?? ''),
        penalty_winner: team === 'penalty_winner' ? value : (prev[matchId]?.penalty_winner ?? predictions[matchId]?.penalty_winner ?? ''),
      }
    }));
  };

  const handleSaveAll = async () => {
    if (!user || !isApproved || !currentLeagueId) return;
    setSavingActive(true);
    setSaveSuccess(false);

    try {
      const isDemo = currentLeagueId === '99999999-9999-9999-9999-999999999999';
      
      if (isDemo && user.id === '00000000-0000-0000-0000-000000000000') {
        const newPreds = { ...predictions };
        Object.entries(drafts).forEach(([matchId, draft]) => {
          const d = draft as { home: string; away: string; penalty_winner?: string };
          if (d.home !== '' && d.away !== '') {
            newPreds[matchId] = { home: Number(d.home), away: Number(d.away), penalty_winner: d.penalty_winner };
          }
        });
        setPredictions(newPreds);
        localStorage.setItem(`demo_predictions_${currentLeagueId}`, JSON.stringify(newPreds));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        return;
      }

      const toUpsert = Object.entries(drafts)
        .filter(([_, draft]) => (draft as any).home !== '' && (draft as any).away !== '')
        .map(([matchId, draft]) => ({
          league_id: currentLeagueId,
          user_id: user.id,
          match_id: matchId,
          home_score: Number((draft as any).home),
          away_score: Number((draft as any).away),
          penalty_winner: (draft as any).penalty_winner || null,
          updated_at: new Date().toISOString()
        }));

      if (toUpsert.length === 0) {
        setSavingActive(false);
        return;
      }

      const { error } = await supabase.from('predictions').upsert(toUpsert, { onConflict: 'league_id,user_id,match_id' });
      if (error) throw error;

      // Update local predictions so they reflect what was saved
      const newPreds = { ...predictions };
      toUpsert.forEach(p => {
        newPreds[p.match_id] = { home: p.home_score, away: p.away_score, penalty_winner: p.penalty_winner || undefined };
      });
      setPredictions(newPreds);

      // Clear drafts that match exactly to avoid clutter, optional
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving predictions:", error);
    } finally {
      setSavingActive(false);
    }
  };

  // Combina palpites salvos com rascunhos locais na memória para que os próximos jogos
  // do mata-mata atualizem instantaneamente conforme o usuário digita/salva os placares.
  const mergedPredictions = useMemo(() => {
    const merged = { ...predictions };
    Object.entries(drafts).forEach(([matchId, d]) => {
      const draftVal = d as any;
      if (draftVal.home !== '' && draftVal.away !== '') {
        merged[matchId] = {
          home: Number(draftVal.home),
          away: Number(draftVal.away),
          penalty_winner: draftVal.penalty_winner || undefined
        };
      }
    });
    return merged;
  }, [predictions, drafts]);

  if (loading || leagueLoading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  if (!isApproved) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center glass-dark rounded-[3rem] border-white/5 space-y-6 mt-10">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center">
          <ShieldCheck className="text-primary w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Aguardando Aprovação</h2>
          <p className="text-white/40 max-w-sm">Seu cadastro foi recebido! O administrador precisa aprovar sua participação para que você possa enviar palpites.</p>
        </div>
        <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Status: Pendente</span>
        </div>
      </div>
    );
  }

  const currentMatches = activeTab === "Mata-Mata"
    ? KNOCKOUT_MATCHES.map(m => ({
      ...m,
      homeTeam: m.homeTeam || getUserKnockoutTeam(m.homePlaceholder, mergedPredictions, KNOCKOUT_MATCHES),
      awayTeam: m.awayTeam || getUserKnockoutTeam(m.awayPlaceholder, mergedPredictions, KNOCKOUT_MATCHES),
      group: m.phase
    }))
    : activeRound?.matches || [];

  const hasUnsavedDrafts = Object.keys(drafts).some(matchId => {
    const d = drafts[matchId];
    if (d.home === '' || d.away === '') return false;
    const saved = predictions[matchId];
    if (!saved) return true;
    return saved.home.toString() !== d.home || saved.away.toString() !== d.away;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-32 relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white font-lexend tracking-tight uppercase mb-2">
            Meus <span className="text-primary">Palpites</span>
          </h1>
          <p className="text-white/50 font-medium">
            Preencha seus palpites e suba no ranking da galera.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap border ${activeTab === tab
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
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          {/* Desktop Table View */}
          <div className="hidden md:block glass-dark rounded-[2.5rem] overflow-hidden border-white/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/40 w-32">Data/Hora</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/40 text-center">Partida</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/40 w-40 text-center">Status / Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentMatches.map((match, idx) => {
                  const showPhase = activeTab === "Mata-Mata" && (idx === 0 || currentMatches[idx - 1].group !== match.group);
                  return (
                    <React.Fragment key={match.id}>
                      {showPhase && (
                        <tr>
                          <td colSpan={3} className="bg-white/10 px-6 py-4">
                            <h3 className="text-sm font-black text-primary font-lexend uppercase tracking-widest flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                              {match.group}
                            </h3>
                          </td>
                        </tr>
                      )}
                      <PredictionRow 
                        match={match} 
                        prediction={predictions[match.id]} 
                        draft={drafts[match.id]} 
                        onChange={handleDraftChange} 
                        result={results[match.id]} 
                        predictions={predictions}
                        results={results}
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
                  <PredictionCardCompact 
                    match={match} 
                    prediction={predictions[match.id]} 
                    draft={drafts[match.id]} 
                    onChange={handleDraftChange} 
                    result={results[match.id]} 
                    predictions={predictions}
                    results={results}
                  />
                </React.Fragment>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Floating Save Button */}
      <AnimatePresence>
        {hasUnsavedDrafts && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-md"
          >
            <button
              onClick={handleSaveAll}
              disabled={savingActive}
              className={`w-full py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-2xl transition-all ${
                saveSuccess 
                  ? 'bg-primary text-dark glow-primary' 
                  : 'bg-white text-dark hover:scale-105'
              }`}
            >
              {savingActive ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark"></div>
              ) : saveSuccess ? (
                <><CheckCircle2 size={18} /> Salvo com Sucesso</>
              ) : (
                <><Trophy size={18} /> Salvar Palpites da Rodada</>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PredictionRow({ match, prediction, draft, onChange, result, predictions, results }: any) {
  const isGroupStage = !isNaN(Number(match.id));
  const locked = isMatchLocked(match.date, match.time, isGroupStage);
  
  const homeVal = draft?.home ?? prediction?.home?.toString() ?? '';
  const awayVal = draft?.away ?? prediction?.away?.toString() ?? '';
  const penaltyWinner = draft?.penalty_winner ?? prediction?.penalty_winner ?? '';

  const points = result && prediction ? calculateKnockoutMatchPoints(
    match.id,
    { homeScore: Number(prediction.home), awayScore: Number(prediction.away) },
    { homeScore: result.home, awayScore: result.away },
    predictions,
    results
  ) : null;

  const isKnockoutMatch = !isGroupStage;
  const isDraw = homeVal !== '' && awayVal !== '' && Number(homeVal) === Number(awayVal);

  return (
    <tr className={`hover:bg-white/[0.02] transition-colors group ${locked ? 'opacity-70' : ''}`}>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white/80">{match.date.split('-').reverse().join('/')}</span>
          <span className="text-[10px] font-medium text-white/40 uppercase">{match.time}</span>
          {locked && <span className="text-[9px] text-red-500 font-black mt-1 uppercase flex items-center gap-1"><Lock size={8}/> Fechado</span>}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <div className="flex flex-col items-center gap-1.5 w-24 sm:w-28">
              <img src={getFlagUrl(match.homeTeam)} className="w-10 h-6 object-cover rounded shadow-sm flag-3d" alt="" />
              <span className="text-xs font-bold text-white/80 text-center truncate w-full">{match.homeTeam}</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 min-w-[120px]">
              <input
                type="number"
                value={homeVal}
                onChange={(e) => onChange(match.id, 'home', e.target.value)}
                disabled={locked}
                className="w-12 h-10 bg-black/40 border border-white/10 rounded-xl text-center text-lg font-black focus:outline-none focus:border-primary transition-all disabled:opacity-50"
              />
              <span className="text-white/20 font-bold">X</span>
              <input
                type="number"
                value={awayVal}
                onChange={(e) => onChange(match.id, 'away', e.target.value)}
                disabled={locked}
                className="w-12 h-10 bg-black/40 border border-white/10 rounded-xl text-center text-lg font-black focus:outline-none focus:border-secondary transition-all disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col items-center gap-1.5 w-24 sm:w-28">
              <img src={getFlagUrl(match.awayTeam)} className="w-10 h-6 object-cover rounded shadow-sm flag-3d" alt="" />
              <span className="text-xs font-bold text-white/80 text-center truncate w-full">{match.awayTeam}</span>
            </div>
          </div>

          {/* Seletor de Pênaltis para o Usuário */}
          {isKnockoutMatch && isDraw && (
            <div className="flex flex-col items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="text-[9px] text-yellow-400 font-black uppercase tracking-widest">Quem classifica nos pênaltis?</span>
              <div className="flex gap-2">
                <button
                  disabled={locked}
                  onClick={() => onChange(match.id, 'penalty_winner', match.homeTeam)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                    penaltyWinner === match.homeTeam
                      ? 'bg-primary text-dark border-primary glow-primary'
                      : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {match.homeTeam}
                </button>
                <button
                  disabled={locked}
                  onClick={() => onChange(match.id, 'penalty_winner', match.awayTeam)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                    penaltyWinner === match.awayTeam
                      ? 'bg-primary text-dark border-primary glow-primary'
                      : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {match.awayTeam}
                </button>
              </div>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        {result ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Oficial: {result.home}x{result.away}</span>
            {points !== null && (
              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${points === 3 ? 'bg-primary/20 text-primary border-primary/20' : points === 1 ? 'bg-secondary/20 text-secondary border-secondary/20' : 'bg-white/5 text-white/40 border-white/5'}`}>
                {points} Pts
              </span>
            )}
          </div>
        ) : locked ? (
          <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Aguardando</span>
        ) : (
          <span className="text-[10px] text-primary/50 uppercase tracking-widest font-bold">Aberto</span>
        )}
      </td>
    </tr>
  );
}

function PredictionCardCompact({ match, prediction, draft, onChange, result, predictions, results }: any) {
  const isGroupStage = !isNaN(Number(match.id));
  const locked = isMatchLocked(match.date, match.time, isGroupStage);
  
  const homeVal = draft?.home ?? prediction?.home?.toString() ?? '';
  const awayVal = draft?.away ?? prediction?.away?.toString() ?? '';
  const penaltyWinner = draft?.penalty_winner ?? prediction?.penalty_winner ?? '';

  const points = result && prediction ? calculateKnockoutMatchPoints(
    match.id,
    { homeScore: Number(prediction.home), awayScore: Number(prediction.away) },
    { homeScore: result.home, awayScore: result.away },
    predictions,
    results
  ) : null;

  const isKnockoutMatch = !isGroupStage;
  const isDraw = homeVal !== '' && awayVal !== '' && Number(homeVal) === Number(awayVal);

  return (
    <div className={`glass-dark p-4 rounded-[1.5rem] border-white/5 space-y-4 ${locked ? 'opacity-80' : ''}`}>
      <div className="flex justify-between items-center">
        <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">
          {match.group}
        </span>
        <div className="flex items-center gap-2">
          {locked && <Lock size={10} className="text-red-500" />}
          <div className="text-right">
            <p className="text-[10px] font-bold text-white/80">{match.date.split('-').reverse().slice(0,2).join('/')}</p>
            <p className="text-[9px] font-medium text-white/40 uppercase">{match.time}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 flex flex-col items-center gap-1">
            <img src={getFlagUrl(match.homeTeam)} className="w-8 h-5 object-cover rounded shadow-sm flag-3d" alt="" />
            <span className="text-[10px] font-bold text-white text-center line-clamp-1">{match.homeTeam}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={homeVal}
              onChange={(e) => onChange(match.id, 'home', e.target.value)}
              disabled={locked}
              className="w-10 h-10 bg-black/40 border border-white/10 rounded-xl text-center text-sm font-black focus:outline-none focus:border-primary disabled:opacity-50"
            />
            <span className="text-white/20 font-black text-xs">X</span>
            <input
              type="number"
              value={awayVal}
              onChange={(e) => onChange(match.id, 'away', e.target.value)}
              disabled={locked}
              className="w-10 h-10 bg-black/40 border border-white/10 rounded-xl text-center text-sm font-black focus:outline-none focus:border-secondary disabled:opacity-50"
            />
          </div>

          <div className="flex-1 flex flex-col items-center gap-1">
            <img src={getFlagUrl(match.awayTeam)} className="w-8 h-5 object-cover rounded shadow-sm flag-3d" alt="" />
            <span className="text-[10px] font-bold text-white text-center line-clamp-1">{match.awayTeam}</span>
          </div>
        </div>

        {/* Seletor de Pênaltis para o Usuário - Mobile */}
        {isKnockoutMatch && isDraw && (
          <div className="flex flex-col items-center gap-1.5 border-t border-white/5 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="text-[9px] text-yellow-400 font-black uppercase tracking-widest">Classifica nos pênaltis?</span>
            <div className="flex gap-2">
              <button
                disabled={locked}
                onClick={() => onChange(match.id, 'penalty_winner', match.homeTeam)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                  penaltyWinner === match.homeTeam
                    ? 'bg-primary text-dark border-primary glow-primary'
                    : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'
                }`}
              >
                {match.homeTeam}
              </button>
              <button
                disabled={locked}
                onClick={() => onChange(match.id, 'penalty_winner', match.awayTeam)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                  penaltyWinner === match.awayTeam
                    ? 'bg-primary text-dark border-primary glow-primary'
                    : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'
                }`}
              >
                {match.awayTeam}
              </button>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Resultado: {result.home}x{result.away}</span>
          {points !== null && (
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${points === 3 ? 'bg-primary/20 text-primary border-primary/20' : points === 1 ? 'bg-secondary/20 text-secondary border-secondary/20' : 'bg-white/5 text-white/40 border-white/5'}`}>
              +{points} Pts
            </span>
          )}
        </div>
      )}
    </div>
  );
}
