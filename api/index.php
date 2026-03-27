<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$table  = $_GET['table'] ?? '';

$input = json_decode(file_get_contents('php://input'), true);

if ($method === 'OPTIONS') {
    exit(0);
}

function response($status, $message, $data = null) {
    echo json_encode(['status' => $status, 'message' => $message, 'data' => $data]);
    exit;
}

// Basic router
switch ($action) {
    case 'create':
        handleCreate($table, $input);
        break;
    case 'bulk_create':
        handleBulkCreate($table, $input);
        break;
    case 'bulk_create_ocorrencias':
        handleBulkCreateOcorrencias($input);
        break;
    case 'delete':
        handleDelete($table, $_GET['id'] ?? null);
        break;
    case 'bulk_delete_recent':
        handleBulkDeleteRecent($table, $input);
        break;
    case 'list':
        handleList($table);
        break;
    case 'init_db':
        handleInitDB();
        break;
    default:
        response('error', 'Invalid action');
}

function handleCreate($table, $data) {
    global $pdo;
    if (!$data) response('error', 'No data provided');

    $keys = array_keys($data);
    $fields = implode(',', $keys);
    $placeholders = implode(',', array_map(fn($k) => ":$k", $keys));

    try {
        $stmt = $pdo->prepare("INSERT INTO $table ($fields) VALUES ($placeholders)");
        $stmt->execute($data);
        response('success', 'Record created successfully', ['id' => $pdo->lastInsertId()]);
    } catch (Exception $e) {
        response('error', $e->getMessage());
    }
}

function handleBulkCreate($table, $data) {
    global $pdo;
    if (!is_array($data)) response('error', 'Data must be an array of objects');

    try {
        $pdo->beginTransaction();
        foreach ($data as $row) {
            $keys = array_keys($row);
            $fields = implode(',', $keys);
            $placeholders = implode(',', array_map(fn($k) => ":$k", $keys));
            $stmt = $pdo->prepare("INSERT INTO $table ($fields) VALUES ($placeholders)");
            $stmt->execute($row);
        }
        $pdo->commit();
        response('success', count($data) . ' records created successfully');
    } catch (Exception $e) {
        $pdo->rollBack();
        response('error', $e->getMessage());
    }
}

function handleBulkCreateOcorrencias($data) {
    global $pdo;
    if (!is_array($data)) response('error', 'Data must be an array of objects');

    try {
        $pdo->beginTransaction();
        foreach ($data as $row) {
            $epi_ids = $row['epi_ids'] ?? [];
            unset($row['epi_ids']);

            $keys = array_keys($row);
            $fields = implode(',', $keys);
            $placeholders = implode(',', array_map(fn($k) => ":$k", $keys));
            
            $stmt = $pdo->prepare("INSERT INTO ocorrencias ($fields) VALUES ($placeholders)");
            $stmt->execute($row);
            $occId = $pdo->lastInsertId();

            if (!empty($epi_ids)) {
                foreach ($epi_ids as $epiId) {
                    $epiStmt = $pdo->prepare("INSERT INTO ocorrencia_epis (ocorrencia_id, epi_id) VALUES (:occ, :epi)");
                    $epiStmt->execute(['occ' => $occId, 'epi' => $epiId]);
                }
            }
        }
        $pdo->commit();
        response('success', count($data) . ' ocorrências processadas com sucesso');
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        response('error', $e->getMessage());
    }
}

