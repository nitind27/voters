-- Create table for storing voter checkbox data
CREATE TABLE IF NOT EXISTS voter_checkbox_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    colony_id INT NOT NULL,
    member_id INT NOT NULL,
    checkbox_data VARCHAR(50) NOT NULL, -- Format: "true|false|true|false"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_colony_member (colony_id, member_id),
    INDEX idx_colony_id (colony_id),
    INDEX idx_member_id (member_id)
);

-- Sample data insertion (optional)
-- INSERT INTO voter_checkbox_data (colony_id, member_id, checkbox_data) VALUES 
-- (1, 101, 'true|false|true|false'),
-- (1, 102, 'false|true|false|true'),
-- (2, 201, 'true|true|false|false');

-- Note: checkbox_data format explanation:
-- Position 1: C1 checkbox (true/false)
-- Position 2: C2 checkbox (true/false) 
-- Position 3: C3 checkbox (true/false)
-- Position 4: C4 checkbox (true/false)
-- Separated by pipe (|) character
