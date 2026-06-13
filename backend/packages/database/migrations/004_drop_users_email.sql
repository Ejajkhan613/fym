DROP INDEX IF EXISTS users_email_unique_idx;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_contact_required,
  DROP COLUMN IF EXISTS email;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_phone_required'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_phone_required CHECK (phone IS NOT NULL);
  END IF;
END $$;

ALTER TABLE users
  ALTER COLUMN phone SET NOT NULL;
