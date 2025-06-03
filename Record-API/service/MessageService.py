import json
import redis
import os
from model.MessageModel import MessageModel
from config.database import db
from service.AuthProxyService import AuthProxyService  # <-- usa a proxy

class MessageService:
    def __init__(self):
        self.auth_proxy = AuthProxyService()
        redis_host = os.getenv('REDIS_HOST', 'localhost')
        redis_port = int(os.getenv('REDIS_PORT', 6379))
        redis_db = int(os.getenv('REDIS_DB', 0))
        self.redis_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            db=redis_db,
            decode_responses=True
        )

    def salvar_mensagem(self, message, userIdSend, userIdReceive):
        nova_mensagem = MessageModel(
            message=message,
            user_id_send=userIdSend,
            user_id_receive=userIdReceive
        )
        nova_mensagem.salvar()

        self.redis_client.delete(f"mensagens:user:{userIdSend}")
        self.redis_client.delete(f"mensagens:user:{userIdReceive}")
        print(f"[Cache] Cache invalidado para userIdSend={userIdSend} e userIdReceive={userIdReceive}")

    
    def listar_mensagens(self, user_id, token):
        cache_key = f"mensagens:user:{user_id}"

        # 1. Verifica se já tem cache
        if self.redis_client.exists(cache_key):
            print(f"[Cache] Mensagens encontradas no cache para user_id={user_id}")
            return json.loads(self.redis_client.get(cache_key))

        # 2. Verifica autenticação
        if not self.auth_proxy.verificar_autenticacao(token, user_id):
            return {'msg': 'not auth'}

        # 3. Busca usuários
        usuarios = self.auth_proxy.pegar_todos_usuarios().get('users', [])

        mensagens_formatadas = []

        # 4. Consulta mensagens no banco
        for outro in usuarios:
            outro_id = outro['user_id']
            if int(outro_id) == int(user_id):
                continue

            mensagens = MessageModel.query.filter(
                ((MessageModel.user_id_send == user_id) & (MessageModel.user_id_receive == outro_id)) |
                ((MessageModel.user_id_send == outro_id) & (MessageModel.user_id_receive == user_id))
            ).all()

            for msg in mensagens:
                mensagens_formatadas.append({
                    'userId': outro_id,
                    'msg': msg.message
                })

        # 5. Salva no cache
        self.redis_client.setex(cache_key, 60, json.dumps(mensagens_formatadas))
        print(f"[Cache] Mensagens salvas no cache para user_id={user_id}")

        return mensagens_formatadas
