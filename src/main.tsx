import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App.tsx';
import { LoginPage } from './pages/LoginPage';
import PredictionsPage from './pages/PredictionsPage';
import GroupsPage from './pages/GroupsPage';
import TablePage from './pages/TablePage';
import RankingPage from './pages/RankingPage';
import UsersPage from './pages/UsersPage';
import RulesPage from './pages/RulesPage';
import LeaguesPage from './pages/LeaguesPage';
import LandingPage from './pages/LandingPage';
import CheckoutPage from './pages/CheckoutPage';
import { AuthProvider } from './hooks/useAuth';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/checkout',
    element: <CheckoutPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/app',
    element: <App />,
    children: [
      { path: '/app', element: <Navigate to="/app/palpites" /> },
      { path: '/app/palpites', element: <PredictionsPage /> },
      { path: '/app/tabela', element: <TablePage /> },
      { path: '/app/grupos', element: <GroupsPage /> },
      { path: '/app/ranking', element: <RankingPage /> },
      { path: '/app/usuarios', element: <UsersPage /> },
      { path: '/app/regras', element: <RulesPage /> },
      { path: '/app/ligas', element: <LeaguesPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
