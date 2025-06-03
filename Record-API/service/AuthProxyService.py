import requests
import os

class AuthProxyService:
    def __init__(self):
        self.base_url = os.getenv('AUTH_API_HOST', 'http://localhost:3000')  # URL da sua Auth-API em PHP

    def verificar_autenticacao(self, token, user_id):
        try:
            url = f"{self.base_url}/token?user={user_id}"
            headers = {'Authorization': token}
            response = requests.get(url, headers=headers)

            if response.status_code == 200:
                return response.json().get('auth', False)
        except Exception as e:
            print(f"[AuthServiceProxy] Erro ao verificar autenticação: {e}")

        return False

    def pegar_todos_usuarios(self):
        try:
            url = f"{self.base_url}/user"
            response = requests.get(url)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"[AuthServiceProxy] Erro ao buscar usuários: {e}")

        return []
