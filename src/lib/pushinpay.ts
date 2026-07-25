const PUSHINPAY_API_URL = 'https://api.pushinpay.com.br/api';

export interface CreatePixPayload {
  amountCents: number;
  webhookUrl?: string;
}

export interface PushinPayPixResponse {
  id: string;
  qr_code: string;
  qr_code_base64: string;
  status: 'created' | 'paid' | 'canceled' | 'expired';
  value: number;
  end_to_end_id?: string | null;
  payer_name?: string | null;
  payer_national_registration?: string | null;
}

/**
 * Cria uma cobrança PIX na PushinPay
 * @param amountCents Valor em centavos (ex: R$ 50,00 = 5000)
 * @param webhookUrl URL para receber notificações de webhook
 */
export async function createPushinPayPixCharge({
  amountCents,
  webhookUrl,
}: CreatePixPayload): Promise<PushinPayPixResponse> {
  const token = process.env.PUSHINPAY_TOKEN || '68789|ucgYVKkINYBhrDbIu3R94HYntnKkfYdzR6sahzQic053fc9d';
  if (!token) {
    throw new Error('PUSHINPAY_TOKEN não configurado no servidor');
  }

  if (amountCents < 50) {
    throw new Error('O valor mínimo para geração de PIX na PushinPay é de 50 centavos (R$ 0,50).');
  }

  const payload: any = {
    value: amountCents,
  };

  if (webhookUrl) {
    payload.webhook_url = webhookUrl;
  }

  const response = await fetch(`${PUSHINPAY_API_URL}/pix/cashIn`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro na API PushinPay (/pix/cashIn):', response.status, errorText);
    throw new Error(`Erro ao gerar PIX na PushinPay (${response.status}): ${errorText}`);
  }

  const data: PushinPayPixResponse = await response.json();
  return data;
}

/**
 * Consulta o status de uma transação PIX na PushinPay pelo ID da transação
 * @param txId ID da transação gerada na PushinPay
 */
export async function getPushinPayPixStatus(txId: string): Promise<PushinPayPixResponse | null> {
  const token = process.env.PUSHINPAY_TOKEN || '68789|ucgYVKkINYBhrDbIu3R94HYntnKkfYdzR6sahzQic053fc9d';
  if (!token || !txId) return null;

  try {
    const response = await fetch(`${PUSHINPAY_API_URL}/transactions/${txId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data: PushinPayPixResponse = await response.json();
    return data;
  } catch (err) {
    console.error('Erro ao consultar transação PushinPay:', err);
    return null;
  }
}
