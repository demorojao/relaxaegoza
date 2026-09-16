import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const method = body.method;

    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id || 1,
        result: {
          tools: [
            {
              name: 'list-professionals',
              description: 'Lista as acompanhantes e massoterapeutas de elite.',
              inputSchema: {
                type: 'object',
                properties: {
                  state: { type: 'string', description: 'Estado (sigla)' },
                  city: { type: 'string', description: 'Cidade' }
                }
              }
            }
          ]
        }
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*'
        }
      });
    }

    if (method === 'tools/call') {
      const { name, arguments: toolArgs } = body.params || {};
      if (name === 'list-professionals') {
        const { getSupabaseServiceClient } = await import('@/lib/supabaseServer');
        const supabaseService = getSupabaseServiceClient();
        
        let query = supabaseService
          .from('profiles')
          .select('id, name, city, price_per_hour, category, avatar_url')
          .eq('role', 'provider');

        if (toolArgs?.city) {
          query = query.ilike('city', `%${toolArgs.city}%`);
        }

        const { data: profiles } = await query.limit(20);

        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id || 1,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(profiles || [])
              }
            ]
          }
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*'
          }
        });
      }
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      id: body.id || 1,
      result: {}
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Model Context Protocol (MCP) HTTP Endpoint'
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
  });
}
