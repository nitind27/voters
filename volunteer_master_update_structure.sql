-- =====================================================
-- Update volunteer_master table structure
-- Changes colony_id from INT to VARCHAR to store comma-separated IDs
-- =====================================================

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Step 1: Backup existing data (optional)
-- CREATE TABLE volunteer_master_backup AS SELECT * FROM volunteer_master;

-- Step 2: Drop existing table and recreate with new structure
DROP TABLE IF EXISTS volunteer_master;

-- Step 3: Create volunteer_master table with updated structure
-- colony_id stores comma-separated colony IDs (e.g., "1,2,3")
CREATE TABLE volunteer_master (
    id INT AUTO_INCREMENT PRIMARY KEY,
    volunteer_name VARCHAR(255) NOT NULL,
    contact_no VARCHAR(20) DEFAULT NULL COMMENT 'Volunteer contact/mobile number',
    colony_id VARCHAR(255) NOT NULL COMMENT 'Comma-separated colony IDs (e.g., "1,2,3")',
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_volunteer_name (volunteer_name),
    INDEX idx_volunteer_name (volunteer_name),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Note: If you had existing data in volunteer_master, you would need to migrate it
-- by combining multiple rows with the same volunteer_name into single rows
-- with comma-separated colony_id values

