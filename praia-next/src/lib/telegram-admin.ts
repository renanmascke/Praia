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

    // Adicionar um ID único e timestamp para evitar de-duplicação e garantir unicidade
    const now = new Date();
    const uniqueId = Math.random().toString(36).substring(7).toUpperCase();
    const timestampStr = now.toLocaleTimeString('pt-BR');
    const finalMessage = `${message}\n\n<pre>ID: ${uniqueId} | ${timestampStr}</pre>`;

    console.log(`TELEGRAM_ADMIN: Enviando HTML - ID ${uniqueId}. Tamanho: ${finalMessage.length}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: ADMIN_CHAT_ID,
                text: finalMessage,
                parse_mode: 'HTML'
            }),
            signal: AbortSignal.timeout(10000)
        });

        const data = await response.json();
        if (!response.ok) {
            console.error(`TELEGRAM_ADMIN: Erro (Status ${response.status}):`, JSON.stringify(data));
            return { ok: false, error: data.description || "Erro desconhecido" };
        } else {
            console.log("TELEGRAM_ADMIN: Sucesso!", JSON.stringify(data));
            return data;
        }
    } catch (error: any) {
        console.error("TELEGRAM_ADMIN: Erro de conexão:", error.message || error);
        return { ok: false, error: error.message };
    }
}
