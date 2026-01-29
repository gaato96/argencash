import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            role: 'SUPERADMIN' | 'ADMIN';
            tenantId: string | null;
            enabledModules?: string;
        };
    }

    interface User {
        id: string;
        email: string;
        name: string;
        role: 'SUPERADMIN' | 'ADMIN';
        tenantId: string | null;
        enabledModules?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role: 'SUPERADMIN' | 'ADMIN';
        tenantId: string | null;
        enabledModules?: string;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Email y contraseña son requeridos');
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: {
                        tenant: {
                            select: { enabledModules: true }
                        }
                    }
                });

                if (!user) {
                    throw new Error('Usuario no encontrado');
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);

                if (!isValid) {
                    throw new Error('Contraseña incorrecta');
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name || user.email,
                    role: user.role as 'SUPERADMIN' | 'ADMIN',
                    tenantId: user.tenantId,
                    enabledModules: user.tenant?.enabledModules
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.tenantId = user.tenantId;
                token.enabledModules = user.enabledModules;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.tenantId = token.tenantId;
                session.user.enabledModules = token.enabledModules;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60, // 24 hours
    },
    secret: process.env.NEXTAUTH_SECRET,
};
