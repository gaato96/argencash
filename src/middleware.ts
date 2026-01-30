import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
    function middleware(req) {
        const { token } = req.nextauth;
        const { pathname } = req.nextUrl;

        // Admin routes - only SUPERADMIN can access
        if (pathname.startsWith('/admin')) {
            if (token?.role !== 'SUPERADMIN') {
                return NextResponse.redirect(new URL('/dashboard', req.url));
            }
        }

        // Dashboard routes - require authentication
        if (pathname.startsWith('/dashboard')) {
            if (!token) {
                return NextResponse.redirect(new URL('/login', req.url));
            }
            // SuperAdmin should not be in tenant dashboard
            if (token.role === 'SUPERADMIN') {
                return NextResponse.redirect(new URL('/admin', req.url));
            }
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl;

                // Public routes
                if (pathname === '/' || pathname === '/login') {
                    return true;
                }

                // Protected routes require token
                return !!token;
            },
        },
    }
);

export const config = {
    matcher: ['/dashboard/:path*', '/admin/:path*'],
};
