<?php 
require_once './Controller/AuthController.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if ($uri === '/health' && $method === 'GET') {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ok']);
    return;

} elseif ($uri === '/user' && $method === 'POST') {
    $controller = new AuthController();
    $controller->postUser();

} elseif ($uri === '/token' && $method === 'POST') {
    $controller = new AuthController();
    $controller->postToken();

} elseif ($uri === '/token' && $method === 'GET') {
        $controller = new AuthController();
        $controller->getToken();

} elseif ($uri === '/user' && $method === 'GET') {
    $controller = new AuthController();
    $controller->getUser();

} elseif ($uri === '/user' && $method === 'PATCH') {
    $controller = new AuthController();
    $controller->updateUser();
    
} elseif ($uri === '/user' && $method === 'DELETE') {
    $controller = new AuthController();
    $controller->deleteUser();
    
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Rota não encontrada']);
}