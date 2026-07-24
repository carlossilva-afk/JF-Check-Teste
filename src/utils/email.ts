/**
 * Função para enviar e-mails de forma transparente e instantânea
 * através da API do Resend executada no backend da aplicação.
 */
export async function enviarEmailResend(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}): Promise<{ success: boolean; id?: string }> {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Erro ao processar envio de e-mail pelo servidor Resend.');
  }

  return data;
}
