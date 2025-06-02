from flask import Blueprint, request, jsonify
from service.MessageService import MessageService

message_bp = Blueprint('message', __name__, url_prefix='/message')
service = MessageService()

# POST /message - Salva nova mensagem
@message_bp.route('', methods=['POST'])
def create_message():
    data = request.get_json()
    message = data.get('message')
    userIdSend = data.get('userIdSend')
    userIdReceive = data.get('userIdReceive')

    if not message or not userIdSend or not userIdReceive:
        return jsonify({'error': 'Campos obrigatórios faltando'}), 400

    service.salvar_mensagem(message, userIdSend, userIdReceive)
    return jsonify({'ok': True}), 201

# GET /message?user=ID - Lista mensagens do usuário autenticado
@message_bp.route('', methods=['GET'])
def get_messages():
    user_id = request.args.get('user')
    token = request.headers.get('Authorization')

    if not user_id or not token:
        return jsonify({'error': 'Parâmetros obrigatórios faltando'}), 400

    mensagens = service.listar_mensagens(user_id, token)
    return jsonify(mensagens), 200
