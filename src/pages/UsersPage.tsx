import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { UserCheck, UserX, ShieldCheck, Mail, Calendar, Search } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  display_name: string;
  photo_url: string;
  approved?: boolean;
  last_login: string;
}

export default function UsersPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [leagueData, setLeagueData] = useState<any>(null);
  const currentLeagueId = localStorage.getItem('currentLeagueId');

  useEffect(() => {
    if (!currentUser || !currentLeagueId) return;

    const fetchData = async () => {
      try {
        // 1. Check League Ownership
        const { data: league, error: lError } = await supabase
          .from('leagues')
          .select('*')
          .eq('id', currentLeagueId)
          .single();
        
        if (league) {
          setLeagueData(league);
          setIsOwner(league.owner_id === currentUser.id);
        }

        // 2. Fetch Users (Members of this league)
        // If global admin, maybe show all users? For now, let's stick to league members for simplicity
        const { data: members, error: mError } = await supabase
          .from('league_members')
          .select('user_id, users(*)')
          .eq('league_id', currentLeagueId);

        if (members) {
          const userList = members.map((m: any) => m.users as UserData);
          setUsers(userList);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const sub = supabase
      .channel('users_page')
      .on('postgres_changes', { event: '*', table: 'league_members', filter: `league_id=eq.${currentLeagueId}` }, fetchData)
      .on('postgres_changes', { event: '*', table: 'users' }, fetchData)
      .subscribe();

    return () => {
      sub.unsubscribe();
    };
  }, [currentUser, currentLeagueId, isAdmin]);

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ approved: !currentStatus })
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error("Error updating approval:", error);
    }
  };

  if (!isAdmin && !isOwner) return <div className="p-20 text-center text-white/20 font-black uppercase tracking-widest">Acesso Negado</div>;
  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  const filteredUsers = users.filter(u =>
    u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <h1 className="text-3xl font-black text-white font-lexend tracking-tight uppercase mb-2">
            Gestão de <span className="text-primary">Participantes</span>
          </h1>
          <p className="text-white/50 font-medium">Aprove ou remova competidores do seu bolão.</p>
        </div>

        {leagueData && (
          <div className="glass-dark p-6 rounded-[2rem] border-white/5 space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Ocupação do Bolão</span>
              <span className="text-xs font-black text-white">
                {users.length} / {leagueData.maxParticipants || 10}
              </span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(users.length / (leagueData.maxParticipants || 10)) * 100}%` }}
                className={`h-full rounded-full ${users.length >= (leagueData.maxParticipants || 10) ? 'bg-red-500' : 'bg-primary'
                  }`}
              />
            </div>
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">
              {users.length >= (leagueData.maxParticipants || 10)
                ? 'Limite atingido! Faça upgrade para liberar mais slots.'
                : `${(leagueData.maxParticipants || 10) - users.length} slots disponíveis no seu plano`}
            </p>
          </div>
        )}
      </div>

      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-primary transition-all text-white"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {filteredUsers.map((user) => (
            <motion.div
              layout
              key={user.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`glass-dark p-6 rounded-[2rem] border transition-all flex items-center justify-between gap-4 ${user.approved ? 'border-primary/20 bg-primary/5' : 'border-white/5'}`}
            >
              <div className="flex items-center gap-4 flex-1 overflow-hidden">
                <div className="relative">
                  <img src={user.photo_url} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-white/10" />
                  {user.approved && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full border-2 border-dark flex items-center justify-center text-dark">
                      <ShieldCheck size={12} />
                    </div>
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="font-bold text-white truncate">{user.display_name}</p>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                      <Mail size={10} />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                      <Calendar size={10} />
                      <span>Log: {new Date(user.last_login).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleToggleApproval(user.id, user.approved || false)}
                className={`
                  flex flex-col items-center justify-center gap-1 w-24 h-24 rounded-2xl transition-all font-black text-[9px] uppercase tracking-widest border
                  ${user.approved
                    ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'
                    : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-dark'
                  }
                `}
              >
                {user.approved ? (
                  <>
                    <UserX size={20} />
                    Bloquear
                  </>
                ) : (
                  <>
                    <UserCheck size={20} />
                    Aprovar
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-20 glass-dark rounded-[3rem] border-white/5">
          <p className="text-white/20 font-black uppercase tracking-widest">Nenhum participante encontrado</p>
        </div>
      )}
    </div>
  );
}
