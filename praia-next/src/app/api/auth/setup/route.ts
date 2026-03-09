import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const existingAdmin = await prisma.user.findFirst();

        if (existingAdmin) {
            return NextResponse.json({ success: false, message: 'Administrador já existe. Abortado.' }, { status: 400 });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const user = await prisma.user.create({
            data: {
                email: 'admin@praia.com.br',
                name: 'Administrador do Sistema',
                password: hashedPassword
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Criado administrador padrão.',
            user: { id: user.id, email: user.email }
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
