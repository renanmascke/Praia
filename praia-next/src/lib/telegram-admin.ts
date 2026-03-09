export async function sendAdminNotification(message: string) {
    const ADMIN_TOKEN = process.env.TELEGRAM_ADMIN_TOKEN;
    const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!ADMIN_TOKEN || !ADMIN_CHAT_ID) {
        console.warn("TELEGRAM_ADMIN: Token ou ChatID não configurados no ambiente.");
        return;
    }

    // Log para depuração na Vercel (sem vazar o token todo)
    console.log(`TELEGRAM_ADMIN: Tentando enviar mensagem para ChatID ${ADMIN_CHAT_ID}. Token inicia com: ${ADMIN_TOKEN.substring(0, 5)}...`);

    const url = `https://api.telegram.org/bot${ADMIN_TOKEN}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: ADMIN_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            }),
            // Adicionar um pequeno timeout para evitar que a função fique presa
            signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`TELEGRAM_ADMIN: Falha da API do Telegram (Status ${response.status}):`, errorText);

            // Tentar novamente sem Markdown se o erro for de parsing
            if (errorText.includes("can't parse entities")) {
                console.log("TELEGRAM_ADMIN: Erro de Markdown, tentando enviar em texto puro...");
                const retryResponse = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: ADMIN_CHAT_ID,
                        text: message.replace(/[*_]/g, '') // Remove caracteres de markdown
                    })
                });
                return retryResponse.ok;
            }
            return false;
        } else {
            console.log("TELEGRAM_ADMIN: Notificação enviada com sucesso.");
            return true;
        }
    } catch (error: any) {
        console.error("TELEGRAM_ADMIN: Erro ao conectar com API do Telegram:", error.message || error);
        return false;
    }
}
