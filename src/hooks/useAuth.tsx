import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  currentLeagueId: string | null;
  setLeagueId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  isAdmin: false, 
  isApproved: false,
  currentLeagueId: null,
  setLeagueId: () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
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
          // Check Global Admin (System Admin)
          const adminDoc = await getDoc(doc(db, 'admins', user.email || ''));
          const isGlobalAdmin = adminDoc.exists() || user.email === 'mionmic@gmail.com';
          setIsAdmin(isGlobalAdmin);

          // Check Approval (Admins are always approved)
          if (isGlobalAdmin) {
            setIsApproved(true);
          } else {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
              await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0],
                photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                lastLogin: new Date().toISOString(),
                approved: true
              });
              setIsApproved(true);
            } else {
              setIsApproved(userDoc.data()?.approved === true);
            }
          }
        } else {
          setIsAdmin(false);
          setIsApproved(false);
          setLeagueId(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isApproved, currentLeagueId, setLeagueId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
