FROM node:18-alpine

# Cria e define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências (incluindo devDependencies para o build)
RUN npm install

# Copia o restante do código
COPY . .

# Faz o build do TypeScript para JavaScript
RUN npm run build

# Expõe a porta que a aplicação vai rodar (assumindo 3333 ou 8080)
# Ajuste conforme a porta que o seu server.ts utiliza (normalmente puxa de process.env.PORT)
EXPOSE 3333
EXPOSE 8080

# Comando para iniciar a aplicação
CMD ["npm", "start"]
