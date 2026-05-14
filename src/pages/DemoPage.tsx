import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  CalendarDays, 
  LayoutGrid, 
  BarChart3, 
  Users, 
  ArrowRight, 
  Sparkles,
  Zap,
  ShieldCheck,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import PredictionsPage from './PredictionsPage';
import RankingPage from './RankingPage';
import GroupsPage from './GroupsPage';
import TablePage from './TablePage';
import { useLeague } from '../hooks/useLeague';

const DEMO_LEAGUE_ID = '99999999-9999-9999-9999-999999999999';

export default function DemoPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('palpites');
  const [showConversionModal, setShowConversionModal] = useState(false);
  const { currentLeagueId, setLeague } = useLeague();

  // Forçar o ID da liga no mount para que os hooks das páginas usem a liga demo imediatamente
  useEffect(() => {
    const originalLeagueId = localStorage.getItem('currentLeagueId');
    
    // Pequeno atraso para garantir que o contexto está pronto
    setLeague(DEMO_LEAGUE_ID);
    
    return () => {
      // Ao sair da página demo, restauramos a liga anterior (se houver)
      if (originalLeagueId && originalLeagueId !== DEMO_LEAGUE_ID) {
        setLeague(originalLeagueId);
      } else {
        localStorage.removeItem('currentLeagueId');
      }
    };
  }, []);

  const tabs = [
    { id: 'palpites', name: 'Palpites', icon: CalendarDays },
    { id: 'tabela', name: 'Tabela', icon: BarChart3 },
    { id: 'grupos', name: 'Grupos', icon: LayoutGrid },
    { id: 'ranking', name: 'Ranking', icon: Trophy },
  ];

  const renderContent = () => {
    // Garantir que não renderizamos o conteúdo real até que o ID da liga esteja setado corretamente
    if (currentLeagueId !== DEMO_LEAGUE_ID) {
      return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">Preparando Experiência...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'palpites': return <PredictionsPage />;
      case 'tabela': return <TablePage />;
      case 'grupos': return <GroupsPage />;
      case 'ranking': return <RankingPage />;
      default: return <PredictionsPage />;
    }
  };

  const handleExitDemo = () => {
    localStorage.removeItem('currentLeagueId');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-dark text-white font-sans selection:bg-primary/30 selection:text-primary pb-32">
      {/* Demo Banner */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-primary text-dark py-2 px-6 overflow-hidden">
        <motion.div 
          animate={{ x: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          className="max-w-5xl mx-auto flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="animate-pulse" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">
              Você está no Modo Demonstração — Experimente todas as funcionalidades
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowConversionModal(true)}
              className="bg-dark text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
            >
              Criar Minha Liga Real
            </button>
            <button 
              onClick={handleExitDemo}
              className="bg-white/20 text-dark px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white/30 transition-all"
            >
              Sair
            </button>
          </div>
        </motion.div>
      </div>

      {/* Header Fake */}
      <header className="bg-dark/80 backdrop-blur-xl flex justify-between items-center w-full px-6 h-20 fixed top-8 z-50 border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-4">
          <img src="https://iili.io/BZG2miP.png" alt="Logo" className="h-10 w-auto" />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-2xl">
            <Trophy size={14} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              Liga de Demonstração
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExitDemo}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-all mr-2"
          >
            Sair da Demo
          </button>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black text-white uppercase tracking-tight">Visitante (Demo)</p>
            <p className="text-[8px] font-bold text-primary uppercase tracking-widest">Modo Teste</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 border-2 border-white/10 flex items-center justify-center">
            <Users size={20} className="text-white/20" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-6 pt-36">
        {renderContent()}
      </main>

      {/* Mobile NavBar Fake */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark/90 backdrop-blur-2xl border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] h-20 pb-safe">
        <div className="max-w-5xl mx-auto h-full flex justify-around items-center px-2">
          {tabs.map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${activeTab === tab.id ? 'text-primary' : 'text-white/30 hover:text-white/60'}`}
            >
              <div className={`relative z-10 transition-transform duration-300 ${activeTab === tab.id ? 'scale-110 -translate-y-1' : ''}`}>
                <tab.icon size={20} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-tighter mt-1.5 transition-all duration-300 ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>
                {tab.name}
              </span>
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="demoNavActive"
                  className="absolute top-0 w-12 h-1 bg-primary rounded-b-full shadow-[0_0_15px_rgba(0,148,64,0.5)]"
                />
              )}
            </button>
          ))}
          <button 
            onClick={() => setShowConversionModal(true)}
            className="flex flex-col items-center justify-center flex-1 h-full text-secondary hover:text-secondary/80 transition-all"
          >
            <Zap size={20} />
            <span className="text-[9px] font-black uppercase tracking-tighter mt-1.5">Criar Liga</span>
          </button>
        </div>
      </nav>

      {/* Conversion Modal */}
      <AnimatePresence>
        {showConversionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-dark w-full max-w-lg p-8 rounded-[3rem] border-white/10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-secondary to-primary" />
              
              <button 
                onClick={() => setShowConversionModal(false)}
                className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={40} className="text-primary animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white uppercase tracking-tight leading-none">
                    Gostou da <span className="text-primary">Experiência?</span>
                  </h2>
                  <p className="text-white/40 font-medium">
                    Crie seu próprio bolão oficial agora e convide seus amigos para a disputa!
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 py-6">
                  {[
                    { icon: ShieldCheck, text: "Gestão de Membros" },
                    { icon: Zap, text: "Ranking em Tempo Real" },
                    { icon: Trophy, text: "Até 100 Participantes" },
                    { icon: Users, text: "Ligas Privadas" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
                      <item.icon size={16} className="text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{item.text}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={() => navigate('/')}
                    className="w-full py-5 bg-primary text-dark font-black rounded-2xl uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-2xl glow-primary"
                  >
                    Começar Meu Bolão Agora <ArrowRight size={20} />
                  </button>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                    A partir de apenas R$47 (Pagamento único)
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
