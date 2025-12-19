-- =====================================================
-- Create volunteer_master table
-- Fields: volunteer_name, contact_no, colony_id
-- =====================================================

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing table if exists (WARNING: This will delete all data!)
DROP TABLE IF EXISTS volunteer_master;

-- Create volunteer_master table
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

