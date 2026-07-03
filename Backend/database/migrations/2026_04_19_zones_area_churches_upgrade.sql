-- Add area and churches fields to zones
ALTER TABLE zones
    ADD COLUMN area TEXT NULL,
    ADD COLUMN churches TEXT NULL;
