<?php
include_once('api_connection.php');
header('Content-Type: application/json');

/*if ($_SERVER['REQUEST_METHOD'] == "POST") {
    mysqli_query($con, "SET NAMES utf8");

    try {
        // Get parameters
        $page = isset($_POST['page']) ? max(1, (int)$_POST['page']) : 1;
        $page_size = 50;
        $offset = ($page - 1) * $page_size;
        $search = isset($_POST['search']) ? trim($_POST['search']) : '';
        $voting_count = isset($_POST['voting_status']) ? (int)trim($_POST['voting_status']) : 0;
        $assign_booth_number = isset($_POST['assign_booth_number']) ? trim($_POST['assign_booth_number']) : '';
        $search_booth_number = isset($_POST['search_booth_number']) ? trim($_POST['search_booth_number']) : '';
        $search_sr_no = isset($_POST['search_sr_no']) ? trim($_POST['search_sr_no']) : '';
        
        if (empty($assign_booth_number)) {
            echo json_encode([
                'error' => true,
                'message' => 'assign_booth_number is required',
                'data' => []
            ]);
            exit;
        }

        // Build WHERE conditions for main query
        $conditions = [];
        $params = [];
        $types = '';
        
        // 1. assign_booth_number IN condition - comma separated (MANDATORY)
        $booth_numbers = array_map('trim', explode(',', $assign_booth_number));
        $booth_placeholders = str_repeat('?,', count($booth_numbers) - 1) . '?';
        $conditions[] = "Booth_Number IN ($booth_placeholders)";
        $params = array_merge($params, $booth_numbers);
        $types .= str_repeat('s', count($booth_numbers));

        // 2. search_booth_number filter (OPTIONAL) - additional Booth_Number LIKE
        if (!empty($search_booth_number)) {
            $conditions[] = "Booth_Number = ?";
            $params[] = trim($search_booth_number);
            $types .= 's';
        }

        // 3. search_sr_no filter (OPTIONAL) - Sr_No LIKE
        if (!empty($search_sr_no)) {
            $conditions[] = "Sr_No = ?";
            $params[] = trim($search_sr_no);
            $types .= 's';
        }

        // 4. voting_status filter
        if($voting_count == 2) {
            $conditions[] = "voting_status = 'In Transit'";
        }
        else if($voting_count == 3) {
            $conditions[] = "voting_status = 'Pending'";
        }
        else if($voting_count == 4) {
            $conditions[] = "(voting_status = 'Completed' OR voting_status = 'Direct')";
        }

        // 5. Name search filter
        if (!empty($search)) {
            $searchWords = explode(' ', $search);
            $innerConditions = [];
            $innerParams = [];
            $innerTypes  = '';
        
            // full_name sab words AND se
            $nameConditions = [];
            foreach ($searchWords as $word) {
                $word = trim($word);
                if (!empty($word)) {
                    $nameConditions[] = "full_name LIKE ?";
                    $innerParams[] = '%' . $word . '%';
                    $innerTypes .= 's';
                }
            }
        
            if (!empty($nameConditions)) {
                $innerConditions[] = '( ' . implode(' AND ', $nameConditions) . ' )';
            }
        
            // Voter_Id LIKE %search%
            $innerConditions[] = "Voter_Id LIKE ?";
            $innerParams[] = '%' . $search . '%';
            $innerTypes .= 's';
        
            if (!empty($innerConditions)) {
                $conditions[] = '( ' . implode(' OR ', $innerConditions) . ' )';
                $params = array_merge($params, $innerParams);
                $types .= $innerTypes;
            }
        }

        $whereClause = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

        // Booth-wise counts (using assign_booth_number only)
        $countParams = $booth_numbers;
        $countTypes = str_repeat('s', count($booth_numbers));

        // 1. Total voters count (Booth_Number IN assign_booth_number)
        $totalQuery = "SELECT COUNT(*) as all_voter FROM tbl_voters_search WHERE Booth_Number IN ($booth_placeholders)";
        $totalStmt = $con->prepare($totalQuery);
        $totalStmt->bind_param($countTypes, ...$countParams);
        $totalStmt->execute();
        $all_voter = $totalStmt->get_result()->fetch_assoc()['all_voter'];
        $totalStmt->close();

        // 2. Pending voters count
        $pendingQuery = "SELECT COUNT(*) as pending_voter FROM tbl_voters_search WHERE Booth_Number IN ($booth_placeholders) AND voting_status = 'Pending'";
        $pendingStmt = $con->prepare($pendingQuery);
        $pendingStmt->bind_param($countTypes, ...$countParams);
        $pendingStmt->execute();
        $pending_voter = $pendingStmt->get_result()->fetch_assoc()['pending_voter'];
        $pendingStmt->close();

        // 3. In Transit voters count
        $inTransitQuery = "SELECT COUNT(*) as in_transit_voter FROM tbl_voters_search WHERE Booth_Number IN ($booth_placeholders) AND voting_status = 'In Transit'";
        $inTransitStmt = $con->prepare($inTransitQuery);
        $inTransitStmt->bind_param($countTypes, ...$countParams);
        $inTransitStmt->execute();
        $in_transit_voter = $inTransitStmt->get_result()->fetch_assoc()['in_transit_voter'];
        $inTransitStmt->close();

        // 4. Completed voters count
        $doneQuery = "SELECT COUNT(*) as done_voter FROM tbl_voters_search WHERE Booth_Number IN ($booth_placeholders) AND (voting_status = 'Completed' OR voting_status = 'Direct')";
        $doneStmt = $con->prepare($doneQuery);
        $doneStmt->bind_param($countTypes, ...$countParams);
        $doneStmt->execute();
        $done_voter = $doneStmt->get_result()->fetch_assoc()['done_voter'];
        $doneStmt->close();

        // Count filtered records for pagination (with ALL filters)
        $countQuery = "SELECT COUNT(*) as total FROM tbl_voters_search $whereClause";
        $countStmt = $con->prepare($countQuery);
        $countStmt->bind_param($types, ...$params);
        $countStmt->execute();
        $countResult = $countStmt->get_result();
        $total = $countResult->fetch_assoc()['total'];
        $countStmt->close();

        // Fetch paginated results
        $query = "SELECT * FROM tbl_voters_search $whereClause ORDER BY id DESC LIMIT ? OFFSET ?";
        $stmt = $con->prepare($query);
        $finalTypes = $types . 'ii';
        $finalParams = array_merge($params, [$page_size, $offset]);
        $stmt->bind_param($finalTypes, ...$finalParams);
        $stmt->execute();
        $res = $stmt->get_result();
        $response = mysqli_fetch_all($res, MYSQLI_ASSOC);
        $stmt->close();

        // Convert numeric fields to integers
        foreach ($response as &$row) {
            if (isset($row['id'])) $row['id'] = (int)$row['id'];
            if (isset($row['user_id'])) $row['user_id'] = (int)$row['user_id'];
        }

        echo json_encode([
            'error' => false,
            'message' => 'Voter details fetched successfully.',
            'count' => count($response),
            'total' => $total,
            'page' => $page,
            'page_size' => $page_size,
            'all_voter' => (int)$all_voter,
            'pending_voter' => (int)$pending_voter,
            'in_transit_voter' => (int)$in_transit_voter,
            'done_voter' => (int)$done_voter,
            'data' => $response
        ]);

    } catch (Exception $e) {
        echo json_encode([
            'error' => true,
            'message' => 'Fetch failed: ' . $e->getMessage(),
            'data' => []
        ]);
    }
} else {
    echo json_encode([
        'error' => true,
        'message' => 'Only POST method allowed.',
        'data' => []
    ]);
}*/



