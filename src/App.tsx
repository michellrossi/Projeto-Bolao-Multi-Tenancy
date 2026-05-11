import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { user, loading } = useAuth();
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

  const currentLeagueId = localStorage.getItem('currentLeagueId');

  if (!currentLeagueId && location.pathname !== '/ligas') {
    return <Navigate to="/ligas" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
