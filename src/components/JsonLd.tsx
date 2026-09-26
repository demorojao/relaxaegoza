import React from 'react';

export default function JsonLd() {
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'Relaxe & Goze',
    'url': 'https://www.relaxegoze.com',
    'description': 'O portal de classificados de alto padrão mais exclusivo do Brasil. Conecte-se com acompanhantes de luxo e massagistas de elite VIP.',
    'inLanguage': 'pt-BR',
    'publisher': {
      '@type': 'Organization',
      'name': 'Relaxe & Goze',
      'url': 'https://www.relaxegoze.com',
      'logo': 'https://www.relaxegoze.com/icon',
    },
    'potentialAction': {
      '@type': 'SearchAction',
      'target': 'https://www.relaxegoze.com/sp/{search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'Relaxe & Goze',
    'url': 'https://www.relaxegoze.com',
    'logo': 'https://www.relaxegoze.com/icon',
    'sameAs': [
      'https://www.instagram.com/relaxegoze',
    ],
    'areaServed': {
      '@type': 'Country',
      'name': 'Brasil',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
    </>
  );
}
