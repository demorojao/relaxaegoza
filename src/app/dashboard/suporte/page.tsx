'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Headphones, Plus, Send, Clock, CheckCircle2, AlertCircle, MessageSquare, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

export default function UserSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);

  // Estados de Criação de Novo Chamado
  const [isCreating, setIsCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('duvida');
  const [priority, setPriority] = useState('medium');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Estado de Resposta em Chamado Existente
  const [replyMessage, setReplyMessage] = useState('');
  const [replying, setReplying] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/support/tickets', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const res = await response.json();
      if (res.success) {
        setTickets(res.tickets || []);
        if (activeTicket) {
          const updated = (res.tickets || []).find((t: any) => t.id === activeTicket.id);
          if (updated) setActiveTicket(updated);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar chamados de suporte:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) {
      setErrorMessage('Por favor, preencha o assunto e a mensagem.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada.');

      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ subject, category, priority, message })
      });

      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Erro ao abrir chamado.');

      setSuccessMessage('Chamado aberto com sucesso! A equipe de suporte responderá em breve.');
      setSubject('');
      setMessage('');
      setIsCreating(false);
      fetchTickets();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao abrir chamado.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyMessage.trim()) return;

    setReplying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada.');

      const response = await fetch('/api/support/tickets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ticketId: activeTicket.id,
          message: replyMessage.trim()
        })
      });

      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Erro ao enviar mensagem.');

      setReplyMessage('');
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar mensagem.');
    } finally {
      setReplying(false);
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', ' às');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/40 p-6 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gold-primary/10 border border-gold-primary/30 rounded-2xl flex items-center justify-center text-gold-primary">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Central de Suporte & Atendimento</h1>
            <p className="text-xs text-gray-400 font-light mt-0.5">
              Abra chamados diretamente com a equipe de suporte do portal e acompanhe as respostas.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => { setIsCreating(!isCreating); setActiveTicket(null); setErrorMessage(''); setSuccessMessage(''); }}
          variant="gold"
          className="text-xs font-bold uppercase tracking-wider px-4 py-3"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {isCreating ? 'Ver Meus Chamados' : 'Abrir Novo Chamado'}
        </Button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Formulário de Criação de Novo Chamado */}
      {isCreating ? (
        <Card variant="glass" className="p-6 md:p-8 space-y-6 max-w-2xl mx-auto border-gold-primary/30 bg-black/40">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-base font-bold text-white">Abrir Solicitação de Atendimento</h2>
            <p className="text-xs text-gray-400 font-light mt-0.5">
              Descreva sua dúvida, problema com pagamentos ou solicitação.
            </p>
          </div>

          <form onSubmit={handleCreateTicket} className="space-y-4">
            <Input
              label="Assunto do Chamado"
              type="text"
              placeholder="Ex: Dúvida sobre plano Gold / Problema com foto"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              themeVariant="gold"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 text-xs text-white p-3 rounded-xl focus:border-gold-primary focus:outline-none"
                >
                  <option value="duvida">Dúvidas Gerais</option>
                  <option value="financeiro">Financeiro / Pagamentos PIX</option>
                  <option value="anuncio">Moderação de Anúncio / Foto</option>
                  <option value="bug">Problema Técnico / Erro</option>
                  <option value="outros">Outros Assuntos</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 text-xs text-white p-3 rounded-xl focus:border-gold-primary focus:outline-none"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média (Padrão)</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Mensagem Detalhada</label>
              <textarea
                rows={5}
                placeholder="Descreva detalhadamente como podemos te ajudar..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-xs text-white p-3.5 rounded-xl focus:border-gold-primary focus:outline-none"
                required
              />
            </div>

            <Button
              type="submit"
              isLoading={submitting}
              variant="gold"
              className="w-full py-3 text-xs font-bold uppercase tracking-wider"
            >
              Enviar Chamado para o Suporte
            </Button>
          </form>
        </Card>
      ) : activeTicket ? (
        /* Visualização / Atendimento do Chamado Selecionado */
        <Card variant="glass" className="p-6 md:p-8 space-y-6 border-gold-primary/30 bg-black/40">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <button
              onClick={() => setActiveTicket(null)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para a lista
            </button>

            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              activeTicket.status === 'open' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
              activeTicket.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
              'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {activeTicket.status === 'open' ? 'Aberto' : activeTicket.status === 'in_progress' ? 'Em Atendimento' : 'Resolvido'}
            </span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">{activeTicket.subject}</h2>
            <span className="text-xs text-gray-500 capitalize">Categoria: {activeTicket.category} • Criado em {formatDateTime(activeTicket.created_at)}</span>
          </div>

          {/* Histórico de Mensagens */}
          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 p-4 bg-black/50 rounded-2xl border border-white/5">
            {activeTicket.messages?.map((msg: any) => {
              const isAdmin = msg.sender_type === 'admin';

              return (
                <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1 px-1">
                    <span className="font-semibold text-gray-300">{isAdmin ? '🎧 Suporte Relaxe & Goze' : 'Você'}</span>
                    <span>•</span>
                    <span>{formatDateTime(msg.created_at)}</span>
                  </div>

                  <div
                    className={`p-4 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                      isAdmin
                        ? 'bg-gradient-to-r from-gold-primary/20 to-gold-dark/20 border border-gold-primary/30 text-gold-light rounded-tl-none shadow-md'
                        : 'bg-white/5 border border-white/10 text-gray-200 rounded-tr-none'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Responder */}
          {activeTicket.status !== 'closed' && (
            <form onSubmit={handleReplyTicket} className="space-y-3">
              <textarea
                rows={3}
                placeholder="Escreva sua resposta..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-xs text-white p-3 rounded-xl focus:border-gold-primary focus:outline-none"
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  isLoading={replying}
                  variant="gold"
                  className="py-2.5 px-4 text-xs font-bold uppercase tracking-wider"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Enviar Resposta
                </Button>
              </div>
            </form>
          )}
        </Card>
      ) : (
        /* Lista de Chamados do Usuário */
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 ml-1">Seus Chamados Abertos</h2>

          {loading ? (
            <div className="text-center py-12 text-gray-500 text-xs">Carregando seus chamados...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 bg-black/30 rounded-2xl border border-white/5 text-gray-500 space-y-3">
              <MessageSquare className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-xs text-gray-400">Você não possui nenhum chamado de suporte aberto.</p>
              <Button
                type="button"
                onClick={() => setIsCreating(true)}
                variant="gold"
                size="sm"
                className="text-xs font-semibold"
              >
                Abrir Primeiro Chamado
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {tickets.map((ticket) => {
                const isPending = ticket.status === 'open' || ticket.status === 'in_progress';

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setActiveTicket(ticket)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer bg-black/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isPending ? 'border-amber-500/30 hover:border-amber-500/50' : 'border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-gold-primary/10 border border-gold-primary/20 text-gold-primary text-[10px] font-bold rounded uppercase">
                          {ticket.category}
                        </span>
                        <h3 className="text-sm font-bold text-white">{ticket.subject}</h3>
                      </div>
                      <p className="text-xs text-gray-400 font-light line-clamp-1">
                        {ticket.messages && ticket.messages.length > 0
                          ? ticket.messages[ticket.messages.length - 1].message
                          : 'Sem mensagens'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-right shrink-0">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ticket.status === 'open' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        ticket.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {ticket.status === 'open' ? 'Aberto' : ticket.status === 'in_progress' ? 'Em Atendimento' : 'Resolvido'}
                      </span>
                      <span className="text-[10px] text-gray-500">{formatDateTime(ticket.updated_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
