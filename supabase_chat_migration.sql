-- ============================================================
--  Doctorji — Chat Messages Migration
--  Run this in Supabase Dashboard → SQL Editor → New Query → RUN
--  Then enable Realtime for `messages` and `connections` tables:
--    Dashboard → Database → Replication → enable both tables
-- ============================================================

-- ─── Messages Table ───
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Both parties in the connection can view messages
DROP POLICY IF EXISTS "Users can view messages in their connections" ON messages;
CREATE POLICY "Users can view messages in their connections"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = messages.connection_id
        AND (connections.patient_id = auth.uid() OR connections.doctor_id = auth.uid())
        AND connections.status = 'accepted'
    )
  );

-- Both parties can send messages (only as themselves)
DROP POLICY IF EXISTS "Users can send messages in their connections" ON messages;
CREATE POLICY "Users can send messages in their connections"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = connection_id
        AND (connections.patient_id = auth.uid() OR connections.doctor_id = auth.uid())
        AND connections.status = 'accepted'
    )
  );

-- Users can mark messages as read
DROP POLICY IF EXISTS "Users can update read status" ON messages;
CREATE POLICY "Users can update read status"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = messages.connection_id
        AND (connections.patient_id = auth.uid() OR connections.doctor_id = auth.uid())
    )
  );
