import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useLeague } from '../hooks/useLeague';
import { Plus, Users, LogIn, Shield, Trophy, ArrowRight, CheckCircle2, Trash2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface League {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  members_count: number;
  is_owner: boolean;
}

interface LeagueResponse {
  league_id: string;
  leagues: {
    id: string;
    name: string;
    owner_id: string;
    invite_code: string;
    members: { count: number }[];
  };
}

export default function LeaguesPage() {
  const { 
    user, 
    hasLicense, 
    maxLeaguesAllowed, 
    maxParticipantsAllowed 
  } = useAuth();
  const { setLeague } = useLeague();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [ownedLeaguesCount, setOwnedLeaguesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [leagueName, setLeagueName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    fetchLeagues();
  }, [user]);

  const fetchLeagues = async () => {
    try {
      const { data: userLeagues, error: leaguesError } = await supabase
        .from('league_members')
        .select(`
          league_id,
          leagues (
            id,
            name,
            owner_id,
            invite_code,
            members: league_members(count)
          )
        `)
        .eq('user_id', user?.id);

      if (leaguesError) throw leaguesError;

      const leagueList: League[] = ((userLeagues as unknown) as LeagueResponse[] || []).map(ul => ({
        id: ul.leagues.id,
        name: ul.leagues.name,
        owner_id: ul.leagues.owner_id,
        invite_code: ul.leagues.invite_code,
        members_count: ul.leagues.members[0].count,
        is_owner: ul.leagues.owner_id === user?.id
      }));

      setLeagues(leagueList);
      setOwnedLeaguesCount(leagueList.filter(l => l.is_owner).length);
    } catch (err) {
      console.error("Error fetching leagues:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueName.trim() || !user) return;

    setSubmitting(true);
    setError('');

    try {
      // Gera código único pseudo-aleatório de 8 caracteres (base 36)
      // O espaço amostral é enorme, tornando a colisão estatisticamente irrelevante
      const generatedCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      // 1. Create league
      const { data: newLeague, error: createError } = await supabase
        .from('leagues')
        .insert({
          name: leagueName,
          owner_id: user.id,
          invite_code: generatedCode,
          max_participants: maxParticipantsAllowed
        })
        .select()
        .single();

      if (createError) throw createError;

      // 2. Add owner as member
      const { error: memberError } = await supabase
        .from('league_members')
        .insert({
          league_id: newLeague.id,
          user_id: user.id
        });

      if (memberError) throw memberError;

      setLeagues([...leagues, {
        id: newLeague.id,
        name: newLeague.name,
        owner_id: newLeague.owner_id,
        invite_code: newLeague.invite_code,
        members_count: 1,
        is_owner: true
      }]);
      setOwnedLeaguesCount(prev => prev + 1);
      setShowCreateModal(false);
      setLeagueName('');

      // Auto-select the newly created league
      setLeague(newLeague.id);
      navigate('/palpites');
    } catch (err: any) {
      console.error("Error creating league:", err);
      if (err.message?.includes('LEAGUE_LIMIT')) {
        setError('Você atingiu o limite de bolões do seu plano.');
      } else {
        setError('Erro ao criar a liga. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !user) return;

    setSubmitting(true);
    setError('');

    try {
      // 1. Find the league by invite code (inclui max_participants)
      const { data: league, error: findError } = await supabase
        .from('leagues')
        .select('id, name, owner_id, invite_code, max_participants')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single();

      if (findError || !league) {
        setError('Código de convite inválido.');
        setSubmitting(false);
        return;
      }

      // 2. Verifica capacidade máxima (validação no cliente — trigger no banco garante atomicidade)
      if (league.max_participants) {
        const { count: currentCount } = await supabase
          .from('league_members')
          .select('*', { count: 'exact', head: true })
          .eq('league_id', league.id);

        if ((currentCount ?? 0) >= league.max_participants) {
          setError(`Esta liga já atingiu o limite de ${league.max_participants} participantes.`);
          setSubmitting(false);
          return;
        }
      }

      // 2. Check if already a member
      const { data: existingMember } = await supabase
        .from('league_members')
        .select('user_id')
        .eq('league_id', league.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        setError('Você já faz parte desta liga.');
        setSubmitting(false);
        return;
      }

      // 3. Add member
      const { error: joinError } = await supabase
        .from('league_members')
        .insert({
          league_id: league.id,
          user_id: user.id
        });

      if (joinError) throw joinError;

      // 4. Get updated count
      const { count } = await supabase
        .from('league_members')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', league.id);

      setLeagues([...leagues, {
        id: league.id,
        name: league.name,
        owner_id: league.owner_id,
        invite_code: league.invite_code,
        members_count: count || 0,
        is_owner: league.owner_id === user.id
      }]);
      setShowJoinModal(false);
      setInviteCode('');

      // Auto-select the joined league
      setLeague(league.id);
      navigate('/palpites');
    } catch (err) {
      console.error("Error joining league:", err);
      setError('Erro ao entrar na liga. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectLeague = (leagueId: string) => {
    setLeague(leagueId);
    navigate('/app/palpites');
  };

  const handleLeaveLeague = async (leagueId: string, isOwner: boolean) => {
    if (isOwner) {
      const ok = window.confirm('Você é o dono desta liga. Ao sair, a liga e todos os dados serão EXCLUÍDOS permanentemente. Confirma?');
      if (!ok) return;
      // Exclusão em cascata (league_members, predictions, leagues)
      const { error } = await supabase.from('leagues').delete().eq('id', leagueId);
      if (error) { alert('Erro ao excluir liga: ' + error.message); return; }
    } else {
      const ok = window.confirm('Deseja sair desta liga? Seus palpites nela serão removidos.');
      if (!ok) return;
      const { error } = await supabase
        .from('league_members')
        .delete()
        .eq('league_id', leagueId)
        .eq('user_id', user?.id);
      if (error) { alert('Erro ao sair da liga: ' + error.message); return; }
    }
    setLeagues(prev => prev.filter(l => l.id !== leagueId));
    if (localStorage.getItem('currentLeagueId') === leagueId) {
      localStorage.removeItem('currentLeagueId');
    }
  };

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-black text-white font-lexend tracking-tighter uppercase">
          Minhas <span className="text-primary">Ligas</span>
        </h1>
        <p className="text-white/40 font-medium max-w-lg mx-auto">
          Crie seu próprio bolão ou entre em um existente com o código de convite dos seus amigos.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create League Card */}
        <motion.button
          whileHover={ownedLeaguesCount < maxLeaguesAllowed ? { y: -5 } : {}}
          onClick={() => {
            if (ownedLeaguesCount < maxLeaguesAllowed) {
              setShowCreateModal(true);
            } else {
              alert(hasLicense ? "Você atingiu o limite de bolões do seu plano." : "Apenas usuários com código de acesso podem criar bolões.");
            }
          }}
          className={`flex flex-col items-center justify-center gap-6 p-10 glass-dark rounded-[3rem] border transition-all group ${ownedLeaguesCount < maxLeaguesAllowed
              ? 'border-white/5 hover:border-primary/20'
              : 'border-red-500/10 opacity-60 grayscale cursor-not-allowed'
            }`}
        >
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-transform ${ownedLeaguesCount < maxLeaguesAllowed ? 'bg-primary/10 group-hover:scale-110' : 'bg-white/5'
            }`}>
            <Plus className={`${ownedLeaguesCount < maxLeaguesAllowed ? 'text-primary' : 'text-white/20'} w-10 h-10`} />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-white uppercase mb-2">Criar Novo Bolão</h2>
            <p className="text-white/40 text-sm">
              {ownedLeaguesCount < maxLeaguesAllowed
                ? `Você pode criar mais ${maxLeaguesAllowed - ownedLeaguesCount} bolão(ões)`
                : hasLicense
                  ? "Limite do plano atingido"
                  : "Requer código de acesso"}
            </p>
          </div>
        </motion.button>

        {/* Join League Card */}
        <motion.button
          whileHover={{ y: -5 }}
          onClick={() => setShowJoinModal(true)}
          className="flex flex-col items-center justify-center gap-6 p-10 glass-dark rounded-[3rem] border-white/5 hover:border-secondary/20 transition-all group"
        >
          <div className="w-20 h-20 bg-secondary/10 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <LogIn className="text-secondary w-10 h-10" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-white uppercase mb-2">Entrar em um Bolão</h2>
            <p className="text-white/40 text-sm">Use um código de convite</p>
          </div>
        </motion.button>
      </div>

      {leagues.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-end px-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Ligas que participo</h2>
            <span className="text-[10px] font-medium text-white/20">{leagues.length} {leagues.length === 1 ? 'liga' : 'ligas'}</span>
          </div>

          <div className="grid gap-4">
            {leagues.map((league) => (
              <motion.div
                key={league.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-dark p-6 rounded-[2rem] border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 text-primary">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white uppercase">{league.name}</h3>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/40">
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {league.members_count} membros
                      </span>
                      {league.is_owner && (
                        <span className="flex items-center gap-1 text-primary/60">
                          <Shield size={12} /> Dono
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex-1 sm:flex-none px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-center">
                    <p className="text-[8px] font-black text-white/20 uppercase mb-0.5">Código</p>
                    <p className="text-sm font-mono font-black text-white tracking-widest">{league.invite_code}</p>
                  </div>
                  <button
                    onClick={() => selectLeague(league.id)}
                    className="flex-1 sm:flex-none px-6 py-3 bg-primary text-dark font-black rounded-xl uppercase text-xs tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2"
                  >
                    Entrar <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => handleLeaveLeague(league.id, league.is_owner)}
                    title={league.is_owner ? 'Excluir liga' : 'Sair da liga'}
                    className={`p-3 rounded-xl border transition-all ${
                      league.is_owner
                        ? 'border-red-500/20 text-red-500 hover:bg-red-500/10'
                        : 'border-white/10 text-white/30 hover:text-white/60'
                    }`}
                  >
                    {league.is_owner ? <Trash2 size={16} /> : <LogOut size={16} />}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-dark/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass-dark p-8 rounded-[3rem] border border-white/10 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-white uppercase mb-6">Criar Novo Bolão</h2>
              <form onSubmit={handleCreateLeague} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4 mb-2 block">
                    Nome da Liga
                  </label>
                  <input
                    type="text"
                    required
                    value={leagueName}
                    onChange={(e) => setLeagueName(e.target.value)}
                    placeholder="Ex: Bolão da Firma, Amigos do Futebol..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-primary text-dark font-black rounded-2xl uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Criando...' : 'Criar Bolão'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Join Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowJoinModal(false)}
              className="absolute inset-0 bg-dark/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass-dark p-8 rounded-[3rem] border border-white/10 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-white uppercase mb-6">Entrar em um Bolão</h2>
              <form onSubmit={handleJoinLeague} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4 mb-2 block">
                    Código de Convite
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="DIGITE O CÓDIGO AQUI"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-mono font-black text-2xl text-center focus:outline-none focus:border-secondary transition-all"
                  />
                </div>

                {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-secondary text-dark font-black rounded-2xl uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Verificando...' : 'Entrar no Bolão'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
