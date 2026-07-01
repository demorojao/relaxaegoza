import React, { useState } from 'react';
import { Heart, X, MapPin, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizAnswers {
  vibe: string;
  budget: string;
  space: string;
}

interface MatchmakerQuizProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (answers: QuizAnswers) => void;
}

export default function MatchmakerQuiz({ isOpen, onClose, onComplete }: MatchmakerQuizProps) {
  const [quizStep, setQuizStep] = useState(1);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers>({ vibe: '', budget: '', space: '' });

  const handleAnswerSelect = (field: keyof QuizAnswers, value: string) => {
    const updatedAnswers = { ...quizAnswers, [field]: value };
    setQuizAnswers(updatedAnswers);
    
    if (quizStep < 3) {
      setQuizStep(prev => prev + 1);
    } else {
      onComplete(updatedAnswers);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-lg bg-dark-card border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
          >
        {/* Background lights inside modal */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gold-primary/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-wine-primary/10 blur-3xl rounded-full" />

        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-gold-primary animate-pulse" />
            <h3 className="text-base font-semibold text-white tracking-wide">Relaxa & Goza Matchmaker</h3>
          </div>
          <button 
            onClick={onClose}
            title="Fechar"
            className="p-1 text-gray-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex gap-2 mb-8 relative z-10">
          {[1, 2, 3].map((step) => (
            <div 
              key={step} 
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                quizStep >= step ? 'bg-gold-primary' : 'bg-white/10'
              }`} 
            />
          ))}
        </div>

        {/* Step 1: Vibe */}
        {quizStep === 1 && (
          <div className="space-y-5 relative z-10 animate-slideIn">
            <h4 className="text-sm font-semibold text-white mb-2">1. O que você busca hoje?</h4>
            <div className="space-y-3">
              <button 
                onClick={() => handleAnswerSelect('vibe', 'massage')}
                className="w-full text-left p-4 rounded-xl border border-white/10 hover:border-gold-primary hover:bg-gold-primary/2 bg-black/20 text-xs text-white transition-all cursor-pointer flex flex-col gap-1"
              >
                <span className="font-semibold text-gold-light text-sm">🧘 Zen & Terapêutico</span>
                <span className="text-gray-500 font-light text-[10px]">Massagem tântrica, relaxante, tailandesa e alinhamento corporal.</span>
              </button>
              <button 
                onClick={() => handleAnswerSelect('vibe', 'escort')}
                className="w-full text-left p-4 rounded-xl border border-white/10 hover:border-wine-primary hover:bg-wine-primary/2 bg-black/20 text-xs text-white transition-all cursor-pointer flex flex-col gap-1"
              >
                <span className="font-semibold text-wine-light text-sm">🔥 Conexão Intensa</span>
                <span className="text-gray-500 font-light text-[10px]">Acompanhantes de luxo premium para encontros e entretenimento adulto.</span>
              </button>
              <button 
                onClick={() => handleAnswerSelect('vibe', 'both')}
                className="w-full text-left p-4 rounded-xl border border-white/10 hover:border-gold-primary hover:bg-linear-to-r hover:from-gold-primary/2 hover:to-wine-primary/2 bg-black/20 text-xs text-white transition-all cursor-pointer flex flex-col gap-1"
              >
                <span className="font-semibold text-white text-sm">✨ Experiência Completa</span>
                <span className="text-gray-500 font-light text-[10px]">Profissionais que atendem com o melhor de ambos os serviços.</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Budget */}
        {quizStep === 2 && (
          <div className="space-y-5 relative z-10 animate-slideIn">
            <h4 className="text-sm font-semibold text-white mb-2">2. Qual é o seu limite de investimento por hora?</h4>
            <div className="space-y-3">
              <button 
                onClick={() => handleAnswerSelect('budget', '300')}
                className="w-full text-left p-4 rounded-xl border border-white/10 hover:border-gold-primary hover:bg-gold-primary/2 bg-black/20 text-xs text-white transition-all cursor-pointer flex justify-between items-center"
              >
                <span className="font-semibold text-sm">💰 Econômico / Razoável</span>
                <span className="text-gold-light font-bold">Até R$ 300</span>
              </button>
              <button 
                onClick={() => handleAnswerSelect('budget', '600')}
                className="w-full text-left p-4 rounded-xl border border-white/10 hover:border-gold-primary hover:bg-gold-primary/2 bg-black/20 text-xs text-white transition-all cursor-pointer flex justify-between items-center"
              >
                <span className="font-semibold text-sm">💎 Intermediário / Premium</span>
                <span className="text-gold-light font-bold">Até R$ 600</span>
              </button>
              <button 
                onClick={() => handleAnswerSelect('budget', '')}
                className="w-full text-left p-4 rounded-xl border border-white/10 hover:border-gold-primary hover:bg-gold-primary/2 bg-black/20 text-xs text-white transition-all cursor-pointer flex justify-between items-center"
              >
                <span className="font-semibold text-sm">👑 Exclusividade Sem Limites</span>
                <span className="text-emerald-400 font-bold">Qualquer valor</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Space */}
        {quizStep === 3 && (
          <div className="space-y-5 relative z-10 animate-slideIn">
            <h4 className="text-sm font-semibold text-white mb-2">3. Onde você prefere o atendimento?</h4>
            <div className="space-y-3">
              <button 
                onClick={() => handleAnswerSelect('space', 'local')}
                className="w-full text-left p-4 rounded-xl border border-white/10 hover:border-gold-primary hover:bg-gold-primary/2 bg-black/20 text-xs text-white transition-all cursor-pointer flex flex-col gap-1"
              >
                <span className="font-semibold text-sm flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gold-primary" /> Local Próprio / Residência</span>
                <span className="text-gray-500 font-light text-[10px]">Prefiro ir ao ambiente climatizado e estruturado da profissional.</span>
              </button>
              <button 
                onClick={() => handleAnswerSelect('space', 'any')}
                className="w-full text-left p-4 rounded-xl border border-white/10 hover:border-gold-primary hover:bg-gold-primary/2 bg-black/20 text-xs text-white transition-all cursor-pointer flex flex-col gap-1"
              >
                <span className="font-semibold text-sm flex items-center gap-1.5"><HelpCircle className="w-4 h-4 text-gray-400" /> A Combinar / Delivery / Hotel</span>
                <span className="text-gray-500 font-light text-[10px]">Aceito deslocamento, atendimento em hotel, motel ou delivery.</span>
              </button>
            </div>
          </div>
        )}
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
