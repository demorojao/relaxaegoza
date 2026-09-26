import { NextResponse } from 'next/server';

const INDEXNOW_KEY = '4a8f9b2c3d4e5f6a7b8c9d0e1f2a3b4c';
const HOST = 'www.relaxegoze.com';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const urls: string[] = body.urls || [
      'https://www.relaxegoze.com',
      'https://www.relaxegoze.com/espacos',
      'https://www.relaxegoze.com/rankings',
      'https://www.relaxegoze.com/planos',
      'https://www.relaxegoze.com/sp/campinas',
    ];

    const payload = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    };

    // Submit to Bing / IndexNow endpoint
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return NextResponse.json({
      success: true,
      status: response.status,
      submittedUrlsCount: urls.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to submit IndexNow' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Simple GET endpoint to trigger pinging default URLs to IndexNow
  try {
    const urls = [
      'https://www.relaxegoze.com',
      'https://www.relaxegoze.com/espacos',
      'https://www.relaxegoze.com/rankings',
      'https://www.relaxegoze.com/planos',
      'https://www.relaxegoze.com/sp/campinas',
    ];

    const payload = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    };

    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return NextResponse.json({
      success: true,
      status: response.status,
      submittedUrlsCount: urls.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to submit IndexNow' },
      { status: 500 }
    );
  }
}
