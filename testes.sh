#!/bin/bash
set -e

echo "🧪 Teste 1: Registro de novo usuário..."
curl -s -X POST http://localhost:3001/user \
  -H "Content-Type: application/json" \
  -d '{"name":"Isa","lastName":"Class","email":"isa@example.com","password":"1234"}'

echo "🧪 Teste 1.1: Registro de outro usuário..."
curl -s -X POST http://localhost:3001/user \
  -H "Content-Type: application/json" \
  -d '{"name":"Joao","lastName":"Victor","email":"joao@example.com","password":"1234"}'


echo ""
echo "🧪 Teste 2: Geração de token JWT..."
TOKEN=$(curl -s -X POST http://localhost:3001/token \
  -H "Content-Type: application/json" \
  -d '{"email":"isa@example.com","password":"1234"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

echo "🔑 Token gerado: $TOKEN"

echo ""
echo "🧪 Teste 3: Enviando mensagem do usuário 1 para o usuário 2..."
curl -s -X POST http://localhost:3002/message \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d '{"userIdSend":1,"userIdReceive":2,"message":"Ola, tudo bem?"}'

echo ""
echo "🧪 Teste 4: Worker processando a fila e salvando a mensagem..."
curl -s -X POST http://localhost:3002/message/worker \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d '{"userIdSend":1,"userIdReceive":2}'

echo ""
echo "🧪 Teste 5: Consulta de mensagens do usuário 1..."
curl -s -X GET "http://localhost:3002/message?user=1" \
  -H "Authorization: $TOKEN"
