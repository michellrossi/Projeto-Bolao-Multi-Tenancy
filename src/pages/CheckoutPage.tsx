import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, CreditCard, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const plan = location.state?.plan || { name: "Prata", price: "97", leagues: 5 };

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    cardNumber: '',
    expiry: '',
    cvc: ''
  });

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create User
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Generate Code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // 3. Save User Data with License Info
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: formData.name,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        createdAt: new Date().toISOString(),
        maxLeaguesAllowed: plan.leagues,
        hasLicense: true,
        approved: true
      });

      // 4. Save Purchase Record
      await addDoc(collection(db, 'purchases'), {
        userId: user.uid,
        plan: plan.name,
        price: plan.price,
        code: code,
        date: new Date().toISOString()
      });

      // 5. Save License Code for reference/validation
      await setDoc(doc(db, 'purchase_codes', code), {
        code: code,
        maxLeagues: plan.leagues,
        usedBy: user.uid,
        usedAt: new Date().toISOString(),
        planType: plan.name,
        status: 'used'
      });

      setGeneratedCode(code);
      setSuccess(true);
    } catch (error: any) {
      console.error("Purchase error:", error);
      alert("Erro ao processar compra: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-dark p-10 rounded-[3rem] border border-primary/20 text-center space-y-8"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="text-primary w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Compra Realizada!</h1>
            <p className="text-white/40">Seu acesso foi liberado com sucesso.</p>
          </div>

          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Seu Código de Ativação</p>
            <p className="text-4xl font-mono font-black text-primary tracking-widest">{generatedCode}</p>
            <p className="text-[9px] text-white/20 uppercase font-bold">Enviamos uma cópia para {formData.email}</p>
          </div>

          <button 
            onClick={() => navigate('/app/ligas')}
            className="w-full py-5 bg-primary text-dark font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl glow-primary"
          >
            Acessar Plataforma
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
        {/* Left: Summary */}
        <div className="space-y-8">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors uppercase font-black text-[10px] tracking-widest"
          >
            <ArrowLeft size={16} /> Voltar para Planos
          </button>
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black font-lexend tracking-tighter uppercase leading-none">
              Finalize sua <br /><span className="text-primary">Inscrição</span>
            </h1>
            <p className="text-white/40 max-w-sm">Você está a um passo de ter o melhor bolão da sua vida.</p>
          </div>

          <div className="glass-dark p-8 rounded-[2.5rem] border-white/5 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Plano Selecionado</p>
                <p className="text-2xl font-black text-white uppercase">{plan.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Total</p>
                <p className="text-3xl font-black text-primary">R$ {plan.price}</p>
              </div>
            </div>
            <div className="h-[1px] bg-white/5 w-full" />
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-xs font-medium text-white/60">
                <CheckCircle2 size={14} className="text-primary" /> Direito a criar {plan.leagues} bolões
              </li>
              <li className="flex items-center gap-3 text-xs font-medium text-white/60">
                <CheckCircle2 size={14} className="text-primary" /> Participantes ilimitados
              </li>
              <li className="flex items-center gap-3 text-xs font-medium text-white/60">
                <CheckCircle2 size={14} className="text-primary" /> Acesso vitalício aos bolões criados
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <ShieldCheck className="text-primary shrink-0" />
            <p className="text-[10px] text-white/60 font-medium">Ambiente 100% seguro com criptografia de ponta a ponta. Seus dados estão protegidos.</p>
          </div>
        </div>

        {/* Right: Form */}
        <div className="glass-dark p-8 md:p-12 rounded-[3.5rem] border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -z-10 rounded-full" />
          
          <form onSubmit={handlePurchase} className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Dados de Acesso</h3>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Nome Completo" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-primary transition-all"
                />
                <input 
                  type="email" 
                  placeholder="E-mail" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-primary transition-all"
                />
                <input 
                  type="password" 
                  placeholder="Senha para o App" 
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Pagamento</h3>
                <div className="flex gap-2">
                  <CreditCard size={16} className="text-white/20" />
                  <Lock size={16} className="text-white/20" />
                </div>
              </div>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Número do Cartão" 
                  required
                  value={formData.cardNumber}
                  onChange={e => setFormData({...formData, cardNumber: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-primary transition-all font-mono"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="MM/AA" 
                    required
                    value={formData.expiry}
                    onChange={e => setFormData({...formData, expiry: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-primary transition-all text-center"
                  />
                  <input 
                    type="text" 
                    placeholder="CVC" 
                    required
                    value={formData.cvc}
                    onChange={e => setFormData({...formData, cvc: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-primary transition-all text-center"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-6 bg-primary text-dark font-black rounded-3xl uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-2xl glow-primary hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Confirmar e Pagar Agora"}
            </button>

            <p className="text-center text-[9px] text-white/20 uppercase font-black tracking-widest">
              Ao clicar em pagar você aceita nossos termos de uso
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
