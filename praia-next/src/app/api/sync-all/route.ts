import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    // Se não for cron, poderíamos validar a sessão do admin aqui, 
    // mas para facilitar o agendamento via vercel.json, 
    // garantimos que o CRON_SECRET existindo, ele deve ser respeitado.
    if (process.env.CRON_SECRET && !isCron) {
        // Permitir chamadas locais para desenvolvimento sem segredo
        const { hostname } = new URL(request.url);
        if (hostname !== 'localhost') {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }
    }

    const { protocol, host } = new URL(request.url);
    const baseUrl = `${protocol}//${host}`;
    const logId = crypto.randomUUID();

    // Criar Log de Início
    await (prisma as any).$executeRawUnsafe(`
        INSERT INTO SyncLog (id, type, startTime, status, message, createdAt)
        VALUES ('${logId}', 'ALL', NOW(), 'RUNNING', 'Iniciando Sincronização Completa (IMA -> Clima -> Mar -> Ranking)...', NOW())
    `);

    const results = {
        ima: null,
        weather: null,
        marine: null,
        ranking: null
    } as any;

    try {
        console.log(">>> INICIANDO SINCRONIZAÇÃO COMPLETA <<<");

        // 1. IMA
        console.log("1/4: Sincronizando IMA...");
        const resIma = await fetch(`${baseUrl}/api/sync-ima`);
        results.ima = await resIma.json();

        // 2. Weather
        console.log("2/4: Sincronizando Weather...");
        const resWeather = await fetch(`${baseUrl}/api/sync-weather`);
        results.weather = await resWeather.json();

        // 3. Marine
        console.log("3/4: Sincronizando Marine...");
        const resMarine = await fetch(`${baseUrl}/api/sync-marine`);
        results.marine = await resMarine.json();

        // 4. Ranking
        console.log("4/4: Recalculando Ranking...");
        const resRanking = await fetch(`${baseUrl}/api/sync-ranking`);
        results.ranking = await resRanking.json();

        console.log(">>> SINCRONIZAÇÃO COMPLETA FINALIZADA <<<");

        // Atualizar Log de Sucesso
        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog 
            SET endTime = NOW(), status = 'SUCCESS', message = 'Sucesso: Sincronização completa finalizada.', response = '${JSON.stringify(results).replace(/'/g, "''")}'
            WHERE id = '${logId}'
        `);

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error(">>> ERRO NA SINCRONIZAÇÃO COMPLETA <<<", error);

        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog SET endTime = NOW(), status = 'FAILED', message = '${error.message.replace(/'/g, "''")}' WHERE id = '${logId}'
        `);

        return NextResponse.json({ success: false, error: error.message, results }, { status: 500 });
    }
}
