---
name: creative-zero-defect-analyzer
description: "Use when analyzing, reviewing, auditing, or enhancing the web application to achieve creative aesthetic excellence, seamless user experience, and 0 logical defects across database schemas, RLS policies, financial fulfillment, and state management."
metadata:
  author: antigravity
  version: "1.0.0"
---

# Creative & Zero-Defect Application Analyzer

This skill provides a systematic framework for analyzing, upgrading, and auditing the web application. It enforces two non-negotiable standards: **Aesthetic & Creative Excellence** (WOW factor) and **Zero Logical Defects** (unbreakable code, sound state management, and bulletproof financial/security logic).

---

## 🎯 Core Principles

1. **Zero Logical Defects**: Every feature must be mathematically, logically, and security-sound. No race conditions, missing edge case handlers, silent RLS failures, or double-fulfillment bugs.
2. **Creative & Premium Design**: Interfaces must look state-of-the-art, with curated dark-mode color palettes (gold/wine/slate), glassmorphism, dynamic micro-animations, clear typography, and responsive layouts.
3. **Verify Everything**: Always run TypeScript compilation (`npx tsc --noEmit`) and verify database/API responses before declaring a task complete.

---

## 🔍 Phase 1: Zero-Defect Logic & Security Audit

Before adding or refactoring code, run the target module through these 5 Logical Audit Checklists:

### 1. Financial & Payment Fulfillment Checklist
- **Idempotency**: Ensure webhook/fulfillment handlers (`paymentFulfillment.ts`) check if a transaction reference or payment intent has already been processed before mutating state or balance.
- **Split & Net Calculation**: Verify platform fee split calculations (e.g., 90% provider / 10% platform) are computed using exact integer cents (`price_cents`) to avoid floating-point inaccuracies.
- **Expiration Dates**: Confirm subscriptions and boosts set exact timestamps (`now() + interval '30 days'` or `GREATEST(now(), current_expiration)`).

### 2. Database RLS & Security Checklist
- **RLS Policy Scope**: Every Supabase table in public schema MUST have RLS enabled with explicit `TO authenticated` or `TO anon` policies.
- **Row Ownership Predicate**: Verify `(SELECT auth.uid()) = user_id` (or `client_id`/`provider_id`) is present in `USING` and `WITH CHECK` clauses for `UPDATE` and `INSERT`.
- **Sensitive Fields**: Ensure fields like `cpf`, `payout_pix_key`, or `admin_role` cannot be updated arbitrarily by users without specific RPCs or server-side checks.

### 3. Client State & Race Conditions
- **Loading & Empty States**: Every UI component fetching async data MUST render a sleek loading spinner or skeleton, plus a friendly empty-state UI when no data is returned.
- **Session & Auth Checks**: Guard client-side routes and actions against unauthenticated or mismatched roles (`provider` vs `client`).
- **Error Interception**: Wrap all `fetch` and Supabase RPC/REST calls in `try/catch` blocks with user-facing notification toasts or alert banners.

### 4. Input Validation & Edge Cases
- **CPF & PIX Key Rules**: Ensure CPF validation is enforced (11 digits) and PIX payout keys are locked to the user's validated CPF.
- **Image & Video CDN Helpers**: All media URLs from Supabase storage or R2 MUST pass through `getCDNUrl()` to guarantee correct domain resolution and fallback placeholder graphics.

---

## 🎨 Phase 2: Creative & Aesthetic Upgrade Standards

When building or improving user interfaces, apply these visual guidelines:

### 1. Dark Mode Elegance & Glassmorphism
- Use deep dark backgrounds (`#0B0B0E`, `#121214`) layered with subtle gradients (`bg-gradient-to-br from-gold-primary/10 via-transparent to-wine-primary/10`).
- Apply glassmorphism borders (`border border-white/10 backdrop-blur-xl bg-black/40`) to create depth and visual hierarchy.

### 2. High-Converting Micro-Interactions
- Add subtle pulse animations (`animate-pulse`) to critical status badges (`Disponível Agora`, `Assinatura Ativa`, `Clube VIP`).
- Include hover scale transitions (`group-hover:scale-105 transition-transform duration-300`) on image thumbnails, video cards, and action buttons.

### 3. Typography & Badging
- Use crisp uppercase typography with tracking (`tracking-wider text-xs font-bold text-gray-400 uppercase`).
- Highlight premium tiers with metallic gold accents (`text-gold-light`, `bg-gold-primary`, `border-gold-primary/30`).

---

## 🧪 Phase 3: Automated Verification Workflow

After making any changes:

1. **Type Safety Verification**:
   ```bash
   npx tsc --noEmit
   ```
   *Fix any TypeScript compilation errors immediately before proceeding.*

2. **Git Repository Status**:
   ```bash
   git status
   ```
   *Verify all modified and untracked files are staged.*

3. **Deploy & Push Protocol**:
   ```bash
   git add .
   git commit -m "feat/fix: [Descriptive summary of changes]"
   git push origin main
   ```

---

## 📝 Checklists for Execution

- [ ] Audit target route or component against the Zero-Defect Security & Logic Checklist.
- [ ] Apply Creative UI design tokens and micro-interactions.
- [ ] Test edge cases (unauthenticated users, empty lists, slow networks).
- [ ] Run `npx tsc --noEmit` and confirm 0 errors.
- [ ] Stage, commit, and push clean code to `origin main`.
