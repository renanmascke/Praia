import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        console.log(`Tentando criar a tabela WindDirection via SQL bruto...`);

        await (prisma as any).$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS \`WindDirection\` (
                \`id\` VARCHAR(191) NOT NULL,
                \`code\` VARCHAR(191) NOT NULL,
                \`name\` VARCHAR(191) NOT NULL,
                \`icon\` VARCHAR(191) NOT NULL,
                \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                UNIQUE INDEX \`WindDirection_code_key\`(\`code\`),
                PRIMARY KEY (\`id\`)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);

        return NextResponse.json({ success: true, message: 'Table created successfully.' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
