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
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        console.log(">>> Testando Gemini Connectivity (gemini-2.0-flash)...");
        const result = await model.generateContent("Diga 'Olá, sistema de ranking pronto!' em JSON format: { 'status': 'ok' }");
        const text = result.response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        diagnostics.testResult = JSON.parse(cleanedText);

        return NextResponse.json({
            success: true,
            message: "Conectividade com Gemini OK!",
            diagnostics
        });
    } catch (error: any) {
        console.error(">>> ERRO NO TESTE GEMINI:", error.message);
        return NextResponse.json({
            success: false,
            message: "Erro ao conectar com Gemini",
            error: error.message,
            diagnostics
        }, { status: 500 });
    }
}
