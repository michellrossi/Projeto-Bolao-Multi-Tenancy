import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false, isApproved: false });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUserChange(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUserChange(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUserChange = async (user: User | null) => {
    try {
      setUser(user);
      if (user) {
        // Check Admin
        const { data: adminDoc } = await supabase
          .from('admins')
          .select('email')
          .eq('email', user.email)
          .single();

        const isAdminUser = !!adminDoc || user.email === 'mionmic@gmail.com';
        setIsAdmin(isAdminUser);

        // Check Approval (Admins are always approved)
        if (isAdminUser) {
          setIsApproved(true);
        } else {
          const { data: userData, error } = await supabase
            .from('users')
            .select('approved')
            .eq('id', user.id)
            .single();
          
          if (error && error.code === 'PGRST116') { // PGRST116 means not found
            // Auto-create missing user document in Supabase
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
          } else {
            setIsApproved(userData?.approved === true);
          }
        }
      } else {
        setIsAdmin(false);
        setIsApproved(false);
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isApproved }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
