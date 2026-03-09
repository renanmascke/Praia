import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendTempPasswordEmail } from '@/lib/email';
import { verifyJWT } from '@/lib/auth';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('adminSession')?.value;
        if (!token) return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
        const verified = await verifyJWT(token);
        if (!verified) return NextResponse.json({ success: false, message: 'Sessão inválida' }, { status: 401 });

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                forcePasswordChange: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, users });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('adminSession')?.value;
        if (!token) return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
        const verified = await verifyJWT(token);
        if (!verified) return NextResponse.json({ success: false, message: 'Sessão inválida' }, { status: 401 });

        const body = await request.json();
        const { name, email } = body;

        if (!name || !email) {
            return NextResponse.json({ success: false, message: 'Nome e e-mail são obrigatórios.' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ success: false, message: 'Este e-mail já está em uso.' }, { status: 400 });
        }

        // Generate an 8-character temporary password
        const tempPassword = Math.random().toString(36).substring(2, 10).toUpperCase();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                forcePasswordChange: true // Obriga a trocar a senha que enviaremos
            }
        });

        // Enviar a senha gerada para o e-mail dele
        await sendTempPasswordEmail(email, tempPassword);

        return NextResponse.json({
            success: true,
            message: 'Administrador criado com sucesso.',
            user: { id: newUser.id, name: newUser.name, email: newUser.email }
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
