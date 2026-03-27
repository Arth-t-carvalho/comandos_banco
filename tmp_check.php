<?php
require 'api/config.php';
try {
    $stmt = $pdo->query('SELECT id, nome FROM funcionarios LIMIT 1');
    $row = $stmt->fetch();
    echo json_encode($row);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
