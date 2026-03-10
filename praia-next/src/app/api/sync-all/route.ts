import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

    // 0. Limpeza de logs "travados" de qualquer tipo (mais de 15 min em RUNNING)
    await (prisma as any).$executeRawUnsafe(`
        UPDATE SyncLog 
        SET status = 'FAILED', message = 'Sincronização interrompida: Timeout/Stale (mais de 15 min sem resposta)'
        WHERE status = 'RUNNING' AND startTime < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    `);

    // 0.1. Trava de concorrência específica para ALL
    const activeSync = await prisma.syncLog.findFirst({
        where: { type: 'ALL', status: 'RUNNING', startTime: { gte: new Date(Date.now() - 15 * 60 * 1000) } }
    });

    if (activeSync) {
        console.warn(">>> SYNC ALL ABORTADO: Já existe uma sincronização completa em andamento.");
        const { sendAdminNotification } = await import('@/lib/telegram-admin');
        await sendAdminNotification(`⚠️ *Sync ALL Abortado*\n\nMotivo: Já existe outra sincronização completa em andamento.`);
        return NextResponse.json({ success: false, error: "Outra sincronização COMPLETA já está em andamento." }, { status: 409 });
    }

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
        console.log(">>> INICIANDO SINCRONIZAÇÃO COMPLETA (MODO DIRETO) <<<");

        // 1. IMA
        console.log("1/4: Sincronizando IMA...");
        const { runImaSync } = await import('../sync-ima/route');
        results.ima = await runImaSync(true);

        // 2. Weather
        console.log("2/4: Sincronizando Weather...");
        const { runWeatherSync } = await import('../sync-weather/route');
        results.weather = await runWeatherSync(true);

        // 3. Marine
        console.log("3/4: Sincronizando Marine...");
        const { runMarineSync } = await import('../sync-marine/route');
        results.marine = await runMarineSync(true);

        // 4. Ranking
        console.log("4/4: Recalculando Ranking...");
        const { runRankingSync } = await import('../sync-ranking/route');
        results.ranking = await runRankingSync(true);

        console.log(">>> SINCRONIZAÇÃO COMPLETA FINALIZADA <<<");

        // Atualizar Log de Sucesso
        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog 
            SET endTime = NOW(), status = 'SUCCESS', message = 'Sucesso: Sincronização completa finalizada.', response = '${JSON.stringify(results).replace(/'/g, "''")}'
            WHERE id = '${logId}'
        `);

        // Enviar Notificação Telegram
        const telegramMessage = `✅ <b>Sincronização Completa Finalizada</b>
📅 ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}

🧪 <b>IMA:</b> ${results.ima?.success ? 'Sucesso ✅' : 'Falha ❌'}
🌤️ <b>Clima:</b> ${results.weather?.success ? `${results.weather.weather} calls ✅` : 'Falha ❌'}
🌊 <b>Mar:</b> ${results.marine?.success ? `${results.marine.marine} calls ✅` : 'Falha ❌'}
🏆 <b>Ranking:</b> ${results.ranking?.success ? 'Recalculado ✅' : 'Falha ❌'}

🚀 <i>Executado via ${isCron ? 'Cron Job' : 'Manual'}</i>
        `.trim();

        const { sendAdminNotification } = await import('@/lib/telegram-admin');
        await sendAdminNotification(telegramMessage);

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error(">>> ERRO NA SINCRONIZAÇÃO COMPLETA <<<", error);

        const { sendAdminNotification } = await import('@/lib/telegram-admin');
        await sendAdminNotification(`❌ <b>ERRO NA SINCRONIZAÇÃO COMPLETA</b>\n\nErro: ${error.message}`);

        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog SET endTime = NOW(), status = 'FAILED', message = '${error.message.replace(/'/g, "''")}' WHERE id = '${logId}'
        `);

        return NextResponse.json({ success: false, error: error.message, results }, { status: 500 });
    }
}
