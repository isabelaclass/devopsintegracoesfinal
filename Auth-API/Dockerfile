# Usa imagem oficial do PHP com servidor embutido
FROM php:8.2-cli

# Instala extensões do PHP (mysqli e redis)
RUN apt-get update && apt-get install -y libzip-dev unzip \
    && docker-php-ext-install mysqli \
    && pecl install redis \
    && docker-php-ext-enable redis

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos da API
COPY . .

# Expõe a porta do servidor embutido
EXPOSE 3000

# Comando para rodar a API com servidor embutido
CMD ["php", "-S", "0.0.0.0:3000", "index.php"]
