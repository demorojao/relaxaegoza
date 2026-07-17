import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const acceptHeader = request.headers.get('accept') || '';

  if (acceptHeader.includes('text/markdown') && request.nextUrl.pathname === '/') {
    const markdownContent = `# Relaxe & Goze - Portal Privê de Luxo

Bem-vindo ao **Relaxe & Goze**, a vitrine e portal de anúncio mais exclusivo do Brasil para acompanhantes de luxo e massoterapeutas de elite.

## Recursos Disponíveis
- **Vitrine de Anúncios**: Acompanhantes de alto padrão e massagistas com verificação facial e de documentos.
- **Profissionais Verificadas**: Sistema de moderação rigoroso garantindo fotos 100% reais.
- **Destaque Premium (Gold/Pro)**: Destaque orgânico prioritário e ativação de anúncios na página principal.
- **Busca por Localização**: Filtros precisos por cidade e bairro.
- **Salas de Massagem e Reservas**: Agendamentos e espaços reservados para atendimento.

## Endpoints e Integrações
- **Catálogo de APIs**: [/.well-known/api-catalog](/.well-known/api-catalog)
- **Documentação de Serviço**: [/docs/api](/docs/api)
- **Cadastro**: [/cadastro](/cadastro)
- **Planos e Preços**: [/planos](/planos)
`;

    // Estimate token count based on word count multiplier
    const tokensCount = Math.ceil(markdownContent.split(/\s+/).length * 1.35);

    return new NextResponse(markdownContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'x-markdown-tokens': tokensCount.toString(),
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
