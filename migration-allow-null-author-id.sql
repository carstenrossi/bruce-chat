-- Migration: Allow NULL author_id for AI messages
-- Execute this in your Supabase SQL Editor

-- Remove NOT NULL constraint from author_id to allow AI messages with NULL author_id
ALTER TABLE messages ALTER COLUMN author_id DROP NOT NULL;

-- Verify the change
\d messages;