#!/bin/bash

echo "Iniciando deploy do sistema de chat por microserviços..."

# Build e up dos containers com Docker Compose
echo "Construindo e subindo containers com Docker Compose..."
docker-compose down
docker-compose build
docker-compose up -d

echo "Aguardando serviços iniciarem..."
sleep 10

# Health checks
echo "Verificando containers ativos:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Etapa 4: testando serviços básicos
curl -s http://localhost:3001/health && echo "Auth-API OK" || echo "Auth-API fora do ar"
curl -s http://localhost:5002/health && echo "Record-API OK" || echo "Record-API fora do ar"
curl -s http://localhost:3002/health && echo "Receive-Send-API OK" || echo "Receive-Send-API fora do ar"

# Logs
echo ""
echo "Logs iniciais dos serviços:"
docker-compose logs --tail=20

echo ""
echo "Deploy finalizado!"
