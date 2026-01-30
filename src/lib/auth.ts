import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';
import fs from 'fs';
import path from 'path';

const debugLog = (msg: string) => {
    const line = new Date().toISOString() + ' : [AUTH] ' + msg + '\n';
    try {
        fs.appendFileSync(path.join(process.cwd(), 'debug.log'), line);
    } catch (e) { }
    console.log(line);
};

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
                debugLog('Authorize starting for: ' + credentials?.email);
                if (!credentials?.email || !credentials?.password) {
                    debugLog('Missing credentials');
                    throw new Error('Email y contraseña son requeridos');
                }

                try {
                    debugLog('Prisma query starting...');
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email },
                        include: {
                            tenant: {
                                select: { enabledModules: true }
                            }
                        }
                    });

                    if (!user) {
                        debugLog('User not found: ' + credentials.email);
                        throw new Error('Usuario no encontrado');
                    }

                    debugLog('User found, checking password...');
                    const isValid = await bcrypt.compare(credentials.password, user.password);

                    if (!isValid) {
                        debugLog('Invalid password for: ' + credentials.email);
                        throw new Error('Contraseña incorrecta');
                    }

                    debugLog('Login successful for: ' + user.email);
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name || user.email,
                        role: user.role as 'SUPERADMIN' | 'ADMIN',
                        tenantId: user.tenantId,
                        enabledModules: user.tenant?.enabledModules
                    };
                } catch (err: any) {
                    debugLog('AUTH ERROR: ' + err.message);
                    if (err.stack) debugLog('STACK: ' + err.stack);
                    throw err;
                }
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
