import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  arrayUnion,
  getDoc
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Plus, Users, LogIn, Shield, Trophy, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface League {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  members: string[];
}

export default function LeaguesPage() {
  const { user, setLeagueId } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
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
      const q = query(collection(db, 'leagues'), where('members', 'array-contains', user?.uid));
      const querySnapshot = await getDocs(q);
      const leagueList: League[] = [];
      let isAnyOwner = false;
      querySnapshot.forEach((doc) => {
        const data = doc.data() as League;
        leagueList.push({ id: doc.id, ...data });
        if (data.ownerId === user?.uid) isAnyOwner = true;
      });

      if (isAnyOwner && user) {
        import('../lib/firebase').then(({ db }) => {
          import('firebase/firestore').then(({ doc, updateDoc }) => {
            updateDoc(doc(db, 'users', user.uid), { isOwner: true });
          });
        });
      }
      setLeagues(leagueList);
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
      // Generate a unique invite code
      const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const leagueData = {
        name: leagueName,
        ownerId: user.uid,
        inviteCode: generatedCode,
        members: [user.uid],
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'leagues'), leagueData);
      
      // Marcar o usuário como dono no documento de perfil dele (para regras de segurança)
      await updateDoc(doc(db, 'users', user.uid), {
        isOwner: true
      });
      
      setLeagues([...leagues, { id: docRef.id, ...leagueData }]);
      setShowCreateModal(false);
      setLeagueName('');
      
      // Auto-select the newly created league
      setLeagueId(docRef.id);
      navigate('/palpites');
    } catch (err) {
      console.error("Error creating league:", err);
      setError('Erro ao criar a liga. Tente novamente.');
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
      const q = query(collection(db, 'leagues'), where('inviteCode', '==', inviteCode.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Código de convite inválido.');
        setSubmitting(false);
        return;
      }

      const leagueDoc = querySnapshot.docs[0];
      const leagueData = leagueDoc.data() as League;

      if (leagueData.members.includes(user.uid)) {
        setError('Você já faz parte desta liga.');
        setSubmitting(false);
        return;
      }

      await updateDoc(doc(db, 'leagues', leagueDoc.id), {
        members: arrayUnion(user.uid)
      });

      setLeagues([...leagues, { id: leagueDoc.id, ...leagueData, members: [...leagueData.members, user.uid] }]);
      setShowJoinModal(false);
      setInviteCode('');
      
      // Auto-select the joined league
      setLeagueId(leagueDoc.id);
      navigate('/palpites');
    } catch (err: any) {
      console.error("Error joining league details:", err);
      setError(`Erro ao entrar na liga: ${err.message || 'Tente novamente.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const { user, setLeagueId } = useAuth();
// ...
      // Auto-select the newly created league
      setLeagueId(docRef.id);
      navigate('/palpites');
// ...
      // Auto-select the joined league
      setLeagueId(leagueDoc.id);
      navigate('/palpites');
// ...
  const selectLeague = (leagueId: string) => {
    setLeagueId(leagueId);
    navigate('/palpites');
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
          whileHover={{ y: -5 }}
          onClick={() => setShowCreateModal(true)}
          className="flex flex-col items-center justify-center gap-6 p-10 glass-dark rounded-[3rem] border-white/5 hover:border-primary/20 transition-all group"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="text-primary w-10 h-10" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-white uppercase mb-2">Criar Novo Bolão</h2>
            <p className="text-white/40 text-sm">Seja o dono e convide sua galera</p>
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
                        <Users size={12} /> {league.members.length} membros
                      </span>
                      {league.ownerId === user?.uid && (
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
                    <p className="text-sm font-mono font-black text-white tracking-widest">{league.inviteCode}</p>
                  </div>
                  <button
                    onClick={() => selectLeague(league.id)}
                    className="flex-1 sm:flex-none px-6 py-3 bg-primary text-dark font-black rounded-xl uppercase text-xs tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2"
                  >
                    Entrar <ArrowRight size={16} />
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
