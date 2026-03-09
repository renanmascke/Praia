const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TELEGRAM_TOKEN = "8609827544:AAED0nKVvp4wMPzvaK0fqBFaiBF1lMT2vVw";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

const windTranslator = {
    "N": "Norte", "S": "Sul", "E": "Leste", "W": "Oeste",
    "NE": "Nordeste", "NW": "Noroeste", "SE": "Sudeste", "SW": "Sudoeste",
    "NNE": "Norte-Nordeste", "ENE": "Leste-Nordeste", "ESE": "Leste-Sudeste", "SSE": "Sul-Sudeste",
    "SSW": "Sul-Sudoeste", "WSW": "Oeste-Sudoeste", "WNW": "Oeste-Noroeste", "NNW": "Norte-Noroeste"
};

async function answerCallbackQuery(callbackQueryId) {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId })
    });
}

async function sendMessage(chatId, text, keyboard = null) {
    const body = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
    };
    if (keyboard) {
        body.reply_markup = keyboard;
    }
    await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

async function handleUpdate(update) {
    if (update.callback_query) {
        await answerCallbackQuery(update.callback_query.id);
        const callbackData = update.callback_query.data;
        const chatId = update.callback_query.message.chat.id;

        if (callbackData === 'start_over') {
            await sendStartMenu(chatId);
        } else if (callbackData.startsWith('city_')) {
            const cityId = callbackData.replace('city_', '');
            await sendRegionOptions(chatId, cityId);
        } else if (callbackData.startsWith('anchor_')) {
            const anchorId = callbackData.replace('anchor_', '');
            await sendAnchorForecast(chatId, anchorId);
        }
        return;
    }

    if (!update.message) return;
    const chatId = update.message.chat.id;
    const text = (update.message.text || '').toLowerCase();

    if (text === '/start' || text.includes('olá') || text.includes('oi')) {
        await sendStartMenu(chatId);
        return;
    }

    // Busca por nome de cidade
    const city = await prisma.city.findFirst({
        where: { name: { contains: text.trim() } }
    });

    if (city) {
        await sendRegionOptions(chatId, city.id);
    } else if (text.length >= 3) {
        const keyboard = await getCitiesKeyboard();
        await sendMessage(chatId, "⚠️ Não encontrei essa cidade. Tente selecionar uma disponível no menu:", keyboard);
    }
}

async function getCitiesKeyboard() {
    const cities = await prisma.city.findMany({ select: { id: true, name: true } });
    return {
        inline_keyboard: cities.map(c => ([{ text: `🏙️ ${c.name}`, callback_data: `city_${c.id}` }]))
    };
}

async function sendStartMenu(chatId) {
    const keyboard = await getCitiesKeyboard();
    await sendMessage(chatId, "👋 Bem-vindo ao **Que Praia Eu Vou?**\n\nEscolha uma cidade abaixo para começar:", keyboard);
}

async function sendRegionOptions(chatId, cityId) {
    const city = await prisma.city.findUnique({
        where: { id: cityId },
        include: { anchors: true }
    });

    if (!city || city.anchors.length === 0) {
        await sendMessage(chatId, "Nenhuma região encontrada.");
        return;
    }

    const keyboard = {
        inline_keyboard: [
            ...city.anchors.map(a => ([{ text: `🏖️ ${a.name}`, callback_data: `anchor_${a.id}` }])),
            [{ text: "⬅️ Voltar", callback_data: "start_over" }]
        ]
    };

    await sendMessage(chatId, `📍 **${city.name}**\n\nEscolha qual região você deseja consultar abaixo:`, keyboard);
}

async function sendAnchorForecast(chatId, anchorId) {
    try {
        const anchor = await prisma.forecastAnchor.findUnique({
            where: { id: anchorId },
            include: {
                city: true,
                forecasts: {
                    where: { date: { gte: new Date() } },
                    orderBy: { date: 'asc' },
                    take: 3
                }
            }
        });

        if (!anchor) return;

        let response = `✨ **PREVISÃO: ${anchor.name.toUpperCase()}**\n`;
        response += `🏙️ ${anchor.city.name}\n`;
        response += `──────────────────\n\n`;

        if (anchor.forecasts.length === 0) {
            response += "⚠️ Sem previsões disponíveis para esta região.";
        } else {
            anchor.forecasts.forEach(f => {
                const dateStr = new Date(f.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).toUpperCase();
                const windName = windTranslator[f.windDir] || f.windDir;
                const waveHeight = (f.hourlyData && f.hourlyData[0]) ? (f.hourlyData[0].waveHeight || '0.0') : (f.hourlyData && Object.values(f.hourlyData)[0]?.waveHeight) || '0.0';

                response += `📅 *${dateStr}*\n`;
                response += `🌤️ ${f.condition}\n`;
                response += `🌡️ ${f.tempMin.toFixed(0)}° - ${f.tempMax.toFixed(0)}°C\n`;
                response += `🌬️ ${windName} (${f.windSpeed.toFixed(0)}km/h)\n`;
                response += `🌊 Mar: ${waveHeight}m\n\n`;
            });
        }

        response += `──────────────────`;

        const keyboard = {
            inline_keyboard: [[{ text: "⬅️ Ver Outra Região", callback_data: `city_${anchor.cityId}` }, { text: "🏠 Início", callback_data: "start_over" }]]
        };

        await sendMessage(chatId, response, keyboard);
    } catch (e) {
        console.error("Erro ao carregar previsão:", e);
    }
}

async function poll() {
    let lastUpdateId = 0;
    console.log("🤖 [TELEGRAM] Bot iniciado com sucesso!");

    // Garantir que webhook está vazio
    await fetch(`${TELEGRAM_API}/setWebhook?url=`);

    while (true) {
        try {
            const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
            const data = await res.json();

            if (data.result && data.result.length > 0) {
                for (const update of data.result) {
                    await handleUpdate(update);
                    lastUpdateId = update.update_id;
                }
            }
        } catch (e) {
            // Silencioso em erros de rede temporários
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

poll();
