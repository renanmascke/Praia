import nodemailer from 'nodemailer';

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

export async function sendEmail(to: string, subject: string, html: string) {
    if (!SMTP_USER || !SMTP_PASS) {
        console.warn("Aviso: Credenciais de SMTP não configuradas no .env");
        return { success: false, error: "SMTP not configured" };
    }

    try {
        const info = await transporter.sendMail({
            from: `"Que Praia Eu Vou?" <${SMTP_USER}>`,
            to,
            subject,
            html,
        });

        console.log("E-mail enviado: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Erro ao enviar e-mail:", error);
        return { success: false, error };
    }
}
