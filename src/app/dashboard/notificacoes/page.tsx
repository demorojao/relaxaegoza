'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Bell, 
  CheckCheck, 
  Star, 
  Gift, 
  Info, 
  Trash2, 
  Clock, 
  Sparkles,
  Inbox
} from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profile_notifications')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotifications(data);
      }
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime database changes for immediate updates!
    let channel: any;
    async function setupRealtime() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`page_notifications_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profile_notifications',
            filter: `profile_id=eq.${user.id}`
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();
    }
    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Mark a single notification as read
  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return; // Já está lida

    try {
      const { error } = await supabase
        .from('profile_notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      // Atualizar estado local
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('profile_notifications')
        .update({ is_read: true })
        .eq('profile_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      // Atualizar estado local
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Erro ao marcar todas as notificações:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  // Delete a single notification
  const handleDeleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('profile_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Erro ao excluir notificação:', err);
    }
  };

  // Helper to render type icons
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_review':
        return (
          <div className="w-9 h-9 rounded-xl bg-gold-primary/10 border border-gold-primary/20 flex items-center justify-center text-gold-primary">
            <Star className="w-4.5 h-4.5 fill-gold-primary" />
          </div>
        );
      case 'gift_boost':
        return (
          <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <Gift className="w-4.5 h-4.5" />
          </div>
        );
      case 'system_update':
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Info className="w-4.5 h-4.5" />
          </div>
        );
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-gold-primary animate-pulse" />
            Central de Notificações
          </h1>
          <p className="text-xs text-gray-400 font-light">
            Acompanhe avaliações, presentes de destaque e atualizações do Relaxa & Goza.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-semibold text-gold-light border border-white/10 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-3 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-effect rounded-2xl border border-white/5 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-gray-400">
            <Inbox className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">Nenhuma notificação por enquanto</h3>
            <p className="text-xs text-gray-500 font-light max-w-xs">
              Quando clientes avaliarem você ou presentearem seu anúncio com destaque, os alertas chegarão aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleMarkAsRead(notif.id, notif.is_read)}
              className={`group relative glass-effect rounded-xl border transition-all p-4 md:p-5 flex items-start gap-4 cursor-pointer select-none ${
                notif.is_read 
                  ? 'border-white/5 bg-black/20 opacity-70 hover:opacity-100' 
                  : 'border-gold-primary/20 bg-gradient-to-r from-gold-primary/5 via-black/30 to-transparent hover:border-gold-primary/40'
              }`}
            >
              {/* Unread Glow Dot */}
              {!notif.is_read && (
                <div className="absolute top-1/2 left-2 -translate-y-1/2 w-1.5 h-1.5 bg-gold-primary rounded-full shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
              )}

              {/* Type Icon */}
              <div className="shrink-0 pl-1">
                {getNotificationIcon(notif.type)}
              </div>

              {/* Notification Content */}
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start gap-4">
                  <h4 className={`text-xs font-bold text-white ${!notif.is_read ? 'text-gold-light' : ''}`}>
                    {notif.title}
                  </h4>
                  
                  {/* Time / Date */}
                  <span className="text-[9px] text-gray-500 font-light flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(notif.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                <p className="text-[11px] text-gray-300 font-light leading-relaxed">
                  {notif.content}
                </p>
              </div>

              {/* Delete Button (visible on hover) */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Evitar disparar o clique de leitura
                  handleDeleteNotification(notif.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/5 cursor-pointer shrink-0 self-center"
                title="Excluir notificação"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
