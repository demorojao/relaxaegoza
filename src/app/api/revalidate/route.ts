import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const receivedSecret = req.headers.get('x-revalidate-secret');
    const expectedSecret = process.env.REVALIDATE_SECRET || process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'aura_revalidate_secret_key';

    let isAuthorized = receivedSecret === expectedSecret;

    if (!isAuthorized) {
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const supabaseServer = getSupabaseServerClient();
        const { data: { user } } = await supabaseServer.auth.getUser(token);
        if (user) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { paths, tags } = await req.json();
    const revalidatedPaths: string[] = [];
    const revalidatedTags: string[] = [];

    if (paths && Array.isArray(paths)) {
      for (const p of paths) {
        revalidatePath(p);
        revalidatedPaths.push(p);
      }
    }
    if (tags && Array.isArray(tags)) {
      for (const t of tags) {
        (revalidateTag as any)(t);
        revalidatedTags.push(t);
      }
    }
    
    if (revalidatedPaths.length > 0 || revalidatedTags.length > 0) {
      return NextResponse.json({ revalidated: true, paths: revalidatedPaths, tags: revalidatedTags });
    }
    
    // Default: revalidate home
    revalidatePath('/');
    return NextResponse.json({ revalidated: true, default: '/' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
