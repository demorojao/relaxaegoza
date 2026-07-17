import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export default async function proxy(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;
  const acceptHeader = request.headers.get('accept') || '';

  // Link headers standard for agent discovery
  const linkHeaders = [
    `</.well-known/api-catalog>; rel="api-catalog"`,
    `</docs/api>; rel="service-doc"`,
    `</openapi.json>; rel="service-desc"`,
    `</auth.md>; rel="describedby"`,
    `</.well-known/agent-skills/index.json>; rel="describedby"`
  ].join(', ');

  // 1. Content Negotiation: Accept: text/markdown on root page
  if (pathname === '/' && acceptHeader.includes('text/markdown')) {
    const markdownContent = `# Relaxe & Goze - Portal Privê de Luxo

Bem-vindo ao **Relaxe & Goze**, a vitrine e portal de anúncio mais exclusivo do Brasil para acompanhantes de luxo e massoterapeutas de elite.

## Recursos Disponíveis
- **Vitrine de Anúncios**: Acompanhantes de alto padrão e massagistas com verificação facial e de documentos.
- **Profissionais Verificadas**: Sistema de moderação rigoroso garantindo fotos 100% reais.
- **Destaque Premium (Gold/Pro)**: Destaque orgânico prioritário e ativação de anúncios na página principal.
- **Busca por Localização**: Filtros precisos por cidade e bairro.
- **Salas de Massagem e Reservas**: Agendamentos e espaços reservados para atendimento.

## Endpoints e Integrações
- **Catálogo de APIs**: ${origin}/.well-known/api-catalog
- **Documentação de Serviço**: ${origin}/docs/api
- **OpenAPI Schema**: ${origin}/openapi.json
- **Instruções de Autenticação**: ${origin}/auth.md
- **Skills de Agente**: ${origin}/.well-known/agent-skills/index.json
`;

    const tokensCount = Math.ceil(markdownContent.split(/\s+/).length * 1.35);

    return new NextResponse(markdownContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'x-markdown-tokens': tokensCount.toString(),
        'Link': linkHeaders,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  // 2. API Catalog (RFC 9727)
  if (pathname === '/.well-known/api-catalog') {
    const apiCatalog = {
      linkset: [
        {
          anchor: origin,
          'service-desc': [
            {
              href: `${origin}/openapi.json`,
              type: 'application/json'
            }
          ],
          'service-doc': [
            {
              href: `${origin}/docs/api`
            }
          ]
        }
      ]
    };

    return NextResponse.json(apiCatalog, {
      status: 200,
      headers: {
        'Content-Type': 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      }
    });
  }

  // 3. OIDC Discovery
  if (pathname === '/.well-known/openid-configuration') {
    const oidcConfig = {
      issuer: 'https://ivlaeilkomqhqwerojny.supabase.co/auth/v1',
      authorization_endpoint: 'https://ivlaeilkomqhqwerojny.supabase.co/auth/v1/authorize',
      token_endpoint: 'https://ivlaeilkomqhqwerojny.supabase.co/auth/v1/token',
      jwks_uri: 'https://ivlaeilkomqhqwerojny.supabase.co/auth/v1/keys',
      grant_types_supported: ['authorization_code', 'implicit', 'password'],
      response_types_supported: ['code', 'token', 'id_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256']
    };

    return NextResponse.json(oidcConfig, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      }
    });
  }

  // 4. OAuth Authorization Server Metadata
  if (pathname === '/.well-known/oauth-authorization-server') {
    const oauthConfig = {
      issuer: 'https://ivlaeilkomqhqwerojny.supabase.co/auth/v1',
      authorization_endpoint: 'https://ivlaeilkomqhqwerojny.supabase.co/auth/v1/authorize',
      token_endpoint: 'https://ivlaeilkomqhqwerojny.supabase.co/auth/v1/token',
      jwks_uri: 'https://ivlaeilkomqhqwerojny.supabase.co/auth/v1/keys',
      grant_types_supported: ['authorization_code', 'implicit', 'password'],
      response_types_supported: ['code', 'token', 'id_token'],
      agent_auth: {
        skill: 'auth-md',
        register_uri: `${origin}/auth.md`,
        supported_identity_types: ['anonymous'],
        anonymous: {
          credential_types_supported: ['bearer'],
          claim_uri: `${origin}/api/agent/claim`
        }
      }
    };

    return NextResponse.json(oauthConfig, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      }
    });
  }

  // 5. OAuth Protected Resource Metadata
  if (pathname === '/.well-known/oauth-protected-resource') {
    const protectedResource = {
      resource: origin,
      authorization_servers: [
        'https://ivlaeilkomqhqwerojny.supabase.co/auth/v1'
      ],
      scopes_supported: ['api', 'read', 'write'],
      bearer_methods_supported: ['header']
    };

    return NextResponse.json(protectedResource, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      }
    });
  }

  // 6. MCP Server Card
  if (pathname === '/.well-known/mcp/server-card.json') {
    const serverCard = {
      serverInfo: {
        name: 'Relaxe & Goze Agent Server',
        version: '1.0.0'
      },
      endpoint: `${origin}/api/mcp`,
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    };

    return NextResponse.json(serverCard, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      }
    });
  }

  // 7. Agent Skills Index
  if (pathname === '/.well-known/agent-skills/index.json') {
    const agentSkills = {
      $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
      skills: [
        {
          name: 'link-headers',
          type: 'skill-md',
          description: 'Agent discovery via Link response headers',
          url: 'https://isitagentready.com/.well-known/agent-skills/link-headers/SKILL.md',
          digest: 'sha256:7d8a6f264ea452ea82ea57fc46d1bf1e428dfb20e0600c010d19910a30b4231b'
        },
        {
          name: 'dns-aid',
          type: 'skill-md',
          description: 'DNS for AI Discovery',
          url: 'https://isitagentready.com/.well-known/agent-skills/dns-aid/SKILL.md',
          digest: 'sha256:7d8a6f264ea452ea82ea57fc46d1bf1e428dfb20e0600c010d19910a30b4231b'
        },
        {
          name: 'markdown-negotiation',
          type: 'skill-md',
          description: 'Markdown Content Negotiation',
          url: 'https://isitagentready.com/.well-known/agent-skills/markdown-negotiation/SKILL.md',
          digest: 'sha256:7d8a6f264ea452ea82ea57fc46d1bf1e428dfb20e0600c010d19910a30b4231b'
        },
        {
          name: 'api-catalog',
          type: 'skill-md',
          description: 'API Catalog Discovery',
          url: 'https://isitagentready.com/.well-known/agent-skills/api-catalog/SKILL.md',
          digest: 'sha256:7d8a6f264ea452ea82ea57fc46d1bf1e428dfb20e0600c010d19910a30b4231b'
        },
        {
          name: 'oauth-discovery',
          type: 'skill-md',
          description: 'OAuth/OIDC Discovery',
          url: 'https://isitagentready.com/.well-known/agent-skills/oauth-discovery/SKILL.md',
          digest: 'sha256:7d8a6f264ea452ea82ea57fc46d1bf1e428dfb20e0600c010d19910a30b4231b'
        },
        {
          name: 'oauth-protected-resource',
          type: 'skill-md',
          description: 'OAuth Protected Resource Metadata',
          url: 'https://isitagentready.com/.well-known/agent-skills/oauth-protected-resource/SKILL.md',
          digest: 'sha256:7d8a6f264ea452ea82ea57fc46d1bf1e428dfb20e0600c010d19910a30b4231b'
        },
        {
          name: 'auth-md',
          type: 'skill-md',
          description: 'Auth.md Agent Registration Discovery',
          url: 'https://isitagentready.com/.well-known/agent-skills/auth-md/SKILL.md',
          digest: 'sha256:7d8a6f264ea452ea82ea57fc46d1bf1e428dfb20e0600c010d19910a30b4231b'
        },
        {
          name: 'mcp-server-card',
          type: 'skill-md',
          description: 'MCP Server Card Discovery',
          url: 'https://isitagentready.com/.well-known/agent-skills/mcp-server-card/SKILL.md',
          digest: 'sha256:7d8a6f264ea452ea82ea57fc46d1bf1e428dfb20e0600c010d19910a30b4231b'
        },
        {
          name: 'agent-skills',
          type: 'skill-md',
          description: 'Agent Skills Discovery Index',
          url: 'https://isitagentready.com/.well-known/agent-skills/agent-skills/SKILL.md',
          digest: 'sha256:7d8a6f264ea452ea82ea57fc46d1bf1e428dfb20e0600c010d19910a30b4231b'
        },
        {
          name: 'webmcp',
          type: 'skill-md',
          description: 'WebMCP Agent Tools Discovery',
          url: 'https://isitagentready.com/.well-known/agent-skills/webmcp/SKILL.md',
          digest: 'sha256:7d8a6f264ea452ea82ea57fc46d1bf1e428dfb20e0600c010d19910a30b4231b'
        },
        {
          name: 'x402',
          type: 'skill-md',
          description: 'x402 Micropayments Protocol',
          url: 'https://isitagentready.com/.well-known/agent-skills/x402/SKILL.md',
          digest: 'sha256:7d8a6f264ea452ea82ea57fc46d1bf1e428dfb20e0600c010d19910a30b4231b'
        },
        {
          name: 'mpp',
          type: 'skill-md',
          description: 'Machine Payment Protocol',
          url: 'https://isitagentready.com/.well-known/agent-skills/mpp/SKILL.md',
          digest: 'sha256:7d8a6f264ea452ea82ea57fc46d1bf1e428dfb20e0600c010d19910a30b4231b'
        }
      ]
    };

    return NextResponse.json(agentSkills, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      }
    });
  }

  // 8. Intercept auth.md to serve it with correct Markdown type
  if (pathname === '/auth.md') {
    const authMdContent = `# auth.md - Agent Registration Instructions

Bem-vindo! Este site oferece suporte à integração programática de agentes de inteligência artificial.

## Público de Agentes (Agent Audience)
Esta API e portal são destinados a agentes autônomos de IA que necessitam acessar dados de profissionais, rankings e planos.

## Registro de Agente (Registration)
Apoiamos o registro anônimo para obtenção de credenciais de acesso temporário:
- Endpoint: \`${origin}/api/agent/register\`
- Método: \`POST\`
- Payload esperado: JSON vazio ou com metadados do agente.

## Reivindicação de Credenciais (Claims)
- Endpoint: \`${origin}/api/agent/claim\`
- Método: \`POST\`

## Utilização de Credenciais
Todas as rotas pagas ou protegidas aceitam autenticação padrão Bearer Token no cabeçalho HTTP:
\`\`\`http
Authorization: Bearer <seu_token_aqui>
\`\`\`
`;

    return new NextResponse(authMdContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      }
    });
  }

  // Fallback Link header injection for any HTML response on homepage
  if (pathname === '/banned') {
    return NextResponse.next();
  }

  // --- IP BAN / SECURITY PROXY CHECK ---

  // 1. Obter o IP do cliente
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

  // Se houver múltiplos IPs (separados por vírgula em proxies), pega o primeiro
  const normalizedIp = ip.split(',')[0].trim();

  // 2. Instanciar o cliente Supabase utilizando chaves anon
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    if (pathname === '/') {
      const response = NextResponse.next();
      response.headers.set('Link', linkHeaders);
      return response;
    }
    return NextResponse.next();
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  try {
    // 3. Verificar na tabela `ip_bans` se o IP está bloqueado
    const { data, error } = await supabase
      .from('ip_bans')
      .select('id')
      .eq('ip_address', normalizedIp)
      .maybeSingle();

    if (data) {
      // Se for uma chamada de API, retorna JSON 403
      if (pathname.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({ error: 'Acesso Proibido. Seu endereço IP foi banido por violação dos termos de uso.' }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        );
      }
      
      // Caso contrário, redireciona para a página /banned
      const url = request.nextUrl.clone();
      url.pathname = '/banned';
      return NextResponse.redirect(url);
    }
  } catch (err) {
    console.error('Erro no proxy ao validar IP banido:', err);
  }

  if (pathname === '/') {
    const response = NextResponse.next();
    response.headers.set('Link', linkHeaders);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets like images (.png, .jpg, .svg)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
