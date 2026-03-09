import prisma from './prisma';
import { beachWhitelist } from './data';

interface RankingScore {
    beachId: string;
    score: number;
    status: string;
}

/**
 * Calcula o score de uma praia com base nos microclimas e condições atuais
 */
export async function calculateBeachScore(beach: any, forecast: any, report: any): Promise<number> {
    let score = 0;

    // 1. Microclima / Conforto de Vento (40 pts)
    // Compara o vento previsto com o vento ideal da praia
    if (forecast && beach.idealWind) {
        const currentWindDir = forecast.windDir; // Ex: "S", "NE"
        const idealWinds = beach.idealWind.split(',').map((w: string) => w.trim());

        if (idealWinds.includes(currentWindDir)) {
            score += 40; // Vento Ideal - Proteção máxima
        } else {
            // Verifica se é um vento "aceitável" (ex: se ideal é S, talvez SW seja aceitável)
            // Para simplificar agora, daremos 10 pts se não for o ideal mas também não for o oposto total
            // TODO: Implementar lógica de oposição de vento mais refinada
            score += 10;
        }
    }

    // 2. Balneabilidade (30 pts)
    if (report) {
        if (report.status === 'Própria') {
            score += 30;
        } else if (report.status === 'Mista') {
            score += 10;
        }
        // Imprópria = 0
    } else {
        // Sem relatório recente, assume-se neutro ou penaliza levemente
        score += 15;
    }

    // 3. Tranquilidade do Mar (20 pts)
    if (forecast && forecast.hourlyData) {
        // Pega a média de waveHeight do hourlyData se disponível, ou assume 0
        const hours = (forecast.hourlyData as any[]) || [];
        const avgWave = hours.length > 0
            ? hours.reduce((acc, h) => acc + (h.waveHeight || 0), 0) / hours.length
            : 0;

        if (avgWave < 0.6) {
            score += 20;
        } else if (avgWave < 1.2) {
            score += 10;
        }
        // Mar muito agitado = 0
    }

    // 4. Condições do Céu (10 pts)
    if (forecast) {
        const condition = forecast.condition.toLowerCase();
        if (condition.includes('sol') || condition.includes('limpo') || condition.includes('céu aberto')) {
            score += 10;
        } else if (condition.includes('nublado') || condition.includes('parcialmente')) {
            score += 5;
        }
        // Chuva = 0
    }

    return score;
}

/**
 * Gera e salva o ranking de todas as praias para uma cidade e data específica
 */
export async function generateDailyRankings(cityId: string, date: Date) {
    console.log(`>>> GERANDO RANKING: Cidade ${cityId}, Data ${date.toISOString().split('T')[0]}`);

    const beaches = await prisma.beach.findMany({
        where: { cityId },
        include: { anchor: true }
    });

    const results: RankingScore[] = [];

    for (const beach of beaches) {
        // Buscar previsão para o anchor desta praia
        const forecast = beach.anchorId ? await prisma.weatherForecast.findUnique({
            where: { anchorId_date: { anchorId: beach.anchorId, date } }
        }) : null;

        // Buscar relatório IMA mais recente (ou da data se disponível)
        // Por simplificação, pegamos o último relatório inserido para esta praia
        const report = await prisma.report.findFirst({
            where: { beachId: beach.id },
            orderBy: { date: 'desc' }
        });

        const score = await calculateBeachScore(beach, forecast, report);

        results.push({
            beachId: beach.id,
            score,
            status: report?.status || 'Indeterminado'
        });
    }

    // Ordenação: 
    // 1. Praias com Balneabilidade 'Indeterminado' ou 'Própria'/'Mista' vêm primeiro (pelo score)
    // 2. Praias 100% Impróprias vêm por último
    const sorted = results.sort((a, b) => {
        const aIsBad = a.status === 'Imprópria';
        const bIsBad = b.status === 'Imprópria';

        if (aIsBad && !bIsBad) return 1;
        if (!aIsBad && bIsBad) return -1;

        return b.score - a.score; // Maior score primeiro
    });

    // Salvar no banco
    for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i];
        await (prisma as any).beachRanking.upsert({
            where: { beachId_date: { beachId: item.beachId, date } },
            update: {
                score: item.score,
                position: i + 1,
                status: item.status
            },
            create: {
                beachId: item.beachId,
                date,
                score: item.score,
                position: i + 1,
                status: item.status
            }
        });
    }

    console.log(`✅ Ranking concluído para ${date.toISOString().split('T')[0]}`);
}
