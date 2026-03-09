import { NextResponse } from 'next/server';
import { sendAdminNotification } from '@/lib/telegram-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log(">>> TEST TELEGRAM ENDPOINT CALLED <<<");
    const token = process.env.TELEGRAM_ADMIN_TOKEN || 'NÃO CONFIGURADO';
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || 'NÃO CONFIGURADO';

    try {
        const success = await sendAdminNotification("🚀 *Teste de Notificação*\n\nSe você recebeu isso, a integração com o Telegram na Vercel está funcionando!");

        return NextResponse.json({
            success,
            message: success ? "Notificação enviada com sucesso!" : "Falha ao enviar notificação. Verifique os logs da Vercel.",
            diagnostics: {
                tokenPresent: token !== 'NÃO CONFIGURADO',
                tokenStart: token !== 'NÃO CONFIGURADO' ? `${token.substring(0, 5)}...` : 'N/A',
                chatIdPresent: chatId !== 'NÃO CONFIGURADO',
                chatId: chatId !== 'NÃO CONFIGURADO' ? chatId : 'N/A'
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
