import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { protocol, host } = new URL(request.url);
    const baseUrl = `${protocol}//${host}`;

    const results = {
        ima: null,
        weather: null,
        marine: null,
        ranking: null
    } as any;

    try {
        console.log(">>> INICIANDO SINCRONIZAÇÃO COMPLETA <<<");

        // 1. IMA
        console.log("1/4: Sincronizando IMA...");
        const resIma = await fetch(`${baseUrl}/api/sync-ima`);
        results.ima = await resIma.json();

        // 2. Weather
        console.log("2/4: Sincronizando Weather...");
        const resWeather = await fetch(`${baseUrl}/api/sync-weather`);
        results.weather = await resWeather.json();

        // 3. Marine
        console.log("3/4: Sincronizando Marine...");
        const resMarine = await fetch(`${baseUrl}/api/sync-marine`);
        results.marine = await resMarine.json();

        // 4. Ranking
        console.log("4/4: Recalculando Ranking...");
        const resRanking = await fetch(`${baseUrl}/api/sync-ranking`);
        results.ranking = await resRanking.json();

        console.log(">>> SINCRONIZAÇÃO COMPLETA FINALIZADA <<<");
        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error(">>> ERRO NA SINCRONIZAÇÃO COMPLETA <<<", error);
        return NextResponse.json({ success: false, error: error.message, results }, { status: 500 });
    }
}
