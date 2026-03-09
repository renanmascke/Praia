import prisma from './prisma';
import { beachWhitelist } from './data';

interface RankingScore {
    beachId: string;
    score: number;
    status: string;
    totalPoints: number;
    proprioCount: number;
    improprioCount: number;
}

/**
 * Calcula o score de uma praia com base nos microclimas e condições atuais
 */
export async function calculateBeachScore(beach: any, forecast: any, report: any): Promise<number> {
    let score = 0;

    // 1. Microclima / Vento Ideal (40 pts)
    if (forecast && beach.idealWind) {
        const currentWindDir = forecast.windDir;
        const idealWinds = beach.idealWind.split(',').map((w: string) => w.trim());

        if (idealWinds.includes(currentWindDir)) {
            score += 40; // Proteção máxima
        } else {
            score += 10;
        }
    }

    // 2. Balneabilidade (30 pts)
    if (report) {
        // Indeterminado não deve ser prejudicado, recebe a mesma pontuação de Própria
        if (report.status === 'Própria' || report.status === 'Indeterminado') {
            score += 30;
        } else if (report.status === 'Mista') {
            score += 10;
        }
        // Imprópria = 0
    } else {
        score += 15;
    }

    // 3. Ondulação (20 pts)
    if (forecast && forecast.hourlyData) {
        const hours = (forecast.hourlyData as any[]) || [];
        const avgWave = hours.length > 0
            ? hours.reduce((acc, h) => acc + (h.waveHeight || 0), 0) / hours.length
            : 0;

        if (avgWave < 0.6) {
            score += 20;
        } else if (avgWave < 1.2) {
            score += 10;
        }
    }

    // 4. Céu (10 pts)
    if (forecast) {
        const condition = forecast.condition.toLowerCase();
        if (condition.includes('sol') || condition.includes('limpo') || condition.includes('céu aberto')) {
            score += 10;
        } else if (condition.includes('nublado')) {
            score += 5;
        }
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

        // Ajuste do status para exibição quando indeterminado
        let status = report?.status || 'Indeterminado';

        results.push({
            beachId: beach.id,
            score,
            status,
            totalPoints: report?.pts || 0,
            proprioCount: report?.pPts || 0,
            improprioCount: report?.improprios || 0
        });
    }

    // Ordenação: 
    // 1. Praias com Balneabilidade 'Indeterminado' ou 'Própria'/'Mista' vêm primeiro (pelo score)
    // 2. Praias 100% Impróprias vêm por último
    const sorted = results.sort((a, b) => {
        // Penalização máxima se 100% imprópria (pts > 0 e pPts == 0)
        const aIsBad = a.totalPoints > 0 && a.proprioCount === 0;
        const bIsBad = b.totalPoints > 0 && b.proprioCount === 0;

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
                status: item.status,
                totalPoints: item.totalPoints,
                proprioCount: item.proprioCount,
                improprioCount: item.improprioCount
            },
            create: {
                beachId: item.beachId,
                date,
                score: item.score,
                position: i + 1,
                status: item.status,
                totalPoints: item.totalPoints,
                proprioCount: item.proprioCount,
                improprioCount: item.improprioCount
            }
        });
    }

    console.log(`✅ Ranking concluído para ${date.toISOString().split('T')[0]}`);
}

/**
 * Dispara a atualização global do ranking para todas as cidades
 * Abrange o dia de hoje e os próximos 2 dias
 */
export async function triggerGlobalRankingUpdate() {
    console.log(">>> DISPARANDO ATUALIZAÇÃO GLOBAL DE RANKINGS...");
    const { getBrazilToday } = await import('./date-utils');
    const cities = await prisma.city.findMany();

    // Dia atual
    const datesToRank = [getBrazilToday()];

    // Próximos 2 dias
    const d1 = new Date(datesToRank[0]); d1.setDate(d1.getDate() + 1);
    const d2 = new Date(datesToRank[0]); d2.setDate(d2.getDate() + 2);
    datesToRank.push(d1, d2);

    for (const city of cities) {
        for (const date of datesToRank) {
            await generateDailyRankings(city.id, date);
        }
    }
    console.log(">>> ATUALIZAÇÃO GLOBAL DE RANKINGS CONCLUÍDA.");
}
