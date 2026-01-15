<?php
include_once('api_connection.php');
header('Content-Type: application/json');

/*if ($_SERVER['REQUEST_METHOD'] == "POST") {

    mysqli_query($con, "SET NAMES utf8");

    try {

        // ================= INPUTS =================
        $primary_person_id = isset($_POST['primary_person_id']) ? trim($_POST['primary_person_id']) : '';
        $page        = isset($_POST['page']) ? max(1, (int)$_POST['page']) : 1;
        $page_size   = isset($_POST['page_size']) ? max(1, (int)$_POST['page_size']) : 50;
        $offset      = ($page - 1) * $page_size;
        $search      = isset($_POST['search']) ? trim($_POST['search']) : '';
        $voting_count = isset($_POST['voting_status']) ? (int)$_POST['voting_status'] : 0;
        $colony_id   = isset($_POST['colony_id']) ? (int)$_POST['colony_id'] : 0;

        if (empty($primary_person_id)) {
            echo json_encode([
                'error' => true,
                'message' => 'primary_person_id required',
                'data' => []
            ]);
            exit;
        }

        // ================= STEP 1: GET PRIMARY VOTER_ID =================
        $primaryVoterIds = [];
        $voterIdQuery = "SELECT Voter_Id FROM tbl_voters_search WHERE id IN ($primary_person_id)";
        $voterIdResult = mysqli_query($con, $voterIdQuery);

        while ($row = mysqli_fetch_assoc($voterIdResult)) {
            if (!empty($row['Voter_Id'])) {
                $primaryVoterIds[] = "'" . mysqli_real_escape_string($con, $row['Voter_Id']) . "'";
            }
        }

        if (empty($primaryVoterIds)) {
            $primaryVoterIds[] = "''";
        }

        $primaryVoterIdsStr = implode(',', $primaryVoterIds);

        // ================= MAIN FAMILY CONDITION =================
        $familyCondition = "
        (
            id IN ($primary_person_id)
            OR family_member IN ($primaryVoterIdsStr)
        )";
        
        $familyConditionCount = "
        (
            v1.id IN ($primary_person_id)
            OR v1.family_member IN ($primaryVoterIdsStr)
        )";

        // ================= WHERE CONDITIONS =================
        $conditions = [];
        $params = [];
        $types = '';

        $conditions[] = $familyCondition;

        if ($voting_count == 1) {
            $conditions[] = "voting_status = 'Pending'";
        } elseif ($voting_count == 2) {
            $conditions[] = "voting_status = 'In Transit'";
        } elseif ($voting_count == 3) {
            $conditions[] = "(voting_status = 'Completed' OR voting_status = 'Direct')";
        }

        if ($colony_id > 0) {
            $conditions[] = "Updated_colony = ?";
            $params[] = $colony_id;
            $types .= 'i';
        }

        if (!empty($search)) {
            $searchWords = explode(' ', $search);
            $nameParts = [];

            foreach ($searchWords as $word) {
                $nameParts[] = "full_name LIKE ?";
                $params[] = '%' . $word . '%';
                $types .= 's';
            }

            $conditions[] = "((" . implode(' AND ', $nameParts) . ") OR Voter_Id LIKE ?)";
            $params[] = '%' . $search . '%';
            $types .= 's';
        }

        $whereClause = 'WHERE ' . implode(' AND ', $conditions);

        // ================= COUNTS (FIXED) =================
        $all_voter_result = mysqli_query($con,
            "SELECT COUNT(*) AS c FROM tbl_voters_search WHERE $familyCondition"
        );
        $all_voter = $all_voter_result ? mysqli_fetch_assoc($all_voter_result)['c'] : 0;

        $pending_voter_result = mysqli_query($con,
            "SELECT COUNT(*) AS c FROM tbl_voters_search WHERE voting_status='Pending' AND $familyCondition"
        );
        $pending_voter = $pending_voter_result ? mysqli_fetch_assoc($pending_voter_result)['c'] : 0;

        $in_transit_voter_result = mysqli_query($con,
            "SELECT COUNT(*) AS c FROM tbl_voters_search WHERE voting_status='In Transit' AND $familyCondition"
        );
        $in_transit_voter = $in_transit_voter_result ? mysqli_fetch_assoc($in_transit_voter_result)['c'] : 0;

        $done_voter_result = mysqli_query($con,
            "SELECT COUNT(*) AS c FROM tbl_voters_search WHERE (voting_status='Completed' OR voting_status='Direct') AND $familyCondition"
        );
        $done_voter = $done_voter_result ? mysqli_fetch_assoc($done_voter_result)['c'] : 0;

        // ================= COLONY WISE COUNT =================
        $colonyWhere = "WHERE $familyCondition";

        if ($voting_count == 1) {
            $colonyWhere .= " AND voting_status='Pending'";
        } elseif ($voting_count == 2) {
            $colonyWhere .= " AND voting_status='In Transit'";
        } elseif ($voting_count == 3) {
            $colonyWhere .= " AND (voting_status='Completed' OR voting_status='Direct')";
        }

        $colonyQuery = "
        SELECT Updated_colony AS colony_id, COUNT(*) AS total_voters
        FROM tbl_voters_search
        $colonyWhere
        GROUP BY Updated_colony";

        $colonyResult = mysqli_query($con, $colonyQuery);
        $colony_voter = [];
        if ($colonyResult) {
            $colony_voter = mysqli_fetch_all($colonyResult, MYSQLI_ASSOC);
            foreach ($colony_voter as &$c) {
                $c['colony_id'] = (int)$c['colony_id'];
                $c['total_voters'] = (int)$c['total_voters'];
            }
        }

        // ================= PAGINATION COUNT =================
        $total = 0;
        $countQuery = "SELECT COUNT(*) AS total FROM tbl_voters_search $whereClause";
        $countStmt = $con->prepare($countQuery);
        if ($countStmt) {
            if (!empty($params)) {
                $countStmt->bind_param($types, ...$params);
            }
            $countStmt->execute();
            $countResult = $countStmt->get_result();
            if ($countResult) {
                $countRow = $countResult->fetch_assoc();
                $total = $countRow ? (int)$countRow['total'] : 0;
            }
            $countStmt->close();
        }

        // ================= FAMILY COUNT QUERY (FIXED - ONLY FOR PENDING) =================
        $family_counts = [];
        if ($voting_count == 1) {
            $familyCountQuery = "
            SELECT 
                v1.id,
                COUNT(DISTINCT v2.id) as family_count
            FROM tbl_voters_search v1
            LEFT JOIN tbl_voters_search v2 ON (
                v2.family_member = v1.family_member
            )
            WHERE v1.voting_status = 'Pending' 
            AND $familyConditionCount
            GROUP BY v1.id
            ";
            // echo $familyCountQuery;
            $familyResult = mysqli_query($con, $familyCountQuery);
            if ($familyResult) {
                while ($row = mysqli_fetch_assoc($familyResult)) {
                    $family_counts[(int)$row['id']] = (int)$row['family_count'];
                }
            }
        }

        // ================= DATA FETCH WITH FAMILY COUNT =================
        $response = [];
        $query = "
        SELECT *
        FROM tbl_voters_search
        $whereClause
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?";

        $params[] = $page_size;
        $params[] = $offset;
        $types .= 'ii';

        $stmt = $con->prepare($query);
        if ($stmt) {
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result) {
                $response = $result->fetch_all(MYSQLI_ASSOC);
            }
            $stmt->close();
        }

        // ================= ADD FAMILY COUNT TO PENDING VOTERS =================
        if ($voting_count == 1) {
            foreach ($response as &$voter) {
                $voter_id = (int)$voter['id'];
                $voter['family_count'] = isset($family_counts[$voter_id]) ? $family_counts[$voter_id] : 0;
            }
        }

        // ================= RESPONSE =================
        echo json_encode([
            'error' => false,
            'message' => 'Voter & family data fetched successfully',
            'count' => count($response),
            'total' => (int)$total,
            'page' => $page,
            'page_size' => $page_size,
            'all_voter' => (int)$all_voter,
            'pending_voter' => (int)$pending_voter,
            'in_transit_voter' => (int)$in_transit_voter,
            'done_voter' => (int)$done_voter,
            'colony_voter' => $colony_voter,
            'data' => $response
        ]);

    } catch (Exception $e) {
        echo json_encode([
            'error' => true,
            'message' => $e->getMessage(),
            'data' => []
        ]);
    }

} else {
    echo json_encode([
        'error' => true,
        'message' => 'Only POST allowed',
        'data' => []
    ]);
}*/


