<?php
include_once('api_connection.php');
header('Content-Type: application/json');

/*if ($_SERVER['REQUEST_METHOD'] === "POST") {

    mysqli_query($con, "SET NAMES utf8");

    if (!isset($_POST['voter_id'])) {
        echo json_encode([
            "status" => false,
            "message" => "voter_id is required"
        ]);
        exit;
    }

    $voterIds = $_POST['voter_id'];

    // ===== STRING OR ARRAY HANDLE =====
    if (!is_array($voterIds)) {
        $voterIds = explode(',', $voterIds);
    }

    // ===== CLEAN VALUES =====
    $voterIds = array_map('trim', $voterIds);
    $voterIds = array_filter($voterIds); // remove empty

    if (count($voterIds) === 0) {
        echo json_encode([
            "status" => false,
            "message" => "Invalid voter_id values"
        ]);
        exit;
    }

    // ===== PLACEHOLDERS =====
    $placeholders = implode(',', array_fill(0, count($voterIds), '?'));

    $sql = "SELECT * FROM tbl_voters_search WHERE family_member IN ($placeholders)";
    $stmt = $con->prepare($sql);

    // ===== ALL STRINGS =====
    $types = str_repeat('s', count($voterIds));
    $stmt->bind_param($types, ...$voterIds);

    $stmt->execute();
    $result = $stmt->get_result();

    $data = $result->fetch_all(MYSQLI_ASSOC);

    echo json_encode([
        "status" => true,
        "count" => count($data),
        "data" => $data
    ]);
}*/


if ($_SERVER['REQUEST_METHOD'] === "POST") {
    mysqli_query($con, "SET NAMES utf8");

    if (!isset($_POST['voter_id'])) {
        echo json_encode([
            "status" => false,
            "message" => "voter_id is required"
        ]);
        exit;
    }

    $voterIds = $_POST['voter_id'];

    // ===== STRING OR ARRAY HANDLE =====
    if (!is_array($voterIds)) {
        $voterIds = explode(',', $voterIds);
    }

    // ===== CLEAN VALUES =====
    $voterIds = array_map('trim', $voterIds);
    $voterIds = array_filter($voterIds); // remove empty

    if (count($voterIds) === 0) {
        echo json_encode([
            "status" => false,
            "message" => "Invalid voter_id values"
        ]);
        exit;
    }

    // ===== COLONY FILTER (FIXED) =====
    $colonyFilter = "(
        tvs.Updated_colony IS NULL 
        OR tvs.Updated_colony = '' 
        OR tvs.Updated_colony = 0
        OR EXISTS (
            SELECT 1 FROM colony 
            WHERE colony.colony_id = CAST(tvs.Updated_colony AS UNSIGNED) 
            AND colony.status = 'Active'
        )
    )";

    // ===== PLACEHOLDERS =====
    $placeholders = implode(',', array_fill(0, count($voterIds), '?'));
    $sql = "SELECT tvs.*, c.status as colony_status 
            FROM tbl_voters_search tvs 
            LEFT JOIN colony c ON c.colony_id = CAST(tvs.Updated_colony AS UNSIGNED)
            WHERE tvs.family_member IN ($placeholders) AND $colonyFilter";
    
    $stmt = $con->prepare($sql);

    if (!$stmt) {
        echo json_encode([
            "status" => false,
            "message" => "Query preparation failed: " . $con->error
        ]);
        exit;
    }

    // ===== ALL STRINGS =====
    $types = str_repeat('s', count($voterIds));
    $stmt->bind_param($types, ...$voterIds);

    $stmt->execute();
    $result = $stmt->get_result();
    $data = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Type casting
    // foreach ($data as &$row) {
    //     if (isset($row['id'])) $row['id'] = (int)$row['id'];
    //     if (isset($row['user_id'])) $row['user_id'] = (int)$row['user_id'];
    //     // if (isset($row['Updated_colony'])) $row['Updated_colony'] = (int)$row['Updated_colony'];
    // }

    echo json_encode([
        "status" => true,
        "count" => count($data),
        "message" => "Family members fetched successfully",
        "data" => $data
    ]);
} else {
    echo json_encode([
        "status" => false,
        "message" => "Only POST method allowed"
    ]);
}
?>
