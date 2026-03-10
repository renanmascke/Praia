import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-1.5-flash";

function isQuotaError(error: any): boolean {
    const message = error?.message?.toLowerCase() || "";
    return message.includes("429") || message.includes("quota") || message.includes("rate limit") || message.includes("exhausted");
}

export interface AiRankingResult {
    date: string; // ISO format
    beachId: string;
    score: number;
    commentary: string;
}

export async function generateMultiDayRanking(cityName: string, dailyDataBatch: any[]): Promise<AiRankingResult[]> {
    if (!apiKey) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY não configurada no .env");
    }

    let currentModelName = PRIMARY_MODEL;

    const buildPrompt = () => `
        Analise os dados meteorológicos e de balneabilidade das praias da cidade de ${cityName} para vários dias e atribua um score de 0 a 100 para cada uma.
        O objetivo é indicar quão agradável a praia está para lazer e banho de mar.

        REQUISITOS DE ESTILO:
        - Seja vibrante e informativo, agindo como um guia local experiente.
        - **PROIBIDO**: Não use saudações ("Olá", "Bom dia"), não se apresente ("Eu sou...", "Como especialista...") e não cite cargos (como "Garota do Tempo").
        - O comentário deve ser uma frase curta, única e cheia de vida.

        CRITÉRIOS DE AVALIAÇÃO:
        1. Balneabilidade: Se for "Impróprio", score máximo 30. Se for "Mista", máximo 50. Se for "Próprio", base 70+.
        2. Vento: Se vento > 8km/h, priorize praias com "Vento Ideal" compatível. Se vento <= 8km/h, considere um dia premium ("mar de espelho").
        3. Mar: Ondas < 0.6m são ótimas para banho. Ondas > 1.2m são perigosas.
        4. Chuva: Se Chance de Chuva > 40%, reduza a nota e mencione a instabilidade de forma clara.

        DADOS PARA PROCESSAR:
        ${JSON.stringify(dailyDataBatch, null, 2)}
        
        RETORNE OBRIGATORIAMENTE UM JSON NO FORMATO:
        [
            {
                "date": "YYYY-MM-DD",
                "beachId": "id-da-praia",
                "score": número,
                "commentary": "Sua dica curta e vibrante aqui."
            },
            ... (todos os dias e praias solicitados)
        ]
    `;

    try {
        console.log(`>>> [BATCH] Tentando modelo Gemini: ${currentModelName} para ${cityName}...`);
        const model = genAI.getGenerativeModel({
            model: currentModelName,
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(buildPrompt());
        const text = result.response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedText);
        console.log(`>>> [BATCH] Sucesso com o modelo: ${currentModelName}`);
        return parsed;
    } catch (error: any) {
        if (isQuotaError(error) && currentModelName === PRIMARY_MODEL) {
            console.warn(`>>> [BATCH] Limite de cota atingido para ${PRIMARY_MODEL}. Tentando fallback para ${FALLBACK_MODEL}...`);
            currentModelName = FALLBACK_MODEL;

            const fallbackModel = genAI.getGenerativeModel({
                model: currentModelName,
                generationConfig: { responseMimeType: "application/json" }
            });

            try {
                const resultFallback = await fallbackModel.generateContent(buildPrompt());
                const textFallback = resultFallback.response.text();
                const cleanedTextFallback = textFallback.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsedFallback = JSON.parse(cleanedTextFallback);
                console.log(`>>> [BATCH] Sucesso com o modelo de fallback: ${currentModelName}`);
                return parsedFallback;
            } catch (fallbackError: any) {
                console.error(`>>> [BATCH] Falha crítica inclusive no fallback ${FALLBACK_MODEL}:`, fallbackError.message);
                throw fallbackError;
            }
        }

        console.error(`>>> [BATCH] Falha crítica com modelo ${currentModelName}:`, error.message);
        throw error;
    }
}

// Manteremos generateCityRanking para retrocompatibilidade se necessário, mas marcamos como deprecação interna
export async function generateCityRanking(cityName: string, beachesData: any[]): Promise<AiRankingResult[]> {
    const today = new Date().toISOString().split('T')[0];
    const batchedData = [{ date: today, beaches: beachesData }];
    return generateMultiDayRanking(cityName, batchedData);
}

export async function generateCityDailySummary(
    cityName: string,
    weatherData: any,
    rankingData: any[]
): Promise<string> {
    if (!apiKey) return "";

    let currentModelName = PRIMARY_MODEL;

    const buildPrompt = () => `
        Gere um boletim de previsão e lazer para a cidade de ${cityName}. 
        Seu tom deve ser animado, amigável e direto ao ponto, como se fosse um guia local dando uma dica rápida.
        
        DIRETRIZES DE CONTEÚDO:
        - **DIFERENCIAÇÃO DE PERÍODOS**: Analise os dados de MANHÃ e TARDE. Se houver mudança significativa no vento ou chuva, RECOMENDE praias ou regiões diferentes para cada período (ex: "Manhã perfeita no Norte, mas à tarde o vento vira e o Sul fica melhor").
        - **NOMES EXPLÍCITOS**: Você DEVE citar obrigatoriamente os nomes das **Regiões** (Norte, Sul, Leste, etc.) e as **Praias** específicas recomendadas. Não seja genérico.
        - **CONCISÃO**: O texto deve ser curto e dinâmico (máximo de 2 parágrafos pequenos).
        - **PROIBIDO**: Não se apresente, não use saudações ("Olá"), e não cite nomes ou cargos (como "Garota do Tempo"). Comece direto no conteúdo.

        ESTRUTURA SUGERIDA:
        1. Resumo do Tempo: Céu, temperatura e risco de chuva (avisar claramente se > 40%).
        2. Dica do Especialista: Onde ir na **Manhã** vs **Tarde** baseado no vento e mar.
        3. Top Praias: Destaque as Top 3 do ranking com nomes em negrito.

        DADOS:
        - Cidade: ${cityName}
        - Clima Detalhado (Manhã/Tarde/Noite): ${JSON.stringify(weatherData)}
        - Rankings Sugeridos (Candidatos): ${JSON.stringify(rankingData.slice(0, 5))}

        Escreva apenas o boletim de lazer.
    `;

    try {
        const model = genAI.getGenerativeModel({ model: currentModelName });
        const result = await model.generateContent(buildPrompt());
        return result.response.text().trim();
    } catch (error: any) {
        if (isQuotaError(error) && currentModelName === PRIMARY_MODEL) {
            try {
                console.warn(`>>> Limite de cota atingido para ${PRIMARY_MODEL} no resumo. Tentando fallback para ${FALLBACK_MODEL}...`);
                currentModelName = FALLBACK_MODEL;
                const fallbackModel = genAI.getGenerativeModel({ model: currentModelName });
                const result = await fallbackModel.generateContent(buildPrompt());
                return result.response.text().trim();
            } catch (fallbackError: any) {
                console.error(">>> Erro no fallback do resumo:", fallbackError.message);
            }
        }

        console.error(">>> Erro ao gerar resumo da cidade:", error.message);
        return "Hoje o dia está convidativo para um passeio no litoral. Confira as praias melhor ranqueadas para aproveitar o sol e o mar calmo.";
    }
}
