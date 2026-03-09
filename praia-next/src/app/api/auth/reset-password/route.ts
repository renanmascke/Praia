import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyJWT, signJWT } from '@/lib/auth';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('adminSession')?.value;
        if (!token) return NextResponse.json({ success: false, message: 'Não autorizado.' }, { status: 401 });

        const verified: any = await verifyJWT(token);
        if (!verified) return NextResponse.json({ success: false, message: 'Sessão inválida.' }, { status: 401 });

        const body = await request.json();
        const { newPassword } = body;

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ success: false, message: 'A nova senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: verified.id },
            data: {
                password: hashedPassword,
                forcePasswordChange: false
            }
        });

        const newToken = await signJWT({
            id: verified.id,
            email: verified.email,
            name: verified.name,
            forcePasswordChange: false
        });

        const response = NextResponse.json({ success: true, message: 'Senha atualizada com sucesso.' });

        response.cookies.set('adminSession', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 24 hours
        });

        return response;

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
