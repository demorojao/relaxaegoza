# auth.md - Agent Registration Instructions

Bem-vindo! Este site oferece suporte à integração programática de agentes de inteligência artificial.

## Público de Agentes (Agent Audience)
Esta API e portal são destinados a agentes autônomos de IA que necessitam acessar dados de profissionais, rankings e planos.

## Registro de Agente (Registration)
Apoiamos o registro anônimo para obtenção de credenciais de acesso temporário:
- Endpoint: `/api/agent/register`
- Método: `POST`
- Payload esperado: JSON vazio ou com metadados do agente.

## Reivindicação de Credenciais (Claims)
- Endpoint: `/api/agent/claim`
- Método: `POST`

## Utilização de Credenciais
Todas as rotas pagas ou protegidas aceitam autenticação padrão Bearer Token no cabeçalho HTTP:
```http
Authorization: Bearer <seu_token_aqui>
```
