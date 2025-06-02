<?php
require_once './Model/UserModel.php';
require_once __DIR__ . '/../vendor/autoload.php';
use Predis\Client;


class AuthService {
    public function criarUsuario($name, $lastName, $email, $password) {
        $userModel = new UserModel();
        $user = $userModel->criar($name, $lastName, $email, $password);

        // Log de criação de usuário
        if ($user && isset($user['user_id'], $user['email'])) {
            error_log("[AuthService] Novo usuário criado no banco: {$user['user_id']} ({$user['email']})");
        } else {
            error_log("[AuthService] Falha ao criar usuário: $email");
        }

        return [
            'message' => 'ok',
            'user' => $user
        ];
    }

    public function gerarToken($email, $password) {
        $userModel = new UserModel();
        $user = $this->buscarUsuario($email); 

        if (!$user || !password_verify($password, $user['password'])) {
            return false;
        }

        $secret = 'strawberry-chat-secret'; 
        $header = $this->base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = $this->base64UrlEncode(json_encode([
            'userId' => $user['user_id'],
            'email' => $user['email'],
            'password' => $user['password']
        ]));
        $signature = $this->base64UrlEncode(
            hash_hmac('sha256', "$header.$payload", $secret, true)
        );

        $token = "$header.$payload.$signature";

        return $token;
    }

    public function validarToken($token, $userId) {
        $partes = explode('.', $token);
        if (count($partes) !== 3) return false;

        [$header, $payload, $signatureRecebida] = $partes;
        $secret = 'strawberry-chat-secret';

        $assinaturaCalculada = $this->base64UrlEncode(
            hash_hmac('sha256', "$header.$payload", $secret, true)
        );

        if (!hash_equals($assinaturaCalculada, $signatureRecebida)) {
            return false;
        }

        $dados = json_decode(base64_decode($payload), true);

        $userModel = new UserModel();
        $userBanco = $this->buscarUsuario($userId); 

        return (
            $dados['userId'] == $userBanco['user_id'] &&
            $dados['password'] == $userBanco['password']
        );
    }

   public function buscarUsuario($identificador) {
        $redis = $this->getRedis();
        $isEmail = filter_var($identificador, FILTER_VALIDATE_EMAIL);

        $cacheKey = $isEmail ? "user:$identificador" : "user:id:$identificador";
        // 1. Busca no Redis
        if ($redis->exists($cacheKey)) {
            error_log("[AuthService] Usuário encontrado no cache: $cacheKey");
            return json_decode($redis->get($cacheKey), true);
        }

        // 2. Se não houver cache, busca no banco
        error_log("[AuthService] Usuário NÃO encontrado no cache ($cacheKey). Buscando no banco...");
        $userModel = new UserModel();
        $user = $isEmail
            ? $userModel->buscarPorEmail($identificador)
            : $userModel->buscarPorId($identificador);

        // 3. Se encontrou, salva no cache
        if ($user) {
            error_log("[AuthService] Usuário encontrado no banco. Salvando no cache: $cacheKey");
            $redis->setex($cacheKey, 10, json_encode($user)); 
            error_log("[AuthService] Usuário NÃO encontrado no banco: $identificador");
        }

        return $user;
    }

    public function listarUsuarios() {
        $redis = $this->getRedis();
        $cacheKey = 'usuarios:todos';

        // 1. Verifica se já existe no cache
        if ($redis->exists($cacheKey)) {
            error_log("[AuthService] Lista de usuários recuperada do cache.");
            return json_decode($redis->get($cacheKey), true);
        }

        // 2. Busca no banco
        $userModel = new UserModel();
        $usuarios = $userModel->buscarTodos();

        // 3. Salva no cache
        if ($usuarios) {
            $redis->setex($cacheKey, 3600, json_encode($usuarios)); // TTL de 1 hora
            error_log("[AuthService] Lista de usuários recuperada do banco e salva no cache.");
        } else {
            error_log("[AuthService] Nenhum usuário encontrado no banco.");
        }

        return $usuarios;
    }
    
    private function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function getRedis() {
        return new Client([
            'scheme' => 'tcp',
            'host' => '127.0.0.1',
            'port' => 6379,
        ]);
    }

    public function atualizarUsuario($email, $dados) {
        $userModel = new UserModel();
        $atualizado = $userModel->atualizar($email, $dados);

        if ($atualizado) {
            // Invalida cache
            $redis = $this->getRedis();
            $redis->del("user:$email");

            return ['message' => 'Usuário atualizado com sucesso'];
        }

        return ['error' => 'Falha ao atualizar usuário'];
    }

    public function removerUsuario($email) {
        $userModel = new UserModel();
        $removido = $userModel->remover($email);

        if ($removido) {
            $redis = $this->getRedis();
            $redis->del("user:$email");

            return ['message' => 'Usuário removido com sucesso'];
        }

        return ['error' => 'Falha ao remover usuário'];
    }


}
