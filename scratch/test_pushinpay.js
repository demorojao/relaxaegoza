const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let token = '';
env.split('\n').forEach(l => {
  if (l.startsWith('PUSHINPAY_TOKEN=')) {
    token = l.replace('PUSHINPAY_TOKEN=', '').trim().replace(/^["']|["']$/g, '');
  }
});

const candidates = [
  'cpf', 'cnpj', 'email', 'phone', 'evp', 'random', 'random_key', 'randomKey', 'phone_number',
  'CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP', 'RANDOM', 'RANDOM_KEY', 'PHONE_NUMBER',
  'Cpf', 'Cnpj', 'Email', 'Phone', 'Evp', 'Random',
  'telefone', 'Telefone', 'TELEFONE', 'celular', 'Celular', 'CELULAR',
  'chave_aleatoria', 'Chave_Aleatoria', 'CHAVE_ALEATORIA', 'chaveAleatoria',
  'document', 'Document', 'DOCUMENT', 'documento', 'Documento', 'DOCUMENTO',
  'pix', 'Pix', 'PIX', 'dict', 'Dict', 'DICT',
  '0', '1', '2', '3', '4', '5',
  'cpf_cnpj', 'CPF_CNPJ', 'Cpf_Cnpj',
  'national_registration', 'NATIONAL_REGISTRATION'
];

async function findValidType() {
  for (const c of candidates) {
    const res = await fetch('https://api.pushinpay.com.br/api/pix/cashOut', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: 500,
        pix_key: '04007883904',
        pix_key_type: c
      })
    });
    const text = await res.text();
    if (text.includes('O tipo de chave PIX selecionado é inválido')) {
      // invalid
    } else {
      console.log(`🎉 FOUND MATCH! pix_key_type: "${c}" -> Status: ${res.status} -> Body: ${text}`);
    }
  }
  console.log('Search finished.');
}

findValidType();
