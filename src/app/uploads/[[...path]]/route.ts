import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, normalize } from 'path';

export async function GET(request: Request, { params }: { params: any }) {
    try {
        const resolvedParams = await Promise.resolve(params);
        const pathArray = resolvedParams.path || [];
        if (pathArray.length === 0) {
            return new NextResponse('Not Found', { status: 404 });
        }

        const uploadDir = join(process.cwd(), 'public', 'uploads');
        // Usar normalización para evitar ataques de salto de directorio (Directory Traversal)
        const filepath = normalize(join(uploadDir, ...pathArray));
        
        if (!filepath.startsWith(uploadDir)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const buffer = await readFile(filepath);
        
        const ext = filepath.split('.').pop()?.toLowerCase() || '';
        let contentType = 'application/octet-stream';
        if (ext === 'pdf') contentType = 'application/pdf';
        else if (['png', 'jpg', 'jpeg'].includes(ext)) contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        else if (ext === 'webp') contentType = 'image/webp';
        else if (ext === 'svg') contentType = 'image/svg+xml';

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (e) {
        // Archivo no encontrado en disco o error al leerlo
        return new NextResponse('Not Found', { status: 404 });
    }
}
