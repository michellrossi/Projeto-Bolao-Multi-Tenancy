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
  currentLeagueId: string | null;
  setLeagueId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isApproved: false,
  hasLicense: false,
  maxLeaguesAllowed: 1, // Bronze default
  maxParticipantsAllowed: 10, // Bronze default
  currentLeagueId: null,
  setLeagueId: () => { }
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [hasLicense, setHasLicense] = useState(false);
  const [maxLeaguesAllowed, setMaxLeaguesAllowed] = useState(1);
  const [maxParticipantsAllowed, setMaxParticipantsAllowed] = useState(10);
  const [loading, setLoading] = useState(true);
  const [currentLeagueId, setCurrentLeagueId] = useState<string | null>(localStorage.getItem('currentLeagueId'));

  const setLeagueId = (id: string | null) => {
    if (id) localStorage.setItem('currentLeagueId', id);
    else localStorage.removeItem('currentLeagueId');
    setCurrentLeagueId(id);
  };

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          // Check Admin
          const adminDoc = await getDoc(doc(db, 'admins', user.email || ''));
          const isAdminUser = adminDoc.exists() || user.email === 'mionmic@gmail.com';
          setIsAdmin(isAdminUser);

          // Check Approval (Admins are always approved)
          if (isAdminUser) {
            setIsApproved(true);
          } else {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
              // Auto-create missing user document
              await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0],
                photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                lastLogin: new Date().toISOString(),
                approved: false
              });
              setIsApproved(false);
            } else {
              setIsApproved(userDoc.data()?.approved === true);
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
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isApproved, hasLicense, maxParticipantsAllowed, currentLeagueId, setLeagueId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
