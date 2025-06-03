<?php

class UserModel {
    private $conn;

    public function __construct() {
        $host = getenv("DB_HOST");
        $user = getenv("DB_USER");
        $password = getenv("DB_PASSWORD");
        $database = getenv("DB_NAME");

        $this->conn = new mysqli($host, $user, $password, $database);

        if ($this->conn->connect_error) {
            die("Erro de conexão: " . $this->conn->connect_error);
        }
    }

    public function criar($name, $lastName, $email, $password) {
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->conn->prepare("INSERT INTO user (name, last_name, email, password) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $name, $lastName, $email, $passwordHash);
        $stmt->execute();

        return [
            'name' => $name,
            'lastName' => $lastName,
            'email' => $email,
            'password' => '[PROTEGIDO]'
        ];
    }

    public function buscarPorEmail($email) {
        $stmt = $this->conn->prepare("SELECT * FROM user WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();

        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    public function buscarPorId($id) {
        $stmt = $this->conn->prepare("SELECT * FROM user WHERE user_id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();

        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    public function buscarTodos() {
        $stmt = $this->conn->prepare("SELECT * FROM user");
        $stmt->execute();
        $result = $stmt->get_result(); 
        $users = $result->fetch_all(MYSQLI_ASSOC); 
        return $users;
    }

    public function atualizar($email, $dados) {
        $query = "UPDATE user SET name = ?, last_name = ?, password = ? WHERE email = ?";
        $stmt = $this->conn->prepare($query);
        $senhaCriptografada = password_hash($dados['password'], PASSWORD_DEFAULT);
        $stmt->bind_param("ssss", $dados['name'], $dados['lastName'], $senhaCriptografada, $email);

        return $stmt->execute();
    }

public function remover($email) {
    $query = "DELETE FROM user WHERE email = ?";
    $stmt = $this->conn->prepare($query);
    $stmt->bind_param("s", $email);

    return $stmt->execute();
}

}
