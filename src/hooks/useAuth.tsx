import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  hasLicense: boolean;
  maxLeaguesAllowed: number;
  maxParticipantsAllowed: number;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isApproved: false,
  hasLicense: false,
  maxLeaguesAllowed: 0,
  maxParticipantsAllowed: 0,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [hasLicense, setHasLicense] = useState(false);
  const [maxLeaguesAllowed, setMaxLeaguesAllowed] = useState(0);
  const [maxParticipantsAllowed, setMaxParticipantsAllowed] = useState(0);
  const [loading, setLoading] = useState(true);

  // Caso especial para o Modo Demo (Visitante sem login)
  const isDemoMode = localStorage.getItem('currentLeagueId') === '99999999-9999-9999-9999-999999999999';
  const demoUser = isDemoMode ? {
    id: '00000000-0000-0000-0000-000000000000',
    email: 'visitante@demo.com',
    user_metadata: { full_name: 'Visitante (Demo)', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo' }
  } as User : null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUserChange(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUserChange(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Real-time listener for profile changes (license, approval, etc)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile_changes_${user.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        table: 'users', 
        filter: `id=eq.${user.id}` 
      }, () => {
        handleUserChange(user);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const handleUserChange = async (user: User | null) => {
    try {
      setUser(user);
      if (user) {
        // FIX #1: Admin verificado APENAS pela tabela admins — sem e-mail hardcoded
        const { data: adminDoc } = await supabase
          .from('admins')
          .select('email')
          .eq('email', user.email)
          .maybeSingle();

        const isAdminUser = !!adminDoc;
        setIsAdmin(isAdminUser);

        if (isAdminUser) {
          setIsApproved(true);
          setHasLicense(true);
        } else {
          const { data: userData } = await supabase
            .from('users')
            .select('approved, has_license, max_leagues_allowed, max_participants_allowed')
            .eq('id', user.id)
            .maybeSingle();

          if (!userData) {
            // Usuário existe no Auth mas não na tabela users (trigger falhou) — auto-cria via upsert
            const { data: newUser } = await supabase
              .from('users')
              .upsert({
                id: user.id,
                email: user.email,
                display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
                photo_url: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
                approved: false
              }, { onConflict: 'id' })
              .select('approved, has_license, max_leagues_allowed, max_participants_allowed')
              .single();

            setIsApproved(newUser?.approved === true);
            setHasLicense(newUser?.has_license === true);
            setMaxLeaguesAllowed(newUser?.max_leagues_allowed || 0);
            setMaxParticipantsAllowed(newUser?.max_participants_allowed || 0);
          } else {
            setIsApproved(userData?.approved === true);
            setHasLicense(userData?.has_license === true);
            setMaxLeaguesAllowed(userData?.max_leagues_allowed || 0);
            setMaxParticipantsAllowed(userData?.max_participants_allowed || 0);
          }
        }
      } else {
        setIsAdmin(false);
        setIsApproved(false);
        setHasLicense(false);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user: user || demoUser,
      loading,
      isAdmin: isDemoMode ? false : isAdmin,
      isApproved: isDemoMode ? true : isApproved,
      hasLicense: isDemoMode ? true : hasLicense,
      maxLeaguesAllowed: isDemoMode ? 1 : maxLeaguesAllowed,
      maxParticipantsAllowed: isDemoMode ? 100 : maxParticipantsAllowed,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
