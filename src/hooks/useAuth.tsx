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
  maxLeaguesAllowed: 1,
  maxParticipantsAllowed: 15,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [hasLicense, setHasLicense] = useState(false);
  const [maxLeaguesAllowed, setMaxLeaguesAllowed] = useState(1);
  const [maxParticipantsAllowed, setMaxParticipantsAllowed] = useState(15);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUserChange(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUserChange(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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
            // Usuário existe no Auth mas não na tabela users (trigger falhou) — auto-cria
            const { data: newUser } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email,
                display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
                photo_url: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
                approved: false
              })
              .select()
              .single();

            setIsApproved(newUser?.approved === true);
            setHasLicense(newUser?.has_license === true);
            setMaxLeaguesAllowed(newUser?.max_leagues_allowed || 1);
            setMaxParticipantsAllowed(newUser?.max_participants_allowed || 15);
          } else {
            setIsApproved(userData?.approved === true);
            setHasLicense(userData?.has_license === true);
            setMaxLeaguesAllowed(userData?.max_leagues_allowed || 1);
            setMaxParticipantsAllowed(userData?.max_participants_allowed || 15);
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
      user,
      loading,
      isAdmin,
      isApproved,
      hasLicense,
      maxLeaguesAllowed,
      maxParticipantsAllowed,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
