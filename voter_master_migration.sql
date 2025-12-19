-- Migration script for voter_master table
-- This script safely creates or updates the voter_master table

-- Option 1: If you want to drop and recreate the table (WARNING: This will delete all data!)
-- Uncomment the line below ONLY if you're okay with losing existing data
-- DROP TABLE IF EXISTS voter_master;

-- Option 2: Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS voter_master (
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

-- Option 3: If table exists but has wrong structure, use these ALTER statements
-- First, check your current table structure with: DESCRIBE voter_master;
-- Then uncomment and run only the ALTER statements for columns that are missing

-- Example: Add missing columns (only run if column doesn't exist)
-- ALTER TABLE voter_master ADD COLUMN voter_id INT NOT NULL COMMENT 'Reference to tbl_voters_search.id' AFTER id;
-- ALTER TABLE voter_master ADD COLUMN full_name VARCHAR(255) DEFAULT NULL AFTER Voter_Id;
-- ALTER TABLE voter_master ADD COLUMN House_Number VARCHAR(50) DEFAULT NULL AFTER full_name;
-- ALTER TABLE voter_master ADD COLUMN Updated_colony VARCHAR(255) DEFAULT NULL AFTER House_Number;
-- ALTER TABLE voter_master ADD COLUMN updated_house_number VARCHAR(50) DEFAULT NULL AFTER Updated_colony;
-- ALTER TABLE voter_master ADD COLUMN updated_mobile_no VARCHAR(20) DEFAULT NULL AFTER updated_house_number;
-- ALTER TABLE voter_master ADD COLUMN volunteer_name VARCHAR(255) NOT NULL AFTER updated_mobile_no;
-- ALTER TABLE voter_master ADD COLUMN volunteer_mobile VARCHAR(20) DEFAULT NULL AFTER volunteer_name;
-- ALTER TABLE voter_master ADD COLUMN volunteer_status ENUM('Active', 'Inactive') DEFAULT 'Active' AFTER volunteer_mobile;
-- ALTER TABLE voter_master ADD COLUMN assigned_colony_name VARCHAR(255) DEFAULT NULL AFTER volunteer_status;
-- ALTER TABLE voter_master ADD COLUMN assigned_colony_id INT DEFAULT NULL COMMENT 'Reference to colony.colony_id' AFTER assigned_colony_name;
-- ALTER TABLE voter_master ADD COLUMN inst_1_paid TINYINT(1) DEFAULT 0 COMMENT '0 = No, 1 = Yes' AFTER assigned_colony_id;
-- ALTER TABLE voter_master ADD COLUMN inst_2_paid TINYINT(1) DEFAULT 0 COMMENT '0 = No, 1 = Yes' AFTER inst_1_paid;
-- ALTER TABLE voter_master ADD COLUMN inst_3_paid TINYINT(1) DEFAULT 0 COMMENT '0 = No, 1 = Yes' AFTER inst_2_paid;
-- ALTER TABLE voter_master ADD COLUMN voting_paid TINYINT(1) DEFAULT 0 COMMENT '0 = No, 1 = Yes' AFTER inst_3_paid;
-- ALTER TABLE voter_master ADD COLUMN voting_in_transit TINYINT(1) DEFAULT 0 COMMENT '0 = No, 1 = Yes' AFTER voting_paid;
-- ALTER TABLE voter_master ADD COLUMN voting_status ENUM('Pending', 'In Transit', 'Completed') DEFAULT 'Pending' AFTER voting_in_transit;
-- ALTER TABLE voter_master ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER voting_status;
-- ALTER TABLE voter_master ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Add indexes (check if they exist first to avoid errors)
-- CREATE INDEX idx_voter_id ON voter_master(voter_id);
-- CREATE INDEX idx_Voter_Id ON voter_master(Voter_Id);
-- CREATE INDEX idx_volunteer_name ON voter_master(volunteer_name);
-- CREATE INDEX idx_assigned_colony_name ON voter_master(assigned_colony_name);
-- CREATE INDEX idx_assigned_colony_id ON voter_master(assigned_colony_id);
-- CREATE INDEX idx_volunteer_status ON voter_master(volunteer_status);

-- Add unique constraint (check if it exists first)
-- ALTER TABLE voter_master ADD UNIQUE KEY unique_voter_assignment (voter_id, volunteer_name, assigned_colony_name);

