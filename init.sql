-- Initialize the database
CREATE DATABASE sump_it;

-- Connect to the database
\c sump_it;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The application will handle table creation through migrations
