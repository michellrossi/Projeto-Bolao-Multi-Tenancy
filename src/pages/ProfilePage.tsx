import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Camera, Check, Loader2, User as UserIcon, Mail, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aiden",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Bibi",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Coco",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Dave",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Eden",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Fifi",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Gigi",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Hugo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Izzy",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Kira",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Nina",
];

export default function ProfilePage() {
  const { user, isAdmin, isApproved, hasLicense } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name || ''
  );
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [currentAvatar, setCurrentAvatar] = useState(
    user?.user_metadata?.avatar_url || ''
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('O nome não pode ser vazio.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const photoUrl = selectedAvatar || currentAvatar;

      // Atualiza metadata do Auth
      await supabase.auth.updateUser({
        data: { full_name: displayName, avatar_url: photoUrl },
      });

      // Atualiza tabela `users`
      const { error: dbErr } = await supabase
        .from('users')
        .update({ display_name: displayName, photo_url: photoUrl })
        .eq('id', user.id);

      if (dbErr) throw dbErr;

      if (selectedAvatar) setCurrentAvatar(selectedAvatar);
      setSelectedAvatar('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('currentLeagueId');
    navigate('/login');
  };

  const avatarSrc = selectedAvatar || currentAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white font-lexend tracking-tight uppercase mb-2">
          Meu <span className="text-primary">Perfil</span>
        </h1>
        <p className="text-white/40 font-medium">Personalize seu nome e avatar.</p>
      </div>

      {/* Avatar + Name */}
      <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 space-y-8">
        {/* Current Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <img
              src={avatarSrc}
              alt="Avatar"
              className="w-28 h-28 rounded-3xl object-cover border-4 border-primary/30 shadow-xl"
            />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <Camera size={16} className="text-dark" />
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
            Escolha um avatar abaixo
          </p>
        </div>

        {/* Avatar Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {AVATARS.map(av => (
            <button
              key={av}
              onClick={() => setSelectedAvatar(av)}
              className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                (selectedAvatar || currentAvatar) === av
                  ? 'border-primary shadow-[0_0_15px_rgba(0,255,133,0.3)] scale-110'
                  : 'border-white/5 hover:border-white/20'
              }`}
            >
              <img src={av} className="w-full h-full object-cover" alt="" />
              {(selectedAvatar || currentAvatar) === av && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <Check size={16} className="text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Name Input */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1 block">
            Nome de exibição
          </label>
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Seu nome no bolão"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-primary transition-all text-white"
            />
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-xs font-bold text-center">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-primary text-dark font-black rounded-2xl uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : saved ? (
            <><Check size={18} /> Salvo!</>
          ) : (
            'Salvar Alterações'
          )}
        </button>
      </div>

      {/* Account Info */}
      <div className="glass-dark p-6 rounded-[2rem] border border-white/5 space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-white/30">Informações da Conta</h2>

        <div className="space-y-3">
          <InfoRow icon={<Mail size={16} />} label="E-mail" value={user.email ?? '—'} />
          <InfoRow
            icon={<Shield size={16} />}
            label="Status"
            value={isAdmin ? 'Administrador' : isApproved ? 'Competidor ativo' : 'Aguardando aprovação'}
            highlight={isAdmin ? 'primary' : isApproved ? 'green' : 'yellow'}
          />
          <InfoRow
            icon={<Shield size={16} />}
            label="Licença"
            value={hasLicense ? 'Ativa' : 'Sem licença'}
            highlight={hasLicense ? 'primary' : undefined}
          />
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-4 bg-red-500/10 text-red-500 font-black rounded-2xl uppercase tracking-widest text-sm border border-red-500/10 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
      >
        <LogOut size={18} /> Sair da Conta
      </button>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: 'primary' | 'green' | 'yellow';
}) {
  const colors: Record<string, string> = {
    primary: 'text-primary',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
  };
  return (
    <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
      <span className="text-white/30">{icon}</span>
      <span className="text-[11px] font-black uppercase tracking-widest text-white/40 flex-shrink-0">{label}</span>
      <span className={`ml-auto text-sm font-bold truncate ${highlight ? colors[highlight] : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}
