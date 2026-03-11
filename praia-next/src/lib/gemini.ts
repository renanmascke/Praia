import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "./prisma";

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
        4. Chuva (CRÍTICO): 
           - Se Chance de Chuva > 80% ou Quantidade > 5mm: Score MÁXIMO 25 (Dia perdido).
           - Se Chance de Chuva > 50% ou Quantidade > 2mm: Score MÁXIMO 45 (Instável).
           - Se Chance de Chuva > 30%: Reduza a nota em pelo menos 15 pontos.
           - Mencione a chuva no comentário se ela for o motivo da nota baixa.

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
            ... (Você DEVE retornar um objeto para CADA UMA das praias enviadas na lista diária, sem ignorar nenhuma)
        ]
    `;

    const promptContent = buildPrompt();

    try {
        console.log(`>>> [BATCH] Tentando modelo Gemini: ${currentModelName} para ${cityName}...`);
        const model = genAI.getGenerativeModel({
            model: currentModelName,
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(promptContent);
        const text = result.response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedText);
        
        // Logar a interação
        await (prisma as any).aiLog.create({
            data: {
                type: 'RANKING',
                city: cityName,
                model: currentModelName,
                prompt: promptContent,
                response: cleanedText
            }
        });

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
                const resultFallback = await fallbackModel.generateContent(promptContent);
                const textFallback = resultFallback.response.text();
                const cleanedTextFallback = textFallback.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsedFallback = JSON.parse(cleanedTextFallback);
                
                // Logar a interação do fallback
                await (prisma as any).aiLog.create({
                    data: {
                        type: 'RANKING',
                        city: cityName,
                        model: currentModelName,
                        prompt: promptContent,
                        response: cleanedTextFallback
                    }
                });

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
        - **NOMES EXPLÍCITOS E REAIS**: Você DEVE citar obrigatoriamente os nomes das **Regiões** (Norte, Sul, Leste, etc.) e as **Praias** específicas recomendadas.
        - **PROIBIDO ALUCINAR**: Use APENAS os nomes de praias fornecidos na lista de "Rankings Sugeridos". Não invente praias que não estejam nos dados. Se o ranking trouxer "**Daniela**", use esse nome. Não cite praias famosas se elas não estiverem no Top do ranking enviado.
        - **CONCISÃO**: O texto deve ser curto e dinâmico (máximo de 2 parágrafos pequenos).
        - **PROIBIDO**: Não se apresente, não use saudações ("Olá"), e não cite nomes ou cargos (como "Garota do Tempo"). Comece direto no conteúdo.

        ESTRUTURA SUGERIDA:
        1. Resumo do Tempo: Céu, temperatura e risco de chuva (avisar claramente se > 40%).
        2. Dica do Especialista: Onde ir na **Manhã** vs **Tarde** baseado no vento e mar.
        3. Top Praias: Destaque as Top 3 do Ranking Sugerido com nomes em negrito.

        DADOS:
        - Cidade: ${cityName}
        - Clima Detalhado (Manhã/Tarde/Noite): ${JSON.stringify(weatherData)}
        - Rankings Sugeridos (Onde escolher nomes): ${JSON.stringify(rankingData.slice(0, 5))}

        Escreva apenas o boletim de lazer.
    `;

    const promptContent = buildPrompt();

    try {
        const model = genAI.getGenerativeModel({ model: currentModelName });
        const result = await model.generateContent(promptContent);
        const responseText = result.response.text().trim();

        // Logar a interação (Resumo)
        await (prisma as any).aiLog.create({
            data: {
                type: 'SUMMARY',
                city: cityName,
                model: currentModelName,
                prompt: promptContent,
                response: responseText
            }
        });

        return responseText;
    } catch (error: any) {
        if (isQuotaError(error) && currentModelName === PRIMARY_MODEL) {
            try {
                console.warn(`>>> Limite de cota atingido para ${PRIMARY_MODEL} no resumo. Tentando fallback para ${FALLBACK_MODEL}...`);
                currentModelName = FALLBACK_MODEL;
                const fallbackModel = genAI.getGenerativeModel({ model: currentModelName });
                const result = await fallbackModel.generateContent(promptContent);
                const responseText = result.response.text().trim();

                // Logar a interação (Resumo Fallback)
                await (prisma as any).aiLog.create({
                    data: {
                        type: 'SUMMARY',
                        city: cityName,
                        model: currentModelName,
                        prompt: promptContent,
                        response: responseText
                    }
                });

                return responseText;
            } catch (fallbackError: any) {
                console.error(">>> Erro no fallback do resumo:", fallbackError.message);
            }
        }

        console.error(">>> Erro ao gerar resumo da cidade:", error.message);
        return "Hoje o dia está convidativo para um passeio no litoral. Confira as praias melhor ranqueadas para aproveitar o sol e o mar calmo.";
    }
}

