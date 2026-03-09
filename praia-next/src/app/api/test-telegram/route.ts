import { NextResponse } from 'next/server';
import { sendAdminNotification } from '@/lib/telegram-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log(">>> TEST TELEGRAM ENDPOINT CALLED <<<");
    try {
        await sendAdminNotification("🚀 *Teste de Notificação*\n\nSe você recebeu isso, a integração com o Telegram na Vercel está funcionando!");
        return NextResponse.json({ success: true, message: "Comando de notificação enviado para o Telegram. Verifique seu bot." });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
