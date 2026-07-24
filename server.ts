import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API endpoint para disparo de e-mail automático via Resend
  app.post('/api/send-email', async (req, res) => {
    try {
      const { to, subject, text, html, from } = req.body;

      if (!to || !subject) {
        return res.status(400).json({ success: false, error: 'Destinatário (to) e Assunto (subject) são obrigatórios.' });
      }

      const apiKey = process.env.RESEND_API_KEY || 're_3ySXx4wV_Ny9QMA63BgAYhaCvCrBVftH9';
      if (!apiKey) {
        return res.status(500).json({ success: false, error: 'Chave API do Resend não configurada.' });
      }

      const resend = new Resend(apiKey);
      // Remetente padrão Resend (onboarding@resend.dev) ou customizado se o domínio estiver verificado no Resend
      const sender = from || process.env.RESEND_FROM_EMAIL || 'Check-List JF <onboarding@resend.dev>';

      const data = await resend.emails.send({
        from: sender,
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        text: text || '',
        html: html || (text ? text.replace(/\n/g, '<br>') : ''),
      });

      if (data.error) {
        console.error('Resend Error:', data.error);
        return res.status(400).json({ success: false, error: data.error.message || 'Erro ao enviar pelo Resend' });
      }

      return res.json({ success: true, id: data.data?.id });
    } catch (err: any) {
      console.error('Erro ao enviar e-mail no servidor:', err);
      return res.status(500).json({ success: false, error: err.message || 'Erro interno no servidor de e-mail.' });
    }
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'JF-Check Email API Server' });
  });

  // Integração com Vite em desenvolvimento e produção
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[JF-Check] Servidor ativo em http://0.0.0.0:${PORT}`);
  });
}

startServer();
