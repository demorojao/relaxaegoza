# 🗺️ Aura Portal - Mapa de Desenvolvimento e Próximos Passos

Este documento serve como a memória ativa e guia do projeto **Aura Portal**. Aqui estão organizadas todas as conquistas atuais do sistema, os detalhes da campanha de lançamento e os próximos passos sugeridos para escalar e comercializar a plataforma.

---

## 🚀 1. Conquistas Atuais (O que já foi feito)

### 🗄️ Arquitetura de Banco de Dados (Supabase)
- **Vínculo de Segurança com Auth:** A tabela `public.profiles` agora herda as chaves primárias de `auth.users(id)` em cascata.
- **Triggers de Autocadastro:** Criado o trigger Postgres `on_auth_user_created` que cria perfis em `public.profiles` a partir do cadastro do Auth, permitindo registro fluido em um único passo.
- **Row Level Security (RLS):** Políticas rígidas de proteção. Clientes comuns não expõem seus dados ao público; anunciantes controlam e editam apenas suas próprias linhas.
- **Tabela de Avaliações (`reviews`):** Suporte a notas multicritério (Terapia, Atendimento, Ambiente) com restrições RLS (apenas clientes reais podem avaliar).
- **Gerenciamento de Mídia:** Tabela `profile_photos` atualizada com suporte a `media_type` para fotos e vídeos.

### 🔑 Fluxo de Autenticação Segregada
- **`/login` e `/cadastro`:** Interfaces fluidas com glassmorphism e seletor de papel (Cliente vs Profissional vs Local de Atendimento) com lógica de redirecionamento inteligente pós-acesso.

### 🛡️ Círculo de Confiança (Dupla Verificação)
- **`/dashboard/verificacao`:** Envio de selfie manuscrita e documento por anunciantes.
- **`/client-dashboard`:** Selo Ouro de Cliente Verificado ativado após envio de selfie rápida. Exibição de taxa de segurança e pontuação.
- **`/dashboard/perfil`:** Formulário para anunciantes estruturarem dados artísticos, comodidades e biografia segmentada.

### 💎 Vitrine & Gerenciamento de Mídias
- **Vitrine Dinâmica (`/`):** Algoritmo que ordena e posiciona anunciantes baseando-se no tier da assinatura: `Gold Premium` (com contorno neon pulsante se ativa em tempo real) > `Gold` > `Pro` > `Bronze`.
- **`/dashboard/midia`:** Enforcamento estrito de limites de arquivos de vitrine por plano:
  - **Bronze (Grátis):** Limite de 3 fotos. Bloqueio completo de vídeos.
  - **Silver (Pro):** Limite de 10 fotos e 10 vídeos.
  - **Gold Premium:** Fotos e vídeos ilimitados + Banner de upgrade para Gold quando os limites inferiores são atingidos.
- **`/rankings`:** Pódios e tabelas classificatórias automáticas das TOP anunciantes de cada categoria.
- **Vitrine Única & Filtros por Categoria:** Filtros de categoria integrados na busca da página inicial e seletor híbrido no painel de administração.
- **Exposição de Comodidades e Local:** Badges proeminentes no perfil público exibindo o local de atendimento ("Local Próprio" vs "Delivery/À Combinar"), status de disponibilidade real, categoria e verificação.
- **Aura Matchmaker Quiz:** Modal interativo de 3 passos na Home que ajuda o cliente a encontrar o perfil ideal e filtra a vitrine de forma automatizada.

### 🏢 Marketplace de Aluguel de Salas (Salas de Atendimento)
- **Role de Host (`'host'`)**: Nova role adicionada no banco de dados para proprietários de locais de atendimento físicos.
- **Tabela `rooms`**: Tabela com RLS habilitado contendo título, descrição, preço por hora, fotos, endereço, comodidades e status de verificação.
- **Tabela `room_bookings`**: Tabela para controle de agendamentos por período feitos por provedoras. RLS seguro permitindo controle total pelas partes envolvidas (provider e host).
- **Interface de Busca & Reserva**: Painel premium `/dashboard/aluguel-salas` para anunciantes buscarem salas verificadas com cálculo automático de preço por período.
- **Painel de Host**: Interface premium `/dashboard` (HostDashboardView) para gerenciar salas, acompanhar métricas de faturamento e aceitar/recusar reservas.
- **Moderação de Salas**: Interface administrativa oculta `/dashboard-interno-moderacao-aura` para auditar e aprovar novas salas (`is_verified = true`).

