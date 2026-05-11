import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, CreditCard, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
    cpf: '',
    postalCode: '',
    cardNumber: '',
    expiry: '',
    cvc: ''
  });

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Process Payment with Asaas (via our backend)
      const paymentResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          cpfCnpj: formData.cpf,
          postalCode: formData.postalCode,
          plan: plan,
          creditCard: {
            number: formData.cardNumber,
            expiry: formData.expiry,
            cvc: formData.cvc
          }
        })
      });

      const paymentResult = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(paymentResult.error || 'Erro ao processar pagamento.');
      }

      // 2. Create User in Supabase Auth (Payment Success!)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
          }
        }
      });

      if (authError) throw authError;
      const user = authData.user;
      if (!user) throw new Error("Erro ao criar usuário.");

      // 3. Generate Code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // 4. Update User Data with License Info
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          display_name: formData.name,
          photo_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
          max_participants_allowed: plan.participants,
          max_leagues_allowed: plan.name === 'Bronze' ? 1 : 999,
          has_license: true,
          approved: true,
          plan_type: plan.name
        });

      if (userError) throw userError;

      // 5. Save Purchase Record
      const { error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          user_id: user.id,
          plan: plan.name,
          price: plan.price,
          code: code,
          payment_id: paymentResult.paymentId
        });

      if (purchaseError) throw purchaseError;

      // 6. Save License Code
      const { error: codeError } = await supabase
        .from('purchase_codes')
        .insert({
          code: code,
          max_participants: plan.participants,
          used_by: user.id,
          plan_type: plan.name,
          status: 'used'
        });

      if (codeError) throw codeError;

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
                <CheckCircle2 size={14} className="text-primary" /> Até {plan.participants} participantes por bolão
              </li>
              <li className="flex items-center gap-3 text-xs font-medium text-white/60">
                <CheckCircle2 size={14} className="text-primary" /> {plan.name === 'Bronze' ? '1 Bolão ativo' : 'Bolões ilimitados'}
              </li>
              <li className="flex items-center gap-3 text-xs font-medium text-white/60">
                <CheckCircle2 size={14} className="text-primary" /> {plan.name === 'Ouro' ? 'Acesso vitalício' : 'Acesso anual'}
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
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="CPF" 
                    required
                    value={formData.cpf}
                    onChange={e => setFormData({...formData, cpf: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-primary transition-all"
                  />
                  <input 
                    type="text" 
                    placeholder="CEP" 
                    required
                    value={formData.postalCode}
                    onChange={e => setFormData({...formData, postalCode: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>
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
