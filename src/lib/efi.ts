import https from 'https';
import axios from 'axios';

const certBase64 = process.env.EFI_CERTIFICATE_BASE64 || '';
const certBuffer = Buffer.from(certBase64, 'base64');

// O certificado da Efí geralmente não tem senha, mas se tiver, adicione no passphrase
const agent = new https.Agent({
  pfx: certBuffer,
  passphrase: '',
  // Em sandbox/desenvolvimento local, se houver problemas de SSL por causa dos certificados auto-assinados da Efí,
  // descomente a linha abaixo para desativar a verificação restrita de rejeição
  rejectUnauthorized: process.env.EFI_ENV === 'producao'
});

export const efiClient = axios.create({
  baseURL: process.env.EFI_ENV === 'producao'
    ? 'https://pix.api.efipay.com.br'
    : 'https://pix-h.api.efipay.com.br',
  httpsAgent: agent,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function getEfiAccessToken(): Promise<string> {
  const clientId = process.env.EFI_CLIENT_ID || '';
  const clientSecret = process.env.EFI_CLIENT_SECRET || '';
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await efiClient.post('/oauth/token', {
    grant_type: 'client_credentials',
  }, {
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data.access_token;
}

export async function createEfiPixCharge(amountCents: number, description: string) {
  const token = await getEfiAccessToken();
  const pixKey = process.env.EFI_PIX_KEY || '';

  const amountString = (amountCents / 100).toFixed(2);

  // 1. Criar a cobrança imediata (Bacen Pix API)
  const responseCob = await efiClient.post('/v2/cob', {
    calendario: {
      expiracao: 3600 // 1 hora
    },
    valor: {
      original: amountString
    },
    chave: pixKey,
    solicitacaoPagador: description
  }, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const { txid, loc, pixCopiaECola } = responseCob.data;

  // 2. Buscar o QR Code em formato Base64 da location correspondente
  const responseQr = await efiClient.get(`/v2/loc/${loc.id}/qrcode`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return {
    txid,
    pixCopiaECola,
    qrcodeImage: responseQr.data.imagemQrcode, // "data:image/png;base64,..."
  };
}
