import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { WORLD_CUP_2026_ROUNDS } from '../lib/matches';
import type { Match, Round } from '../lib/matches';
import { CheckCircle2, Edit3, Loader2, Search, ChevronDown, ChevronRight } from 'lucide-react';

interface ResultEntry {
  match_id: string;
  home_score: number;
  away_score: number;
}

type ResultsStore = Record<string, ResultEntry>;

export default function AdminResultsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [results, setResults] = useState<ResultsStore>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({ '1ª Rodada': true });

  // Inline edit state
  const [editing, setEditing] = useState<string | null>(null);
  const [editHome, setEditHome] = useState('');
  const [editAway, setEditAway] = useState('');

  const fetchResults = useCallback(async () => {
    const { data } = await supabase.from('results').select('match_id, home_score, away_score');
    if (data) {
      const store: ResultsStore = {};
      data.forEach(r => { store[r.match_id] = r; });
      setResults(store);
    }
  }, []);

  useEffect(() => {
    fetchResults();
    // Real-time updates
    const sub = supabase
      .channel('admin_results')
      .on('postgres_changes', { event: '*', table: 'results' }, fetchResults)
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

  const startEdit = (match: Match) => {
    setEditing(match.id);
    const existing = results[match.id];
    setEditHome(existing ? String(existing.home_score) : '');
    setEditAway(existing ? String(existing.away_score) : '');
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditHome('');
    setEditAway('');
  };

  const saveResult = async (matchId: string) => {
    const h = parseInt(editHome);
    const a = parseInt(editAway);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;

    if (!window.confirm('Confirma a publicação oficial deste resultado para toda a plataforma? Isso afetará os rankings.')) {
      return;
    }

    setSaving(matchId);
    try {
      const { error } = await supabase
        .from('results')
        .upsert(
          { match_id: matchId, home_score: h, away_score: a, updated_at: new Date().toISOString() },
          { onConflict: 'match_id' }
        );
      if (error) throw error;

      setResults(prev => ({ ...prev, [matchId]: { match_id: matchId, home_score: h, away_score: a } }));
      setSaved(matchId);
      setTimeout(() => setSaved(null), 2000);
      setEditing(null);
    } catch (err) {
      console.error('Error saving result:', err);
      alert('Erro ao salvar resultado. Tente novamente.');
    } finally {
      setSaving(null);
    }
  };

  const deleteResult = async (matchId: string) => {
    if (!window.confirm('Remover o resultado deste jogo?')) return;
    await supabase.from('results').delete().eq('match_id', matchId);
    setResults(prev => {
      const copy = { ...prev };
      delete copy[matchId];
      return copy;
    });
  };

  const toggleRound = (name: string) => {
    setExpandedRounds(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Filter matches
  const filteredRounds: Round[] = WORLD_CUP_2026_ROUNDS.map(round => ({
    ...round,
    matches: round.matches.filter(m =>
      !search ||
      m.homeTeam.toLowerCase().includes(search.toLowerCase()) ||
      m.awayTeam.toLowerCase().includes(search.toLowerCase()) ||
      m.group.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(r => r.matches.length > 0);

  const totalWithResults = Object.keys(results).length;
  const totalMatches = WORLD_CUP_2026_ROUNDS.reduce((acc, r) => acc + r.matches.length, 0);

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
                    {round.matches.map(match => {
                      const result = results[match.id];
                      const isEditing = editing === match.id;
                      const isSaving = saving === match.id;
                      const isSaved = saved === match.id;

                      return (
                        <div
                          key={match.id}
                          className={`flex flex-col sm:flex-row items-center gap-4 p-5 transition-colors ${
                            result ? 'bg-primary/[0.02]' : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          {/* Match Info */}
                          <div className="flex-1 w-full">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-black bg-white/5 text-white/30 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                Grupo {match.group}
                              </span>
                              <span className="text-[9px] text-white/20 font-medium">
                                {new Date(`${match.date}T${match.time}`).toLocaleDateString('pt-BR', {
                                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-white text-sm flex-1">{match.homeTeam}</span>

                              {/* Score Display / Edit */}
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="99"
                                    value={editHome}
                                    onChange={e => setEditHome(e.target.value)}
                                    className="w-14 text-center bg-black/40 border border-primary/30 rounded-xl py-2 text-xl font-black text-white focus:outline-none focus:border-primary"
                                    autoFocus
                                  />
                                  <span className="text-white/40 font-black">×</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="99"
                                    value={editAway}
                                    onChange={e => setEditAway(e.target.value)}
                                    className="w-14 text-center bg-black/40 border border-primary/30 rounded-xl py-2 text-xl font-black text-white focus:outline-none focus:border-primary"
                                  />
                                </div>
                              ) : result ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-black text-primary">
                                    {result.home_score} × {result.away_score}
                                  </span>
                                  {isSaved && <CheckCircle2 size={16} className="text-primary" />}
                                </div>
                              ) : (
                                <span className="text-white/20 font-black text-sm">— × —</span>
                              )}

                              <span className="font-bold text-white text-sm flex-1 text-right">{match.awayTeam}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveResult(match.id)}
                                  disabled={isSaving}
                                  className="px-4 py-2 bg-primary text-dark font-black text-xs rounded-xl uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-1"
                                >
                                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Publicar'}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-4 py-2 bg-white/5 text-white/50 font-black text-xs rounded-xl uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(match)}
                                  className="p-2.5 bg-white/5 text-white/40 rounded-xl border border-white/10 hover:border-primary/30 hover:text-primary transition-all"
                                  title={result ? 'Editar resultado' : 'Inserir resultado'}
                                >
                                  <Edit3 size={16} />
                                </button>
                                {result && (
                                  <button
                                    onClick={() => deleteResult(match.id)}
                                    className="p-2.5 bg-red-500/5 text-red-500/50 rounded-xl border border-red-500/10 hover:bg-red-500/10 hover:text-red-500 transition-all"
                                    title="Remover resultado"
                                  >
                                    ×
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
