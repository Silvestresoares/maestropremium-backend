import rateLimit from 'express-rate-limit';

// Rate limiter genérico para rotas de autenticação (prevenir brute-force / credential stuffing)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // Limita cada IP a 20 requisições por windowMs em rotas de autenticação
  message: { error: 'Muitas tentativas de login/recuperação vindas deste IP, tente novamente mais tarde.' },
  standardHeaders: true, // Retorna os headers de limite de taxa nas respostas `RateLimit-*`
  legacyHeaders: false, // Desabilita os cabeçalhos `X-RateLimit-*`
});

// Rate limiter específico para a rota de geração de PDF via Puppeteer (prevenir DDoS ou esgotamento de CPU/RAM)
export const pdfLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // Limita cada IP a 10 gerações de PDF por minuto
  message: { error: 'Limite de geração de PDFs atingido, tente novamente em um minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});
