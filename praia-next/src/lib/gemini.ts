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
               - Vento ideal para o microclima (direção abrigada) = +20 pontos. Indica mar calmo e sem vento "batendo" no guarda-sol.
               - Ventos fortes (> 20km/h) ou direções desabrigadas diminuem a nota para lazer.
            3. "Mar de Piscina" (Ondulação):
               - Mar "flat" ou calmo (waveHeight < 0.6m) = +15 pontos. É o ideal para banho.
               - Mar agitado (> 1.2m) = -20 pontos. Perigoso para banho e desconfortável para crianças. Não dê pontos por ser bom para surf.
            4. Condição do Céu:
               - Sol/Céu Limpo = +10 pontos. 
               - Nublado ou Chuva = Diminui a atratividade consideravelmente.

            Dados das Praias em ${cityName}:
            ${JSON.stringify(beachesData, null, 2)}
            
            Responda obrigatoriamente um JSON no formato:
            [
                {
                    "beachId": "id-string",
                    "score": número de 0 a 100,
                    "commentary": "Justificativa curta (máx 140 caracteres) focada em banho e conforto (ex: 'Mar calmo e vento ideal para o guarda-sol')."
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
        Sua tarefa é escrever um resumo curto e amigável sobre como será o dia nas praias hoje.
        
        REQUISITOS DO TEXTO:
        - Estilo: Amigo especialista local, amigável e informativo.
        - Tom: Sem gírias excessivas, sem saudações (não diga "Olá" ou "Bom dia").
        - Conteúdo:
            1. Descreva como está o tempo de forma geral (sol, nuvens, temperatura).
            2. Indique qual é a MELHOR região da cidade para ir (Norte, Sul, Leste, etc) com base no conforto do vento.
            3. Mencione as top 3 praias do ranking.
            4. Para a praia número #1, explique detalhadamente por que ela é a escolha ideal hoje (ex: mar calmo, protegida do vento, sol batendo cedo).
        - Restrição: Não use dados muito técnicos (como "20km/h" ou "1.2m"). Use termos como "brisa leve", "mar de piscina", "bem abrigada".
        - Tamanho: Máximo de 2 parágrafos curtos.
        - Formatação: Markdown simples (pode usar negrito para nomes de praias).

        DADOS:
        - Cidade: ${cityName}
        - Clima: ${JSON.stringify(weatherData)}
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
