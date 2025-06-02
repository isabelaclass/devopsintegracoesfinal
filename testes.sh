#!/bin/bash

echo "Testando registro de usuário"
curl -s -X POST http://auth-api:3000/user -H "Content-Type: application/json" \
  -d '{"name":"Ana", "lastName":"Silva", "email":"ana@email.com", "password":"123"}'

echo -e "\nTestando login"
TOKEN=$(curl -s -X POST http://lauth-api:3000/token -H "Content-Type: application/json" \
  -d '{"email":"ana@email.com", "password":"123"}' | jq -r '.token')

echo "Enviando mensagem usando token: $TOKEN"
curl -s -X POST http://receive-send-api:3002/message -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d '{"userIdSend":1,"userIdReceive":2,"message":"Oi!"}'
