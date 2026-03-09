import { NextResponse } from 'next/server';
import { sendAdminNotification } from '@/lib/telegram-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log(">>> TEST TELEGRAM ENDPOINT CALLED <<<");
    const token = process.env.TELEGRAM_ADMIN_TOKEN || 'NÃO CONFIGURADO';
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || 'NÃO CONFIGURADO';

    let botInfo = null;
    let updates = null;
    if (token !== 'NÃO CONFIGURADO') {
        try {
            const botRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
            if (botRes.ok) {
                const data = await botRes.json();
                botInfo = data.result;
            }

            const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=5&offset=-5`);
            if (updatesRes.ok) {
                const data = await updatesRes.json();
                updates = data.result;
            }
        } catch (e) {
            console.error("Erro ao buscar info do bot:", e);
        }
    }

    try {
        const response = await sendAdminNotification("🚀 *Teste de Notificação*\n\nSe você recebeu isso, a integração com o Telegram na Vercel está funcionando!");

        return NextResponse.json({
            success: response.ok,
            message: response.ok ? "Notificação enviada com sucesso!" : "Falha ao enviar notificação.",
            telegramResponse: response,
            diagnostics: {
                tokenPresent: token !== 'NÃO CONFIGURADO',
                tokenStart: token !== 'NÃO CONFIGURADO' ? `${token.substring(0, 5)}...` : 'N/A',
                chatIdPresent: chatId !== 'NÃO CONFIGURADO',
                chatIdConfigurado: chatId !== 'NÃO CONFIGURADO' ? chatId : 'N/A',
                botUsername: botInfo?.username || 'N/A',
                botName: botInfo?.first_name || 'N/A',
                ultimasInteracoes: updates?.map((u: any) => ({
                    chatId: u.message?.chat?.id || u.callback_query?.message?.chat?.id,
                    from: u.message?.from?.username || u.callback_query?.from?.username,
                    text: u.message?.text || 'Botão clicado'
                })) || []
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