function handleDelete($table, $id) {
    global $pdo;
    if (!$id) response('error', 'No ID provided');

    try {
        $pdo->beginTransaction();
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

        // 1. Delete the item
        $stmt = $pdo->prepare("DELETE FROM $table WHERE id = :id");
        $stmt->execute(['id' => $id]);

        // 2. Identify tables that reference this ID
        $relations = [
            'setores' => [
                ['table' => 'funcionarios', 'field' => 'setor_id'],
                ['table' => 'usuarios', 'field' => 'setor_id']
            ],
            'funcionarios' => [
                ['table' => 'ocorrencias', 'field' => 'funcionario_id'],
                ['table' => 'amostras_faciais', 'field' => 'funcionario_id']
            ],
            'epis' => [
                ['table' => 'ocorrencia_epis', 'field' => 'epi_id']
            ],
            'ocorrencias' => [
                ['table' => 'ocorrencia_epis', 'field' => 'ocorrencia_id'],
                ['table' => 'acoes_ocorrencia', 'field' => 'ocorrencia_id'],
                ['table' => 'evidencias', 'field' => 'ocorrencia_id']
            ],
            'usuarios' => [
                ['table' => 'acoes_ocorrencia', 'field' => 'usuario_id']
            ]
        ];

        // 3. Shift subsequent IDs and update references
        // We find all records with ID > $id
        $stmt = $pdo->prepare("SELECT id FROM $table WHERE id > :id ORDER BY id ASC");
        $stmt->execute(['id' => $id]);
        $subsequent = $stmt->fetchAll(PDO::FETCH_COLUMN);

        foreach ($subsequent as $oldId) {
            $newId = $oldId - 1;

            // Update refs in other tables
            if (isset($relations[$table])) {
                foreach ($relations[$table] as $rel) {
                    $upd = $pdo->prepare("UPDATE {$rel['table']} SET {$rel['field']} = :new WHERE {$rel['field']} = :old");
                    $upd->execute(['new' => $newId, 'old' => $oldId]);
                }
            }

            // Update the record itself
            $upd = $pdo->prepare("UPDATE $table SET id = :new WHERE id = :old");
            $upd->execute(['new' => $newId, 'old' => $oldId]);
        }

        // 4. Reset Auto-Increment
        $stmt = $pdo->query("SELECT MAX(id) FROM $table");
        $max = $stmt->fetchColumn() ?: 0;
        $next = $max + 1;

        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
        $pdo->commit();

        $pdo->exec("ALTER TABLE $table AUTO_INCREMENT = $next");
        
        response('success', 'Registro removido e IDs reorganizados com sucesso');
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
        response('error', $e->getMessage());
    }
}

function handleBulkDeleteRecent($table, $data) {
    global $pdo;
    $count = (int)($data['count'] ?? 0);
    if ($count <= 0) response('error', 'Quantidade inválida');

    try {
        $pdo->beginTransaction();
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

        $stmt = $pdo->prepare("SELECT id FROM $table ORDER BY id DESC LIMIT :limit");
        $stmt->bindValue(':limit', $count, PDO::PARAM_INT);
        $stmt->execute();
        $idsToDelete = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($idsToDelete)) {
            $pdo->rollBack();
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
            response('success', 'Nenhum registro para remover.');
        }

        $idList = implode(',', array_map('intval', $idsToDelete));
        $pdo->exec("DELETE FROM $table WHERE id IN ($idList)");

        $stmt = $pdo->query("SELECT MAX(id) FROM $table");
        $max = $stmt->fetchColumn() ?: 0;
        $next = $max + 1;

        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
        $pdo->commit();
        
        $pdo->exec("ALTER TABLE $table AUTO_INCREMENT = $next");
        response('success', count($idsToDelete) . ' registros recentes removidos com sucesso.');
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
        response('error', $e->getMessage());
    }
}

function handleList($table) {
    global $pdo;
    try {
        $stmt = $pdo->query("SELECT * FROM $table ORDER BY id DESC");
        response('success', 'Records fetched', $stmt->fetchAll());
    } catch (Exception $e) {
        response('error', $e->getMessage());
    }
}

function handleInitDB() {
    global $pdo;
    $sql = file_get_contents('db_init.sql');
    try {
        $pdo->exec($sql);
        response('success', 'Database initialized successfully');
    } catch (Exception $e) {
        response('error', 'Failed to initialize database: ' . $e->getMessage());
    }
}
?>
