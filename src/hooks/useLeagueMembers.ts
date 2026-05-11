import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/types';

/**
 * Hook que busca membros de uma liga com seus perfis.
 * Filtra por league_id — não busca todos os usuários da plataforma.
 */
export function useLeagueMembers(leagueId: string | null) {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [leagueData, setLeagueData] = useState<{ name: string; owner_id: string; max_participants?: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!leagueId || leagueId === 'null' || leagueId === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      // Liga (owner + dados)
      const { data: league } = await supabase
        .from('leagues')
        .select('name, owner_id')
        .eq('id', leagueId)
        .single();

      if (league) setLeagueData(league);

      // Membros: join league_members → users (filtrado por league_id)
      const { data: membersRaw } = await supabase
        .from('league_members')
        .select('users(*)')
        .eq('league_id', leagueId);

      if (membersRaw) {
        const userList = membersRaw
          .map((m: { users: UserProfile }) => m.users)
          .filter(Boolean);
        setMembers(userList);
      }
    } catch (err) {
      console.error('useLeagueMembers — fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    fetchData();

    const sub = supabase
      .channel(`league_members_${leagueId}`)
      .on('postgres_changes', {
        event: '*',
        table: 'league_members',
        filter: `league_id=eq.${leagueId}`,
      }, fetchData)
      .on('postgres_changes', { event: 'UPDATE', table: 'users' }, fetchData)
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [fetchData, leagueId]);

  return { members, leagueData, loading };
}
