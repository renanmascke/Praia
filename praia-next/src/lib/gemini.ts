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
            Você é um especialista em lazer, banho de mar e conforto na praia em Santa Catarina. 
            Sua tarefa é analisar dados de várias praias na cidade de ${cityName} e atribuir um score de 0 a 100 para cada uma, indicando quão "perfeita" a praia está para um dia de lazer relaxante, banho de mar e ficar no guarda-sol hoje.
            
            Critérios de Avaliação (Importância Decrescente - FOCO EM LAZER/BANHO):
            1. Balneabilidade (IMA): 
               - Status "Impróprio" ou alta concentração de E.Coli = Nota Baixa (máx 30). É o fator eliminatório.
               - Status "Mista" = Nota Média (máx 50). Significa que alguns pontos da praia estão próprios e outros impróprios. Destaque essa incerteza no comentário e recomende cautela.
               - Status "Próprio" ou "Indeterminado" = Nota Alta (base 70).
            2. Vento e Guarda-Sol (Conforto Térmico):
               - IF Vento > 8km/h: Vento ideal para o microclima (direção abrigada) = +20 pontos.
               - IF Vento <= 8km/h: É uma "Brisa Leve". Ignore a direção do vento e não diga que é desfavorável. Atribua +20 pontos de bônus automaticamente pelo conforto.
               - Ventos fortes (> 20km/h) diminuem a nota para lazer consideravelmente.
            3. "Mar de Piscina" (Ondulação):
               - Mar "flat" ou calmo (waveHeight < 0.6m) = +15 pontos. É o ideal para banho.
               - Mar agitado (> 1.2m) = -20 pontos. Perigoso para banho e desconfortável para crianças. Não dê pontos por ser bom para surf.
            4. Condição do Céu e Chuva:
               - Sol/Céu Limpo = +10 pontos. 
               - Se houver qualquer indicação de "Chuva" ou "RainChance > 40%" em algum período, mencione isso obrigatoriamente e diminua a nota.

            Dados das Praias em ${cityName}:
            ${JSON.stringify(beachesData, null, 2)}
            
            Responda obrigatoriamente um JSON no formato:
            [
                {
                    "beachId": "id-string",
                    "score": número de 0 a 100,
                    "commentary": "Justificativa curta (máx 140 caracteres) focada em banho e conforto."
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
        Você é um especialista local em lazer e praias em ${cityName}, Santa Catarina. 
        Sua tarefa é escrever um resumo curto e amigável sobre como será o dia nas praias hoje, analisando os períodos (Manhã, Tarde e Noite).
        
        DIRETRIZES DE INTELIGÊNCIA:
        - VENTO: Se a velocidade for baixa (< 8-10 km/h), descreva como "brisa leve" e ignore direções desfavoráveis. O conforto para o guarda-sol é excelente com ventos baixos.
        - CLIMA PROATIVO: Se houver mudança de tempo (ex: sol de manhã e chuva à tarde), você DEVE descrever essa transição claramente.
        - CONSISTÊNCIA: Se os dados horários indicarem "Possibilidade de chuva" ou "RainChance > 40%", mencione isso mesmo que o ícone geral seja de sol. Não ignore riscos de chuva.
        - MELHOR REGIÃO: Indique a região que estará mais confortável (abrigada do vento OU com mais sol) em cada período se houver mudança.

        REQUISITOS DO TEXTO:
        - Estilo: Amigo especialista local, amigável e informativo.
        - Tom: Sem gírias excessivas, sem saudações (não diga "Olá" ou "Bom dia").
        - Conteúdo:
            1. Descreva a evolução do tempo ao longo do dia (Manhã -> Tarde -> Noite).
            2. Indique a MELHOR região da cidade para lazer com base nos períodos.
            3. Mencione as top 3 praias do ranking atual.
            4. Para a praia número #1, explique por que ela é a escolha ideal hoje (especialmente focando em qual período ela estará melhor).
        - Restrição: Máximo de 2 parágrafos. Não use dados técnicos numéricos no texto.
        - Formatação: Markdown simples.

        DADOS:
        - Cidade: ${cityName}
        - Clima por Períodos: ${JSON.stringify(weatherData)}
        - Melhores Praias (Ranking): ${JSON.stringify(rankingData.slice(0, 5))}

        Escreva apenas o texto do resumo.
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error: any) {
        console.error(">>> Erro ao gerar resumo da cidade:", error.message);
        return "Hoje o dia está convidativo para um passeio no litoral. Confira as praias melhor ranqueadas para aproveitar o sol e o mar calmo.";
    }
}
