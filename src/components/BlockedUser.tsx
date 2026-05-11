import { ShieldX, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function BlockedUser() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative mx-auto w-24 h-24 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/20">
          <ShieldX className="text-red-500 w-12 h-12" />
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full border-4 border-dark animate-pulse" />
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
            Acesso <span className="text-red-500">Bloqueado</span>
          </h1>
          <p className="text-white/40 font-medium leading-relaxed">
            Ops! Parece que sua participação foi suspensa pelo administrador do sistema ou da liga. 
            Isso pode ter ocorrido por violação das regras ou manutenção.
          </p>
        </div>

        <div className="glass-dark p-6 rounded-[2rem] border-white/5 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/20">O que você pode fazer?</p>
          <div className="flex flex-col gap-3">
            <a 
              href="https://wa.me/" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-green-500 text-dark font-black rounded-2xl uppercase text-xs tracking-widest hover:scale-[1.02] transition-all"
            >
              <MessageCircle size={18} />
              Contatar Administrador
            </a>
            <button 
              onClick={handleSignOut}
              className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all"
            >
              Sair da Conta
            </button>
          </div>
        </div>

        <p className="text-[10px] font-medium text-white/10">Código do Erro: AUTH_USER_SUSPENDED</p>
      </div>
    </div>
  );
}
