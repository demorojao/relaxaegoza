import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    const { paths } = await req.json();
    if (paths && Array.isArray(paths)) {
      for (const p of paths) {
        revalidatePath(p);
      }
      return NextResponse.json({ revalidated: true, paths });
    }
    
    // Default: revalidate home
    revalidatePath('/');
    return NextResponse.json({ revalidated: true, default: '/' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