if ($_SERVER['REQUEST_METHOD'] == "POST") {
    mysqli_query($con, "SET NAMES utf8");

    try {
        // Get parameters
        $page = isset($_POST['page']) ? max(1, (int)$_POST['page']) : 1;
        $page_size = isset($_POST['page_size']) ? max(1, (int)$_POST['page_size']) : 50;
        $offset = ($page - 1) * $page_size;
        $search = isset($_POST['search']) ? trim($_POST['search']) : '';
        $voting_count = isset($_POST['voting_status']) ? (int)trim($_POST['voting_status']) : 0;
        $assign_booth_number = isset($_POST['assign_booth_number']) ? trim($_POST['assign_booth_number']) : '';
        $search_booth_number = isset($_POST['search_booth_number']) ? trim($_POST['search_booth_number']) : '';
        $search_sr_no = isset($_POST['search_sr_no']) ? trim($_POST['search_sr_no']) : '';
        
        if (empty($assign_booth_number)) {
            echo json_encode([
                'error' => true,
                'message' => 'assign_booth_number is required',
                'data' => []
            ]);
            exit;
        }

        // Colony filter conditions (with tvs. prefix for JOIN compatibility)
        $colonyConditions = [];
        $colonyConditions[] = "(tvs.Updated_colony IS NULL OR tvs.Updated_colony = '')";
        $colonyConditions[] = "(tvs.Updated_colony != '' AND tvs.Updated_colony != 0 AND EXISTS (
            SELECT 1 FROM colony c WHERE c.colony_id = CAST(tvs.Updated_colony AS UNSIGNED) AND c.status = 'Active'
        ))";
        $colonyFilter = '( ' . implode(' OR ', $colonyConditions) . ' )';

        // 1. assign_booth_number IN condition
        $booth_numbers = array_map('trim', explode(',', $assign_booth_number));
        $booth_placeholders = str_repeat('?,', count($booth_numbers) - 1) . '?';
        $boothCondition = "tvs.Booth_Number IN ($booth_placeholders) AND $colonyFilter";

        // Booth-wise counts (with colony filter)
        $countParams = $booth_numbers;
        $countTypes = str_repeat('s', count($booth_numbers));

        // 1. Total voters count
        $totalQuery = "SELECT COUNT(*) as all_voter FROM tbl_voters_search tvs WHERE $boothCondition";
        $totalStmt = $con->prepare($totalQuery);
        if ($totalStmt === false) {
            throw new Exception("Total query preparation failed: " . $con->error);
        }
        $totalStmt->bind_param($countTypes, ...$countParams);
        $totalStmt->execute();
        $all_voter = $totalStmt->get_result()->fetch_assoc()['all_voter'];
        $totalStmt->close();

        // 2. Pending voters count
        $pendingQuery = "SELECT COUNT(*) as pending_voter FROM tbl_voters_search tvs WHERE $boothCondition AND tvs.voting_status = 'Pending'";
        $pendingStmt = $con->prepare($pendingQuery);
        if ($pendingStmt === false) {
            throw new Exception("Pending query preparation failed: " . $con->error);
        }
        $pendingStmt->bind_param($countTypes, ...$countParams);
        $pendingStmt->execute();
        $pending_voter = $pendingStmt->get_result()->fetch_assoc()['pending_voter'];
        $pendingStmt->close();

        // 3. In Transit voters count
        $inTransitQuery = "SELECT COUNT(*) as in_transit_voter FROM tbl_voters_search tvs WHERE $boothCondition AND tvs.voting_status = 'In Transit'";
        $inTransitStmt = $con->prepare($inTransitQuery);
        if ($inTransitStmt === false) {
            throw new Exception("In Transit query preparation failed: " . $con->error);
        }
        $inTransitStmt->bind_param($countTypes, ...$countParams);
        $inTransitStmt->execute();
        $in_transit_voter = $inTransitStmt->get_result()->fetch_assoc()['in_transit_voter'];
        $inTransitStmt->close();

        // 4. Completed voters count
        $doneQuery = "SELECT COUNT(*) as done_voter FROM tbl_voters_search tvs WHERE $boothCondition AND (tvs.voting_status = 'Completed' OR tvs.voting_status = 'Direct')";
        $doneStmt = $con->prepare($doneQuery);
        if ($doneStmt === false) {
            throw new Exception("Done query preparation failed: " . $con->error);
        }
        $doneStmt->bind_param($countTypes, ...$countParams);
        $doneStmt->execute();
        $done_voter = $doneStmt->get_result()->fetch_assoc()['done_voter'];
        $doneStmt->close();

        // Build WHERE conditions for main query
        $conditions = [$boothCondition];
        $params = $booth_numbers;
        $types = str_repeat('s', count($booth_numbers));

        // 2. search_booth_number filter
        if (!empty($search_booth_number)) {
            $conditions[] = "tvs.Booth_Number = ?";
            $params[] = trim($search_booth_number);
            $types .= 's';
        }

        // 3. search_sr_no filter
        if (!empty($search_sr_no)) {
            $conditions[] = "tvs.Sr_No = ?";
            $params[] = trim($search_sr_no);
            $types .= 's';
        }

        // 4. voting_status filter
        if($voting_count == 2) {
            $conditions[] = "tvs.voting_status = 'In Transit'";
        }
        else if($voting_count == 3) {
            $conditions[] = "tvs.voting_status = 'Pending'";
        }
        else if($voting_count == 4) {
            $conditions[] = "(tvs.voting_status = 'Completed' OR tvs.voting_status = 'Direct')";
        }

        // 5. Name search filter
        if (!empty($search)) {
            $searchWords = explode(' ', $search);
            $innerConditions = [];
            $innerParams = [];
            $innerTypes = '';

            $nameConditions = [];
            foreach ($searchWords as $word) {
                $word = trim($word);
                if (!empty($word)) {
                    $nameConditions[] = "tvs.full_name LIKE ?";
                    $innerParams[] = '%' . $word . '%';
                    $innerTypes .= 's';
                }
            }

            if (!empty($nameConditions)) {
                $innerConditions[] = '( ' . implode(' AND ', $nameConditions) . ' )';
            }

            $innerConditions[] = "tvs.Voter_Id LIKE ?";
            $innerParams[] = '%' . $search . '%';
            $innerTypes .= 's';

            if (!empty($innerConditions)) {
                $conditions[] = '( ' . implode(' OR ', $innerConditions) . ' )';
                $params = array_merge($params, $innerParams);
                $types .= $innerTypes;
            }
        }

        $whereClause = 'WHERE ' . implode(' AND ', $conditions);

        // Count filtered records
        $countQuery = "SELECT COUNT(*) as total FROM tbl_voters_search tvs $whereClause";
        $countStmt = $con->prepare($countQuery);
        if ($countStmt === false) {
            throw new Exception("Count query preparation failed: " . $con->error);
        }
        $countStmt->bind_param($types, ...$params);
        $countStmt->execute();
        $countResult = $countStmt->get_result();
        $total = $countResult->fetch_assoc()['total'];
        $countStmt->close();

        // Fetch paginated results - FIXED QUERY
        $query = "SELECT tvs.*, c.status as colony_status, c.colony_name 
                  FROM tbl_voters_search tvs 
                  LEFT JOIN colony c ON c.colony_id = IF(tvs.Updated_colony REGEXP '^[0-9]+$', CAST(tvs.Updated_colony AS UNSIGNED), NULL)
                  $whereClause 
                  ORDER BY tvs.id DESC 
                  LIMIT ? OFFSET ?";
        
        $stmt = $con->prepare($query);
        if ($stmt === false) {
            throw new Exception("Main query preparation failed: " . $con->error . " | Query: " . $query);
        }
        
        $finalTypes = $types . 'ii';
        $finalParams = array_merge($params, [$page_size, $offset]);
        $stmt->bind_param($finalTypes, ...$finalParams);
        $stmt->execute();
        $res = $stmt->get_result();
        $response = mysqli_fetch_all($res, MYSQLI_ASSOC);
        $stmt->close();

        // Convert numeric fields
        // foreach ($response as &$row) {
        //     if (isset($row['id'])) $row['id'] = (int)$row['id'];
        //     if (isset($row['user_id'])) $row['user_id'] = (int)$row['user_id'];
        //     if (isset($row['Updated_colony'])) $row['Updated_colony'] = (int)$row['Updated_colony'];
        // }

        echo json_encode([
            'error' => false,
            'message' => 'Voter details fetched successfully.',
            'count' => count($response),
            'total' => $total,
            'page' => $page,
            'page_size' => $page_size,
            'all_voter' => (int)$all_voter,
            'pending_voter' => (int)$pending_voter,
            'in_transit_voter' => (int)$in_transit_voter,
            'done_voter' => (int)$done_voter,
            'data' => $response
        ]);

    } catch (Exception $e) {
        echo json_encode([
            'error' => true,
            'message' => 'Fetch failed: ' . $e->getMessage(),
            'data' => []
        ]);
    }
} else {
    echo json_encode([
        'error' => true,
        'message' => 'Only POST method allowed.',
        'data' => []
    ]);
}
?>