export async function generateAiConsultation(
    query: string,
    context: {
        cityName: string;
        weatherData: any;
        topBeaches: any[];
    }
): Promise<string> {
    if (!apiKey) return "Serviço de consultoria indisponível no momento.";

    let currentModelName = PRIMARY_MODEL;

    const buildPrompt = () => `
        Você é o Consultor Especialista em Praias de ${context.cityName}. 
        Seu objetivo é responder dúvidas de turistas e moradores sobre as melhores condições para aproveitar o dia.

        CONTEXTO ATUAL:
        - Cidade: ${context.cityName}
        - Clima: ${JSON.stringify(context.weatherData)}
        - Melhores Praias Hoje: ${JSON.stringify(context.topBeaches.slice(0, 5))}

        DIRETRIZES DE RESPOSTA:
        - Seja prestativo, use um tom de "conversa de beira de mar", amigável e entusiasmado.
        - Se o usuário perguntar horários, seja preciso (ex: "Às 15h o vento Norte aperta, então recomendo ir antes ou escolher praias do Sul").
        - Se mencionarem crianças ou idosos, priorize praias com Mar Calmo (Sheltered) e boa balneabilidade.
        - Sempre use nomes de praias em **negrito**.
        - Seja conciso (máximo de 150 palavras).
        - **PROIBIDO**: Não se apresente ou use saudações formais. Responda diretamente à dúvida.

        PERGUNTA DO USUÁRIO: "${query}"

        Responda como o consultor experiente:
    `;

    const promptContent = buildPrompt();

    try {
        const model = genAI.getGenerativeModel({ model: currentModelName });
        const result = await model.generateContent(promptContent);
        const responseText = result.response.text().trim();

        // Logar a interação
        await (prisma as any).aiLog.create({
            data: {
                type: 'CONSULTATION',
                city: context.cityName,
                model: currentModelName,
                prompt: promptContent,
                response: responseText
            }
        });

        return responseText;
    } catch (error: any) {
        console.error(">>> Erro na consultoria IA:", error.message);
        return "Desculpe, tive um pequeno problema ao processar sua consulta. Tente novamente em alguns instantes ou confira as recomendações gerais do ranking.";
    }
}
export async function selectBestDay(
    cityName: string,
    dailySummaries: { date: string, content: string }[]
): Promise<string | null> {
    if (!apiKey || dailySummaries.length === 0) return null;

    let currentModelName = PRIMARY_MODEL;

    const buildPrompt = () => `
        Analise os boletins diários de lazer da cidade de ${cityName} para os próximos dias e escolha qual é o MELHOR dia absoluto para ir à praia.
        Considere o clima, as recomendações e o entusiasmo descrito em cada boletim.

        BOLETINS:
        ${JSON.stringify(dailySummaries, null, 2)}

        RETORNE OBRIGATORIAMENTE UM JSON NO FORMATO:
        {
            "bestDate": "YYYY-MM-DD",
            "justification": "Uma frase curta de por que este é o melhor dia."
        }
    `;

    const promptContent = buildPrompt();

    try {
        const model = genAI.getGenerativeModel({
            model: currentModelName,
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(promptContent);
        const text = result.response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedText);

        // Logar a interação
        await (prisma as any).aiLog.create({
            data: {
                type: 'HIGHLIGHT',
                city: cityName,
                model: currentModelName,
                prompt: promptContent,
                response: cleanedText
            }
        });

        return parsed.bestDate;
    } catch (error: any) {
        console.error(">>> Erro ao selecionar melhor dia:", error.message);
        return null;
    }
}
