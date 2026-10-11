# ==========================================
# Maestro Cifras - Backend Dockerfile
# Otimizado para Hostinger VPS (Ubuntu / Docker)
# Suporte a Node.js 20, Puppeteer & Chromium
# ==========================================

FROM node:20-bookworm-slim

# Instala Chromium do sistema e dependências para Puppeteer rodar com estabilidade
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    dumb-init \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Configura o Puppeteer para usar o Chromium nativo do sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Copia manifestos de dependências
COPY package*.json ./

# Instala todas as dependências sem disparar postinstall antes da cópia do código
RUN npm install --ignore-scripts

# Copia todo o código fonte
COPY . .

# Compila o TypeScript para a pasta dist/
RUN npm run build

# Remove dependências de desenvolvimento para manter a imagem enxuta
RUN npm prune --production --ignore-scripts

# Cria a pasta de uploads persistente
RUN mkdir -p /app/uploads

# Expõe a porta padrão do Maestro
EXPOSE 3333

# Gerenciador de processos para tratar sinais POSIX (SIGTERM/SIGINT) no Docker
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Inicialização da API compilada
CMD ["node", "dist/server.js"]
