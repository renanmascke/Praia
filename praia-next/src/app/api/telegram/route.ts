import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { windTranslator } from '@/lib/data';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Handle Callback Queries (Buttons)
        if (body.callback_query) {
            await answerCallbackQuery(body.callback_query.id);
            const callbackData = body.callback_query.data;
            const chatId = body.callback_query.message.chat.id;

            if (callbackData === 'start_over') {
                return handleStart(chatId);
            } else if (callbackData.startsWith('city_')) {
                const cityId = callbackData.replace('city_', '');
                return sendRegionOptions(chatId, cityId);
            } else if (callbackData.startsWith('anchor_')) {
                const anchorId = callbackData.replace('anchor_', '');
                return sendAnchorForecast(chatId, anchorId);
            }
            return NextResponse.json({ ok: true });
        }

        if (!body.message) return NextResponse.json({ ok: true });

        const chatId = body.message.chat.id;
        const text = (body.message.text || '').toLowerCase();

        if (text === '/start' || text.includes('olá') || text.includes('oi')) {
            return handleStart(chatId);
        }

        // Manual search
        const city = await prisma.city.findFirst({
            where: { name: { contains: text.trim() } }
        });

        if (city) {
            return sendRegionOptions(chatId, city.id);
        }

        await sendMessage(chatId, "Desculpe, não entendi. Use os botões abaixo para ver as opções:", await getCitiesKeyboard());
        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error("Erro no Webhook do Telegram:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

async function getCitiesKeyboard() {
    const cities = await prisma.city.findMany({ select: { id: true, name: true } });
    return {
        inline_keyboard: cities.map(c => ([{ text: `🏙️ ${c.name}`, callback_data: `city_${c.id}` }]))
    };
}

async function handleStart(chatId: number) {
    const keyboard = await getCitiesKeyboard();
    await sendMessage(chatId, "👋 Bem-vindo ao **inDica Praia**\n\nEscolha uma cidade abaixo para começar:", keyboard);
    return NextResponse.json({ ok: true });
}

async function sendRegionOptions(chatId: number, cityId: string) {
    const city = await prisma.city.findUnique({
        where: { id: cityId },
        include: { anchors: true }
    });

    if (!city || city.anchors.length === 0) {
        await sendMessage(chatId, "Nenhuma região encontrada.");
        return NextResponse.json({ ok: true });
    }

    const keyboard = {
        inline_keyboard: [
            ...city.anchors.map(a => ([{ text: `🏖️ ${a.name}`, callback_data: `anchor_${a.id}` }])),
            [{ text: "⬅️ Voltar", callback_data: "start_over" }]
        ]
    };

    await sendMessage(chatId, `📍 **Certo! Qual região em ${city.name} você quer consultar?**`, keyboard);
    return NextResponse.json({ ok: true });
}

async function sendAnchorForecast(chatId: number, anchorId: string) {
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

    if (!anchor) return NextResponse.json({ ok: true });

    let response = `✨ **PREVISÃO: ${anchor.name.toUpperCase()}**\n`;
    response += `🏙️ ${anchor.city.name}\n`;
    response += `──────────────────\n\n`;

    if (anchor.forecasts.length === 0) {
        response += "Não há previsões disponíveis.";
    } else {
        anchor.forecasts.forEach(f => {
            const dateStr = new Date(f.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).toUpperCase();
            const windName = windTranslator[f.windDir] || f.windDir;
            const waveHeight = (f.hourlyData && (f.hourlyData as any)[0]) ? (f.hourlyData as any)[0].waveHeight || '0.0' : '0.0';

            response += `📅 *${dateStr}*\n`;
            response += `🌤️ ${f.condition}\n`;
            response += `🌡️ ${f.tempMin.toFixed(0)}° - ${f.tempMax.toFixed(0)}°C\n`;
            response += `🌬️ ${windName} (${f.windSpeed.toFixed(0)}km/h)\n`;
            response += `🌊 Mar: ${waveHeight}m\n\n`;
        });
    }

    response += `──────────────────`;

    const keyboard = {
        inline_keyboard: [[{ text: "⬅️ Outras Regiões", callback_data: `city_${anchor.cityId}` }, { text: "🏠 Início", callback_data: "start_over" }]]
    };

    await sendMessage(chatId, response, keyboard);
    return NextResponse.json({ ok: true });
}

async function answerCallbackQuery(callbackQueryId: string) {
    if (!TELEGRAM_TOKEN) return;
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId })
    });
}

async function sendMessage(chatId: number, text: string, keyboard?: any) {
    if (!TELEGRAM_TOKEN) return;
    const body: any = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
    };
    if (keyboard) body.reply_markup = keyboard;

    await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}
