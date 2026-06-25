import { NextRequest, NextResponse } from 'next/server';

export async function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info, Prefer',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: await corsHeaders() });
}

async function handleProxy(req: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase URL or Anon Key is missing on the server' }, { status: 500 });
  }

  // Obter o path relativo a /api/supabase-proxy
  const url = new URL(req.url);
  const relativePath = url.pathname.replace('/api/supabase-proxy', '');
  
  // Construir o URL final para o Supabase
  const targetUrl = new URL(`${supabaseUrl}${relativePath}${url.search}`);

  // Copiar e tratar os headers da requisição
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    headers.set(key, value);
  });

  // Substituir a chave anon dummy pela chave anon real nos headers
  if (headers.get('apikey') === 'dummy-anon-key-to-be-replaced-on-server' || !headers.get('apikey')) {
    headers.set('apikey', supabaseAnonKey);
  }
  
  const authHeader = headers.get('authorization');
  if (authHeader && authHeader.includes('dummy-anon-key-to-be-replaced-on-server')) {
    headers.set('authorization', `Bearer ${supabaseAnonKey}`);
  }

  // Ajustar o host e outros headers comuns
  headers.delete('host');
  headers.delete('connection');

  // Obter o body
  let body: any = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      body = await req.arrayBuffer();
    } catch (e) {
      // Sem body ou falha ao ler
    }
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });

    // Construir a resposta
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (key !== 'content-encoding' && key !== 'transfer-encoding') {
        responseHeaders.set(key, value);
      }
    });

    // Adicionar CORS headers
    const cors = await corsHeaders();
    Object.entries(cors).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });

    const resBody = (response.status === 204 || response.status === 205)
      ? null
      : await response.arrayBuffer();

    return new Response(resBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('Supabase proxy error:', error);
    return NextResponse.json({ error: error.message || 'Proxy request failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) { return handleProxy(req); }
export async function POST(req: NextRequest) { return handleProxy(req); }
export async function PUT(req: NextRequest) { return handleProxy(req); }
export async function DELETE(req: NextRequest) { return handleProxy(req); }
export async function PATCH(req: NextRequest) { return handleProxy(req); }
