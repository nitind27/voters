<?php
include_once('api_connection.php');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== "POST") {
    echo json_encode([
        'success' => false,
        'message' => 'Only POST method allowed'
    ]);
    exit;
}

mysqli_set_charset($con, "utf8mb4");

try {
    // ================= INPUTS =================
    $page = max(1, (int)($_POST['page'] ?? 1));
    $page_size = min(100, max(1, (int)($_POST['page_size'] ?? 50)));
    $offset = ($page - 1) * $page_size;
    $search = trim($_POST['search'] ?? '');
    $colony_id = (int)($_POST['colony_id'] ?? 0);

    // ================= CONDITIONS =================
    $conditions = [];
    $params = [];
    $types = '';

    // Colony filter
    $conditions[] = "(
        v.Updated_colony IS NULL 
        OR v.Updated_colony = '' 
        OR v.Updated_colony = 0
        OR EXISTS (
            SELECT 1 FROM colony 
            WHERE colony.colony_id = CAST(v.Updated_colony AS UNSIGNED) 
            AND colony.status = 'Active'
        )
    )";

    if ($colony_id > 0) {
        $conditions[] = "v.Updated_colony = ?";
        $params[] = $colony_id;
        $types .= 'i';
    }

    if ($search !== '') {
        $conditions[] = "(v.full_name LIKE ? OR v.Voter_Id LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $types .= 'ss';
    }

    $whereClause = count($conditions) > 0 ? 'WHERE ' . implode(' AND ', $conditions) : '';

    // ================= TOTAL COUNT =================
    $countSql = "SELECT COUNT(*) total FROM tbl_voters_search v $whereClause";
    $countStmt = $con->prepare($countSql);
    
    if (!$countStmt) {
        throw new Exception("Count query preparation failed: " . $con->error);
    }
    
    if ($params) {
        $countStmt->bind_param($types, ...$params);
    }
    $countStmt->execute();
    $total = (int)$countStmt->get_result()->fetch_assoc()['total'];
    $countStmt->close();

    // ================= MAIN DATA QUERY =================
    $sql = "
        SELECT 
            v.*,
            c.status as colony_status,
            CASE 
                WHEN v.family_member IS NULL OR TRIM(v.family_member) = '' OR v.family_member = '0' 
                THEN 0
                ELSE (
                    SELECT COUNT(*) 
                    FROM tbl_voters_search v2 
                    WHERE TRIM(v2.family_member) = TRIM(v.family_member)
                    AND v2.family_member IS NOT NULL 
                    AND TRIM(v2.family_member) != '' 
                    AND v2.family_member != '0'
                )
            END AS family_count
        FROM tbl_voters_search v
        LEFT JOIN colony c ON c.colony_id = CAST(v.Updated_colony AS UNSIGNED)
        $whereClause
        ORDER BY v.id DESC
        LIMIT ? OFFSET ?
    ";

    $params[] = $page_size;
    $params[] = $offset;
    $types .= 'ii';

    $stmt = $con->prepare($sql);
    
    if (!$stmt) {
        throw new Exception("Main query preparation failed: " . $con->error);
    }
    
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $data = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    echo json_encode([
        'success' => true,
        'count' => count($data),
        'total' => $total,
        'page' => $page,
        'page_size' => $page_size,
        'data' => $data
    ]);

} catch (Throwable $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/*try {

    // ================= INPUTS =================
    $page      = max(1, (int)($_POST['page'] ?? 1));
    $page_size = min(100, max(1, (int)($_POST['page_size'] ?? 50)));
    $offset    = ($page - 1) * $page_size;
    $search    = trim($_POST['search'] ?? '');
    $colony_id = (int)($_POST['colony_id'] ?? 0);

    // ================= CONDITIONS =================
    $conditions = [];
    $params = [];
    $types = '';

    if ($colony_id > 0) {
        $conditions[] = "v.Updated_colony = ?";
        $params[] = $colony_id;
        $types .= 'i';
    }

    if ($search !== '') {
        $conditions[] = "(v.full_name LIKE ? OR v.Voter_Id LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $types .= 'ss';
    }

    $whereClause = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

    // ================= TOTAL COUNT =================
    $countSql = "SELECT COUNT(*) total FROM tbl_voters_search v $whereClause";
    $countStmt = $con->prepare($countSql);
    if ($params) {
        $countStmt->bind_param($types, ...$params);
    }
    $countStmt->execute();
    $total = (int)$countStmt->get_result()->fetch_assoc()['total'];
    $countStmt->close();

    // ================= MAIN DATA QUERY =================
    $sql = "
        SELECT 
            v.*,
            COUNT(*) OVER (PARTITION BY v.family_member) AS family_count
        FROM tbl_voters_search v
        $whereClause
        ORDER BY v.id DESC
        LIMIT ? OFFSET ?
    ";

    $params[] = $page_size;
    $params[] = $offset;
    $types .= 'ii';

    $stmt = $con->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $data = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    echo json_encode([
        'success' => true,
        'count' => count($data),
        'total' => $total,
        'page' => $page,
        'page_size' => $page_size,
        'data' => $data
    ]);

} catch (Throwable $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}*/
?>

