# Script de Automação do Túnel Stripe Webhooks - Aura Portal
# Executável via PowerShell: .\stripe-tunnel.ps1

Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "            AURA PORTAL - STRIPE TUNNEL UTILITY          " -ForegroundColor DarkRed
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host ""

# 1. Verifica se o Node/npm está disponível
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERRO] npm/Node.js não foi encontrado. Instale o Node.js antes de prosseguir." -ForegroundColor Red
    Exit
}

# 2. Verifica se o Stripe CLI está instalado
if (-not (Get-Command "stripe" -ErrorAction SilentlyContinue)) {
    Write-Host "[AVISO] Stripe CLI não está instalado globalmente. Tentando instalar via npm..." -ForegroundColor Cyan
    npm install -g stripe-cli
    
    if (-not (Get-Command "stripe" -ErrorAction SilentlyContinue)) {
        Write-Host "[ERRO] Não foi possível instalar o Stripe CLI automaticamente. Execute 'npm install -g stripe-cli' manualmente." -ForegroundColor Red
        Exit
    }
    Write-Host "[SUCESSO] Stripe CLI instalado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "[INFO] Stripe CLI detectado." -ForegroundColor Green
}

Write-Host ""
Write-Host "----------------------------------------------------------" -ForegroundColor Gray
Write-Host "1. Certifique-se de que a sua aplicação local está rodando (ex: localhost:3000)." -ForegroundColor White
Write-Host "2. Se for sua primeira vez, uma aba de navegador abrirá para login no Stripe Sandbox." -ForegroundColor White
Write-Host "3. Copie a chave de webhook gerada pelo terminal ('whsec_...') e cole-a no seu .env.local" -ForegroundColor Gold
Write-Host "   no campo STRIPE_WEBHOOK_SECRET=sua_chave para testar as assinaturas reais." -ForegroundColor Gold
Write-Host "----------------------------------------------------------" -ForegroundColor Gray
Write-Host ""

Write-Host "Iniciando túnel do webhook Stripe..." -ForegroundColor Cyan
stripe listen --forward-to localhost:3000/api/webhooks/stripe
