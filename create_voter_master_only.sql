-- Create voter_master table only
-- This script will drop existing table and create fresh one

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing table if it exists
DROP TABLE IF EXISTS voter_master;

-- Create voter_master table with proper structure
CREATE TABLE voter_master (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voter_id INT NOT NULL COMMENT 'Reference to tbl_voters_search.id',
    Voter_Id VARCHAR(100) NOT NULL COMMENT 'Voter ID string',
    full_name VARCHAR(255) DEFAULT NULL,
    House_Number VARCHAR(50) DEFAULT NULL,
    Updated_colony VARCHAR(255) DEFAULT NULL,
    updated_house_number VARCHAR(50) DEFAULT NULL,
    updated_mobile_no VARCHAR(20) DEFAULT NULL,
    volunteer_name VARCHAR(255) NOT NULL,
    volunteer_mobile VARCHAR(20) DEFAULT NULL,
    volunteer_status ENUM('Active', 'Inactive') DEFAULT 'Active',
    assigned_colony_name VARCHAR(255) DEFAULT NULL,
    assigned_colony_id INT DEFAULT NULL COMMENT 'Reference to colony.colony_id',
    inst_1_paid TINYINT(1) DEFAULT 0 COMMENT '0 = No, 1 = Yes',
    inst_2_paid TINYINT(1) DEFAULT 0 COMMENT '0 = No, 1 = Yes',
    inst_3_paid TINYINT(1) DEFAULT 0 COMMENT '0 = No, 1 = Yes',
    voting_paid TINYINT(1) DEFAULT 0 COMMENT '0 = No, 1 = Yes',
    voting_in_transit TINYINT(1) DEFAULT 0 COMMENT '0 = No, 1 = Yes',
    voting_status ENUM('Pending', 'In Transit', 'Completed') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_voter_assignment (voter_id, volunteer_name, assigned_colony_name),
    INDEX idx_voter_id (voter_id),
    INDEX idx_Voter_Id (Voter_Id),
    INDEX idx_volunteer_name (volunteer_name),
    INDEX idx_assigned_colony_name (assigned_colony_name),
    INDEX idx_assigned_colony_id (assigned_colony_id),
    INDEX idx_volunteer_status (volunteer_status),
    FOREIGN KEY (assigned_colony_id) REFERENCES colony(colony_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

