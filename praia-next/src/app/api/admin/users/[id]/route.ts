import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendTempPasswordEmail } from '@/lib/email';
import { verifyJWT } from '@/lib/auth';
import type { NextRequest } from 'next/server';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const token = request.cookies.get('adminSession')?.value;
        if (!token) return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
        const verified = await verifyJWT(token);
        if (!verified) return NextResponse.json({ success: false, message: 'Sessão inválida' }, { status: 401 });

        const body = await request.json();
        const { name, email, resetPassword } = body;
        const userId = params.id;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ success: false, message: 'Usuário não encontrado.' }, { status: 404 });

        const updateData: any = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;

        if (resetPassword) {
            const tempPassword = Math.random().toString(36).substring(2, 10).toUpperCase();
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(tempPassword, salt);
            updateData.forcePasswordChange = true;

            await sendTempPasswordEmail(updateData.email || user.email, tempPassword);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, name: true, email: true, forcePasswordChange: true }
        });

        return NextResponse.json({
            success: true,
            message: resetPassword ? 'Senha redefinida e e-mail enviado com sucesso.' : 'Dados atualizados.',
            user: updatedUser
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const token = request.cookies.get('adminSession')?.value;
        if (!token) return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
        const verified: any = await verifyJWT(token);
        if (!verified) return NextResponse.json({ success: false, message: 'Sessão inválida' }, { status: 401 });

        const userId = params.id;

        if (verified.id === userId) {
            return NextResponse.json({ success: false, message: 'Você não pode excluir sua própria conta em uso.' }, { status: 400 });
        }

        await prisma.user.delete({ where: { id: userId } });

        return NextResponse.json({ success: true, message: 'Administrador removido.' });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
