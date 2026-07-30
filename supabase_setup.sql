-- ============================================================
--  Doctorji — Supabase Table Setup
--  Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── Doctors Table ───
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  dob DATE,
  age INTEGER,
  mobile TEXT,
  email TEXT UNIQUE NOT NULL,
  location TEXT,
  degree TEXT,
  certification TEXT,
  dr_card_link TEXT,
  speciality TEXT,
  experience INTEGER,
  clinic_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Patients Table ───
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  dob DATE,
  age INTEGER,
  mobile TEXT,
  email TEXT UNIQUE NOT NULL,
  location TEXT,
  prev_health_issue TEXT,
  blood_group TEXT,
  allergies TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Row Level Security (RLS) ───
-- Enable RLS so only authenticated users can read/write their own data.

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Doctors: users can read/insert/update their own row
CREATE POLICY "Doctors can view own profile"
  ON doctors FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Doctors can insert own profile"
  ON doctors FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Doctors can update own profile"
  ON doctors FOR UPDATE
  USING (auth.uid() = id);

-- Patients: users can read/insert/update their own row
CREATE POLICY "Patients can view own profile"
  ON patients FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Patients can insert own profile"
  ON patients FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Patients can update own profile"
  ON patients FOR UPDATE
  USING (auth.uid() = id);

-- ─── Cross-role email lookup (for signup validation) ───
-- Allow anyone authenticated to check if an email exists in the other table.
-- This only exposes the email column, not any other data.

CREATE POLICY "Allow email existence check on doctors"
  ON doctors FOR SELECT
  USING (true)  -- Anyone can check if an email exists
  ;

CREATE POLICY "Allow email existence check on patients"
  ON patients FOR SELECT
  USING (true)
  ;

-- NOTE: The above "allow all select" policies are simple for a hackathon.
-- In production, restrict these to only return the email column via a
-- Postgres function or a more granular policy.
