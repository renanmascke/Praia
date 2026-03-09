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
        const resIma = await fetch(`${baseUrl}/api/sync-ima?silent=true`);
        results.ima = await resIma.json();

        // 2. Weather
        console.log("2/4: Sincronizando Weather...");
        const resWeather = await fetch(`${baseUrl}/api/sync-weather?silent=true`);
        results.weather = await resWeather.json();

        // 3. Marine
        console.log("3/4: Sincronizando Marine...");
        const resMarine = await fetch(`${baseUrl}/api/sync-marine?silent=true`);
        results.marine = await resMarine.json();

        // 4. Ranking
        console.log("4/4: Recalculando Ranking...");
        const resRanking = await fetch(`${baseUrl}/api/sync-ranking?silent=true`);
        results.ranking = await resRanking.json();

        console.log(">>> SINCRONIZAÇÃO COMPLETA FINALIZADA <<<");

        // Atualizar Log de Sucesso
        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog 
            SET endTime = NOW(), status = 'SUCCESS', message = 'Sucesso: Sincronização completa finalizada.', response = '${JSON.stringify(results).replace(/'/g, "''")}'
            WHERE id = '${logId}'
        `);

        // Enviar Notificação Telegram
        const telegramMessage = `
✅ *Sincronização Completa Finalizada*
📅 ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}

🧪 *IMA:* ${results.ima?.success ? 'Sucesso ✅' : 'Falha ❌'}
🌤️ *Clima:* ${results.weather?.success ? `${results.weather.weather} calls ✅` : 'Falha ❌'}
🌊 *Mar:* ${results.marine?.success ? `${results.marine.marine} calls ✅` : 'Falha ❌'}
🏆 *Ranking:* ${results.ranking?.success ? 'Recalculado ✅' : 'Falha ❌'}

🚀 _Executado via ${isCron ? 'Cron Job' : 'Manual'}_
        `.trim();

        const { sendAdminNotification } = await import('@/lib/telegram-admin');
        await sendAdminNotification(telegramMessage);

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error(">>> ERRO NA SINCRONIZAÇÃO COMPLETA <<<", error);

        const { sendAdminNotification } = await import('@/lib/telegram-admin');
        await sendAdminNotification(`❌ *ERRO NA SINCRONIZAÇÃO COMPLETA*\n\nErro: ${error.message}`);

        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog SET endTime = NOW(), status = 'FAILED', message = '${error.message.replace(/'/g, "''")}' WHERE id = '${logId}'
        `);

        return NextResponse.json({ success: false, error: error.message, results }, { status: 500 });
    }
}
