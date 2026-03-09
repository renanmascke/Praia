import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = 'force-dynamic';

export async function GET() {
    const diagnostics = {
        geminiKeyPresent: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        geminiKeyStart: process.env.GOOGLE_GENERATIVE_AI_API_KEY ? `${process.env.GOOGLE_GENERATIVE_AI_API_KEY.substring(0, 10)}...` : 'N/A',
        time: new Date().toISOString(),
        testResult: null as any
    };

    if (!diagnostics.geminiKeyPresent) {
        return NextResponse.json({ success: false, message: "Variável GOOGLE_GENERATIVE_AI_API_KEY não encontrada.", diagnostics });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
        const modelNames = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-2.0-flash"];
        const results: any[] = [];

        for (const modelName of modelNames) {
            try {
                console.log(`>>> Testando Gemini Connectivity (${modelName})...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Diga 'OK' em JSON: { 'status': 'ok' }");
                const text = result.response.text();
                results.push({ model: modelName, status: "SUCCESS", response: text });
            } catch (err: any) {
                results.push({ model: modelName, status: "FAILED", error: err.message });
            }
        }

        diagnostics.testResult = results;

        const anySuccess = results.some(r => r.status === "SUCCESS");

        return NextResponse.json({
            success: anySuccess,
            message: anySuccess ? "Conectividade parcial ou total com Gemini!" : "Todos os modelos falharam.",
            diagnostics
        });
    } catch (error: any) {
        console.error(">>> ERRO NO TESTE GLOBAL GEMINI:", error.message);
        return NextResponse.json({
            success: false,
            message: "Erro catastrófico no teste de Gemini",
            error: error.message,
            diagnostics
        }, { status: 500 });
    }
}
