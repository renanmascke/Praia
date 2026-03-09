import nodemailer from 'nodemailer';

export async function sendTempPasswordEmail(to: string, tempPassword: string) {
    try {
        // Falls back to safe console logging if SMTP vars are missing
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log(`[ATENÇÃO] SMTP não configurado no .env.`);
            console.log(`[SIMULAÇÃO E-MAIL] Para: ${to} | Senha Temporária: ${tempPassword}`);
            return;
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `"Praia Admin" <${process.env.SMTP_USER}>`,
            to: to,
            subject: "Acesso - Painel Admin Floripa",
            html: `
        <div style="font-family: sans-serif; color: #333; p{line-height: 1.5;}">
          <h2 style="color: #0ea5e9;">Bem-vindo(a) ao Painel de Controle!</h2>
          <p>Sua conta de Gestor de Praias foi criada ou a sua senha foi redefinida pelo administrador do sistema.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Seu E-mail:</strong> ${to}</p>
          <p><strong>Senha Temporária:</strong> <span style="background: #f1f5f9; padding: 4px 8px; font-weight: bold; border-radius: 4px; letter-spacing: 2px;">${tempPassword}</span></p>
          <p>Acesse o painel em: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login">Fazer Login</a></p>
          <p><em>⚠️ Por segurança de nível empresarial, será obrigatório criar uma nova senha pessoal definitiva imediatamente no seu primeiro acesso.</em></p>
        </div>
      `,
        });

        console.log("Email despachado com as credenciais via Nodemailer: %s", info.messageId);
    } catch (err: any) {
        console.error("Erro ao enviar email pelo Nodemailer:", err.message);
    }
}
