-- Migration: Add new student fields for data migration from old system
-- Date: 2026-01-28

-- Add phone2 (secondary contact)
ALTER TABLE students ADD COLUMN phone2 TEXT;

-- Add address (residential address)
ALTER TABLE students ADD COLUMN address TEXT;

-- Add gender
ALTER TABLE students ADD COLUMN gender TEXT CHECK (gender IN ('Male', 'Female'));

-- Add date_of_birth
ALTER TABLE students ADD COLUMN date_of_birth TEXT;

-- Add parent_cnic (Father's CNIC)
ALTER TABLE students ADD COLUMN parent_cnic TEXT;

-- Add removal_date (date when student left)
ALTER TABLE students ADD COLUMN removal_date TEXT;
