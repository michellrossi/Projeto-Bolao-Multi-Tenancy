import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface LeagueContextType {
  currentLeagueId: string | null;
  setLeague: (id: string | null) => void;
  isApproved: boolean;
  isOwner: boolean;
  loading: boolean;
}

const LeagueContext = createContext<LeagueContextType>({
  currentLeagueId: null,
  setLeague: () => {},
  isApproved: false,
  isOwner: false,
  loading: true,
});

export function LeagueProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [currentLeagueId, setCurrentLeagueId] = useState<string | null>(
    localStorage.getItem('currentLeagueId')
  );
  const [isApproved, setIsApproved] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Se não há usuário ou liga, reseta tudo imediatamente
    if (!user || !currentLeagueId) {
      setIsApproved(false);
      setIsOwner(false);
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      setLoading(true);
      try {
        // 1. Verificar se é dono da liga
        const { data: league } = await supabase
          .from('leagues')
          .select('owner_id')
          .eq('id', currentLeagueId)
          .maybeSingle();
        
        const ownerStatus = league?.owner_id === user.id;
        setIsOwner(ownerStatus);

        // 2. Se for Admin ou Dono, aprovado automaticamente
        if (isAdmin || ownerStatus) {
          setIsApproved(true);
          setLoading(false);
          return;
        }

        // 3. Verificar status de membro
        const { data, error } = await supabase
          .from('league_members')
          .select('status')
          .eq('league_id', currentLeagueId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setIsApproved(data.status === 'approved');
        } else {
          setIsApproved(false);
        }
      } catch (err) {
        console.error('Erro ao buscar status da liga:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Listener em tempo real para mudanças de status na liga
    const channel = supabase
      .channel(`member_status_${currentLeagueId}_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        table: 'league_members',
        filter: `league_id=eq.${currentLeagueId}`
      }, (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
        // Se a mudança for para o usuário atual
        if (payload.new && (payload.new as any).user_id === user.id) {
          setIsApproved((payload.new as any).status === 'approved');
        }
        // Se o registro foi deletado
        if (payload.eventType === 'DELETE' && payload.old && (payload.old as any).user_id === user.id) {
          setIsApproved(false);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        table: 'leagues',
        filter: `id=eq.${currentLeagueId}`
      }, (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
        if (payload.new) {
          setIsOwner((payload.new as any).owner_id === user.id);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentLeagueId, user?.id, isAdmin]); // Usando user?.id para evitar disparos extras

  const setLeague = (id: string | null) => {
    if (id) {
      localStorage.setItem('currentLeagueId', id);
    } else {
      localStorage.removeItem('currentLeagueId');
    }
    setCurrentLeagueId(id);
    // Reset imediato para evitar flicker do estado anterior
    setIsApproved(false);
    setIsOwner(false);
    setLoading(true);
  };

  return (
    <LeagueContext.Provider value={{ currentLeagueId, setLeague, isApproved, isOwner, loading }}>
      {children}
    </LeagueContext.Provider>
  );
}

export const useLeague = () => useContext(LeagueContext);
