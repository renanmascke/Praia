import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export interface AiRankingResult {
    beachId: string;
    score: number;
    commentary: string;
}

export async function generateCityRanking(cityName: string, beachesData: any[]): Promise<AiRankingResult[]> {
    if (!apiKey) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY não configurada no .env");
    }

    // O usuário confirmou que usa e tem quota para 'gemini-2.5-flash'
    const modelName = "gemini-2.5-flash";

    try {
        console.log(`>>> Tentando modelo Gemini: ${modelName} para ${cityName}...`);
        const model = genAI.getGenerativeModel({
            model: modelName,
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
        console.log(`>>> Sucesso com o modelo: ${modelName}`);
        return parsed;
    } catch (error: any) {
        console.error(`>>> Falha crítica com modelo ${modelName}:`, error.message);
        throw error;
    }
}

export async function generateCityDailySummary(
    cityName: string,
    weatherData: any,
    rankingData: any[]
): Promise<string> {
    if (!apiKey) return "";

    const modelName = "gemini-2.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
        Você é a "Garota do Tempo" especialista em lazer de ${cityName}. Seu tom é vibrante, amigável e muito informativo, como se estivesse apresentando um boletim matinal para leigos que só querem aproveitar a praia.
        
        DIRETRIZES DE PERSONA:
        - Traduza dados técnicos: Explique a velocidade do vento (ex: "vento de 5km/h é aquela brisinha que nem balança o guarda-sol") e a temperatura.
        - Detalhe a Chuva: Se houver previsão, explique como ela se comporta (ex: "pode vir aquela pancadinha passageira à tarde, então fique atento").
        - Evolução do Dia: Descreva a transição entre manhã, tarde e noite de forma fluida.
        - Sem Saudações: Comece direto no conteúdo.

        CONTEÚDO DO RESUMO:
        1. O Panorama Geral: Temperatura do dia, condição do céu e detalhes da chuva.
        2. A Dica de Ouro: Indique a melhor região e explique o vento para essa área de forma técnica mas simples (ex: "No Norte, o vento leste sopra a 12km/h, deixando o mar uma seda nessa região").
        3. As Estrelas do Dia: Liste as top 3 praias do ranking atual.
        4. O Destaque #1: Explique com paixão por que a primeira colocada é a campeã absoluta hoje, considerando o clima e as características dela.

        REQUISITOS TÉCNICOS:
        - Máximo de 2 parágrafos.
        - Formatação: Markdown (use negrito para destacar valores e nomes de praias).

        DADOS:
        - Cidade: ${cityName}
        - Clima por Períodos: ${JSON.stringify(weatherData)}
        - Melhores Praias (Ranking): ${JSON.stringify(rankingData.slice(0, 5))}

        Escreva apenas o boletim da Garota do Tempo.
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error: any) {
        console.error(">>> Erro ao gerar resumo da cidade:", error.message);
        return "Hoje o dia está convidativo para um passeio no litoral. Confira as praias melhor ranqueadas para aproveitar o sol e o mar calmo.";
    }
}
