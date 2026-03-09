const ADMIN_TOKEN = process.env.TELEGRAM_ADMIN_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

export async function sendAdminNotification(message: string) {
    if (!ADMIN_TOKEN || !ADMIN_CHAT_ID) {
        console.warn("TELEGRAM_ADMIN_TOKEN ou TELEGRAM_ADMIN_CHAT_ID não configurados.");
        return;
    }

    const url = `https://api.telegram.org/bot${ADMIN_TOKEN}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: ADMIN_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            console.error("Falha ao enviar notificação administrativa:", await response.text());
        }
    } catch (error) {
        console.error("Erro ao conectar com API do Telegram Admin:", error);
    }
}
