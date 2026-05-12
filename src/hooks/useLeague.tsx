import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface LeagueContextType {
  currentLeagueId: string | null;
  setLeague: (id: string | null) => void;
  isApproved: boolean;
  loading: boolean;
}

const LeagueContext = createContext<LeagueContextType>({
  currentLeagueId: null,
  setLeague: () => {},
  isApproved: false,
  loading: true,
});

export function LeagueProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [currentLeagueId, setCurrentLeagueId] = useState<string | null>(
    localStorage.getItem('currentLeagueId')
  );
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !currentLeagueId) {
      setIsApproved(false);
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      if (isAdmin) {
        setIsApproved(true);
        setLoading(false);
        return;
      }

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
      setLoading(false);
    };

    fetchStatus();

    // Listener em tempo real para mudanças de status na liga
    const channel = supabase
      .channel(`member_status_${currentLeagueId}_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        table: 'league_members',
        filter: `league_id=eq.${currentLeagueId}`
      }, (payload: any) => {
        if (payload.new && payload.new.user_id === user.id) {
          setIsApproved(payload.new.status === 'approved');
        }
        // Se o registro foi deletado (usuário saiu ou foi removido)
        if (payload.eventType === 'DELETE' && payload.old.user_id === user.id) {
          setIsApproved(false);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentLeagueId, user, isAdmin]);

  const setLeague = (id: string | null) => {
    if (id) {
      localStorage.setItem('currentLeagueId', id);
    } else {
      localStorage.removeItem('currentLeagueId');
    }
    setCurrentLeagueId(id);
    setLoading(true);
  };

  return (
    <LeagueContext.Provider value={{ currentLeagueId, setLeague, isApproved, loading }}>
      {children}
    </LeagueContext.Provider>
  );
}

export const useLeague = () => useContext(LeagueContext);
