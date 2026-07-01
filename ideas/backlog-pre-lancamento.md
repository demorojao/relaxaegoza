# Backlog de Ideias e Funcionalidades Pré-Lançamento 🚀

Este documento consolida as ideias de melhorias técnicas, de experiência de usuário (UX) e segurança para o portal **Relaxa & Goza** antes de seu lançamento oficial.

---

## 🔒 Segurança e Integridade da Plataforma

### 1. Sistema de Denúncia de Anúncios (Report System) 🛡️
* **Objetivo:** Permitir que visitantes reportem perfis fakes, golpes, menor de idade ou dados incorretos.
* **Componentes:**
  * Botão "Denunciar Perfil" na página pública.
  * Modal com opções: "Fotos Falsas", "Valor incorreto", "Comportamento Inadequado", "Menor de idade", "Outros".
  * Gravação na tabela `reports` do banco de dados.
  * Aba "Denúncias" no painel de moderação administrativa para apuração e aplicação de punições (ex: banimento de IP).

### 2. Proteção de Marca d'água Visual (Watermark Overlay) 📸
* **Objetivo:** Evitar roubo de fotos das modelos e clonagem de anúncios em outros sites.
* **Componentes:**
  * Aplicação de uma camada sutil semitransparente com a marca do site (`Relaxa & Goza`) sob todas as fotos do álbum e avatar do perfil público.
  * Blindagem via CSS/HTML para dificultar cópias diretas por robôs de raspagem.

### 3. Validação de Telefone WhatsApp (Formato/DDI/DDD) 📱
* **Objetivo:** Garantir que o WhatsApp cadastrado pelas modelos esteja correto e funcional, evitando links quebrados.
* **Componentes:**
  * Máscara no campo de formulário do dashboard para forçar o preenchimento correto (`+55 (XX) XXXXX-XXXX`).
  * Tratamento regex no backend para salvar o número limpo (apenas dígitos com DDI e DDD), garantindo que a geração do link da API do WhatsApp nunca falhe.

---

## ⚡ Experiência do Usuário (UI/UX) e Engajamento

### 4. Compartilhamento Rápido de Perfil (Quick Share Link) 🔗
* **Objetivo:** Incentivar a indicação boca a boca e compartilhamento orgânico.
* **Componentes:**
  * Botão de compartilhamento na página de detalhes da modelo.
  * Integração com a Web Share API (para acionar o menu nativo de compartilhamento em celulares iOS/Android).
  * Fallback de cópia rápida para área de transferência em computadores.

### 5. Filtro de Perfis Verificados na Vitrine (Verified-Only Toggle) ✅
* **Objetivo:** Dar destaque instantâneo para quem passou na auditoria de fotos de rosto/documentos.
* **Componentes:**
  * Filtro rápido tipo "switch" no topo da vitrine (ao lado da barra de buscas): **"Somente Verificados"**.
  * Filtragem otimizada no banco para entregar esses resultados primeiro, aumentando a credibilidade das profissionais ativas.

### 6. Configuração de Grade de Horário de Atendimento 📅
* **Objetivo:** Deixar claro os dias e horários em que a modelo atende, evitando mensagens fora de hora.
* **Componentes:**
  * Editor simples no dashboard para marcar dias e horas de expediente (ex: Seg-Sex 14h às 22h).
  * Exibição visual elegante na página do perfil mostrando se a modelo está atualmente "Em Expediente" ou "Fora do Horário".

### 7. Tags Rápidas de Avaliação (Tag-Based Reviews) 🏷️
* **Objetivo:** Facilitar que clientes deixem feedback de forma rápida em celulares, sem precisar digitar textos longos.
* **Componentes:**
  * Seleção de elogios pré-definidos (tags) como: `"Fiel às Fotos"`, `"Excelente Massagem"`, `"Ambiente Limpo"`, `"Muito Simpática"`, `"Educada"`.
  * Contador destas tags em destaque no cabeçalho do perfil público.

---

## ⚖️ Conformidade Legal e Credibilidade

### 8. Age Gate Modal (Aviso de Entrada 18+) 🔞
* **Objetivo:** Proteção legal da plataforma contra acesso de menores e aviso de conteúdo adulto.
* **Componentes:**
  * Tela de entrada bloqueante (interstitial) exibida na primeira visita do usuário.
  * Pergunta obrigatória de confirmação: "Você tem mais de 18 anos?".
  * Armazenamento temporário nos cookies do navegador para não exibir o aviso repetidas vezes para o mesmo usuário.

### 9. Termos de Consentimento de Uso de Imagem para Modelos 📝
* **Objetivo:** Proteger juridicamente a plataforma contra reclamações futuras de direito de imagem.
* **Componentes:**
  * Caixa de aceite contratual obrigatória no fluxo de cadastro da modelo, concordando que as fotos enviadas são de sua propriedade intelectual e de livre consentimento de exibição.
