import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-3-flash";

function isQuotaError(error: any): boolean {
    const message = error?.message?.toLowerCase() || "";
    return message.includes("429") || message.includes("quota") || message.includes("rate limit") || message.includes("exhausted");
}

export interface AiRankingResult {
    beachId: string;
    score: number;
    commentary: string;
}

export async function generateCityRanking(cityName: string, beachesData: any[]): Promise<AiRankingResult[]> {
    if (!apiKey) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY não configurada no .env");
    }

    let currentModelName = PRIMARY_MODEL;

    try {
        console.log(`>>> Tentando modelo Gemini: ${currentModelName} para ${cityName}...`);
        const model = genAI.getGenerativeModel({
            model: currentModelName,
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
            Você é uma especialista apaixonada por lazer e bem-estar nas praias de Santa Catarina. 
            Sua tarefa é analisar dados de várias praias na cidade de ${cityName} e atribuir um score de 0 a 100 para cada uma, indicando quão "perfeita" a praia está para um dia de lazer relaxante, banho de mar e "ficar de boa" hoje.
            
            REQUISITOS DE ESTILO (NÃO SEJA ROBÓTICO):
            - Evite frases padrão como "Perfeita para o banho". Varie o vocabulário.
            - Use as características únicas de cada praia (ex: se é uma praia familiar, se tem águas cristalinas, se é mais rústica).
            - O comentário deve ser uma frase curta, mas vibrante e cheia de vida, como uma dica quente de quem conhece cada centímetro de areia.

            Critérios de Avaliação (Importância Decrescente):
            1. Balneabilidade (IMA): 
               - Status "Impróprio" ou alta concentração de E.Coli = Nota Baixa (máx 30). Fator eliminatório.
               - Status "Mista" = Nota Média (máx 50). Destaque a parcialidade e recomende cuidado com os pontos.
               - Status "Próprio" ou "Indeterminado" = Nota Alta (base 70).
            2. Vento e Conforto (Guarda-Sol):
               - IF Vento > 8km/h: Pontue bem as praias abrigadas (Ventos Ideais).
               - IF Vento <= 8km/h: Considere um dia premium para todas. Use termos como "brisa acariciante".
            3. Condição do Mar:
               - Mar calmo (< 0.6m) é o "mar de piscina" que amamos para relaxar.
               - Mar agitado (> 1.2m) é sinal de alerta para banhistas.
            4. Clima:
               - Se houver previsão de chuva, mencione de forma leve mas clara.

            Dados das Praias em ${cityName}:
            ${JSON.stringify(beachesData, null, 2)}
            
            Responda obrigatoriamente um JSON no formato:
            [
                {
                    "beachId": "id-string",
                    "score": número,
                    "commentary": "Uma frase curta, única e vibrante de indicação local."
                },
                ...
            ]
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedText);
        console.log(`>>> Sucesso com o modelo: ${currentModelName}`);
        return parsed;
    } catch (error: any) {
        if (isQuotaError(error) && currentModelName === PRIMARY_MODEL) {
            console.warn(`>>> Limite de cota atingido para ${PRIMARY_MODEL}. Tentando fallback para ${FALLBACK_MODEL}...`);
            currentModelName = FALLBACK_MODEL;

            const fallbackModel = genAI.getGenerativeModel({
                model: currentModelName,
                generationConfig: { responseMimeType: "application/json" }
            });

            try {
                const prompt = `
            Você é uma especialista apaixonada por lazer e bem-estar nas praias de Santa Catarina. 
            Sua tarefa é analisar dados de várias praias na cidade de ${cityName} e atribuir um score de 0 a 100 para cada uma, indicando quão "perfeita" a praia está para um dia de lazer relaxante, banho de mar e "ficar de boa" hoje.
            
            REQUISITOS DE ESTILO (NÃO SEJA ROBÓTICO):
            - Evite frases padrão como "Perfeita para o banho". Varie o vocabulário.
            - Use as características únicas de cada praia (ex: se é uma praia familiar, se tem águas cristalinas, se é mais rústica).
            - O comentário deve ser uma frase curta, mas vibrante e cheia de vida, como uma dica quente de quem conhece cada centímetro de areia.

            Critérios de Avaliação (Importância Decrescente):
            1. Balneabilidade (IMA): 
               - Status "Impróprio" ou alta concentração de E.Coli = Nota Baixa (máx 30). Fator eliminatório.
               - Status "Mista" = Nota Média (máx 50). Destaque a parcialidade e recomende cuidado com os pontos.
               - Status "Próprio" ou "Indeterminado" = Nota Alta (base 70).
            2. Vento e Conforto (Guarda-Sol):
               - IF Vento > 8km/h: Pontue bem as praias abrigadas (Ventos Ideais).
               - IF Vento <= 8km/h: Considere um dia premium para todas. Use termos como "brisa acariciante".
            3. Condição do Mar:
               - Mar calmo (< 0.6m) é o "mar de piscina" que amamos para relaxar.
               - Mar agitado (> 1.2m) é sinal de alerta para banhistas.
            4. Clima:
               - Se houver previsão de chuva, mencione de forma leve mas clara.

            Dados das Praias em ${cityName}:
            ${JSON.stringify(beachesData, null, 2)}
            
            Responda obrigatoriamente um JSON no formato:
            [
                {
                    "beachId": "id-string",
                    "score": número,
                    "commentary": "Uma frase curta, única e vibrante de indicação local."
                },
                ...
            ]
        `;
                const resultFallback = await fallbackModel.generateContent(prompt);
                const textFallback = resultFallback.response.text();
                const cleanedTextFallback = textFallback.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsedFallback = JSON.parse(cleanedTextFallback);
                console.log(`>>> Sucesso com o modelo de fallback: ${currentModelName}`);
                return parsedFallback;
            } catch (fallbackError: any) {
                console.error(`>>> Falha crítica inclusive no fallback ${FALLBACK_MODEL}:`, fallbackError.message);
                throw fallbackError;
            }
        }

        console.error(`>>> Falha crítica com modelo ${currentModelName}:`, error.message);
        throw error;
    }
}

