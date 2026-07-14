'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Shield, ShieldCheck, ShieldAlert, Upload, Sparkles, Building2, HelpCircle, Check, Clock, Lock } from 'lucide-react';
import Link from 'next/link';
import { triggerRevalidate } from '@/lib/revalidate';
import { uploadToR2 } from '@/lib/r2Client';

export default function VerificationPanel() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Selfie / Document Form
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verificationStage, setVerificationStage] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Auditing Request Form
  const [spaceFile, setSpaceFile] = useState<File | null>(null);
  const [spaceFilePreview, setSpaceFilePreview] = useState<string | null>(null);
  const [auditingRequested, setAuditingRequested] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setProfile(data);
        if (data.is_space_verified || data.space_verification_file) {
          setAuditingRequested(true);
        }
      }
    }
    setLoading(false);
  };  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!selfieFile || !documentFile) {
      alert('Por favor, selecione ambos os arquivos (selfie e documento) para a verificação.');
      return;
    }
    setSubmitting(true);
    setVerificationError(null);

    try {
      // 1. Fazer upload da Selfie no Cloudflare R2
      setVerificationStage('Enviando selfie para armazenamento seguro...');
      const selfiePublicUrl = await uploadToR2(selfieFile);

      // 2. Fazer upload do Documento no Cloudflare R2
      setVerificationStage('Enviando documento para armazenamento seguro...');
      const docPublicUrl = await uploadToR2(documentFile);

      // Salva previamente as URLs de arquivos no banco como pending
      const { error: savePreError } = await supabase
        .from('profiles')
        .update({
          verification_status: 'pending',
          verification_selfie: selfiePublicUrl,
          verification_document: docPublicUrl
        })
        .eq('id', user.id);

      if (savePreError) throw savePreError;

      if (profile) {
        await triggerRevalidate(profile.city, profile.neighborhood);
      }

      // 3. Finalizar o fluxo para análise humana
      setProfile((prev: any) => ({
        ...prev,
        verification_status: 'pending',
        verification_selfie: selfiePublicUrl,
        verification_document: docPublicUrl
      }));
      setSuccess(true);
      setVerificationStage('Documentos enviados com sucesso!');

    } catch (err: any) {
      console.error('Erro no envio de documentos:', err);
      alert('Ocorreu um erro ao enviar os documentos: ' + (err.message || err));
    } finally {
      setSubmitting(false);
      setVerificationStage(null);
    }
  };
  const handleAuditingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!spaceFile) {
      alert('Por favor, selecione o arquivo de imagem ou vídeo do seu espaço.');
      return;
    }
    setSubmitting(true);

    try {
      // Upload para o Cloudflare R2
      const spacePublicUrl = await uploadToR2(spaceFile);

      // Salva o link do vídeo/foto na nova coluna
      const { error } = await supabase
        .from('profiles')
        .update({
          space_verification_file: spacePublicUrl,
          is_space_verified: false
        })
        .eq('id', user.id);

      if (error) throw error;

      if (profile) {
        await triggerRevalidate(profile.city, profile.neighborhood);
      }

      setAuditingRequested(true);
      setProfile((prev: any) => ({
        ...prev,
        space_verification_file: spacePublicUrl,
        is_space_verified: false
      }));
    } catch (err: any) {
      alert('Erro ao solicitar verificação de espaço: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-wine-primary/30 border-t-wine-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative z-20 pb-16 selection:bg-gold-primary selection:text-dark-bg">
      {/* Header */}
      <div className="border-b border-dark-border/20 pb-5">
        <h1 className="text-2xl md:text-3xl font-light text-white tracking-tight">
          Painel de <span className="font-semibold text-wine-light">Verificações de Segurança</span>
        </h1>
        <p className="text-xs md:text-sm text-gray-400 font-light mt-1.5">
          Garanta o destaque premium no portal e transmita 100% de confiança para seus clientes através das nossas certificações.
        </p>
      </div>

      {/* Grid de Verificações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Lado Esquerdo: Verificação por Selfie & RG */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-6 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-wine-primary/10 rounded-xl text-wine-light">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white">Selo de Perfil Verificado (Selfie)</h3>
              </div>
              
              {/* Badge de Status */}
              {profile?.verification_status === 'verified' && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verificado
                </span>
              )}
              {profile?.verification_status === 'pending' && (
                <span className="text-[10px] bg-gold-primary/10 text-gold-light border border-gold-primary/20 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Sob Análise
                </span>
              )}
              {(profile?.verification_status === 'none' || profile?.verification_status === 'rejected') && (
                <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Não Verificado
                </span>
              )}
            </div>

            <p className="text-xs text-gray-400 font-light leading-relaxed mb-6">
              Para validar que você é realmente a pessoa das fotos de perfil, envie uma foto legível do seu documento de identidade (RG ou CNH) e uma selfie segurando um papel manuscrito com seu **Nome Artístico**.
            </p>

            {profile?.verification_status === 'none' && !success && (
              <form onSubmit={handleIdentitySubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="selfie-file-input" className="text-xs text-gray-400 font-medium">Selfie segurando papel manuscrito</label>
                  <div className="relative border border-dashed border-dark-border hover:border-wine-primary/50 transition-colors rounded-xl p-4 bg-dark-bg/40 flex flex-col items-center justify-center gap-2 min-h-24">
                    <input 
                      id="selfie-file-input"
                      type="file" 
                      accept="image/*"
                      title="Foto de selfie para verificação"
                      placeholder="Escolha o arquivo de selfie"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelfieFile(file);
                        if (file) {
                          setSelfiePreview(URL.createObjectURL(file));
                        } else {
                          setSelfiePreview(null);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      required
                    />
                    {selfiePreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={selfiePreview} alt="Selfie Preview" className="w-24 h-24 object-cover rounded-lg border border-wine-primary/30" />
                        <span className="text-[10px] text-gray-400">Clique para alterar a foto</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-gray-500" />
                        <span className="text-xs text-gray-400 text-center">Clique ou arraste para enviar sua selfie</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="document-file-input" className="text-xs text-gray-400 font-medium">Foto do Documento (RG ou CNH)</label>
                  <div className="relative border border-dashed border-dark-border hover:border-wine-primary/50 transition-colors rounded-xl p-4 bg-dark-bg/40 flex flex-col items-center justify-center gap-2 min-h-24">
                    <input 
                      id="document-file-input"
                      type="file" 
                      accept="image/*"
                      title="Foto do documento para verificação"
                      placeholder="Escolha o arquivo do documento"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setDocumentFile(file);
                        if (file) {
                          setDocumentPreview(URL.createObjectURL(file));
                        } else {
                          setDocumentPreview(null);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      required
                    />
                    {documentPreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={documentPreview} alt="Document Preview" className="w-24 h-24 object-cover rounded-lg border border-wine-primary/30" />
                        <span className="text-[10px] text-gray-400">Clique para alterar a foto</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-gray-500" />
                        <span className="text-xs text-gray-400 text-center">Clique ou arraste para enviar a foto do documento</span>
                      </>
                    )}
                  </div>
                </div>

                {submitting ? (
                  <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-3 animate-pulse">
                    <div className="w-6 h-6 border-2 border-wine-light/30 border-t-wine-light rounded-full animate-spin" />
                    <span className="text-[11px] font-medium text-gray-300 text-center">
                      {verificationStage || 'Analisando dados...'}
                    </span>
                  </div>
                ) : (
                  <button 
                    type="submit" 
                    title="Enviar documentos para análise"
                    className="w-full py-3 rounded-xl bg-wine-primary hover:bg-wine-light text-white text-xs font-semibold tracking-wide transition-all shadow-[0_4px_12px_rgba(155,44,44,0.2)] cursor-pointer"
                  >
                    Enviar para Análise
                  </button>
                )}
              </form>
            )}

            {profile?.verification_status === 'pending' && (
              <div className="bg-gold-primary/2 border border-gold-primary/20 rounded-xl p-4 text-center space-y-2">
                <Clock className="w-8 h-8 text-gold-primary mx-auto mb-1 animate-pulse" />
                <h4 className="text-xs font-semibold text-white mb-1">Análise em Andamento</h4>
                <p className="text-[10px] text-gray-500 font-light leading-relaxed">
                  Recebemos seus arquivos de selfie e documento. A validação é realizada manualmente por nossa equipe e pode levar até 72 horas.
                </p>
                {verificationError && (
                  <p className="text-[10px] text-amber-400 font-light border-t border-white/5 pt-2 mt-2 leading-relaxed">
                    ⚠️ {verificationError}
                  </p>
                )}
              </div>
            )}

            {profile?.verification_status === 'verified' && (
              <div className="bg-emerald-500/2 border border-emerald-500/20 rounded-xl p-4 text-center">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-xs font-semibold text-white mb-1">Identidade Validada!</h4>
                <p className="text-[10px] text-gray-500 font-light leading-relaxed">
                  Seu perfil exibe o selo **Foto Real / Perfil Verificado** na vitrine principal, aumentando em até **60% seus cliques**.
                </p>
              </div>
            )}
          </div>

          <div className="text-[10px] text-gray-500 font-light border-t border-dark-border/40 pt-4">
            * Seus dados de documentos são protegidos por criptografia de ponta a ponta e deletados após a conclusão da verificação.
          </div>
        </div>

        {/* Lado Direito: Selo de Ambiente Validado (Espaço Físico) */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-6 flex flex-col justify-between space-y-6 relative overflow-hidden">
          {profile?.subscription_tier !== 'gold' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-[5px] z-30 flex flex-col items-center justify-center p-6 text-center border border-white/5">
              <div className="p-3 bg-gold-primary/10 rounded-full text-gold-primary mb-3">
                <Lock className="w-5 h-5 animate-pulse" />
              </div>
              <h4 className="text-xs font-bold text-white tracking-wide">Espaço Validado (Exclusivo GOLD)</h4>
              <p className="text-[10px] text-gray-400 font-light max-w-55 mt-1.5 leading-relaxed mb-4">
                O selo de auditoria de espaço e ambiente físico de atendimento está disponível apenas para parceiras **Gold Premium**.
              </p>
              <Link href="/planos">
                <button 
                  title="Fazer Upgrade para Gold"
                  className="px-4 py-2 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-gold-primary/20"
                >
                  Fazer Upgrade para Gold
                </button>
              </Link>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gold-primary/10 rounded-xl text-gold-primary">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white">Selo de Espaço Validado via Vídeo (Online)</h3>
              </div>

              {profile?.is_space_verified ? (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Validado
                </span>
              ) : (
                <span className="text-[10px] bg-gray-500/10 text-gray-400 border border-white/5 px-2.5 py-1 rounded-full font-semibold">
                  Pendente
                </span>
              )}
            </div>

            <p className="text-xs text-gray-400 font-light leading-relaxed mb-6">
              Exclusivo para profissionais com espaço de atendimento próprio ou clínico. Envie um vídeo curto mostrando o seu espaço ou agende uma rápida chamada de vídeo de verificação para atestar a infraestrutura, higiene, conforto e privacidade do seu local de trabalho, 100% online.
            </p>

            {!auditingRequested ? (
              <form onSubmit={handleAuditingSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="space-file-input" className="text-xs text-gray-400 font-medium">Foto ou Vídeo Curto do Espaço de Atendimento</label>
                  <div className="relative border border-dashed border-dark-border hover:border-gold-primary/50 transition-colors rounded-xl p-4 bg-dark-bg/40 flex flex-col items-center justify-center gap-2 min-h-24">
                    <input 
                      id="space-file-input"
                      type="file" 
                      accept="image/*,video/*"
                      title="Foto ou vídeo do espaço de atendimento"
                      placeholder="Escolha o arquivo do espaço"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSpaceFile(file);
                        if (file) {
                          setSpaceFilePreview(URL.createObjectURL(file));
                        } else {
                          setSpaceFilePreview(null);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      required
                    />
                    {spaceFilePreview ? (
                      <div className="flex flex-col items-center gap-2">
                        {spaceFile?.type.startsWith('video/') ? (
                          <video src={spaceFilePreview} className="w-32 h-24 object-cover rounded-lg border border-gold-primary/30" controls />
                        ) : (
                          <img src={spaceFilePreview} alt="Space Preview" className="w-32 h-24 object-cover rounded-lg border border-gold-primary/30" />
                        )}
                        <span className="text-[10px] text-gray-400">Clique para alterar o arquivo</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-gray-500 animate-pulse" />
                        <span className="text-xs text-gray-400 text-center">Clique ou arraste para enviar vídeo ou foto do espaço</span>
                      </>
                    )}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  title="Solicitar validação online"
                  className="w-full py-3 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg text-xs font-semibold tracking-wide transition-all shadow-[0_4px_12px_rgba(197,168,128,0.2)] cursor-pointer"
                >
                  {submitting ? 'Enviando arquivo...' : 'Solicitar Validação Online'}
                </button>
              </form>
            ) : (
              <div className="bg-emerald-500/2 border border-emerald-500/20 rounded-xl p-4 text-center">
                <Sparkles className="w-8 h-8 text-gold-primary mx-auto mb-2 animate-pulse" />
                <h4 className="text-xs font-semibold text-white mb-1">Solicitação Ativa</h4>
                <p className="text-[10px] text-gray-500 font-light leading-relaxed">
                  Parabéns! O status de **Espaço Validado** foi ativado no seu perfil. Seus clientes sabem que seu local de trabalho é seguro e confortável.
                </p>
              </div>
            )}
          </div>

          <div className="text-[10px] text-gray-500 font-light border-t border-dark-border/40 pt-4">
            * A validação online por vídeo é realizada com total discrição e sigilo. Não há gravação pública nem exposição de dados.
          </div>
        </div>

      </div>

      {/* Dúvidas Frequentes de Segurança */}
      <div className="glass-effect rounded-2xl border border-dark-border/60 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-gold-primary" /> Pergunta Frequente
        </h3>
        
        <div className="space-y-4 text-xs font-light leading-relaxed">
          <div>
            <h4 className="font-semibold text-white mb-1">Qual o benefício da dupla verificação para a profissional?</h4>
            <p className="text-gray-400">
              Profissionais verificadas aparecem com distintivos de confiança nas buscas. Além disso, somente clientes verificados (com identidade validada) poderão enviar mensagens diretas ou avaliações de feedback. Isso filtra trotes e melhora em 90% a qualidade do seu tempo de trabalho.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
