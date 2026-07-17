import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const signature = request.headers.get('payment-signature') || request.headers.get('x-payment');

  const payReqObj = {
    x402Version: '1',
    accepts: [
      {
        scheme: 'exact',
        network: 'eip155:8453', // Base Mainnet
        payTo: '0xe1dCdC52D26c04fcfdE0df3310061e80C6488a03',
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
        maxAmountRequired: '10000' // 0.01 USDC (6 decimals)
      }
    ]
  };

  const payReqBase64 = Buffer.from(JSON.stringify(payReqObj)).toString('base64');

  if (!signature) {
    return NextResponse.json(payReqObj, {
      status: 402,
      headers: {
        'PAYMENT-REQUIRED': payReqBase64,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Expose-Headers': 'PAYMENT-REQUIRED'
      }
    });
  }

  // Se a assinatura de pagamento estiver presente, retorna o recurso com status 200 OK
  return NextResponse.json({
    status: 'success',
    message: 'Acesso concedido e pago com sucesso via protocolo x402!',
    data: {
      message: 'Bem-vindo ao canal exclusivo para agentes de IA do portal.'
    }
  }, {
    status: 200,
    headers: {
      'PAYMENT-RESPONSE': JSON.stringify({ status: 'settled', signature }),
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
  });
}
