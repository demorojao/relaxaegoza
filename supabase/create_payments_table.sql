-- Tabela para gerenciar transações via Pix Efí
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  txid varchar(255) unique not null,
  amount_cents integer not null,
  status varchar(50) default 'pending' not null, -- 'pending', 'paid', 'expired', 'refunded'
  tier varchar(50), -- 'pro', 'gold', 'boost'
  is_boost boolean default false,
  is_gift boolean default false,
  target_profile_id uuid references public.profiles(id) on delete set null,
  pix_copia_e_cola text,
  pix_qr_code text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ativar RLS
alter table public.payments enable row level security;

-- Política RLS para leitura (usuários veem seus próprios pagamentos)
drop policy if exists "Usuários podem ver seus próprios pagamentos" on public.payments;
create policy "Usuários podem ver seus próprios pagamentos"
  on public.payments for select
  using ( auth.uid() = user_id );

-- Índices de chaves estrangeiras para performance (Segurança e Melhores Práticas)
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_target_profile_id on public.payments(target_profile_id);
