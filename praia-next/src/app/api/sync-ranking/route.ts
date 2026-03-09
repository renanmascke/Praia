import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBrazilToday } from '@/lib/date-utils';
import { generateDailyRankings } from '@/lib/ranking';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log(">>> RECALCULO DE RANKING MANUAL INICIADO <<<");

    try {
        const cities = await prisma.city.findMany();
        const today = getBrazilToday();

        // Datas para recalcular: Hoje + próximos 2 dias
        const datesToRank = [today];
        const d1 = new Date(today); d1.setUTCDate(today.getUTCDate() + 1);
        const d2 = new Date(today); d2.setUTCDate(today.getUTCDate() + 2);
        datesToRank.push(d1, d2);

        let totalProcessed = 0;

        for (const city of cities) {
            for (const date of datesToRank) {
                await generateDailyRankings(city.id, date);
                totalProcessed++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Ranking recalculado com sucesso para ${cities.length} cidades e ${datesToRank.length} datas.`,
            totalProcessed
        });

    } catch (error: any) {
        console.error(">>> ERRO NO RECALCULO DE RANKING <<<", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
