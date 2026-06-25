'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { 
  LayoutDashboard, 
  UserSquare2, 
  ImagePlus, 
  ShieldCheck, 
  CreditCard, 
  ArrowLeft,
  Sparkles,
  Building2,
  Calendar,
  Camera,
  Menu,
  X
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (data) {
          setRole(data.role);
        }
      }
      setLoading(false);
    }
    fetchRole();
  }, []);

  const providerItems = [
    {
      name: 'Métricas & Painel',
      icon: LayoutDashboard,
      path: '/dashboard'
    },
    {
      name: 'Estruturar Perfil',
      icon: UserSquare2,
      path: '/dashboard/perfil'
    },
    {
      name: 'Fotos & Galeria',
      icon: ImagePlus,
      path: '/dashboard/midia'
    },
    {
      name: 'Stories Efêmeros',
      icon: Camera,
      path: '/dashboard/stories'
    },
    {
      name: 'Enviar Verificação',
      icon: ShieldCheck,
      path: '/dashboard/verificacao'
    },
    {
      name: 'Planos de Anúncio',
      icon: CreditCard,
      path: '/planos'
    }
  ];

  const hostItems = [
    {
      name: 'Painel do Local',
      icon: LayoutDashboard,
      path: '/dashboard'
    },
    {
      name: 'Minhas Salas',
      icon: Building2,
      path: '/dashboard/salas'
    },
    {
      name: 'Reservas Recebidas',
      icon: Calendar,
      path: '/dashboard/reservas'
    },
    {
      name: 'Validar Espaço',
      icon: ShieldCheck,
      path: '/dashboard/verificacao'
    }
  ];

  // Forçado a exibir apenas itens de provedor para ocultar recursos de salas e reservas do host temporariamente para o lançamento
  const menuItems = providerItems;

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 flex flex-col md:flex-row selection:bg-gold-primary selection:text-dark-bg">
      {/* Mobile Sticky Header */}
      <header className="md:hidden sticky top-0 z-50 bg-dark-card/90 backdrop-blur-md border-b border-dark-border/40 px-4 py-3 flex items-center justify-between">
        <Logo />
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          {menuOpen ? <X className="w-6 h-6 text-gold-primary" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Navigation Drawer Overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-x-0 bottom-0 top-[53px] bg-dark-bg/95 backdrop-blur-md z-40 p-6 flex flex-col justify-between overflow-y-auto animate-fadeIn">
          <div className="space-y-6">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold block ml-1">
              Navegação do Painel
            </span>
            <nav className="flex flex-col gap-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.name} 
                    href={item.path}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all ${
                      isActive 
                        ? 'bg-gold-primary/10 text-gold-light border-l-2 border-gold-primary font-bold shadow' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}>
                      <Icon className={`w-4 h-4 ${isActive ? 'text-gold-primary' : ''}`} />
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-dark-border/20 pt-5 mt-8">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para a Home
            </Link>
          </div>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 bg-dark-card border-r border-dark-border/40 p-6 flex-col justify-between flex-shrink-0">
        <div>
          {/* Logo Header */}
          <div className="flex flex-col gap-1.5 mb-8 border-b border-dark-border/20 pb-5">
            <Logo />
            <span className="text-[9px] uppercase tracking-[0.2em] text-gray-500 font-medium ml-1">
              {role === 'host' ? 'Painel do Local' : 'Painel de Anúncio'}
            </span>
          </div>

          {/* Nav menu */}
          <nav className="space-y-1">
            {loading ? (
              <div className="py-4 flex justify-center">
                <div className="w-5 h-5 border-2 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
              </div>
            ) : (
              menuItems.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link key={item.name} href={item.path}>
                    <span className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                      isActive 
                        ? 'bg-gold-primary/10 text-gold-light border-l-2 border-gold-primary' 
                        : 'text-gray-400 hover:text-white hover:bg-dark-bg/60'
                    }`}>
                      <Icon className={`w-4 h-4 ${isActive ? 'text-gold-primary' : ''}`} />
                      {item.name}
                    </span>
                  </Link>
                );
              })
            )}
          </nav>
        </div>

        {/* Back Link */}
        <div className="border-t border-dark-border/20 pt-5">
          <Link href="/" className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para a Home
          </Link>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-4 md:p-10 max-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
