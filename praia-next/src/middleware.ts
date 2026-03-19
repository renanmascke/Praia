import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from './lib/auth';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isAdminRoute = pathname.startsWith('/admin');
    const isLoginPage = pathname === '/login';

    const isForceResetPage = pathname === '/admin/force-reset';

    const token = request.cookies.get('adminSession')?.value;

    if (isAdminRoute) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        const verified: any = await verifyJWT(token);
        if (!verified) {
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('adminSession');
            return response;
        }

        if (verified.forcePasswordChange && !isForceResetPage) {
            return NextResponse.redirect(new URL('/admin/force-reset', request.url));
        }

        if (!verified.forcePasswordChange && isForceResetPage) {
            return NextResponse.redirect(new URL('/admin', request.url));
        }
    }

    if (isLoginPage) {
        if (token) {
            const verified: any = await verifyJWT(token);
            if (verified) {
                if (verified.forcePasswordChange) {
                    return NextResponse.redirect(new URL('/admin/force-reset', request.url));
                }
                return NextResponse.redirect(new URL('/admin', request.url));
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/login'],
};
