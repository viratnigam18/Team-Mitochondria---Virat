-- ============================================================
--  Doctorji — Full Supabase Migration
--  Run this in Supabase Dashboard → SQL Editor
--  This replaces the old supabase_setup.sql
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

-- ─── Connections Table ───
-- Links patients to doctors with request/accept/reject workflow
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_id, doctor_id)
);

-- ─── Checkups Table ───
-- Stores AI triage results for each symptom analysis session
CREATE TABLE IF NOT EXISTS checkups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  symptom_text TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('green', 'medium', 'red')),
  ai_advice TEXT,
  home_remedy TEXT,
  medicine TEXT,
  food_advice TEXT,
  cause_guess TEXT,
  future_risk TEXT,
  avoid_list TEXT,
  doctor_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
--  Row Level Security (RLS)
-- ============================================================

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkups ENABLE ROW LEVEL SECURITY;

-- ─── Doctors Policies ───

-- Drop existing policies if they exist (safe re-run)
DROP POLICY IF EXISTS "Doctors can view own profile" ON doctors;
DROP POLICY IF EXISTS "Doctors can insert own profile" ON doctors;
DROP POLICY IF EXISTS "Doctors can update own profile" ON doctors;
DROP POLICY IF EXISTS "Allow email existence check on doctors" ON doctors;
DROP POLICY IF EXISTS "Anyone authenticated can browse doctors" ON doctors;

-- Doctors: own profile CRUD
CREATE POLICY "Doctors can insert own profile"
  ON doctors FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Doctors can update own profile"
  ON doctors FOR UPDATE
  USING (auth.uid() = id);

-- Anyone authenticated can browse doctors (for "Find a Doctor" feature)
CREATE POLICY "Anyone authenticated can browse doctors"
  ON doctors FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ─── Patients Policies ───

DROP POLICY IF EXISTS "Patients can view own profile" ON patients;
DROP POLICY IF EXISTS "Patients can insert own profile" ON patients;
DROP POLICY IF EXISTS "Patients can update own profile" ON patients;
DROP POLICY IF EXISTS "Allow email existence check on patients" ON patients;
DROP POLICY IF EXISTS "Anyone authenticated can view patients" ON patients;

CREATE POLICY "Patients can insert own profile"
  ON patients FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Patients can update own profile"
  ON patients FOR UPDATE
  USING (auth.uid() = id);

-- Patients can view own profile; doctors can view connected patients
CREATE POLICY "Anyone authenticated can view patients"
  ON patients FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ─── Connections Policies ───

-- Patients can create connection requests
CREATE POLICY "Patients can create connections"
  ON connections FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- Both parties can view their connections
CREATE POLICY "Users can view own connections"
  ON connections FOR SELECT
  USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

-- Doctors can update connection status (accept/reject)
CREATE POLICY "Doctors can update connection status"
  ON connections FOR UPDATE
  USING (auth.uid() = doctor_id);

-- ─── Checkups Policies ───

-- Patients can insert their own checkups
CREATE POLICY "Patients can insert own checkups"
  ON checkups FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- Patients can view their own checkups
CREATE POLICY "Patients can view own checkups"
  ON checkups FOR SELECT
  USING (auth.uid() = patient_id);

-- Doctors can view checkups of connected patients
CREATE POLICY "Doctors can view connected patient checkups"
  ON checkups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.doctor_id = auth.uid()
        AND connections.patient_id = checkups.patient_id
        AND connections.status = 'accepted'
    )
  );

-- Doctors can add notes to connected patient checkups
CREATE POLICY "Doctors can add notes to checkups"
  ON checkups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.doctor_id = auth.uid()
        AND connections.patient_id = checkups.patient_id
        AND connections.status = 'accepted'
    )
  );

-- ─── Triage Sessions Table ───
-- Stores full AI triage conversation threads (messages array)
CREATE TABLE IF NOT EXISTS triage_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity TEXT CHECK (severity IS NULL OR severity IN ('green', 'medium', 'red')),
  checkup_id UUID REFERENCES checkups(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE triage_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can insert own triage sessions" ON triage_sessions;
DROP POLICY IF EXISTS "Patients can view own triage sessions" ON triage_sessions;
DROP POLICY IF EXISTS "Patients can update own triage sessions" ON triage_sessions;
DROP POLICY IF EXISTS "Patients can delete own triage sessions" ON triage_sessions;

CREATE POLICY "Patients can insert own triage sessions"
  ON triage_sessions FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can view own triage sessions"
  ON triage_sessions FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can update own triage sessions"
  ON triage_sessions FOR UPDATE
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can delete own triage sessions"
  ON triage_sessions FOR DELETE
  USING (auth.uid() = patient_id);
