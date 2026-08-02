import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Stripe webhook desativado. Todos os pagamentos são processados via PushinPay PIX.' },
    { status: 410 }
  );
}
