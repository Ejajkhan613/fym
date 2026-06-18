CREATE TABLE IF NOT EXISTS customer_family_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name varchar(120) NOT NULL,
  relationship varchar(80) NOT NULL,
  date_of_birth date,
  gender varchar(40),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT customer_family_profiles_gender_check CHECK (
    gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say')
  )
);

CREATE INDEX IF NOT EXISTS customer_family_profiles_user_idx
  ON customer_family_profiles (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS medicine_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_profile_id uuid REFERENCES customer_family_profiles(id) ON DELETE SET NULL,
  medicine_name varchar(180) NOT NULL,
  dosage varchar(120),
  frequency varchar(80) NOT NULL,
  schedule_time time NOT NULL,
  start_date date NOT NULL,
  end_date date,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT medicine_reminders_date_check CHECK (
    end_date IS NULL OR end_date >= start_date
  )
);

CREATE INDEX IF NOT EXISTS medicine_reminders_user_idx
  ON medicine_reminders (user_id, is_active, schedule_time);

CREATE INDEX IF NOT EXISTS medicine_reminders_family_profile_idx
  ON medicine_reminders (family_profile_id);

CREATE TABLE IF NOT EXISTS customer_privacy_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  push_notifications_enabled boolean NOT NULL DEFAULT true,
  sms_notifications_enabled boolean NOT NULL DEFAULT true,
  order_updates_enabled boolean NOT NULL DEFAULT true,
  prescription_updates_enabled boolean NOT NULL DEFAULT true,
  support_updates_enabled boolean NOT NULL DEFAULT true,
  medicine_reminders_enabled boolean NOT NULL DEFAULT true,
  promotional_offers_enabled boolean NOT NULL DEFAULT false,
  data_sharing_consent boolean NOT NULL DEFAULT false,
  gps_for_addresses_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