export async function generateCityDailySummary(
    cityName: string,
    weatherData: any,
    rankingData: any[]
): Promise<string> {
    if (!apiKey) return "";

    let currentModelName = PRIMARY_MODEL;

    const buildPrompt = () => `
        Você é a "Garota do Tempo" especialista em lazer de ${cityName}. Seu tom é animado, amigável e direto ao ponto, como um boletim rápido de rádio ou TV para quem quer ir à praia agora.
        
        DIRETRIZES DE PERSONA E PRECISÃO:
        - CONCISÃO: Seja direta. O texto deve ser curto e dinâmico (máximo de 1 parágrafo grande ou 2 bem pequenos).
        - DADOS GEOGRÁFICOS: Se você recomendar uma região como a melhor (ex: "Região Norte"), você DEVE usar estritamente os dados de vento e temperatura desse ponto específico nos dados meteorológicos. Não misture dados de regiões diferentes.
        - EXPLICAÇÃO LEIGA: Traduza o vento de forma simples (ex: "12km/h é aquela brisinha gostosa").
        - SEM SAUDAÇÕES: Comece direto no conteúdo.

        CONTEÚDO DO BOLETIM:
        1. Resumo do Tempo: Céu, temperatura máxima do dia e se tem risco real de chuva (fale da chance de chuva se for > 40%).
        2. A Melhor Região: Indique a região campeã e cite o vento exato dela agora (ex: "No Norte o vento leste sopra a **10km/h**, deixando o mar uma seda").
        3. Destaque das Praias: Liste as top 3 e foque na #1, explicando rapidamente por que ela é o paraíso de hoje (ex: mar calmo, sol batendo cedo).

        REQUISITOS TÉCNICOS:
        - Formatação: Markdown (use negrito para **nomes de praias**, **valores** e **regiões**).

        DADOS:
        - Cidade: ${cityName}
        - Clima por Regiões/Períodos: ${JSON.stringify(weatherData)}
        - Melhores Praias (Ranking): ${JSON.stringify(rankingData.slice(0, 5))}

        Escreva apenas o boletim da Garota do Tempo.
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