if ($_SERVER['REQUEST_METHOD'] == "POST") {
    mysqli_query($con, "SET NAMES utf8");

    try {
        // ================= INPUTS =================
        $primary_person_id = isset($_POST['primary_person_id']) ? trim($_POST['primary_person_id']) : '';
        $page = isset($_POST['page']) ? max(1, (int)$_POST['page']) : 1;
        $page_size   = isset($_POST['page_size']) ? max(1, (int)$_POST['page_size']) : 50;
        $offset = ($page - 1) * $page_size;
        $search = isset($_POST['search']) ? trim($_POST['search']) : '';
        $voting_count = isset($_POST['voting_status']) ? (int)$_POST['voting_status'] : 0;
        $colony_id = isset($_POST['colony_id']) ? (int)$_POST['colony_id'] : 0;

        if (empty($primary_person_id)) {
            echo json_encode([
                'error' => true,
                'message' => 'primary_person_id required',
                'data' => []
            ]);
            exit;
        }

        // Colony filter function - reusable with table alias
        function getColonyFilter($tableAlias = '') {
            $prefix = $tableAlias ? "$tableAlias." : '';
            return "(
                {$prefix}Updated_colony IS NULL 
                OR {$prefix}Updated_colony = '' 
                OR {$prefix}Updated_colony = 0
                OR EXISTS (
                    SELECT 1 FROM colony 
                    WHERE colony.colony_id = CAST({$prefix}Updated_colony AS UNSIGNED) 
                    AND colony.status = 'Active'
                )
            )";
        }

        // ================= STEP 1: GET PRIMARY VOTER_ID (SECURE) =================
        $primaryIds = array_map('trim', explode(',', $primary_person_id));
        $idPlaceholders = str_repeat('?,', count($primaryIds) - 1) . '?';
        
        $colonyFilter = getColonyFilter();
        $voterIdQuery = "SELECT Voter_Id FROM tbl_voters_search WHERE id IN ($idPlaceholders) AND $colonyFilter";
        $voterStmt = $con->prepare($voterIdQuery);
        
        if (!$voterStmt) {
            throw new Exception("Voter ID query failed: " . $con->error);
        }
        
        $idTypes = str_repeat('i', count($primaryIds));
        $voterStmt->bind_param($idTypes, ...$primaryIds);
        $voterStmt->execute();
        $voterResult = $voterStmt->get_result();
        
        $primaryVoterIds = [];
        while ($row = $voterResult->fetch_assoc()) {
            if (!empty($row['Voter_Id'])) {
                $primaryVoterIds[] = $row['Voter_Id'];
            }
        }
        $voterStmt->close();

        if (empty($primaryVoterIds)) {
            echo json_encode([
                'error' => true,
                'message' => 'No valid primary voter found',
                'data' => []
            ]);
            exit;
        }

        // ================= MAIN FAMILY + COLONY CONDITION =================
        $voterPlaceholders = str_repeat('?,', count($primaryVoterIds) - 1) . '?';
        $colonyFilter = getColonyFilter();
        $familyCondition = "(id IN ($idPlaceholders) OR family_member IN ($voterPlaceholders)) AND $colonyFilter";

        // ================= COUNTS (WITH COLONY FILTER) =================
        // All voters count
        $allQuery = "SELECT COUNT(*) AS c FROM tbl_voters_search WHERE $familyCondition";
        $allStmt = $con->prepare($allQuery);
        
        if (!$allStmt) {
            throw new Exception("All count query failed: " . $con->error);
        }
        
        $allStmt->bind_param($idTypes . str_repeat('s', count($primaryVoterIds)), 
                           ...array_merge($primaryIds, $primaryVoterIds));
        $allStmt->execute();
        $all_voter = $allStmt->get_result()->fetch_assoc()['c'];
        $allStmt->close();

        // Pending count
        $pendingQuery = "SELECT COUNT(*) AS c FROM tbl_voters_search WHERE $familyCondition AND voting_status='Pending'";
        $pendingStmt = $con->prepare($pendingQuery);
        
        if (!$pendingStmt) {
            throw new Exception("Pending count query failed: " . $con->error);
        }
        
        $pendingStmt->bind_param($idTypes . str_repeat('s', count($primaryVoterIds)), 
                               ...array_merge($primaryIds, $primaryVoterIds));
        $pendingStmt->execute();
        $pending_voter = $pendingStmt->get_result()->fetch_assoc()['c'];
        $pendingStmt->close();

        // In Transit count
        $inTransitQuery = "SELECT COUNT(*) AS c FROM tbl_voters_search WHERE $familyCondition AND voting_status='In Transit'";
        $inTransitStmt = $con->prepare($inTransitQuery);
        
        if (!$inTransitStmt) {
            throw new Exception("In Transit count query failed: " . $con->error);
        }
        
        $inTransitStmt->bind_param($idTypes . str_repeat('s', count($primaryVoterIds)), 
                                 ...array_merge($primaryIds, $primaryVoterIds));
        $inTransitStmt->execute();
        $in_transit_voter = $inTransitStmt->get_result()->fetch_assoc()['c'];
        $inTransitStmt->close();

        // Done count
        $doneQuery = "SELECT COUNT(*) AS c FROM tbl_voters_search WHERE $familyCondition AND (voting_status='Completed' OR voting_status='Direct')";
        $doneStmt = $con->prepare($doneQuery);
        
        if (!$doneStmt) {
            throw new Exception("Done count query failed: " . $con->error);
        }
        
        $doneStmt->bind_param($idTypes . str_repeat('s', count($primaryVoterIds)), 
                            ...array_merge($primaryIds, $primaryVoterIds));
        $doneStmt->execute();
        $done_voter = $doneStmt->get_result()->fetch_assoc()['c'];
        $doneStmt->close();

        // ================= WHERE CONDITIONS FOR MAIN QUERY =================
        $conditions = [$familyCondition];
        $params = array_merge($primaryIds, $primaryVoterIds);
        $types = $idTypes . str_repeat('s', count($primaryVoterIds));

        if ($colony_id > 0) {
            $conditions[] = "Updated_colony = ?";
            $params[] = $colony_id;
            $types .= 'i';
        }
        
        if ($voting_count == 1) {
            $conditions[] = "voting_status = 'Pending'";
        } elseif ($voting_count == 2) {
            $conditions[] = "voting_status = 'In Transit'";
        } elseif ($voting_count == 3) {
            $conditions[] = "(voting_status = 'Completed' OR voting_status = 'Direct')";
        }

        if (!empty($search)) {
            $searchWords = explode(' ', $search);
            $nameParts = [];
            foreach ($searchWords as $word) {
                if (trim($word)) {
                    $nameParts[] = "full_name LIKE ?";
                    $params[] = '%' . trim($word) . '%';
                    $types .= 's';
                }
            }
            if (!empty($nameParts)) {
                $conditions[] = "((" . implode(' AND ', $nameParts) . ") OR Voter_Id LIKE ?)";
                $params[] = '%' . $search . '%';
                $types .= 's';
            }
        }

        $whereClause = 'WHERE ' . implode(' AND ', $conditions);

        // Colony wise count (with voting filter + colony filter)
        $colonyWhere = $familyCondition;
        $colonyParams = array_merge($primaryIds, $primaryVoterIds);
        $colonyTypes = $idTypes . str_repeat('s', count($primaryVoterIds));
        
        if ($voting_count == 1) $colonyWhere .= " AND voting_status='Pending'";
        elseif ($voting_count == 2) $colonyWhere .= " AND voting_status='In Transit'";
        elseif ($voting_count == 3) $colonyWhere .= " AND (voting_status='Completed' OR voting_status='Direct')";
        
        $colonyQuery = "SELECT Updated_colony AS colony_id, COUNT(*) AS total_voters 
                        FROM tbl_voters_search WHERE $colonyWhere 
                        GROUP BY Updated_colony";
        $colonyStmt = $con->prepare($colonyQuery);
        
        if (!$colonyStmt) {
            throw new Exception("Colony count query failed: " . $con->error);
        }
        
        $colonyStmt->bind_param($colonyTypes, ...$colonyParams);
        $colonyStmt->execute();
        $colonyResult = $colonyStmt->get_result();
        $colony_voter = [];
        while ($row = $colonyResult->fetch_assoc()) {
            $colony_voter[] = [
                'colony_id' => (int)$row['colony_id'],
                'total_voters' => (int)$row['total_voters']
            ];
        }
        $colonyStmt->close();

        // Pagination count
        $countQuery = "SELECT COUNT(*) AS total FROM tbl_voters_search $whereClause";
        $countStmt = $con->prepare($countQuery);
        
        if (!$countStmt) {
            throw new Exception("Pagination count query failed: " . $con->error);
        }
        
        $countStmt->bind_param($types, ...$params);
        $countStmt->execute();
        $total = $countStmt->get_result()->fetch_assoc()['total'];
        $countStmt->close();

        // Data fetch WITH FAMILY COUNT
        $query = "SELECT 
                    tvs.*, 
                    c.status as colony_status,
                    CASE 
                        WHEN tvs.family_member IS NULL OR TRIM(tvs.family_member) = '' OR tvs.family_member = '0' 
                        THEN 0
                        ELSE (
                            SELECT COUNT(*) 
                            FROM tbl_voters_search v2 
                            WHERE TRIM(v2.family_member) = TRIM(tvs.family_member)
                            AND v2.family_member IS NOT NULL 
                            AND TRIM(v2.family_member) != '' 
                            AND v2.family_member != '0'
                        )
                    END AS family_count
                  FROM tbl_voters_search tvs 
                  LEFT JOIN colony c ON c.colony_id = CAST(tvs.Updated_colony AS UNSIGNED)
                  $whereClause 
                  ORDER BY tvs.updated_at DESC 
                  LIMIT ? OFFSET ?";
        
        $params[] = $page_size;
        $params[] = $offset;
        $types .= 'ii';
        
        $stmt = $con->prepare($query);
        
        if (!$stmt) {
            throw new Exception("Main data query failed: " . $con->error);
        }
        
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $response = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        echo json_encode([
            'error' => false,
            'message' => 'Voter & family data fetched successfully',
            'count' => count($response),
            'total' => (int)$total,
            'page' => $page,
            'page_size' => $page_size,
            'all_voter' => (int)$all_voter,
            'pending_voter' => (int)$pending_voter,
            'in_transit_voter' => (int)$in_transit_voter,
            'done_voter' => (int)$done_voter,
            'colony_voter' => $colony_voter,
            'data' => $response
        ]);

    } catch (Exception $e) {
        echo json_encode([
            'error' => true,
            'message' => $e->getMessage(),
            'data' => []
        ]);
    }
} else {
    echo json_encode([
        'error' => true,
        'message' => 'Only POST allowed',
        'data' => []
    ]);
}
?>
