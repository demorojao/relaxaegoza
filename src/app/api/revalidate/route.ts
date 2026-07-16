import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
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
        revalidateTag(t, { expire: 0 });
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
