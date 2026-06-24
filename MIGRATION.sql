-- ================================================================
-- Backlog database migration — run in Supabase SQL editor
-- ================================================================

-- 1. Extended user_games columns (platform, time played, tags, etc.)
ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS platform         text,
  ADD COLUMN IF NOT EXISTS time_played      numeric,
  ADD COLUMN IF NOT EXISTS completion_type  text,
  ADD COLUMN IF NOT EXISTS tags             text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS spoiler          boolean DEFAULT false;

-- 2. Follow system
CREATE TABLE IF NOT EXISTS follows (
  follower_id  uuid REFERENCES auth.users NOT NULL,
  following_id uuid REFERENCES auth.users NOT NULL,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "follows_select" ON follows;
DROP POLICY IF EXISTS "follows_write"  ON follows;
CREATE POLICY "follows_select" ON follows FOR SELECT USING (true);
CREATE POLICY "follows_write"  ON follows FOR ALL   USING (auth.uid() = follower_id);

-- 3. Review likes
CREATE TABLE IF NOT EXISTS review_likes (
  user_id        uuid REFERENCES auth.users NOT NULL,
  target_user_id uuid REFERENCES auth.users NOT NULL,
  game_id        integer NOT NULL,
  created_at     timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, target_user_id, game_id)
);
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "review_likes_select" ON review_likes;
DROP POLICY IF EXISTS "review_likes_write"  ON review_likes;
CREATE POLICY "review_likes_select" ON review_likes FOR SELECT USING (true);
CREATE POLICY "review_likes_write"  ON review_likes FOR ALL   USING (auth.uid() = user_id);

-- 4. Custom lists
CREATE TABLE IF NOT EXISTS lists (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  title       text NOT NULL,
  description text,
  is_public   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS list_items (
  list_id  uuid REFERENCES lists(id) ON DELETE CASCADE,
  game_id  integer NOT NULL,
  note     text,
  position integer DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  PRIMARY KEY (list_id, game_id)
);
ALTER TABLE lists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lists_select"      ON lists;
DROP POLICY IF EXISTS "lists_write"       ON lists;
DROP POLICY IF EXISTS "list_items_select" ON list_items;
DROP POLICY IF EXISTS "list_items_write"  ON list_items;
CREATE POLICY "lists_select" ON lists FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "lists_write"  ON lists FOR ALL   USING (auth.uid() = user_id);
CREATE POLICY "list_items_select" ON list_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM lists WHERE lists.id = list_id AND (lists.is_public OR lists.user_id = auth.uid())));
CREATE POLICY "list_items_write" ON list_items FOR ALL
  USING (EXISTS (SELECT 1 FROM lists WHERE lists.id = list_id AND lists.user_id = auth.uid()));

-- 5. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  type       text NOT NULL,
  from_user  uuid REFERENCES auth.users,
  payload    jsonb,
  read       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications (user_id, read, created_at DESC);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Done! All features should now be active.
