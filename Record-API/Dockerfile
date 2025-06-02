# Usa imagem oficial do Python
FROM python:3.11-slim

# Define o diretório de trabalho no container
WORKDIR /app

# Copia os arquivos da API para dentro do container
COPY . .

# Instala dependências do sistema
RUN apt-get update && apt-get install -y gcc default-libmysqlclient-dev

# Instala as dependências do projeto
RUN pip install --no-cache-dir -r requirements.txt

# Expõe a porta 5002 (a mesma usada no app.py)
EXPOSE 5002

# Comando para iniciar o servidor Flask
CMD ["python", "app.py"]
