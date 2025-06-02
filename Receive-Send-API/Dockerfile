# Usa imagem oficial do Node.js
FROM node:20

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependência primeiro (para aproveitar cache de build)
COPY package*.json ./

# Instala as dependências do projeto
RUN npm install

# Copia o restante da aplicação
COPY . .

# Expõe a porta que sua API usa (ajuste se necessário)
EXPOSE 3002

# Comando para iniciar a aplicação
CMD ["node", "app.js"]
