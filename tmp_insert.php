<?php
require 'api/config.php';
try {
    $stmt = $pdo->prepare('INSERT INTO ocorrencias (funcionario_id, tipo, data_hora) VALUES (1, "INFRACAO", NOW())');
    $stmt->execute();
    echo "Insert successful. ID: " . $pdo->lastInsertId();
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
