import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Users, Shield, Zap, ArrowRight, Check, Star, LayoutGrid, BarChart3, MessageCircle, Instagram } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=signup') || hash.includes('type=recovery')) {
      navigate('/login' + hash);
    }
  }, [navigate]);

  const plans = [
    {
      name: "Bronze",
      price: "47",
      participants: 25,
      features: ["Até 25 participantes", "Ranking em tempo real", "Suporte via WhatsApp"],
      popular: true,
      color: "from-orange-500/20 to-orange-500/5"
    },
    {
      name: "Prata",
      price: "97",
      participants: 50,
      features: ["Até 50 participantes", "Ranking em tempo real", "Suporte via WhatsApp"],
      popular: false,
      color: "from-primary/20 to-primary/5"
    },
    {
      name: "Ouro",
      price: "147",
      participants: 100,
      features: ["Até 100 participantes", "Suporte Prioritário", "Acesso vitalício"],
      popular: false,
      color: "from-yellow-500/20 to-yellow-500/5"
    }
  ];

  return (
    <div className="min-h-screen bg-dark text-white overflow-x-hidden font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-dark/80 backdrop-blur-xl border-b border-white/5 px-6 h-20 flex items-center justify-between">
        <img src="https://iili.io/BZG2miP.png" alt="Bolão 2026" className="h-10 w-auto" />
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
          >
            Entrar
          </button>
          <button
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-6 py-2.5 bg-primary text-dark font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg glow-primary"
          >
            Criar Agora
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 blur-[120px] rounded-full -z-10" />

        <div className="max-w-5xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10"
          >
            <Star className="text-yellow-500 w-4 h-4 fill-yellow-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">A maior plataforma de bolões do Brasil</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-8xl font-black font-lexend tracking-tighter leading-[0.9]"
          >
            Sua Copa, Suas Regras. <br />
            <span className="text-primary">Seu Próprio Bolão.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/40 max-w-2xl mx-auto text-lg md:text-xl font-medium leading-relaxed"
          >
            Crie grupos exclusivos, gerencie participantes e acompanhe o ranking em tempo real com a tecnologia mais avançada do mercado.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
          >
            <button
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-10 py-5 bg-primary text-dark font-black rounded-2xl uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-2xl glow-primary"
            >
              Criar meu Bolão <ArrowRight size={20} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-10 py-5 bg-white/5 text-white font-black rounded-2xl uppercase tracking-widest text-sm border border-white/10 hover:bg-white/10 transition-all"
            >
              Entrar em um Bolão
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: LayoutGrid, title: "Ligas Privadas", desc: "Crie grupos exclusivos e gerencie quem pode ver os palpites." },
            { icon: BarChart3, title: "Ranking Live", desc: "Cálculo de pontos instantâneo e ranking dinâmico pós-jogo." },
            { icon: Shield, title: "Gestão Total", desc: "Aprove ou bloqueie participantes. Você é o dono da arena." },
            { icon: Zap, title: "Performance", desc: "Interface ultra-rápida pensada para mobile e web." },
            { icon: Trophy, title: "Mata-Mata", desc: "Suporte completo para fases de grupos e eliminatórias." },
            { icon: Users, title: "Engajamento", desc: "Aumente a interação do seu grupo durante o mundial." }
          ].map((f, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="glass-dark p-8 rounded-[2.5rem] border-white/5 space-y-4"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <f.icon size={24} />
              </div>
              <h3 className="font-black uppercase tracking-tight text-lg">{f.title}</h3>
              <p className="text-white/40 text-sm font-medium leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-[120px] -z-10" />

        <div className="max-w-5xl mx-auto text-center space-y-16">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-black font-lexend tracking-tighter uppercase">Escolha seu <span className="text-primary">Pacote</span></h2>
            <p className="text-white/40 font-medium">Planos sob medida para o tamanho da sua galera.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-end">
            {plans.map((p, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className={`relative glass-dark p-10 rounded-[3rem] border transition-all ${p.popular ? 'border-primary shadow-[0_0_50px_rgba(0,255,133,0.15)] scale-105 z-10' : 'border-white/5'}`}
              >
                {p.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-dark text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                    Mais Popular
                  </div>
                )}

                <div className={`absolute inset-0 bg-gradient-to-b ${p.color} -z-10 rounded-[3rem] opacity-30`} />

                <div className="space-y-6 text-center">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/40">{p.name}</h3>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-black text-white/40">R$</span>
                    <span className="text-6xl font-black text-white leading-none">{p.price}</span>
                  </div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Pagamento Único</p>

                  <div className="h-[1px] bg-white/5 w-full" />

                  <ul className="space-y-4 py-4">
                    {p.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-3 text-xs font-medium text-white/60">
                        <Check size={14} className="text-primary" /> {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => navigate('/checkout', { state: { plan: p } })}
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${p.popular ? 'bg-primary text-dark shadow-xl glow-primary' : 'bg-white/5 text-white hover:bg-white/10'}`}
                  >
                    Adquirir Acesso
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 bg-black/40">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="space-y-4 text-center md:text-left">
            <img src="https://iili.io/BZG2miP.png" alt="Logo" className="h-12 w-auto mx-auto md:mx-0" />
            <p className="text-white/20 text-xs font-medium max-w-xs">
              A maior plataforma de bolões para a Copa do Mundo 2026. <br />
              © 2026 Bolão 2026. Todos os direitos reservados.
            </p>
          </div>
          <div className="flex gap-8">
            <a href="https://instagram.com/mestrecopa" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-primary transition-colors">
              <Instagram />
            </a>
            <a href="#" className="text-white/40 hover:text-primary transition-colors"><MessageCircle /></a>
            <a href="#" className="text-white/40 hover:text-primary transition-colors"><Star /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
