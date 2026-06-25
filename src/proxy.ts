import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export default async function proxy(request: NextRequest) {
  // 1. Obter o IP do cliente
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

  // Se houver múltiplos IPs (separados por vírgula em proxies), pega o primeiro
  const normalizedIp = ip.split(',')[0].trim();

  // Evitar loop infinito se o usuário já estiver na rota de banido
  if (request.nextUrl.pathname === '/banned') {
    return NextResponse.next();
  }

  // 2. Instanciar o cliente Supabase utilizando chaves anon
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
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
      if (request.nextUrl.pathname.startsWith('/api/')) {
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
