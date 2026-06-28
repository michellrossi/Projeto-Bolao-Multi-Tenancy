import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, CreditCard, ArrowLeft, Loader2, CheckCircle2, QrCode, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';

const isValidCPF = (cpf: string) => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  let resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  return true;
};

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const plan = location.state?.plan || { name: "Prata", price: "97", leagues: 5 };

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    cpf: '',
    postalCode: '',
    addressNumber: '',
    phone: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
    paymentMethod: 'CREDIT_CARD'
  });

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidCPF(formData.cpf)) {
      alert('CPF inválido. Verifique os dígitos e tente novamente.');
      return;
    }

    setLoading(true);

    try {
      // 1. Criar usuário no Supabase Auth PRIMEIRO para obter o ID
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { 
          data: { 
            full_name: formData.name,
            // Inicialmente falso, será ativado pelo webhook ou pela API se for cartão
            has_license: false,
            approved: false,
            max_participants_allowed: plan.participants,
            max_leagues_allowed: plan.name === 'Bronze' ? 1 : 999,
            plan_type: plan.name
          } 
        }
      });

      if (authError) throw authError;
      const user = authData.user;
      if (!user) throw new Error('Erro ao criar usuário.');

      // 2. Processar Pagamento via Asaas passando o userId
      let paymentResult: { paymentId?: string; error?: string; isPix?: boolean; pixQrCode?: string; pixCopyPaste?: string; code?: string };
      try {
        const paymentResponse = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id, // Passando o ID do usuário criado
            name: formData.name,
            email: formData.email,
            cpfCnpj: formData.cpf,
            postalCode: formData.postalCode,
            addressNumber: formData.addressNumber,
            phone: formData.phone,
            plan,
            billingType: formData.paymentMethod,
            creditCard: formData.paymentMethod === 'PIX' ? undefined : {
              number: formData.cardNumber,
              expiry: formData.expiry,
              cvc: formData.cvc
            }
          }),
        });
        paymentResult = await paymentResponse.json();
        if (!paymentResponse.ok) {
          throw new Error(paymentResult.error || 'Pagamento não autorizado.');
        }
      } catch (paymentError: unknown) {
        const msg = paymentError instanceof Error ? paymentError.message : 'Erro no pagamento.';
        throw new Error(msg);
      }

      // 3. Usar o código gerado pelo servidor
      const code = paymentResult.code || 'ERRO_AO_GERAR';
      
      // 4. Update User Data (Tolerante a RLS na sessão anônima de confirmação de e-mail)
      // O trigger síncrono no backend (master.sql) também cuida disso, mas este upsert ajuda a refletir no cliente.
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          display_name: formData.name,
          photo_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
          max_participants_allowed: plan.participants,
          max_leagues_allowed: plan.name === 'Bronze' ? 1 : 999,
          has_license: paymentResult.isPix ? false : true,
          approved: paymentResult.isPix ? false : true,
          plan_type: plan.name
        });

      if (userError) console.warn('Aviso RLS no users ignorado no cliente (gerenciado via trigger síncrono no backend):', userError);

      // 7. Fire-and-forget welcome email (se aprovado imediato)
      if (!paymentResult.isPix) {
        fetch('/api/welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            plan,
            code,
          }),
        }).catch(err => console.warn('welcome-email failed (non-blocking):', err));
      }

      setGeneratedCode(code);
      if (paymentResult.isPix) {
        setPixData({ qrCode: paymentResult.pixQrCode!, copyPaste: paymentResult.pixCopyPaste! });
      }
      setSuccess(true);
    } catch (error: unknown) {
      console.error("Purchase error:", error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      alert("Erro ao processar compra: " + message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    if (pixData) {
      return (
        <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full glass-dark p-8 md:p-10 rounded-[3rem] border border-primary/20 text-center space-y-6"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
              <QrCode className="text-primary w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Pague via PIX</h1>
              <p className="text-white/40 text-sm">Escaneie o QR Code abaixo com o app do seu banco para liberar seu acesso.</p>
            </div>
            
            <div className="bg-white p-4 rounded-3xl mx-auto w-fit">
              <img src={`data:image/png;base64,${pixData.qrCode}`} alt="QR Code PIX" className="w-48 h-48" />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-black text-white/40">PIX Copia e Cola</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={pixData.copyPaste} 
                  readOnly 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none"
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(pixData.copyPaste);
                    alert('Código PIX copiado!');
                  }}
                  className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors shrink-0"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <p className="text-[10px] text-white/40">Após o pagamento, sua licença será ativada automaticamente em até 5 minutos.</p>
            
            <button 
              onClick={() => navigate('/login')}
              className="w-full py-4 border border-white/10 text-white font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-white/5 transition-all"
            >
              Ir para o Login
            </button>
          </motion.div>
        </div>
      );
    }

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
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="Número (endereço)" 
                    required
                    value={formData.addressNumber}
                    onChange={e => setFormData({...formData, addressNumber: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-primary transition-all"
                  />
                  <input 
                    type="tel" 
                    placeholder="Telefone (com DDD)" 
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Pagamento</h3>
                <div className="flex gap-2">
                  <Lock size={16} className="text-white/20" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, paymentMethod: 'CREDIT_CARD'})}
                  className={`py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs transition-all border ${
                    formData.paymentMethod === 'CREDIT_CARD' 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                  }`}
                >
                  <CreditCard size={16} /> Cartão
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, paymentMethod: 'PIX'})}
                  className={`py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs transition-all border ${
                    formData.paymentMethod === 'PIX' 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                  }`}
                >
                  <QrCode size={16} /> PIX
                </button>
              </div>

              {formData.paymentMethod === 'CREDIT_CARD' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
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
              )}
              {formData.paymentMethod === 'PIX' && (
                <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl text-center space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <QrCode className="text-primary w-8 h-8 mx-auto" />
                  <p className="text-primary font-bold text-sm">Liberação mais rápida</p>
                  <p className="text-white/40 text-xs">O QR Code será gerado na próxima tela.</p>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-6 bg-primary text-dark font-black rounded-3xl uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-2xl glow-primary hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Confirmar e Pagar Agora"}
            </button>

            <p className="text-center text-[9px] text-white/20 uppercase font-black tracking-widest">
              Ao clicar em pagar você aceita os{' '}
              <a href="/termos" target="_blank" className="underline hover:text-primary transition-colors">Termos de Uso</a>
              {' '}e a{' '}
              <a href="/privacidade" target="_blank" className="underline hover:text-primary transition-colors">Política de Privacidade</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
