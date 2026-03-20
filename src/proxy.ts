import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/session';

export async function proxy(request: NextRequest) {
    const session = request.cookies.get('session')?.value;

    if (request.nextUrl.pathname.startsWith('/login')) {
        if (session) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // Rutas públicas o API de login permitidas
    // Y excepciones que no requieren check estricto para evitar loops
    if (
        request.nextUrl.pathname.startsWith('/api/auth/login') ||
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Verificamos si hay sesión para todas las demás rutas
    if (!session) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Validamos JWT
    const payload = await decrypt(session);
    if (!payload) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Forzar cambio de contraseña
    if (payload.mustChangePassword && !request.nextUrl.pathname.startsWith('/update-password')) {
        return NextResponse.redirect(new URL('/update-password', request.url));
    }

    // Si ya cambió la contraseña y está intentando acceder a la pantalla de update-password, mandarlo al home
    if (!payload.mustChangePassword && request.nextUrl.pathname.startsWith('/update-password')) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
