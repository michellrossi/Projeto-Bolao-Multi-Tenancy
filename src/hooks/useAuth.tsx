import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
  setLeagueId: () => {}
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
          // Check Global Admin (System Admin)
          const adminDoc = await getDoc(doc(db, 'admins', user.email || ''));
          const isGlobalAdmin = adminDoc.exists() || user.email === 'mionmic@gmail.com';
          setIsAdmin(isGlobalAdmin);

          // Check Approval and License
          if (isGlobalAdmin) {
            setIsApproved(true);
            setHasLicense(true);
            setMaxLeaguesAllowed(999);
            setMaxParticipantsAllowed(999);
          } else {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              const data = userDoc.data();
              setIsApproved(data?.approved === true);
              setHasLicense(data?.hasLicense === true);
              
              // Se tiver licença, os bolões são ilimitados (exceto Bronze que é 1)
              const plan = data?.planType || 'Bronze';
              setMaxLeaguesAllowed(plan === 'Bronze' ? 1 : 999);
              setMaxParticipantsAllowed(data?.maxParticipantsAllowed || 10);
            } else {
              setIsApproved(true);
              setHasLicense(false);
              setMaxLeaguesAllowed(1);
              setMaxParticipantsAllowed(10);
            }
          }
        } else {
          setIsAdmin(false);
          setIsApproved(false);
          setHasLicense(false);
          setMaxLeaguesAllowed(1);
          setMaxParticipantsAllowed(10);
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
    <AuthContext.Provider value={{ user, loading, isAdmin, isApproved, hasLicense, maxParticipantsAllowed, currentLeagueId, setLeagueId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
