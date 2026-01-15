<?php
include_once('api_connection.php');
header('Content-Type: application/json');
mysqli_query($con, "SET NAMES utf8");

try {

    if (!isset($_POST['id']) || trim($_POST['id']) === '') {
        throw new Exception('ID is required.', 400);
    }

    if (!isset($_POST['voting_status']) || trim($_POST['voting_status']) === '') {
        throw new Exception('voting_status is required.', 400);
    }

    $idsInput = trim($_POST['id']);
    $voting_status = trim($_POST['voting_status']);

    // ===== HANDLE SINGLE OR MULTIPLE IDS =====
    $ids = explode(',', $idsInput);
    $ids = array_map('trim', $ids);
    $ids = array_filter($ids, 'is_numeric'); // id is primary key (INT)

    if (count($ids) === 0) {
        throw new Exception('Invalid ID values.', 400);
    }

    // ===== CREATE PLACEHOLDERS =====
    $placeholders = implode(',', array_fill(0, count($ids), '?'));

    $sql = "UPDATE tbl_voters_search 
            SET voting_status = ?, updated_at = NOW() 
            WHERE id IN ($placeholders)";

    $stmt = $con->prepare($sql);

    // ===== BIND PARAMS =====
    // 1 string + multiple integers
    $types = 's' . str_repeat('i', count($ids));
    $params = array_merge([$voting_status], $ids);

    $stmt->bind_param($types, ...$params);

    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode([
            'error' => false,
            'message' => 'Voting status updated successfully.'
        ]);
    } else {
        echo json_encode([
            'error' => true,
            'code' => 404,
            'message' => 'No records updated (IDs not found or same value).'
        ]);
    }

    $stmt->close();

} catch (Exception $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode([
        'error' => true,
        'code' => $e->getCode(),
        'message' => $e->getMessage()
    ]);
}
?>
