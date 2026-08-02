import { NextRequest, NextResponse } from 'next/server';
import { fulfillPayment } from '@/lib/paymentFulfillment';

export async function POST(req: NextRequest) {
  try {
    // 1. Validar o token de segurança no header x-pushinpay-token se configurado
    const expectedToken = process.env.PUSHINPAY_WEBHOOK_SECRET;
    const receivedToken = req.headers.get('x-pushinpay-token');

    if (expectedToken && receivedToken !== expectedToken) {
      console.warn('Webhook PushinPay: token de validação inválido ou ausente.');
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Extrair dados do corpo do Webhook
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      // Retorna 200 para pings/handshakes iniciais de teste sem corpo
      return new Response('OK', { status: 200 });
    }

    const { id, status } = body;

    if (!id) {
      return new Response('OK', { status: 200 });
    }

    console.log(`PushinPay Webhook recebido: ID=${id}, Status=${status}`);

    // 3. Se a cobrança PIX foi confirmada como paga ('paid'), realizar o cumprimento do pedido
    if (status === 'paid') {
      await fulfillPayment(id);
    }

    return new Response('OK', { status: 200 });
  } catch (err: any) {
    console.error('Erro no processamento do Webhook PushinPay:', err);
    // Sempre retornar 200 OK para evitar loops de reenvio da plataforma
    return new Response('OK', { status: 200 });
  }
}

export async function GET() {
  return new Response('PushinPay Webhook Endpoint Active', { status: 200 });
}
