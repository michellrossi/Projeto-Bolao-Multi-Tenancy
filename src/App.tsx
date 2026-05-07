import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './hooks/useAuth';
import { BlockedUser } from './components/BlockedUser';

export default function App() {
  const { user, loading, isApproved, currentLeagueId } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Regra 5: Se bloqueado, impede acesso a tudo
  if (!isApproved) {
    return <BlockedUser />;
  }

  const hasValidLeague = currentLeagueId && currentLeagueId !== 'null' && currentLeagueId !== 'undefined';
  
  // Regras 2 e 3: Se não tiver liga válida, força ficar na página de ligas
  if (!hasValidLeague && location.pathname !== '/ligas') {
    return <Navigate to="/ligas" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
