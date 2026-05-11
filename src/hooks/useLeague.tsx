import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LeagueContextType {
  currentLeagueId: string | null;
  setLeague: (id: string | null) => void;
}

const LeagueContext = createContext<LeagueContextType>({
  currentLeagueId: null,
  setLeague: () => {},
});

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [currentLeagueId, setCurrentLeagueId] = useState<string | null>(
    localStorage.getItem('currentLeagueId')
  );

  const setLeague = (id: string | null) => {
    if (id) {
      localStorage.setItem('currentLeagueId', id);
    } else {
      localStorage.removeItem('currentLeagueId');
    }
    setCurrentLeagueId(id);
  };

  return (
    <LeagueContext.Provider value={{ currentLeagueId, setLeague }}>
      {children}
    </LeagueContext.Provider>
  );
}

export const useLeague = () => useContext(LeagueContext);
