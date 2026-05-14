import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { WORLD_CUP_2026_ROUNDS, Match } from '../lib/matches';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getFlagUrl } from '../lib/flags';
import { Save, Lock, Edit3, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export default function TablePage() {
  const { isAdmin } = useAuth();
  const [results, setResults] = useState<Record<string, { home: number; away: number }>>({});
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
        const resMap: Record<string, { home: number; away: number }> = {};
        data.forEach(r => resMap[r.match_id] = { home: r.home_score, away: r.away_score });
        setResults(resMap);
      }
      setLoading(false);
    };

    fetchResults();

    const sub = supabase.channel('table_results').on('postgres_changes', { event: '*', table: 'results' }, fetchResults).subscribe();

    return () => {
      sub.unsubscribe();
    };
  }, []);

  const handleSaveResult = async (matchId: string, home: number | string, away: number | string) => {
    if (home === '' || away === '') return;
    try {
      const { error } = await supabase.from('results').upsert({
        match_id: matchId,
        home_score: Number(home),
        away_score: Number(away),
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error saving result:", error);
    }
  };

  const handleResetResult = (matchId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Resetar Resultado',
      message: 'Tem certeza que deseja resetar o resultado oficial deste jogo? Isso afetará os rankings e palpites dos usuários.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('results').delete().eq('match_id', matchId);
          if (error) throw error;
        } catch (error) {
          console.error("Error resetting result:", error);
        }
      }
    });
  };

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white font-lexend tracking-tight uppercase mb-2">
            Tabela de <span className="text-primary">Resultados</span>
          </h1>
          <p className="text-white/50 font-medium">
            {isAdmin ? 'Área do Administrador: Insira os resultados oficiais.' : 'Acompanhe os resultados oficiais de cada partida.'}
          </p>
        </div>
        {isAdmin && (
          <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20 text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            Modo Edição Ativo
          </div>
        )}
      </div>

      <div className="space-y-4">
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
              {WORLD_CUP_2026_ROUNDS.flatMap(r => r.matches).map((match) => (
                <ResultRow 
                  key={match.id} 
                  match={match} 
                  savedResult={results[match.id]} 
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-4">
          {WORLD_CUP_2026_ROUNDS.flatMap(r => r.matches).map((match) => (
            <ResultCard
              key={match.id}
              match={match}
              savedResult={results[match.id]}
            />
          ))}
        </div>
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

function ResultCard({ match, savedResult }: { match: Match; savedResult: { home: number; away: number } | undefined; }) {
  return (
    <div className="glass-dark p-6 rounded-[2rem] border-white/5 space-y-6">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
          Grupo {match.group}
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
          <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
            <span className="text-lg font-black text-white">{savedResult?.home ?? '-'}</span>
            <span className="text-white/20">-</span>
            <span className="text-lg font-black text-white">{savedResult?.away ?? '-'}</span>
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

function ResultRow({ match, savedResult }: { match: Match; savedResult: { home: number; away: number } | undefined; }) {
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
          
          <div className="flex items-center justify-center gap-2 min-w-[110px]">
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <span className="text-xl font-black text-white">{savedResult?.home ?? '-'}</span>
              <span className="text-white/20 font-bold">-</span>
              <span className="text-xl font-black text-white">{savedResult?.away ?? '-'}</span>
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
