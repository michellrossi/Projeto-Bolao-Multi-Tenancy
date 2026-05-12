import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './hooks/useAuth';
import { useLeague } from './hooks/useLeague';

export default function App() {
  const { user, loading } = useAuth();
  // FIX #6: Fonte de verdade única para o ID da liga — useLeague (não mais localStorage direto)
  const { currentLeagueId } = useLeague();
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

  if (!currentLeagueId && 
      location.pathname !== '/app/ligas' && 
      location.pathname !== '/app/admin-resultados' && 
      location.pathname !== '/app/perfil') {
    return <Navigate to="/app/ligas" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
