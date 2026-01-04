import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

type Params = { params: Promise<{ filename: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { filename } = await params;
    const safe = path.basename(filename);
    const filePath = path.join(process.cwd(), 'tmp', 'uploads', 'voterphotos', safe);
    const buf = await readFile(filePath);

    const ext = path.extname(safe).toLowerCase();
    const contentType =
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      ext === '.png' ? 'image/png' :
      ext === '.webp' ? 'image/webp' : 'application/octet-stream';

    return new NextResponse(buf, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
