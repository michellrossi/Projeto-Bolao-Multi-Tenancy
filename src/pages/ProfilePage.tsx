import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useLeague } from '../hooks/useLeague';
import { Camera, Check, Loader2, User as UserIcon, Mail, Shield, LogOut, Key, Trophy, Calendar, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AVATAR_COLLECTIONS = {
  adventurer: [
    "Felix", "Aneka", "Aiden", "Bibi", "Coco", "Dave", "Eden", "Fifi", "Gigi", "Hugo"
  ],
  avataaars: [
    "Nala", "Loki", "Zoey", "Milo", "Leo", "Luna", "Jasper", "Cleo", "Simba", "Shadow"
  ],
  funEmoji: [
    "Cool", "Love", "Happy", "Blush", "Smile", "Kiss", "Wink", "Laugh", "Star", "Heart"
  ]
};

const AVATARS = [
  ...AVATAR_COLLECTIONS.adventurer.map(s => `https://api.dicebear.com/7.x/adventurer/svg?seed=${s}`),
  ...AVATAR_COLLECTIONS.avataaars.map(s => `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}`),
  ...AVATAR_COLLECTIONS.funEmoji.map(s => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${s}`)
];

interface LeagueMemberRow {
  created_at: string;
  name: string;
  status: string;
  isOwner: boolean;
}

export default function ProfilePage() {
  const { user, isAdmin, isApproved, hasLicense } = useAuth();
  const { setLeague } = useLeague();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [initialName, setInitialName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [currentAvatar, setCurrentAvatar] = useState('');
  const [userLeagues, setUserLeagues] = useState<LeagueMemberRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedAvatar, setSavedAvatar] = useState(false);
  const [error, setError] = useState('');

  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Carregar dados básicos apenas no primeiro carregamento para evitar sobrescrever edições em andamento
    if (isFirstLoad) {
      const name = user.user_metadata?.full_name || '';
      setDisplayName(name);
      setInitialName(name);
      setCurrentAvatar(user.user_metadata?.avatar_url || '');
      setIsFirstLoad(false);
    }

    // Carregar ligas
    const fetchLeagues = async () => {
      try {
        const { data, error } = await supabase
          .from('league_members')
          .select(`
            status,
            created_at,
            league_id,
            leagues (
              name,
              owner_id,
              created_at
            )
          `)
          .eq('user_id', user.id);

        if (error) throw error;

        if (data) {
          const normalized: LeagueMemberRow[] = (data as any[]).map((item) => {
            // Supabase pode retornar leagues como objeto ou array dependendo da versão/config
            const leagueObj = Array.isArray(item.leagues) ? item.leagues[0] : item.leagues;
            
            if (!leagueObj) return null;

            const isOwnerOfLeague = leagueObj.owner_id === user.id;
            
            return {
              created_at: item.created_at || leagueObj.created_at,
              name: leagueObj.name || 'Liga Desconhecida',
              status: isOwnerOfLeague ? 'Dono' : 
                      item.status === 'approved' ? 'Aprovado' : 
                      item.status === 'blocked' ? 'Bloqueado' : 'Pendente',
              isOwner: isOwnerOfLeague
            };
          }).filter(Boolean) as LeagueMemberRow[];
          
          setUserLeagues(normalized);
        }
      } catch (err) {
        console.error('Erro ao buscar ligas:', err);
      }
    };
    fetchLeagues();
  }, [user]);

  if (!user) return null;

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setError('O nome não pode ser vazio.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      // Atualiza metadata do Auth
      const { data: updateData, error: authErr } = await supabase.auth.updateUser({
        data: { full_name: displayName },
      });

      if (authErr) throw authErr;

      // Atualiza tabela `users`
      const { error: dbErr } = await supabase
        .from('users')
        .update({ display_name: displayName })
        .eq('id', user.id);

      if (dbErr) throw dbErr;

      // Força atualização local do avatar/nome caso o hook de auth demore
      if (updateData.user) {
        setInitialName(displayName);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAvatar = async () => {
    if (!selectedAvatar) return;
    setSavingAvatar(true);

    try {
      const { data: updateData, error: authErr } = await supabase.auth.updateUser({
        data: { avatar_url: selectedAvatar },
      });

      if (authErr) throw authErr;

      const { error: dbErr } = await supabase
        .from('users')
        .update({ photo_url: selectedAvatar })
        .eq('id', user.id);

      if (dbErr) throw dbErr;

      // Atualiza estados locais imediatamente
      if (updateData.user) {
        setCurrentAvatar(selectedAvatar);
        setSelectedAvatar('');
      }
      
      setSavedAvatar(true);
      setTimeout(() => setSavedAvatar(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar avatar:', err);
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) {
      setError(error.message);
    } else {
      alert('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLeague(null);
    navigate('/login');
  };

  const avatarSrc = selectedAvatar || currentAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.id}`;

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      {/* Header - Fora do Grid para alinhamento */}
      <div className="text-center md:text-left">
        <h1 className="text-4xl font-black text-white font-lexend tracking-tight uppercase mb-2">
          Meu <span className="text-primary">Perfil</span>
        </h1>
        <p className="text-white/40 font-medium">Gerencie suas informações e avatar.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Lado Esquerdo */}
        <div className="space-y-8">
          {/* Avatar Selection */}
          <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 space-y-8">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/30 text-center">Seu Avatar</h2>
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
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {AVATARS.map(av => (
                <button
                  key={av}
                  onClick={() => setSelectedAvatar(av)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${(selectedAvatar || currentAvatar) === av
                      ? 'border-primary shadow-[0_0_10px_rgba(0,255,133,0.3)] scale-110'
                      : 'border-white/5 hover:border-white/20'
                    }`}
                >
                  <img src={av} className="w-full h-full object-cover" alt="" />
                  {(selectedAvatar || currentAvatar) === av && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check size={12} className="text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={handleSaveAvatar}
              disabled={!selectedAvatar || savingAvatar}
              className={`w-full py-4 rounded-2xl uppercase tracking-widest text-sm font-black flex items-center justify-center gap-2 transition-all ${selectedAvatar
                  ? 'bg-secondary text-dark hover:scale-[1.02] active:scale-95 shadow-lg shadow-secondary/20'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}
            >
              {savingAvatar ? <Loader2 size={18} className="animate-spin" /> : savedAvatar ? <><Check size={18} /> Avatar Salvo!</> : <><Save size={18} /> Salvar</>}
            </button>
          </div>

          {/* Registration Data */}
          <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 space-y-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/30">Dados de Cadastro</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1 block">Nome</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1 block">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input
                    type="text"
                    disabled
                    value={user.email}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white/40 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1 block">Senha</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input
                    type="password"
                    disabled
                    value="********"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white/40 cursor-not-allowed"
                  />
                  <button
                    onClick={handleResetPassword}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-white transition-all"
                  >
                    Trocar
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving || displayName === initialName}
              className={`w-full py-4 rounded-2xl uppercase tracking-widest text-sm font-black flex items-center justify-center gap-2 transition-all ${
                displayName !== initialName && !saving
                  ? 'bg-primary text-dark hover:scale-[1.02] shadow-lg shadow-primary/20'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <><Check size={18} /> Nome Salvo!</> : <><Save size={18} /> Salvar</>}
            </button>
          </div>
        </div>

        {/* Lado Direito */}
        <div className="space-y-8">
          {/* Leagues List */}
          <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black uppercase tracking-widest text-white/30">Meus Bolões e Status ({userLeagues.length})</h2>
              <Trophy size={16} className="text-primary/40" />
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {userLeagues.length > 0 ? (
                userLeagues.map((ul, idx) => (
                  <div key={idx} className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-4 group hover:bg-white/[0.05] transition-all">
                    <div>
                      <p className="font-bold text-white text-sm uppercase tracking-tight group-hover:text-primary transition-colors">{ul.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Calendar size={10} className="text-white/20" />
                        <span className="text-[10px] text-white/30 font-medium uppercase">
                          Membro desde {ul.created_at ? new Date(ul.created_at).toLocaleDateString('pt-BR') : 'Data Indisp.'}
                        </span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      ul.status === 'Dono' ? 'bg-primary/20 text-primary border border-primary/20' :
                      ul.status === 'Aprovado' ? 'bg-green-500/20 text-green-500 border border-green-500/20' :
                      ul.status === 'Bloqueado' ? 'bg-red-500/20 text-red-500 border border-red-500/20' :
                      'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20'
                    }`}>
                      {ul.status}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 space-y-4">
                  <Trophy className="w-12 h-12 text-white/5 mx-auto" />
                  <p className="text-xs text-white/20 italic">Você ainda não participa de nenhuma liga.</p>
                  <button
                    onClick={() => navigate('/app/ligas')}
                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                  >
                    Encontrar um bolão
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Account Status Info Summary (Simplified) */}
          {hasLicense && (
            <div className="bg-primary/5 border border-primary/10 p-6 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                <Shield size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Licença Organizador</p>
                <p className="text-xs text-white/60 font-medium">Você possui uma licença ativa para criar bolões.</p>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full py-4 bg-red-500/10 text-red-500 font-black rounded-2xl uppercase tracking-widest text-sm border border-red-500/10 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={18} /> Sair da Conta
          </button>
        </div>
      </div>
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
