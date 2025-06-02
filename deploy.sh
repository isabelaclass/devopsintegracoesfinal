#!/bin/bash

echo "Iniciando deploy do sistema de chat por microserviços..."

# Etapa 1: build e up dos containers
echo "Construindo e subindo containers com Docker Compose..."
docker-compose down
docker-compose build
docker-compose up -d

# Etapa 2: aguarda subida dos containers
echo "Aguardando serviços iniciarem..."
sleep 10

# Etapa 3: checa saúde dos containers
echo "Verificando containers ativos:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Etapa 4: testando serviços básicos
curl -s http://localhost:3000/health && echo "Auth-API OK" || echo "Auth-API fora do ar"
curl -s http://localhost:5002/health && echo "Record-API OK" || echo "Record-API fora do ar"
curl -s http://localhost:4000/health && echo "Receive-Send-API OK" || echo "Receive-Send-API fora do ar"

# Etapa 5: logs
echo ""
echo "Logs iniciais dos serviços:"
docker-compose logs --tail=20

echo ""
echo "Deploy finalizado!"
