import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { WORLD_CUP_2026_ROUNDS } from '../lib/matches';
import { KNOCKOUT_MATCHES } from '../lib/knockout';
import { getKnockoutTeam } from '../lib/scoring';
import type { Match, Round } from '../lib/matches';
import { getFlagUrl } from '../lib/flags';
import { Loader2, Search, ChevronDown, ChevronRight, Save, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface ResultEntry {
  match_id: string;
  home_score: number;
  away_score: number;
  penalty_winner?: string;
}

type ResultsStore = Record<string, ResultEntry>;

export default function AdminResultsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [results, setResults] = useState<ResultsStore>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({ '1ª Rodada': true, 'Mata-Mata': true });
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

  const fetchResults = useCallback(async () => {
    const { data } = await supabase.from('results').select('match_id, home_score, away_score, penalty_winner');
    if (data) {
      const store: ResultsStore = {};
      data.forEach(r => { store[r.match_id] = r; });
      setResults(store);
    }
  }, []);

  useEffect(() => {
    fetchResults();
    const sub = supabase
      .channel('admin_results')
      .on('postgres_changes' as any, { event: '*', table: 'results' }, fetchResults)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [fetchResults]);

  if (!isAdmin) {
    return (
      <div className="p-20 text-center text-white/20 font-black uppercase tracking-widest">
        Acesso restrito a administradores
      </div>
    );
  }

  const saveResult = async (matchId: string, homeStr: string | number, awayStr: string | number, penaltyWinner?: string) => {
    if (homeStr === '' || awayStr === '') return;
    const h = Number(homeStr);
    const a = Number(awayStr);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;

    setConfirmModal({
      isOpen: true,
      title: 'Publicar Resultado',
      message: 'Confirma a publicação oficial deste resultado para toda a plataforma? Isso afetará os rankings imediatamente.',
      variant: 'primary',
      onConfirm: async () => {
        setSaving(matchId);
        try {
          const { error } = await supabase
            .from('results')
            .upsert(
              { 
                match_id: matchId, 
                home_score: h, 
                away_score: a, 
                penalty_winner: penaltyWinner || null,
                updated_at: new Date().toISOString() 
              },
              { onConflict: 'match_id' }
            );
          if (error) throw error;

          setResults(prev => ({ 
            ...prev, 
            [matchId]: { 
              match_id: matchId, 
              home_score: h, 
              away_score: a, 
              penalty_winner: penaltyWinner 
            } 
          }));
        } catch (err) {
          console.error('Error saving result:', err);
          alert('Erro ao salvar resultado. Tente novamente.');
        } finally {
          setSaving(null);
        }
      }
    });
  };

  const deleteResult = async (matchId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remover Resultado',
      message: 'Tem certeza que deseja remover o resultado oficial deste jogo? Isso recalculará o ranking.',
      variant: 'danger',
      onConfirm: async () => {
        await supabase.from('results').delete().eq('match_id', matchId);
        setResults(prev => {
          const copy = { ...prev };
          delete copy[matchId];
          return copy;
        });
      }
    });
  };

  const toggleRound = (name: string) => {
    setExpandedRounds(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const knockoutRound: Round = {
    name: "Mata-Mata",
    matches: KNOCKOUT_MATCHES.map(m => ({
      id: m.id,
      group: m.phase,
      homeTeam: m.homeTeam || getKnockoutTeam(m.homePlaceholder, results, KNOCKOUT_MATCHES),
      awayTeam: m.awayTeam || getKnockoutTeam(m.awayPlaceholder, results, KNOCKOUT_MATCHES),
      date: m.date,
      time: m.time
    }))
  };

  const allRounds = [...WORLD_CUP_2026_ROUNDS, knockoutRound];

  // Filter matches
  const filteredRounds: Round[] = allRounds.map(round => ({
    ...round,
    matches: round.matches.filter(m =>
      !search ||
      m.homeTeam.toLowerCase().includes(search.toLowerCase()) ||
      m.awayTeam.toLowerCase().includes(search.toLowerCase()) ||
      m.group.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(r => r.matches.length > 0);

  const totalWithResults = Object.keys(results).length;
  const totalMatches = allRounds.reduce((acc, r) => acc + r.matches.length, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-white font-lexend tracking-tight uppercase">
          Gestão de <span className="text-primary">Resultados</span>
        </h1>
        <p className="text-white/40 font-medium">
          Insira os placares oficiais. O ranking de todas as ligas é atualizado automaticamente em tempo real.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de Jogos', value: totalMatches, color: 'text-white' },
          { label: 'Com Resultado', value: totalWithResults, color: 'text-primary' },
          { label: 'Pendentes', value: totalMatches - totalWithResults, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="glass-dark p-4 rounded-2xl border-white/5 text-center">
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
        <input
          type="text"
          placeholder="Buscar por seleção ou grupo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-primary transition-all text-white"
        />
      </div>

      {/* Rounds */}
      <div className="space-y-4">
        {filteredRounds.map(round => (
          <div key={round.name} className="glass-dark rounded-[2rem] border border-white/5 overflow-hidden">
            {/* Round header */}
            <button
              onClick={() => toggleRound(round.name)}
              className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-4">
                <h2 className="font-black uppercase tracking-widest text-white">{round.name}</h2>
                <span className="text-[10px] font-black bg-white/5 text-white/40 px-3 py-1 rounded-full uppercase tracking-widest">
                  {round.matches.filter(m => results[m.id]).length}/{round.matches.length} resultados
                </span>
              </div>
              {expandedRounds[round.name] ? (
                <ChevronDown size={20} className="text-white/40" />
              ) : (
                <ChevronRight size={20} className="text-white/40" />
              )}
            </button>

            {/* Matches */}
            <AnimatePresence>
              {expandedRounds[round.name] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-white/5 border-t border-white/5">
                    {round.matches.map((match, idx) => {
                      const showPhase = round.name === "Mata-Mata" && (idx === 0 || round.matches[idx - 1].group !== match.group);
                      return (
                        <React.Fragment key={match.id}>
                          {showPhase && (
                            <div className="bg-white/10 px-6 py-4">
                              <h3 className="text-sm font-black text-primary font-lexend uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                                {match.group}
                              </h3>
                            </div>
                          )}
                          <AdminMatchRow
                            match={match as any}
                            savedResult={results[match.id]}
                            onSave={saveResult}
                            onReset={deleteResult}
                            isSaving={saving === match.id}
                          />
                        </React.Fragment>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

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

function AdminMatchRow({
  match,
  savedResult,
  onSave,
  onReset,
  isSaving,
}: any) {
  const [home, setHome] = useState(savedResult ? String(savedResult.home_score) : '');
  const [away, setAway] = useState(savedResult ? String(savedResult.away_score) : '');
  const [penaltyWinner, setPenaltyWinner] = useState(savedResult?.penalty_winner || '');

  useEffect(() => {
    setHome(savedResult ? String(savedResult.home_score) : '');
    setAway(savedResult ? String(savedResult.away_score) : '');
    setPenaltyWinner(savedResult?.penalty_winner || '');
  }, [savedResult]);

  const isKnockoutMatch = isNaN(Number(match.id));
  const isDraw = home !== '' && away !== '' && Number(home) === Number(away);

  return (
    <div className={`flex flex-col p-6 transition-colors ${
      savedResult ? 'bg-primary/[0.02]' : 'hover:bg-white/[0.02]'
    }`}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 w-full">
        {/* Data / Grupo */}
        <div className="flex flex-col sm:w-32 flex-shrink-0 text-center sm:text-left">
          <span className="text-[10px] font-black bg-white/5 text-primary px-3 py-1 rounded-full uppercase tracking-widest w-fit mx-auto sm:mx-0 mb-2">
            {isKnockoutMatch ? match.group : `Grupo ${match.group}`}
          </span>
          <span className="text-sm font-bold text-white/80">
            {match.date.split('-').reverse().join('/')}
          </span>
          <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest">
            {match.time}
          </span>
        </div>

        {/* Partida (Bandeira - Inputs - Bandeira) */}
        <div className="flex-1 flex items-center justify-center gap-4 sm:gap-6 w-full max-w-md mx-auto">
          <div className="flex flex-col items-center gap-1.5 w-24 sm:w-28">
            <img src={getFlagUrl(match.homeTeam)} className="w-10 h-6 object-cover rounded shadow-sm flag-3d" alt="" />
            <span className="text-xs font-bold text-white/80 text-center truncate w-full">{match.homeTeam}</span>
          </div>

          <div className="flex items-center justify-center gap-2 min-w-[110px]">
            <input
              type="number"
              value={home}
              onChange={e => setHome(e.target.value)}
              className="w-12 h-10 bg-black/40 border border-white/10 rounded-lg text-center font-black focus:border-primary transition-all text-white"
            />
            <span className="text-white/20 font-black">-</span>
            <input
              type="number"
              value={away}
              onChange={e => setAway(e.target.value)}
              className="w-12 h-10 bg-black/40 border border-white/10 rounded-lg text-center font-black focus:border-primary transition-all text-white"
            />
          </div>

          <div className="flex flex-col items-center gap-1.5 w-24 sm:w-28">
            <img src={getFlagUrl(match.awayTeam)} className="w-10 h-6 object-cover rounded shadow-sm flag-3d" alt="" />
            <span className="text-xs font-bold text-white/80 text-center truncate w-full">{match.awayTeam}</span>
          </div>
        </div>

        {/* Botões Salvar e Resetar */}
        <div className="flex items-center justify-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <button
            onClick={() => onSave(match.id, home, away, isKnockoutMatch && isDraw ? penaltyWinner : undefined)}
            disabled={isSaving || (isKnockoutMatch && isDraw && !penaltyWinner)}
            className="flex-1 sm:flex-none p-2.5 px-4 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-dark transition-all border border-primary/10 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
            title="Salvar"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span className="sm:hidden">Salvar</span>
          </button>
          <button
            onClick={() => onReset(match.id)}
            className="p-2.5 px-4 sm:px-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/10 flex items-center justify-center gap-2"
            title="Resetar"
          >
            <Trash2 size={16} />
            <span className="sm:hidden text-xs font-black uppercase tracking-widest">Resetar</span>
          </button>
        </div>
      </div>

      {/* Seletor de Vencedor por Pênaltis (Mata-Mata com Empate) */}
      {isKnockoutMatch && isDraw && (
        <div className="flex flex-col items-center gap-2 mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300 w-full">
          <span className="text-[10px] text-yellow-400 font-black uppercase tracking-widest text-center">
            Quem se classificou nos Pênaltis / Prorrogação?
          </span>
          <div className="flex gap-4">
            <button
              onClick={() => setPenaltyWinner(match.homeTeam)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                penaltyWinner === match.homeTeam
                  ? 'bg-primary text-dark border-primary glow-primary'
                  : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              {match.homeTeam}
            </button>
            <button
              onClick={() => setPenaltyWinner(match.awayTeam)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
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
  );
}
