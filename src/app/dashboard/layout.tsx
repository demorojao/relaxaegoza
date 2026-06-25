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
  Camera
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      {/* Sidebar Desktop */}
      <aside className="w-full md:w-64 bg-dark-card border-b md:border-b-0 md:border-r border-dark-border/40 p-6 flex flex-col justify-between flex-shrink-0">
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
        <div className="border-t border-dark-border/20 pt-5 mt-8 md:mt-0">
          <Link href="/" className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para a Home
          </Link>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-6 md:p-10 max-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
