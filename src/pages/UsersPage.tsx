import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useLeague } from '../hooks/useLeague';
import { useLeagueMembers } from '../hooks/useLeagueMembers';
import { UserCheck, UserX, ShieldCheck, Mail, Calendar, Search, Trash2 } from 'lucide-react';
import type { UserProfile } from '../lib/types';

export default function UsersPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const { currentLeagueId } = useLeague();
  const { members, leagueData, loading, mutate } = useLeagueMembers(currentLeagueId);
  const [search, setSearch] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  // Verifica se é dono da liga
  useEffect(() => {
    if (leagueData && currentUser) {
      setIsOwner(leagueData.owner_id === currentUser.id);
    }
  }, [leagueData, currentUser]);

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    if (!currentLeagueId) return;
    try {
      const { error } = await supabase
        .from('league_members')
        .update({ status: currentStatus ? 'pending' : 'approved' })
        .eq('league_id', currentLeagueId)
        .eq('user_id', id);
      if (error) throw error;
      
      // Atualiza a lista imediatamente
      mutate();
    } catch (error) {
      console.error('Error updating approval:', error);
    }
  };
  const handleDeleteParticipant = async (id: string) => {
    if (!currentLeagueId) return;
    if (!confirm('Tem certeza que deseja excluir este participante? Esta ação não pode ser desfeita e ele perderá o acesso à liga.')) return;
    
    try {
      const { error } = await supabase
        .from('league_members')
        .delete()
        .eq('league_id', currentLeagueId)
        .eq('user_id', id);
        
      if (error) throw error;
      
      mutate();
    } catch (error) {
      console.error('Error deleting participant:', error);
    }
  };
  if (!isAdmin && !isOwner) {
    return (
      <div className="p-20 text-center text-white/20 font-black uppercase tracking-widest">
        Acesso Negado
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const filteredMembers = members.filter(u =>
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
          <OccupancyCard
            current={members.length}
            max={leagueData.max_participants ?? 15}
          />
        )}
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-primary transition-all text-white"
        />
      </div>

      {/* Member cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {filteredMembers.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              onToggleApproval={handleToggleApproval}
              onDelete={handleDeleteParticipant}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-20 glass-dark rounded-[3rem] border-white/5">
          <p className="text-white/20 font-black uppercase tracking-widest">Nenhum participante encontrado</p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function OccupancyCard({ current, max }: { current: number; max: number }) {
  const pct = Math.min((current / max) * 100, 100);
  return (
    <div className="glass-dark p-6 rounded-[2rem] border-white/5 space-y-3">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Ocupação do Bolão</span>
        <span className="text-xs font-black text-white">{current} / {max}</span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          className={`h-full rounded-full ${current >= max ? 'bg-red-500' : 'bg-primary'}`}
        />
      </div>
      <p className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">
        {current >= max
          ? 'Limite atingido! Faça upgrade para liberar mais slots.'
          : `${max - current} slots disponíveis no seu plano`}
      </p>
    </div>
  );
}

function MemberCard({
  member,
  onToggleApproval,
  onDelete,
}: {
  member: UserProfile;
  onToggleApproval: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`glass-dark p-6 rounded-[2rem] border transition-all flex items-center justify-between gap-4 ${
        member.approved ? 'border-primary/20 bg-primary/5' : 'border-white/5'
      }`}
    >
      <div className="flex items-center gap-4 flex-1 overflow-hidden">
        <div className="relative">
          <img
            src={member.photo_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${member.id}`}
            alt=""
            className="w-14 h-14 rounded-2xl object-cover border-2 border-white/10"
          />
          {member.approved && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full border-2 border-dark flex items-center justify-center text-dark">
              <ShieldCheck size={12} />
            </div>
          )}
        </div>
        <div className="overflow-hidden">
          <p className="font-bold text-white truncate">{member.display_name}</p>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-[10px] text-white/40">
              <Mail size={10} />
              <span className="truncate">{member.email}</span>
            </div>
            {member.last_login && (
              <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                <Calendar size={10} />
                <span>Log: {new Date(member.last_login).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => onToggleApproval(member.id, member.approved)}
          className={`flex items-center justify-center gap-2 w-28 h-10 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest border ${
            member.approved
              ? 'bg-orange-500/10 border-orange-500/20 text-orange-500 hover:bg-orange-500 hover:text-white'
              : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-dark'
          }`}
        >
          {member.approved ? (
            <><UserX size={14} />Bloquear</>
          ) : (
            <><UserCheck size={14} />Aprovar</>
          )}
        </button>
        <button
          onClick={() => onDelete(member.id)}
          className="flex items-center justify-center gap-2 w-28 h-10 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest border bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
        >
          <Trash2 size={14} />
          Excluir
        </button>
      </div>
    </motion.div>
  );
}
