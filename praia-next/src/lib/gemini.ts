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
