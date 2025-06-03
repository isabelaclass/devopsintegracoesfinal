CREATE TABLE IF NOT EXISTS user (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS message (
  message_id INT AUTO_INCREMENT PRIMARY KEY,
  message TEXT,
  user_id_send INT,
  user_id_receive INT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
