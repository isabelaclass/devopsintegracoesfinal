<?php
require_once './Service/AuthService.php';

class AuthController {
    public function postUser() {
        $data = json_decode(file_get_contents('php://input'), true);

        $name = $data['name'] ?? null;
        $lastName = $data['lastName'] ?? null;
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;

        if (!$name || !$lastName || !$email || !$password) {
            http_response_code(400);
            echo json_encode(['error' => 'Campos obrigatórios ausentes']);
            return;
        }

        $service = new AuthService();
        $result = $service->criarUsuario($name, $lastName, $email, $password);

        echo json_encode($result);
    }

    public function postToken() {
        $data = json_decode(file_get_contents('php://input'), true);
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;

        if (!$email || !$password) {
            http_response_code(400);
            echo json_encode(['error' => 'Email e senha são obrigatórios']);
            return;
        }

        $service = new AuthService();
        $token = $service->gerarToken($email, $password);

        echo json_encode(['token' => $token ?: false]);
    }

    public function getToken() {
        $headers = getallheaders();
        $token = $headers['Authorization'] ?? null;
        $userId = $_GET['user'] ?? null;

        if (!$token || !$userId) {
            echo json_encode(['auth' => false]);
            return;
        }

        $service = new AuthService();
        $auth = $service->validarToken($token, $userId);

        echo json_encode(['auth' => $auth]);
    }

    public function getUser() {
        $email = $_GET['email'] ?? null;
        $userId = $_GET['user_id'] ?? null;
        $service = new AuthService();

        // ─── Se não foi passado email, retorna todos os usuários ───
        if (!$email && !$userId) {
            $usuarios = $service->listarUsuarios();
            foreach ($usuarios as &$usuario) {
                unset($usuario['password']); // Remove a senha de todos
            }
            echo json_encode(['users' => $usuarios]);
            return;
        }

         if ($email) {
        $user = $service->buscarUsuario($email);
        } elseif ($userId) {
            $user = $service->buscarUsuario($userId);
        }

        if (!$user) {
            http_response_code(404);
            echo json_encode(['error' => 'Usuário não encontrado']);
            return;
        }

        unset($user['password']);
        echo json_encode(['user' => $user]);
    }

    public function updateUser() {
        $email = $_GET['email'] ?? null;
        $input = json_decode(file_get_contents("php://input"), true);

        if (!$email || !$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Email e dados são obrigatórios']);
            return;
        }

        $service = new AuthService();
        $resultado = $service->atualizarUsuario($email, $input);

        echo json_encode($resultado);
    }

    public function deleteUser() {
        $email = $_GET['email'] ?? null;

        if (!$email) {
            http_response_code(400);
            echo json_encode(['error' => 'Email é obrigatório']);
            return;
        }

        $service = new AuthService();
        $resultado = $service->removerUsuario($email);

        echo json_encode($resultado);
    }

}
