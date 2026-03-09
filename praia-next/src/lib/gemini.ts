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
            Você é um especialista em balneabilidade, surf e lazer na praia em Santa Catarina. 
            Sua tarefa é analisar dados de várias praias na cidade de ${cityName} e atribuir um score de 0 a 100 para cada uma, indicando quão "perfeita" a praia está para lazer e banho hoje.
            
            Critérios de Avaliação (Importância Decrescente):
            1. Balneabilidade (IMA): 
               - Status "Impróprio" ou alta concentração de E.Coli = Nota Baixa (máx 40).
               - Status "Próprio" ou "Indeterminado" = Nota Alta (base 70).
            2. Vento (Microclima):
               - Se a 'direcaoVento' atual estiver na lista de 'ventosIdeais' da praia, adicione +20 pontos. Isso indica mar abrigado e sem "repuxo".
            3. Ondulação:
               - Mar calmo (waveHeight < 0.7m) = +10 pontos para banho.
               - Mar agitado (> 1.5m) = -10 pontos para banho (perigoso), mas destaque se for bom para surf no comentário.
            4. Condição do Céu:
               - Sol/Céu Limpo = +10 pontos. Chuva ou nublado diminui a atratividade.

            Dados das Praias em ${cityName}:
            ${JSON.stringify(beachesData, null, 2)}
            
            Responda obrigatoriamente um JSON no formato:
            [
                {
                    "beachId": "id-string",
                    "score": número de 0 a 100,
                    "commentary": "Justificativa curta e amigável em português (máx 150 caracteres)."
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
