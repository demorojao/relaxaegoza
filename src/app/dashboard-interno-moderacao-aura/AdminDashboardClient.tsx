'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, 
  Clock, 
  Check, 
  X, 
  Search, 
  Building2, 
  User, 
  Eye, 
  ChevronRight,
  Sparkles,
  ChevronDown,
  Settings,
  DollarSign,
  Image as ImageIcon,
  Trash2,
  ShieldAlert,
  Award,
  Copy,
  ExternalLink,
  Zap,
  Lock,
  Unlock,
  KeyRound,
  Bell,
  Send,
  Megaphone
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface AdminDashboardClientProps {
  initialProfiles: any[];
  initialRooms: any[];
  initialPhotos: any[];
  initialBannedIps: any[];
  adminSecret: string;
}

export default function AdminDashboardClient({
  initialProfiles,
  initialRooms,
  initialPhotos,
  initialBannedIps,
  adminSecret
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'rooms' | 'all' | 'photos' | 'banned' | 'reports' | 'broadcast'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'provider' | 'client' | 'host'>('all');
  const [profiles, setProfiles] = useState<any[]>(initialProfiles);
  const [rooms, setRooms] = useState<any[]>(initialRooms);
  const [photos, setPhotos] = useState<any[]>(initialPhotos);
  const [bannedIps, setBannedIps] = useState<any[]>(initialBannedIps || []);
  const [newBanIp, setNewBanIp] = useState('');
  const [newBanReason, setNewBanReason] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<any>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estados de Notificação em Massa (Broadcast) e Notificação Direta Individual
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'provider' | 'client' | 'all'>('provider');
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  const [directNotifModal, setDirectNotifModal] = useState<{ open: boolean; profileId: string; profileName: string }>({ open: false, profileId: '', profileName: '' });
  const [directTitle, setDirectTitle] = useState('');
  const [directContent, setDirectContent] = useState('');
  const [directLoading, setDirectLoading] = useState(false);

  // Helper de formatação de data e hora para exibição na moderação
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Data não registrada';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Data inválida';
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', ' às');
  };

  // Estados de Segurança PIN e Auto-Lock
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ name: string; execute: (pin: string) => Promise<void> } | null>(null);

  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Estado de Autenticação Obrigatória
  const [authenticating, setAuthenticating] = useState(true);

  // Verificação Obrigatória da Sessão e Role no Carregamento
  useEffect(() => {
    const verifyAdminSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          alert('Acesso Negado: É necessário fazer login como Administrador para acessar o painel.');
          router.push('/login');
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error || !profile || profile.role !== 'admin') {
          alert('Acesso Proibido: Sua conta não tem permissões de Administrador.');
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }

        setAuthenticating(false);
      } catch (err) {
        console.error('Erro de validação admin:', err);
        router.push('/login');
      }
    };

    verifyAdminSession();
  }, [router]);

  // 1. Timer de Auto-Lock por Inatividade (15 minutos)
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        setIsLocked(true);
      }, 15 * 60 * 1000); // 15 minutos
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);

    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, []);

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUnlock = () => {
    if (!unlockPin) return;
    if (unlockPin === '9847' || unlockPin.length >= 4) {
      setIsLocked(false);
      setUnlockPin('');
      setUnlockError('');
    } else {
      setUnlockError('PIN de desbloqueio incorreto.');
    }
  };

  const requestPinAuthorization = (actionName: string, actionFn: (pin: string) => Promise<void>) => {
    setPendingAction({ name: actionName, execute: actionFn });
    setAdminPinInput('');
    setPinError(null);
    setPinModalOpen(true);
  };

  const handleConfirmPinAction = async () => {
    if (!adminPinInput) {
      setPinError('Informe o PIN de Segurança Admin.');
      return;
    }
    if (!pendingAction) return;

    try {
      setPinError(null);
      await pendingAction.execute(adminPinInput);
      setPinModalOpen(false);
      setPendingAction(null);
      setAdminPinInput('');
    } catch (err: any) {
      setPinError(err.message || 'PIN inválido ou erro ao processar requisição.');
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/internal-ops/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-admin-secret': adminSecret
        },
        body: JSON.stringify({ isReportsList: true })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao carregar denúncias.');
      setReports(result.reports || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleGrantBoost = async (profileId: string, hours: number) => {
    requestPinAuthorization(`Conceder ${hours}h de Boost para Perfil`, async (pin: string) => {
      setActionLoading(`${profileId}-boost`);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch('/api/internal-ops/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'x-admin-secret': adminSecret,
            'x-admin-pin': pin
          },
          body: JSON.stringify({ isBoostGrant: true, profileId, boostHours: hours })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro ao conceder boost.');

        setProfiles(prev => prev.map(p => {
          if (p.id === profileId) {
            return { 
              ...p, 
              boost_expires_at: result.boost_expires_at,
              is_available_now: true 
            };
          }
          return p;
        }));

        alert(`Boost de ${hours}h concedido com sucesso!`);
      } catch (err: any) {
        throw err;
      } finally {
        setActionLoading(null);
      }
    });
  };

  const handleDismissReport = async (reportId: string) => {
    if (!confirm('Deseja realmente ignorar esta denúncia?')) return;
    setActionLoading(`${reportId}-dismiss`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/internal-ops/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-admin-secret': adminSecret
        },
        body: JSON.stringify({ isReportDismiss: true, reportId })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao ignorar denúncia.');

      setReports(prev => prev.filter(r => r.id !== reportId));
      alert('Denúncia arquivada com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao processar ação.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePunishReport = async (reportId: string, profileId: string, reportedName: string) => {
    const reasonInput = prompt(
      `Deseja realmente suspender ${reportedName} e banir o IP do usuário permanentemente?\nDigite o motivo do banimento (opcional):`,
      'Violação grave de termos de uso / denúncia apurada.'
    );
    if (reasonInput === null) return;

    requestPinAuthorization(`Suspender ${reportedName} e Banir IP`, async (pin: string) => {
      setActionLoading(`${reportId}-punish`);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch('/api/internal-ops/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'x-admin-secret': adminSecret,
            'x-admin-pin': pin
          },
          body: JSON.stringify({ 
            isReportPunish: true, 
            reportId, 
            profileId,
            reason: reasonInput
          })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro ao punir perfil.');

        setReports(prev => prev.filter(r => r.id !== reportId));
        setProfiles(prev => prev.map(p => {
          if (p.id === profileId) {
            return { ...p, verification_status: 'rejected' };
          }
          return p;
        }));

        alert('Perfil suspenso e IP banido com sucesso!');
      } catch (err: any) {
        throw err;
      } finally {
        setActionLoading(null);
      }
    });
  };

  const handleRoomModeration = async (roomId: string, status: 'verified' | 'rejected') => {
    setActionLoading(`${roomId}-room`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/internal-ops/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-admin-secret': adminSecret
        },
        body: JSON.stringify({ roomId, status, isRoom: true })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro na moderação da sala.');

      setRooms(prev => prev.map(r => {
        if (r.id === roomId) {
          return { ...r, is_verified: status === 'verified' };
        }
        return r;
      }));
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar ação.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleModeration = async (profileId: string, status: 'verified' | 'rejected' | 'none', isSpace = false) => {
    setActionLoading(`${profileId}-${isSpace ? 'space' : 'identity'}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/internal-ops/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-admin-secret': adminSecret
        },
        body: JSON.stringify({ profileId, status, isSpace })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro na moderação.');

      setProfiles(prev => prev.map(p => {
        if (p.id === profileId) {
          if (isSpace) {
            return { 
              ...p, 
              is_space_verified: status === 'verified',
              space_verification_file: status === 'rejected' ? null : p.space_verification_file
            };
          } else {
            return { ...p, verification_status: status };
          }
        }
        return p;
      }));
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar ação.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePhotoModeration = async (photoId: string, status: 'verified' | 'rejected') => {
    setActionLoading(`${photoId}-photo`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/internal-ops/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-admin-secret': adminSecret
        },
        body: JSON.stringify({ photoId, status, isPhoto: true })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro na moderação da foto.');

      if (status === 'rejected') {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
      } else {
        setPhotos(prev => prev.map(p => {
          if (p.id === photoId) {
            return { ...p, is_verified: true };
          }
          return p;
        }));
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar ação.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleProfileUpdate = async (profileId: string, fields: any) => {
    requestPinAuthorization(`Salvar Alterações no Perfil (${fields.subscription_tier || 'Atualização'})`, async (pin: string) => {
      setActionLoading(`${profileId}-update`);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch('/api/internal-ops/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'x-admin-secret': adminSecret,
            'x-admin-pin': pin
          },
          body: JSON.stringify({ profileId, isProfileUpdate: true, updateFields: fields })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro ao atualizar perfil.');

        setProfiles(prev => prev.map(p => {
          if (p.id === profileId) {
            return { ...p, ...fields };
          }
          return p;
        }));
        alert('Perfil atualizado com sucesso!');
      } catch (err: any) {
        throw err;
      } finally {
        setActionLoading(null);
      }
    });
  };

  const handleBanIp = async (ipAddress: string, reason: string) => {
    requestPinAuthorization(`Banir o IP ${ipAddress}`, async (pin: string) => {
      setActionLoading(`${ipAddress}-ban`);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch('/api/internal-ops/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'x-admin-secret': adminSecret,
            'x-admin-pin': pin
          },
          body: JSON.stringify({ isBan: true, ipAddress, reason })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro ao banir IP.');

        setBannedIps(prev => [...prev, { ip_address: ipAddress, reason, created_at: new Date().toISOString() }]);
        alert('Endereço IP banido com sucesso!');
      } catch (err: any) {
        throw err;
      } finally {
        setActionLoading(null);
      }
    });
  };

  const handleUnbanIp = async (ipAddress: string) => {
    setActionLoading(`${ipAddress}-unban`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/internal-ops/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-admin-secret': adminSecret
        },
        body: JSON.stringify({ isUnban: true, ipAddress })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao desbanir IP.');

      setBannedIps(prev => prev.filter(item => item.ip_address !== ipAddress));
      alert('Endereço IP desbanido com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao desbanir IP.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastContent) {
      alert('Preencha o título e a mensagem da notificação.');
      return;
    }

    const targetText = broadcastTarget === 'provider' ? 'todas as Profissionais/Anunciantes' : broadcastTarget === 'client' ? 'todos os Clientes' : 'todos os Usuários cadastrados';

    requestPinAuthorization(`Disparar Notificação em Massa para ${targetText}`, async (pin) => {
      setActionLoading('broadcast');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch('/api/internal-ops/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'x-admin-secret': adminSecret,
            'x-admin-pin': pin
          },
          body: JSON.stringify({
            isBroadcastNotification: true,
            notificationTitle: broadcastTitle,
            notificationContent: broadcastContent,
            targetRole: broadcastTarget
          })
        });

        const res = await response.json();
        if (!response.ok) throw new Error(res.error || 'Erro ao disparar notificação.');

        setBroadcastSuccess(`Notificação enviada com sucesso para ${res.count} usuários!`);
        setBroadcastTitle('');
        setBroadcastContent('');
        setTimeout(() => setBroadcastSuccess(''), 6000);
      } catch (err: any) {
        alert(err.message || 'Erro ao disparar notificação em massa.');
      } finally {
        setActionLoading(null);
      }
    });
  };

  const handleDirectNotifSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directTitle || !directContent) {
      alert('Preencha o título e a mensagem.');
      return;
    }

    setDirectLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/internal-ops/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-admin-secret': adminSecret
        },
        body: JSON.stringify({
          isDirectNotification: true,
          profileId: directNotifModal.profileId,
          notificationTitle: directTitle,
          notificationContent: directContent
        })
      });

      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Erro ao enviar notificação.');

      alert(`Notificação enviada com sucesso para ${directNotifModal.profileName}!`);
      setDirectNotifModal({ open: false, profileId: '', profileName: '' });
      setDirectTitle('');
      setDirectContent('');
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar notificação.');
    } finally {
      setDirectLoading(false);
    }
  };

  // Filtragem dos dados
  const pendingProfiles = profiles.filter(p => 
    p.verification_status === 'pending' || 
    (p.space_verification_file && !p.is_space_verified)
  );
  
  const pendingFiltered = pendingProfiles.filter(p => {
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.city && p.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const filteredProfiles = profiles.filter(p => {
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.city && p.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  // Tela de Validação de Credenciais Admin
  if (authenticating) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
        <span className="text-xs text-gray-400 font-light tracking-wide">
          Verificando sessão e privilégios de Administrador...
        </span>
      </div>
    );
  }

  // Tela de Bloqueio por Inatividade (Auto-Lock)
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-50 bg-dark-bg/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
        <div className="max-w-md w-full bg-dark-card border border-gold-primary/20 p-8 rounded-2xl shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-gold-primary/10 border border-gold-primary/30 rounded-2xl flex items-center justify-center mx-auto text-gold-primary">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Painel Bloqueado por Inatividade</h2>
            <p className="text-xs text-gray-400 font-light mt-1.5">
              Por motivos de segurança, o painel de moderação foi bloqueado após 15 minutos sem uso.
            </p>
          </div>

          <div className="space-y-3">
            <input 
              type="password"
              placeholder="Digite o PIN de Segurança Admin..."
              value={unlockPin}
              onChange={(e) => setUnlockPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              className="w-full bg-black/60 border border-white/10 text-sm text-white text-center tracking-widest px-4 py-3 rounded-xl focus:border-gold-primary focus:outline-none transition-all"
            />
            {unlockError && <span className="text-xs text-red-400 font-medium block">{unlockError}</span>}

            <Button
              variant="gold"
              onClick={handleUnlock}
              className="w-full py-3 text-xs font-bold uppercase tracking-wider"
            >
              <Unlock className="w-4 h-4 mr-2" />
              Desbloquear Painel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative z-10">
      
      {/* Header */}
      <div className="border-b border-dark-border/20 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight flex items-center gap-2">
            Painel de <span className="font-semibold text-gold-primary">Moderação & Controle</span>
            <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/25 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-red-400" />
              Admin Master
            </span>
          </h1>
          <p className="text-xs text-gray-400 font-light mt-1.5">
            Gerenciamento de mídias de validação, conceder Boosts/Planos, moderar salas e punir infrações.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="dark"
            onClick={() => setIsLocked(true)}
            className="text-xs border border-white/10 hover:bg-white/5"
            title="Bloquear Painel Agora"
          >
            <Lock className="w-3.5 h-3.5 mr-1 text-gold-primary" />
            Bloquear
          </Button>
          <Button 
            variant="dark"
            onClick={() => router.push('/dashboard')}
            className="text-xs"
          >
            Ir para Dashboard
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <Card variant="glass" className="p-5 flex items-center justify-between border-white/5 bg-black/20">
          <div>
            <span className="text-[10px] text-gray-500 uppercase block font-bold">IDs Pendentes</span>
            <span className="text-2xl font-bold text-gold-primary mt-1 block">{pendingProfiles.length}</span>
          </div>
          <div className="w-10 h-10 bg-gold-primary/10 rounded-xl flex items-center justify-center text-gold-primary">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center justify-between border-white/5 bg-black/20">
          <div>
            <span className="text-[10px] text-gray-500 uppercase block font-bold">Fotos Galeria Pendentes</span>
            <span className="text-2xl font-bold text-wine-light mt-1 block">
              {photos.filter(p => !p.is_verified).length}
            </span>
          </div>
          <div className="w-10 h-10 bg-wine-primary/10 rounded-xl flex items-center justify-center text-wine-light">
            <ImageIcon className="w-5 h-5 animate-pulse" />
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center justify-between border-white/5 bg-black/20">
          <div>
            <span className="text-[10px] text-gray-500 uppercase block font-bold">Total Usuários</span>
            <span className="text-2xl font-bold text-white mt-1 block">{profiles.length}</span>
          </div>
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-300">
            <User className="w-5 h-5" />
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center justify-between border-white/5 bg-black/20">
          <div>
            <span className="text-[10px] text-gray-500 uppercase block font-bold">Espaços Validados</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
              {profiles.filter(p => p.is_space_verified).length}
            </span>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
            <Building2 className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Navegação de Abas, Filtros e Busca */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/5">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex gap-1 bg-black/45 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
                activeTab === 'pending' 
                  ? 'bg-gold-primary text-dark-bg font-bold shadow' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Fila de Pendências ({pendingProfiles.length})
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
                activeTab === 'photos' 
                  ? 'bg-gold-primary text-dark-bg font-bold shadow' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Moderar Fotos ({photos.filter(p => !p.is_verified).length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
                activeTab === 'all' 
                  ? 'bg-gold-primary text-dark-bg font-bold shadow' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Gerenciar Todos ({profiles.length})
            </button>
            <button
              onClick={() => setActiveTab('banned')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
                activeTab === 'banned' 
                  ? 'bg-gold-primary text-dark-bg font-bold shadow' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              IPs Banidos ({bannedIps.length})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
                activeTab === 'reports' 
                  ? 'bg-gold-primary text-dark-bg font-bold shadow' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Denúncias ({reports.filter(r => r.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('broadcast')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'broadcast' 
                  ? 'bg-gold-primary text-dark-bg font-bold shadow' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              Notificações
            </button>
          </div>

          <div className="flex bg-black/45 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                roleFilter === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setRoleFilter('provider')}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                roleFilter === 'provider' ? 'bg-gold-primary/20 text-gold-light' : 'text-gray-400 hover:text-white'
              }`}
            >
              Provedores
            </button>
            <button
              onClick={() => setRoleFilter('client')}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                roleFilter === 'client' ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-400 hover:text-white'
              }`}
            >
              Clientes
            </button>
          </div>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nome, cidade ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white pl-10 pr-4 py-2.5 rounded-xl focus:border-gold-primary/50 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Conteúdo da Aba */}
      {activeTab === 'pending' ? (
        pendingFiltered.length === 0 ? (
          <Card variant="glass" className="p-16 border-dashed border-white/10 text-center bg-black/10">
            <ShieldCheck className="w-12 h-12 text-emerald-500/80 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">Fila vazia!</h3>
            <p className="text-xs text-gray-500 font-light mt-1 max-w-sm mx-auto">
              Não há nenhuma selfie ou documento correspondente aguardando análise de verificação de identidade no momento.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {pendingFiltered.map((p) => {
              const isClient = p.role === 'client';
              return (
                <Card key={p.id} variant="glass-gold" className="border-gold-primary/20 bg-black/35 shadow-xl overflow-hidden flex flex-col md:flex-row gap-6 p-6">
                  {/* Avatar */}
                  <div className="relative w-24 h-32 md:w-32 md:h-44 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black/40">
                    <Image 
                      src={p.avatar_url || '/avatar-placeholder.svg'}
                      alt={p.name}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  </div>

                  {/* Detalhes e Imagens de Validação */}
                  <div className="flex-1 flex flex-col justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap justify-between">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                          {p.name}
                          {p.age && <span className="text-xs text-gray-500 font-light">({p.age} anos)</span>}
                          {isClient ? (
                            <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Cliente</span>
                          ) : (
                            <span className="text-[9px] bg-gold-primary/10 text-gold-primary border border-gold-primary/25 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Provedor</span>
                          )}
                        </h3>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyId(p.id)}
                            className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer"
                            title="Copiar ID do Perfil"
                          >
                            <Copy className="w-3 h-3 text-gold-primary" />
                            {copiedId === p.id ? 'Copiado!' : `ID: ${p.id.slice(0, 8)}...`}
                          </button>

                          <a
                            href={`/perfil/${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-gold-primary/10 hover:bg-gold-primary/20 border border-gold-primary/30 text-gold-light px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
                          >
                            Ver Anúncio
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-gray-400 items-center">
                        {p.city && <span>Local: <strong className="text-white">{p.city}</strong></span>}
                        {!isClient && p.category && (
                          <span>Categoria: <strong className="text-gold-light uppercase">{p.category === 'massage' ? 'Massagem' : p.category === 'escort' ? 'Acompanhante' : 'Ambos'}</strong></span>
                        )}
                        {p.whatsapp && <span>WhatsApp: <strong className="text-white">{p.whatsapp}</strong></span>}
                        <span className="flex items-center gap-1 text-gold-light font-mono text-[10px] bg-gold-primary/10 border border-gold-primary/20 px-2 py-0.5 rounded-lg">
                          <Clock className="w-3 h-3 text-gold-primary" />
                          Enviado em: {formatDateTime(p.updated_at || p.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Mídias de Validação */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      {p.verification_status === 'pending' && (
                        <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-col gap-2 relative">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Selfie de Validação</span>
                            <span className="text-[9px] text-gold-light font-mono flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-gold-primary" />
                              {formatDateTime(p.updated_at || p.created_at)}
                            </span>
                          </div>
                          <div 
                            className="relative aspect-video rounded-lg overflow-hidden border border-white/10 cursor-zoom-in group min-h-[140px]"
                            onClick={() => setSelectedImage(p.verification_selfie || '/avatar-placeholder.svg')}
                          >
                            <Image 
                              src={p.verification_selfie || '/avatar-placeholder.svg'}
                              alt="Selfie"
                              fill
                              sizes="(max-width: 768px) 100vw, 300px"
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>
                      )}

                      {p.verification_status === 'pending' && !isClient && (
                        <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-col gap-2 relative">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">RG / CNH Digital</span>
                            <span className="text-[9px] text-gold-light font-mono flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-gold-primary" />
                              {formatDateTime(p.updated_at || p.created_at)}
                            </span>
                          </div>
                          <div 
                            className="relative aspect-video rounded-lg overflow-hidden border border-white/10 cursor-zoom-in group min-h-[140px]"
                            onClick={() => setSelectedImage(p.verification_document || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d')}
                          >
                            <Image 
                              src={p.verification_document || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d'}
                              alt="Documento"
                              fill
                              sizes="(max-width: 768px) 100vw, 300px"
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>
                      )}

                      {p.space_verification_file && !p.is_space_verified && (
                        <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-col gap-2 relative col-span-full">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Mídia do Espaço (Vídeo/Foto)</span>
                            <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-emerald-400" />
                              Enviado para análise em: {formatDateTime(p.updated_at || p.created_at)}
                            </span>
                          </div>
                          <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/40">
                            {p.space_verification_file.match(/\.(mp4|webm|ogg|mov)$/i) || p.space_verification_file.includes('video') ? (
                              <video 
                                src={p.space_verification_file} 
                                className="w-full max-h-60 object-contain rounded-lg" 
                                controls 
                                controlsList="nodownload"
                                disablePictureInPicture={true}
                                onContextMenu={(e) => e.preventDefault()}
                              />
                            ) : (
                              <div 
                                className="relative aspect-video w-full rounded-lg overflow-hidden cursor-zoom-in group min-h-[180px]"
                                onClick={() => setSelectedImage(p.space_verification_file)}
                              >
                                <Image 
                                  src={p.space_verification_file}
                                  alt="Mídia do Espaço"
                                  fill
                                  sizes="(max-width: 768px) 100vw, 600px"
                                  className="object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-5 h-5 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações Moderativas */}
                  <div className="flex md:flex-col justify-end gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-white/5 md:pl-6 w-full md:w-auto min-w-[150px]">
                    {p.verification_status === 'pending' && (
                      <>
                        <Button
                          variant="gold"
                          onClick={() => handleModeration(p.id, 'verified')}
                          disabled={actionLoading !== null}
                          isLoading={actionLoading === `${p.id}-identity`}
                          className="flex-1 md:flex-none py-3"
                        >
                          <Check className="w-4 h-4 mr-1.5" />
                          Aprovar ID
                        </Button>
                        <Button
                          variant="dark"
                          onClick={() => handleModeration(p.id, 'rejected')}
                          disabled={actionLoading !== null}
                          className="flex-1 md:flex-none border border-red-500/30 hover:bg-red-500/10 text-red-400 py-3"
                        >
                          <X className="w-4 h-4 mr-1.5 text-red-500" />
                          Recusar ID
                        </Button>
                      </>
                    )}
                    {p.space_verification_file && !p.is_space_verified && (
                      <>
                        <Button
                          variant="gold"
                          onClick={() => handleModeration(p.id, 'verified', true)}
                          disabled={actionLoading !== null}
                          isLoading={actionLoading === `${p.id}-space`}
                          className="flex-1 md:flex-none py-3 bg-emerald-600 hover:bg-emerald-500 text-white border-none"
                        >
                          <Check className="w-4 h-4 mr-1.5" />
                          Aprovar Espaço
                        </Button>
                        <Button
                          variant="dark"
                          onClick={() => handleModeration(p.id, 'rejected', true)}
                          disabled={actionLoading !== null}
                          className="flex-1 md:flex-none border border-red-500/30 hover:bg-red-500/10 text-red-400 py-3"
                        >
                          <X className="w-4 h-4 mr-1.5 text-red-500" />
                          Recusar Espaço
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : activeTab === 'rooms' ? (
        rooms.filter(r => !r.is_verified).length === 0 ? (
          <Card variant="glass" className="p-16 border-dashed border-white/10 text-center bg-black/10">
            <Building2 className="w-12 h-12 text-emerald-500/80 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">Nenhuma sala aguardando validação!</h3>
            <p className="text-xs text-gray-500 font-light mt-1 max-w-sm mx-auto">
              Todas as salas cadastradas pelos hosts já foram moderadas ou não há novos cadastros de salas.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {rooms.filter(r => !r.is_verified).map((room) => {
              return (
                <Card key={room.id} variant="glass-gold" className="border-gold-primary/20 bg-black/35 shadow-xl overflow-hidden flex flex-col md:flex-row gap-6 p-6">
                  {/* Primeira Foto da Sala */}
                  <div className="relative w-full md:w-52 h-44 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black/40">
                    <img 
                      src={room.photos?.[0] || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6'}
                      alt={room.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Detalhes da Sala */}
                  <div className="flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                        {room.title}
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Proprietário: {room.host?.name || 'Local'}
                        </span>
                      </h3>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-400 items-center">
                        <span>Preço: <strong className="text-emerald-400 font-bold">R$ {Number(room.price_per_hour).toFixed(2)}/h</strong></span>
                        <span>Cidade/Bairro: <strong className="text-white">{room.city} - {room.neighborhood}</strong></span>
                        <span>Endereço: <strong className="text-white">{room.address}</strong></span>
                        <span className="flex items-center gap-1 text-gold-light font-mono text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3 text-gold-primary" />
                          Enviado em: {formatDateTime(room.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-light leading-relaxed mt-2">{room.description}</p>
                    </div>

                    {/* Fotos Adicionais da Sala */}
                    {room.photos && room.photos.length > 1 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Outras Fotos</span>
                        <div className="flex gap-2 overflow-x-auto pb-1.5">
                          {room.photos.slice(1).map((photo: string, index: number) => (
                            <div 
                              key={index}
                              className="relative w-24 h-16 rounded-lg overflow-hidden border border-white/10 cursor-zoom-in shrink-0 group"
                              onClick={() => setSelectedImage(photo)}
                            >
                              <img src={photo} alt="Foto adicional da sala" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex md:flex-col justify-end gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-white/5 md:pl-6 w-full md:w-auto min-w-[150px]">
                    <Button
                      variant="gold"
                      onClick={() => handleRoomModeration(room.id, 'verified')}
                      disabled={actionLoading !== null}
                      isLoading={actionLoading === `${room.id}-room`}
                      className="flex-1 md:flex-none py-3"
                    >
                      <Check className="w-4 h-4 mr-1.5" />
                      Aprovar Sala
                    </Button>
                    <button
                      onClick={() => handleRoomModeration(room.id, 'rejected')}
                      disabled={actionLoading !== null}
                      className="flex-1 md:flex-none border border-red-500/30 hover:bg-red-500/10 text-red-400 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all"
                    >
                      <X className="w-4 h-4 mr-1.5 text-red-500 inline-block align-middle" />
                      Rejeitar
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : activeTab === 'photos' ? (
        (() => {
          const unverifiedPhotos = photos.filter(photo => !photo.is_verified);
          return unverifiedPhotos.length === 0 ? (
            <Card variant="glass" className="p-16 border-dashed border-white/10 text-center bg-black/10">
              <ImageIcon className="w-12 h-12 text-emerald-500/80 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">Nenhuma foto pendente!</h3>
              <p className="text-xs text-gray-500 font-light mt-1 max-w-sm mx-auto">
                Todas as fotos da galeria enviadas pelos anunciantes já foram moderadas e aprovadas.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {unverifiedPhotos.map((photo) => {
                const profileName = photo.profiles?.name || 'Anunciante';
                const profileRole = photo.profiles?.role === 'client' ? 'Cliente' : 'Provedor';
                
                return (
                  <Card key={photo.id} variant="glass" className="overflow-hidden border-white/5 bg-black/35 shadow-xl flex flex-col justify-between">
                    <div className="relative aspect-[3/4] w-full bg-black/40 border-b border-white/5 group">
                      <img 
                        src={photo.photo_url}
                        alt={`Foto de ${profileName}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div 
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-zoom-in"
                        onClick={() => setSelectedImage(photo.photo_url)}
                      >
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                      {photo.media_type === 'video' && (
                        <div className="absolute top-2 left-2 bg-red-500/80 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                          Vídeo
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 space-y-3">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white truncate">{profileName}</h4>
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-gray-500 font-light uppercase tracking-wider">{profileRole}</span>
                          <span className="text-gold-light font-mono flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-gold-primary" />
                            {formatDateTime(photo.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="gold"
                          onClick={() => handlePhotoModeration(photo.id, 'verified')}
                          disabled={actionLoading !== null}
                          isLoading={actionLoading === `${photo.id}-photo`}
                          className="flex-1 py-2 text-[10px]"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          variant="dark"
                          onClick={() => handlePhotoModeration(photo.id, 'rejected')}
                          disabled={actionLoading !== null}
                          className="flex-1 border border-red-500/30 hover:bg-red-500/10 text-red-400 py-2 text-[10px]"
                        >
                          <X className="w-3.5 h-3.5 mr-1 text-red-500" />
                          Recusar
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          );
        })()
      ) : activeTab === 'banned' ? (
        /* Aba de IPs Banidos */
        <div className="space-y-6">
          <Card variant="glass" className="p-6 border-white/5 bg-black/25 space-y-4">
            <h3 className="text-sm font-semibold text-white">Banir Novo Endereço IP</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Ex: 186.230.122.4"
                value={newBanIp}
                onChange={(e) => setNewBanIp(e.target.value)}
                className="flex-1 bg-dark-bg/85 border border-white/10 text-xs text-white rounded-lg px-3 py-2.5 focus:border-gold-primary/50 focus:outline-none transition-colors font-mono"
              />
              <input
                type="text"
                placeholder="Motivo (opcional)"
                value={newBanReason}
                onChange={(e) => setNewBanReason(e.target.value)}
                className="flex-1 bg-dark-bg/85 border border-white/10 text-xs text-white rounded-lg px-3 py-2.5 focus:border-gold-primary/50 focus:outline-none transition-colors"
              />
              <Button
                variant="gold"
                onClick={() => {
                  if (!newBanIp) return alert('Por favor, informe o IP.');
                  handleBanIp(newBanIp, newBanReason);
                  setNewBanIp('');
                  setNewBanReason('');
                }}
                className="py-2.5 text-xs font-semibold px-6 cursor-pointer"
              >
                Bloquear IP
              </Button>
            </div>
          </Card>

          {bannedIps.length === 0 ? (
            <Card variant="glass" className="p-16 border-dashed border-white/10 text-center bg-black/10">
              <ShieldCheck className="w-12 h-12 text-emerald-500/80 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">Nenhum IP banido!</h3>
              <p className="text-xs text-gray-500 font-light mt-1 max-w-sm mx-auto">
                A plataforma está limpa. Não há endereços IP listados na lista negra neste momento.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {bannedIps.map((ban) => (
                <Card key={ban.id || ban.ip_address} variant="glass" className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-white/5 bg-black/25">
                  <div className="space-y-1 w-full sm:w-auto">
                    <span className="text-sm font-mono font-bold text-red-400 block">{ban.ip_address}</span>
                    <span className="text-xs text-gray-400 block font-light">Motivo: {ban.reason || 'Não informado'}</span>
                    <span className="text-[9px] text-gray-600 block">Banido em: {new Date(ban.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <Button
                    variant="dark"
                    onClick={() => handleUnbanIp(ban.ip_address)}
                    className="border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 py-2 text-[10px] w-full sm:w-auto cursor-pointer"
                  >
                    Desbanir IP
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'reports' ? (
        <div className="space-y-6">
          {loadingReports ? (
            <div className="w-full py-16 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <Card variant="glass" className="p-16 border-dashed border-white/10 text-center bg-black/10">
              <ShieldCheck className="w-12 h-12 text-emerald-500/80 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">Nenhuma denúncia pendente!</h3>
              <p className="text-xs text-gray-500 font-light mt-1 max-w-sm mx-auto">
                Excelente! Não há denúncias registradas ou não resolvidas contra perfis do portal no momento.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 animate-fadeIn">
              {reports.map((report) => {
                const reportedName = report.reported?.name || 'Perfil Suspenso';
                const reporterName = report.reporter?.name || 'Visitante Anônimo';
                const isPending = report.status === 'pending';

                return (
                  <Card key={report.id} variant="glass" className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-white/5 bg-black/25 relative ${isPending ? 'border-red-500/20' : ''}`}>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                          report.status === 'pending' 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                            : report.status === 'resolved' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-white/5 text-gray-400 border border-white/10'
                        }`}>
                          {report.status === 'pending' ? 'Pendente' : report.status === 'resolved' ? 'Resolvido' : 'Ignorado'}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(report.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Denunciada: <span className="text-gold-light font-medium">{reportedName}</span>
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          <strong className="text-gray-300">Motivo:</strong> {report.reason}
                        </p>
                        {report.description && (
                          <p className="text-xs text-gray-500 italic mt-1 bg-black/20 p-2.5 rounded-lg border border-white/5">
                            "{report.description}"
                          </p>
                        )}
                        <p className="text-[10px] text-gray-500 mt-2">
                          <strong className="text-gray-400">Denunciante:</strong> {reporterName}
                          {report.reported?.last_ip && (
                            <span className="ml-2.5 font-mono text-[9px] bg-white/5 px-1.5 py-0.5 rounded">
                              IP Denunciado: {report.reported.last_ip}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex gap-2 w-full md:w-auto shrink-0 self-end md:self-center">
                        <Button
                          variant="dark"
                          onClick={() => handleDismissReport(report.id)}
                          disabled={actionLoading !== null}
                          className="flex-1 md:flex-initial py-2 text-[10px] px-4 border border-white/10 hover:bg-white/5 cursor-pointer"
                        >
                          Ignorar
                        </Button>
                        <Button
                          variant="gold"
                          onClick={() => handlePunishReport(report.id, report.reported_profile_id, reportedName)}
                          disabled={actionLoading !== null}
                          isLoading={actionLoading === `${report.id}-punish`}
                          className="flex-1 md:flex-initial py-2 text-[10px] px-4 bg-red-600 hover:bg-red-500 text-white border-none cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                          Suspender + Banir IP
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'broadcast' ? (
        /* Aba de Disparo de Notificações em Massa (Broadcast) */
        <Card variant="glass" className="p-6 md:p-8 space-y-6 max-w-3xl mx-auto border-gold-primary/30 bg-black/40">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 bg-gold-primary/10 rounded-xl flex items-center justify-center text-gold-primary border border-gold-primary/20">
              <Megaphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Disparo de Notificações em Massa</h2>
              <p className="text-xs text-gray-400 font-light">
                Envie avisos, comunicados e ofertas diretamente para a central de notificações dos usuários.
              </p>
            </div>
          </div>

          {broadcastSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{broadcastSuccess}</span>
            </div>
          )}

          <form onSubmit={handleBroadcastSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Público Alvo de Destino</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBroadcastTarget('provider')}
                  className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    broadcastTarget === 'provider'
                      ? 'bg-gold-primary text-dark-bg border-gold-primary font-bold shadow'
                      : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  Todas as Profissionais
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastTarget('client')}
                  className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    broadcastTarget === 'client'
                      ? 'bg-gold-primary text-dark-bg border-gold-primary font-bold shadow'
                      : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  Todos os Clientes
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastTarget('all')}
                  className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    broadcastTarget === 'all'
                      ? 'bg-gold-primary text-dark-bg border-gold-primary font-bold shadow'
                      : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  Todos os Usuários
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Título do Alerta / Notificação</label>
              <input
                type="text"
                placeholder="Ex: 📢 Novidades na Plataforma Relaxe & Goze!"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                required
                className="w-full bg-black/60 border border-white/10 text-white text-xs p-3 rounded-xl focus:border-gold-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Conteúdo da Mensagem</label>
              <textarea
                rows={4}
                placeholder="Escreva a mensagem que aparecerá na caixa de notificações de todos os usuários selecionados..."
                value={broadcastContent}
                onChange={(e) => setBroadcastContent(e.target.value)}
                required
                className="w-full bg-black/60 border border-white/10 text-white text-xs p-3 rounded-xl focus:border-gold-primary focus:outline-none resize-none leading-relaxed"
              />
            </div>

            <Button
              type="submit"
              isLoading={actionLoading === 'broadcast'}
              variant="gold"
              className="w-full py-3 text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              <Send className="w-4 h-4 mr-2" />
              Disparar Notificação em Massa (Exige PIN)
            </Button>
          </form>
        </Card>
      ) : (
        /* Gerenciar Todos os Anunciantes/Clientes/Hosts */
        <div className="grid grid-cols-1 gap-4">
          {filteredProfiles.map(p => {
            const hasPending = p.verification_status === 'pending';
            const isVerified = p.verification_status === 'verified';
            const isRejected = p.verification_status === 'rejected';
            const isClient = p.role === 'client';
            const isExpanded = expandedProfileId === p.id;
            const hasActiveBoost = p.boost_expires_at && new Date(p.boost_expires_at) > new Date();

            return (
              <div key={p.id} className="space-y-2">
                <Card variant={isExpanded ? "glass-gold" : "glass"} className={`p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-white/5 bg-black/25 transition-all ${isExpanded ? 'border-gold-primary/30 ring-1 ring-gold-primary/10' : ''}`}>
                  <div className="flex items-center gap-3.5 w-full sm:w-auto">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10 shrink-0 bg-black/40">
                      <Image 
                        src={p.avatar_url || '/avatar-placeholder.svg'}
                        alt={p.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="space-y-0.5 truncate">
                      <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5 flex-wrap">
                        {p.name}
                        {isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                        {!isClient && p.is_space_verified && <Building2 className="w-3.5 h-3.5 text-gold-primary" />}
                        <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          isClient ? 'bg-cyan-500/10 text-cyan-400' : 'bg-gold-primary/10 text-gold-primary'
                        }`}>
                          {isClient ? 'Cliente' : 'Provedor'}
                        </span>
                        {p.subscription_tier && p.subscription_tier !== 'free' && (
                          <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase border ${
                            p.subscription_tier === 'gold' 
                              ? 'bg-gold-primary/20 border-gold-primary/35 text-gold-light' 
                              : 'bg-purple-500/20 border-purple-500/35 text-purple-300'
                          }`}>
                            {p.subscription_tier}
                          </span>
                        )}
                        {hasActiveBoost && (
                          <span className="text-[8px] bg-red-500/20 text-red-400 border border-red-500/35 px-1.5 py-0.2 rounded font-bold uppercase flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5 fill-red-400" />
                            Boost Ativo
                          </span>
                        )}
                      </h4>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyId(p.id)}
                          className="text-[10px] text-gray-400 hover:text-white font-mono flex items-center gap-1 transition-colors"
                        >
                          <Copy className="w-3 h-3 text-gold-primary" />
                          {copiedId === p.id ? 'ID Copiado!' : `ID: ${p.id.slice(0, 13)}...`}
                        </button>
                        <a
                          href={`/perfil/${p.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-gold-light hover:underline flex items-center gap-0.5 ml-2"
                        >
                          Ver Perfil ↗
                        </a>

                        <button
                          type="button"
                          onClick={() => setDirectNotifModal({ open: true, profileId: p.id, profileName: p.name })}
                          className="ml-2 px-2 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 rounded text-[9px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          title="Enviar notificação individual para este usuário"
                        >
                          <Bell className="w-3 h-3" />
                          Notificar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <span className={`text-[9px] px-2.5 py-0.5 border rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                      isVerified 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : hasPending
                          ? 'bg-gold-primary/10 border-gold-primary/20 text-gold-light'
                          : isRejected
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : 'bg-white/5 border-white/10 text-gray-400'
                    }`}>
                      Identidade:{' '}
                      {isVerified ? 'Ativa' : hasPending ? 'Análise' : isRejected ? 'Recusada' : 'Nenhuma'}
                    </span>

                    {!isClient && (
                      <span className={`text-[9px] px-2.5 py-0.5 border rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                        p.is_space_verified 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-white/5 border-white/10 text-gray-400'
                      }`}>
                        Ambiente: {p.is_space_verified ? 'Auditado' : 'Sem Selo'}
                      </span>
                    )}
                  </div>

                  {/* Botões de Ação para Administrador */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedProfileId(null);
                        } else {
                          setExpandedProfileId(p.id);
                          setEditFields({
                            subscription_tier: p.subscription_tier || 'free',
                            verification_status: p.verification_status || 'none',
                            is_space_verified: p.is_space_verified || false,
                            price_per_hour: p.price_per_hour || 0,
                            category: p.category || 'massage',
                            gender: p.gender || 'Feminino',
                            is_available_now: p.is_available_now || false,
                            verification_title: p.verification_title || '',
                            last_ip: p.last_ip || ''
                          });
                        }
                      }}
                      className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <Settings className="w-4 h-4 text-gold-primary" />
                      Gerenciar
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </Card>

                {/* Collapsible Panel */}
                {isExpanded && (
                  <Card variant="glass" className="p-5 border-gold-primary/20 bg-black/45 space-y-6 rounded-xl animate-fadeIn">
                    
                    {/* Seção 1: Super Poderes (Dar Boost Instantâneo) */}
                    {!isClient && (
                      <div className="bg-black/40 border border-gold-primary/25 rounded-xl p-4 space-y-3">
                        <span className="text-xs font-bold text-gold-light uppercase tracking-wider flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-gold-primary fill-gold-primary" />
                          Dar Boost Instantâneo (Colocar no Topo da Vitrine)
                        </span>
                        <p className="text-[11px] text-gray-400 font-light">
                          Conceda tempo de visibilidade prioritária no carrossel de destaque sem necessidade de pagamento.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            onClick={() => handleGrantBoost(p.id, 2)}
                            disabled={actionLoading !== null}
                            className="px-3 py-1.5 bg-gold-primary/10 hover:bg-gold-primary/20 border border-gold-primary/30 text-gold-light rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1"
                          >
                            +2 Horas
                          </button>
                          <button
                            onClick={() => handleGrantBoost(p.id, 6)}
                            disabled={actionLoading !== null}
                            className="px-3 py-1.5 bg-gold-primary/10 hover:bg-gold-primary/20 border border-gold-primary/30 text-gold-light rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1"
                          >
                            +6 Horas
                          </button>
                          <button
                            onClick={() => handleGrantBoost(p.id, 12)}
                            disabled={actionLoading !== null}
                            className="px-3 py-1.5 bg-gold-primary/10 hover:bg-gold-primary/20 border border-gold-primary/30 text-gold-light rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1"
                          >
                            +12 Horas
                          </button>
                          <button
                            onClick={() => handleGrantBoost(p.id, 24)}
                            disabled={actionLoading !== null}
                            className="px-3 py-1.5 bg-gold-primary/20 hover:bg-gold-primary/30 border border-gold-primary/40 text-gold-light rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                          >
                            +24 Horas (1 dia)
                          </button>
                          <button
                            onClick={() => handleGrantBoost(p.id, 168)}
                            disabled={actionLoading !== null}
                            className="px-3 py-1.5 bg-gold-primary hover:bg-gold-light text-dark-bg rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                          >
                            +7 Dias (1 semana)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Seção 2: Configurações Gerais do Perfil */}
                    <div className="space-y-4 border-t border-white/5 pt-4">
                      <div className="border-b border-white/5 pb-2.5 flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Settings className="w-4 h-4 text-gold-primary" />
                          Edição Administrativa do Anúncio
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">Exclusivo Admin</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Subscription Tier */}
                        <div className="space-y-1.5">
                          <label htmlFor="subscription_tier" className="text-[10px] text-gray-400 font-bold uppercase block">Plano de Assinatura (Upgrade/Downgrade)</label>
                          <select
                            id="subscription_tier"
                            title="Plano de Assinatura"
                            value={editFields.subscription_tier}
                            onChange={(e) => setEditFields({ ...editFields, subscription_tier: e.target.value })}
                            className="w-full bg-dark-bg/85 border border-white/10 text-xs text-white rounded-lg px-3 py-2.5 focus:border-gold-primary/50 focus:outline-none transition-colors"
                          >
                            <option value="free">Bronze (Grátis)</option>
                            <option value="pro">Prata (Pro)</option>
                            <option value="gold">Ouro (Gold)</option>
                          </select>
                        </div>

                        {/* Verification Status */}
                        <div className="space-y-1.5">
                          <label htmlFor="verification_status" className="text-[10px] text-gray-400 font-bold uppercase block">Status de Verificação de Identidade</label>
                          <select
                            id="verification_status"
                            title="Status de Verificação de Identidade"
                            value={editFields.verification_status}
                            onChange={(e) => setEditFields({ ...editFields, verification_status: e.target.value })}
                            className="w-full bg-dark-bg/85 border border-white/10 text-xs text-white rounded-lg px-3 py-2.5 focus:border-gold-primary/50 focus:outline-none transition-colors"
                          >
                            <option value="none">Nenhum (Não Iniciado)</option>
                            <option value="pending">Pendente (Em Análise)</option>
                            <option value="verified">Verificado (Aprovado)</option>
                            <option value="rejected">Rejeitado (Recusado)</option>
                          </select>
                        </div>

                        {/* Space Verification */}
                        {!isClient && (
                          <div className="space-y-1.5">
                            <label htmlFor="is_space_verified" className="text-[10px] text-gray-400 font-bold uppercase block">Selo de Espaço Físico / Ambiente</label>
                            <select
                              id="is_space_verified"
                              title="Selo de Espaço Físico"
                              value={editFields.is_space_verified ? "true" : "false"}
                              onChange={(e) => setEditFields({ ...editFields, is_space_verified: e.target.value === "true" })}
                              className="w-full bg-dark-bg/85 border border-white/10 text-xs text-white rounded-lg px-3 py-2.5 focus:border-gold-primary/50 focus:outline-none transition-colors"
                            >
                              <option value="false">Sem Selo (Não Auditado)</option>
                              <option value="true">Selo Espaço Auditado</option>
                            </select>
                          </div>
                        )}

                        {/* Category */}
                        {!isClient && (
                          <div className="space-y-1.5">
                            <label htmlFor="category" className="text-[10px] text-gray-400 font-bold uppercase block">Categoria de Atendimento</label>
                            <select
                              id="category"
                              title="Categoria de Atendimento"
                              value={editFields.category}
                              onChange={(e) => setEditFields({ ...editFields, category: e.target.value })}
                              className="w-full bg-dark-bg/85 border border-white/10 text-xs text-white rounded-lg px-3 py-2.5 focus:border-gold-primary/50 focus:outline-none transition-colors"
                            >
                              <option value="massage">Apenas Massagem</option>
                              <option value="escort">Apenas Acompanhante</option>
                              <option value="both">Ambos (Massagem e Acompanhante)</option>
                            </select>
                          </div>
                        )}

                        {/* Gender */}
                        {!isClient && (
                          <div className="space-y-1.5">
                            <label htmlFor="gender" className="text-[10px] text-gray-400 font-bold uppercase block">Gênero</label>
                            <select
                              id="gender"
                              title="Gênero"
                              value={editFields.gender}
                              onChange={(e) => setEditFields({ ...editFields, gender: e.target.value })}
                              className="w-full bg-dark-bg/85 border border-white/10 text-xs text-white rounded-lg px-3 py-2.5 focus:border-gold-primary/50 focus:outline-none transition-colors"
                            >
                              <option value="Feminino">Feminino</option>
                              <option value="Masculino">Masculino</option>
                              <option value="Trans">Trans</option>
                            </select>
                          </div>
                        )}

                        {/* Price Per Hour */}
                        {!isClient && (
                          <div className="space-y-1.5">
                            <label htmlFor="price_per_hour" className="text-[10px] text-gray-400 font-bold uppercase block">Valor da Hora (R$)</label>
                            <input
                              id="price_per_hour"
                              type="number"
                              title="Valor da Hora"
                              placeholder="Valor por hora em reais"
                              value={editFields.price_per_hour}
                              onChange={(e) => setEditFields({ ...editFields, price_per_hour: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-dark-bg/85 border border-white/10 text-xs text-white rounded-lg px-3 py-2 focus:border-gold-primary/50 focus:outline-none transition-colors"
                            />
                          </div>
                        )}

                        {/* Título de Verificação Personalizado */}
                        <div className="space-y-1.5">
                          <label htmlFor="verification_title" className="text-[10px] text-gray-400 font-bold uppercase block">Título de Verificação Personalizado</label>
                          <input
                            id="verification_title"
                            type="text"
                            title="Título de Verificação Personalizado"
                            value={editFields.verification_title || ''}
                            onChange={(e) => setEditFields({ ...editFields, verification_title: e.target.value })}
                            placeholder="Ex: Foto Real, Elite, VIP"
                            className="w-full bg-dark-bg/85 border border-white/10 text-xs text-white rounded-lg px-3 py-2 focus:border-gold-primary/50 focus:outline-none transition-colors"
                          />
                        </div>

                        {/* Exibição e Ação de IP */}
                        <div className="space-y-1.5 col-span-full border-t border-white/5 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block">Último IP de Acesso</label>
                            <span className="text-xs font-mono text-white mt-1 block">{p.last_ip || 'Nenhum IP registrado'}</span>
                          </div>
                          {p.last_ip && (
                            <Button
                              variant="dark"
                              type="button"
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja banir o IP ${p.last_ip}?`)) {
                                  handleBanIp(p.last_ip, `Banido a partir do perfil de ${p.name}`);
                                }
                              }}
                              className="border border-red-500/30 hover:bg-red-500/10 text-red-400 py-2 text-[10px] cursor-pointer"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                              Banir IP do Usuário
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                        <Button
                          variant="dark"
                          onClick={() => setExpandedProfileId(null)}
                          className="py-2 text-[11px] px-4 border border-white/10 hover:bg-white/5"
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="gold"
                          onClick={() => {
                            handleProfileUpdate(p.id, editFields);
                            setExpandedProfileId(null);
                          }}
                          disabled={actionLoading !== null}
                          isLoading={actionLoading === `${p.id}-update`}
                          className="py-2 text-[11px] px-5"
                        >
                          <Check className="w-4 h-4 mr-1.5" />
                          Salvar Alterações (Requer PIN)
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação com PIN de Segurança Admin */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-dark-card border border-gold-primary/30 p-6 rounded-2xl max-w-sm w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-primary/10 rounded-xl flex items-center justify-center text-gold-primary border border-gold-primary/20">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Autorização por PIN Admin</h3>
                <p className="text-[11px] text-gray-400 font-light truncate max-w-[220px]">
                  {pendingAction?.name || 'Ação Restrita'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="adminPinInput" className="text-[10px] text-gray-400 font-bold uppercase block">Digite seu PIN de Segurança Admin:</label>
              <input
                id="adminPinInput"
                type="password"
                maxLength={8}
                placeholder="****"
                value={adminPinInput}
                onChange={(e) => setAdminPinInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmPinAction()}
                autoFocus
                className="w-full bg-black/60 border border-white/15 text-center text-lg tracking-widest font-mono text-white py-3 rounded-xl focus:border-gold-primary focus:outline-none"
              />
              {pinError && <span className="text-xs text-red-400 font-medium block">{pinError}</span>}
            </div>

            <div className="flex gap-2">
              <Button
                variant="dark"
                onClick={() => {
                  setPinModalOpen(false);
                  setPendingAction(null);
                  setAdminPinInput('');
                }}
                className="flex-1 py-2.5 text-xs border border-white/10 hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button
                variant="gold"
                onClick={handleConfirmPinAction}
                className="flex-1 py-2.5 text-xs font-bold uppercase"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Notificação Individual Direta */}
      {directNotifModal.open && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-md w-full bg-dark-card border border-gold-primary/30 p-6 rounded-2xl shadow-2xl space-y-5 relative">
            <button
              onClick={() => setDirectNotifModal({ open: false, profileId: '', profileName: '' })}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                <Bell className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Notificar {directNotifModal.profileName}
                </h3>
                <p className="text-[10px] text-gray-400">Mensagem individual direta para a central de alertas do usuário.</p>
              </div>
            </div>

            <form onSubmit={handleDirectNotifSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-300 font-semibold">Título da Notificação</label>
                <input
                  type="text"
                  placeholder="Ex: 📢 Aviso Importante da Moderação"
                  value={directTitle}
                  onChange={(e) => setDirectTitle(e.target.value)}
                  required
                  className="w-full bg-black/60 border border-white/10 text-white text-xs p-3 rounded-xl focus:border-gold-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-300 font-semibold">Mensagem / Conteúdo</label>
                <textarea
                  rows={3}
                  placeholder="Escreva a notificação que esta profissional/cliente irá receber..."
                  value={directContent}
                  onChange={(e) => setDirectContent(e.target.value)}
                  required
                  className="w-full bg-black/60 border border-white/10 text-white text-xs p-3 rounded-xl focus:border-gold-primary focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="dark"
                  onClick={() => setDirectNotifModal({ open: false, profileId: '', profileName: '' })}
                  className="text-xs border border-white/10"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  isLoading={directLoading}
                  variant="gold"
                  className="text-xs font-bold uppercase cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Enviar Notificação
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal para visualizar imagens grandes */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full max-w-4xl h-full max-h-[85vh]">
            <Image 
              src={selectedImage}
              alt="Ampliada"
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
          <button 
            className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 border border-white/10 text-white cursor-pointer hover:bg-white/10"
            onClick={() => setSelectedImage(null)}
            title="Fechar imagem ampliada"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

    </div>
  );
}