---

## 🎁 2. Campanha de Lançamento (Ativa)

Para acelerar a tração inicial da plataforma Aura:
1. **Gratuidade para Locais (`hosts`)**: Os 100 primeiros proprietários cadastrados (`hostRank <= 100`) têm acesso 100% gratuito e ilimitado para listar salas e gerenciar reservas. Hosts a partir do nº 101 pagam assinatura obrigatória de **R$ 399,00 / mês**.
2. **30% de Desconto para Anunciantes (`providers`)**: As primeiras 100 anunciantes registradas (`providerRank <= 100`) ganham **30% de desconto recorrente** em qualquer plano pago (Pro/Silver passa a R$ 139,30/mês e Gold Premium passa a R$ 279,30/mês).

---

## 📈 3. Caminhos para a Excelência (Planos Futuros)

Para atingir a excelência absoluta e expandir comercialmente, o Aura Portal deve seguir os seguintes marcos:

### 📍 Fase A: Melhorias de Geolocalização e Experiência
- [ ] **Integração Real do Mapa Interativo (`/components/Map.tsx`):**
  - Conectar os marcadores Leaflet dinamicamente ao banco de dados Supabase (colunas `latitude` e `longitude` em `profiles`).
  - Filtrar o mapa em tempo real junto com a barra de busca principal.
  - Destacar marcadores de usuários Gold Premium com um pin customizado brilhante.
- [ ] **Sessão de Stories Efêmeros (Estilo Instagram):**
  - Permitir a anunciantes Gold Premium postar pequenos vídeos ou fotos efêmeras de 24h na vitrine para aumentar os cliques de clientes.

### 💳 Fase B: Pagamentos Automatizados Integrados
- [ ] **Integração de Gateway de Pagamento (Stripe / ASAAS / Pix API):**
  - Checkout transparente para aquisição de planos (Silver e Gold Premium) diretamente da página `/planos`.
  - Webhook ativa para atualizar automaticamente a coluna `subscription_tier` no banco de dados.
  - Checkout rápido para "Impulsionar Agora" (Boost pontual por 24 horas).
  - Repasse automático ou garantia de reserva com sinal financeiro nas reservas de salas.

### 🤝 Fase C: Segurança Avançada (Círculo de Confiança)
- [ ] **Integração de Câmera Nativa no Upload de Selfie:**
  - Integrar a API de câmera do navegador (`navigator.mediaDevices.getUserMedia`) para capturar a selfie de veracidade do cliente/profissional direto na plataforma, evitando uploads de fotos prontas.
- [ ] **Feedback de Encontro Seguro ("Safe Encounter"):**
  - Permitir que a profissional ou o cliente marquem se o encontro ocorreu sob total segurança após o contato via WhatsApp. Isso gera um incremento percentual na "Taxa de Segurança" do perfil do cliente.

---

## 🛠️ Diretório de Páginas do Projeto
- `src/app/page.tsx` - Vitrine Principal e Filtros
- `src/app/login/page.tsx` - Login Segregado com auto-healing de perfil
- `src/app/cadastro/page.tsx` - Cadastro Segregado de Clientes, Provedores e Hosts
- `src/app/client-dashboard/page.tsx` - Central de Segurança do Cliente
- `src/app/dashboard/midia/page.tsx` - Painel de Upload com enforcamento de limites
- `src/app/dashboard/verificacao/page.tsx` - Verificação de Selfie e Documentos
- `src/app/dashboard/perfil/page.tsx` - Estruturador de Anúncio e Endereço
- `src/app/dashboard/salas/page.tsx` - Gerenciamento de Salas pelo Host
- `src/app/dashboard/reservas/page.tsx` - Gerenciamento de Reservas pelo Host
- `src/app/dashboard/aluguel-salas/page.tsx` - Marketplace de Locação de Salas pelas Provedoras
- `src/app/perfil/[id]/page.tsx` - Perfil Público (Server-Side Rendered para SEO)
- `src/app/rankings/page.tsx` - Pódios e Classificações Gerais
- `src/app/planos/page.tsx` - Venda de Planos de Anúncio com verificação de desconto
- `src/app/api/checkout/route.ts` - Checkout no Stripe com regras dinâmicas de desconto e gratuidade
- `src/app/dashboard-interno-moderacao-aura/page.tsx` - Painel de moderação com Key Secreta
- `supabase/schema.sql` - Estrutura de Tabelas, Triggers, RLS e Policies do banco de dados
