'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  AlertCircle, 
  MessageSquare,
  Award
} from 'lucide-react';

function CheckoutContent() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [payment, setPayment] = useState<any>(null);

  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '5500000000000';
  const supportUrl = `https://wa.me/${supportPhone}?text=${encodeURIComponent(
    `Olá! Estou na página de checkout Pix (ID: ${paymentId}) e gostaria de verificar meu pagamento.`
  )}`;

  // 1. Carregar dados iniciais do pagamento e iniciar Polling
  useEffect(() => {
    if (!paymentId) return;

    let intervalId: any;

    async function fetchStatus() {
      try {
        const response = await fetch(`/api/checkout/status?id=${paymentId}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erro ao carregar dados do pagamento.');
        }

        const data = await response.json();
        setPayment(data);
        setLoading(false);

        // Se o status for pago, redirecionar
        if (data.status === 'paid') {
          clearInterval(intervalId);
          setTimeout(() => {
            if (data.isGift && data.targetProfileId) {
              router.push(`/perfil/${data.targetProfileId}?checkout_status=success_gift_boost`);
            } else {
              router.push('/dashboard?checkout_status=success');
            }
          }, 3000);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Erro ao conectar ao servidor.');
        setLoading(false);
        clearInterval(intervalId);
      }
    }

    fetchStatus();

    // Consultar status a cada 4 segundos
    intervalId = setInterval(fetchStatus, 4000);

    return () => clearInterval(intervalId);
  }, [paymentId, router]);

  // 2. Copiar código Pix Copia e Cola para área de transferência
  const handleCopy = () => {
    if (!payment?.pixCopiaECola) return;
    navigator.clipboard.writeText(payment.pixCopiaECola);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 select-none min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
          <p className="text-xs text-gray-400 font-light tracking-wide">Iniciando cobrança Pix Efí...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[400px]">
        <div className="glass-effect max-w-md w-full p-8 rounded-3xl border border-red-500/20 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Erro no Pagamento</h2>
          <p className="text-xs text-gray-400 font-light mb-6 leading-relaxed">
            {error || 'Não foi possível carregar os dados desta cobrança.'}
          </p>
          <button 
            onClick={() => router.push('/planos')}
            className="w-full py-3 bg-white/5 border border-white/10 hover:border-white/30 text-white rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer"
          >
            Voltar para Planos
          </button>
        </div>
      </div>
    );
  }

  const formattedAmount = (payment.amountCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  return (
    <div className="max-w-md mx-auto w-full relative z-10 flex-1 flex flex-col justify-center my-8">
      {/* State: Pagamento Confirmado */}
      {payment.status === 'paid' ? (
        <div className="glass-effect p-8 rounded-3xl border border-emerald-500/30 text-center shadow-[0_15px_40px_-15px_rgba(16,185,129,0.15)] animate-fadeIn">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400">
            <ShieldCheck className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Pagamento Confirmado!</h2>
          <p className="text-xs text-gray-400 font-light leading-relaxed mb-6">
            Identificamos o seu Pix com sucesso. Seu plano ou recurso contratado foi ativado imediatamente.
          </p>
          <div className="flex flex-col items-center gap-3">
            <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
              Redirecionando em instantes...
            </span>
          </div>
        </div>
      ) : (
        /* State: Aguardando Pagamento Pix */
        <div className="glass-effect p-6 md:p-8 rounded-3xl border border-dark-border/40 shadow-xl flex flex-col gap-6">
          
          {/* Header info */}
          <div className="text-center">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold-primary/10 border border-gold-primary/20 text-gold-light text-[10px] font-bold tracking-wide uppercase mb-3">
              <Award className="w-3 h-3" />
              Pagamento Instantâneo via Pix
            </div>
            <h2 className="text-base font-semibold text-white">Finalizar Assinatura</h2>
            <p className="text-xs text-gray-400 font-light mt-0.5">Escaneie o QR Code ou copie a chave Pix abaixo</p>
          </div>

          {/* Price Box */}
          <div className="bg-dark-bg/60 border border-dark-border/40 rounded-2xl p-4 flex justify-between items-center">
            <span className="text-xs text-gray-400 font-light">Valor a pagar:</span>
            <span className="text-lg font-bold text-white tracking-tight">{formattedAmount}</span>
          </div>

          {/* QR Code Container (High contrast background for easy scanner reading) */}
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-4.5 rounded-2xl border border-gold-primary/20 shadow-lg flex items-center justify-center w-52 h-52">
              {payment.pixQrCode ? (
                <img 
                  src={payment.pixQrCode} 
                  alt="QR Code Pix" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-8 h-8 border-2 border-gray-300 border-t-gold-primary rounded-full animate-spin" />
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2.5 h-2.5 border border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
              <span className="text-[10px] text-gray-400 font-medium tracking-wide">
                Aguardando transferência Pix...
              </span>
            </div>
          </div>

          {/* Copia e Cola field */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold ml-1">
              Código Pix Copia e Cola:
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={payment.pixCopiaECola || ''}
                className="bg-dark-bg/60 border border-dark-border/40 rounded-xl px-3 py-2.5 text-xs text-gray-300 font-mono w-full select-all focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="p-3 bg-gold-primary hover:bg-gold-light text-dark-bg font-bold rounded-xl transition-all cursor-pointer shrink-0"
                title="Copiar Código"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Support section (Prevenção de MED) */}
          <div className="border-t border-dark-border/40 pt-5 mt-2">
            <p className="text-xs text-gray-400 font-light text-center leading-relaxed mb-3">
              Dificuldades com a leitura ou confirmação do Pix? Chame nosso <strong>Departamento Financeiro</strong> no WhatsApp para liberação imediata.
            </p>
            <a 
              href={supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Falar com o Financeiro via WhatsApp
            </a>
          </div>

        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 py-12 px-4 md:px-6 relative overflow-hidden flex flex-col justify-between selection:bg-gold-primary selection:text-dark-bg">
      {/* Decorative BG light */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-gold-primary/5 blur-[120px] pointer-events-none" />

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-6 select-none min-h-[400px] relative z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
            <p className="text-xs text-gray-400 font-light tracking-wide">Carregando dados do checkout...</p>
          </div>
        </div>
      }>
        <CheckoutContent />
      </Suspense>

      {/* Safety Badge */}
      <div className="max-w-md mx-auto w-full text-center relative z-10 text-[10px] text-gray-600 font-light flex items-center justify-center gap-1.5 mt-4">
        <ShieldCheck className="w-4 h-4 text-gray-600" />
        Ambiente de Pagamento Seguro e Integrado à Receita Federal
      </div>
    </div>
  );
}
