-- ============================================================
-- Enable RLS on tables flagged by Supabase Security Advisor
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================
-- NOTE: All API routes use supabaseAdmin (service_role key), which bypasses
-- RLS automatically. These policies are defensive — they restrict direct
-- PostgREST / anon client access while leaving the server-side admin client
-- completely unaffected.


-- ─────────────────────────────────────────────────────────────
-- 1. players  (public read-only reference table)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) may read player data — needed for the draft UI
CREATE POLICY "players: public read"
  ON public.players
  FOR SELECT
  USING (true);

-- Only the service role (API backend) may insert / update / delete
-- No explicit policy needed for INSERT/UPDATE/DELETE: RLS blocks all
-- non-service-role writes by default when no matching policy exists.


-- ─────────────────────────────────────────────────────────────
-- 2. draft_comments  (scoped to league members)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.draft_comments ENABLE ROW LEVEL SECURITY;

-- Authenticated league members may read comments in their leagues
CREATE POLICY "draft_comments: members can read"
  ON public.draft_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.league_members lm
      WHERE lm.league_id = draft_comments.league_id
        AND lm.user_id   = auth.uid()::text
    )
  );

-- Authenticated league members may post comments (commenter = themselves)
CREATE POLICY "draft_comments: members can insert own"
  ON public.draft_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    commenter_user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.league_members lm
      WHERE lm.league_id = draft_comments.league_id
        AND lm.user_id   = auth.uid()::text
    )
  );

-- Users may delete only their own comments
CREATE POLICY "draft_comments: owner can delete"
  ON public.draft_comments
  FOR DELETE
  TO authenticated
  USING (commenter_user_id = auth.uid()::text);


-- ─────────────────────────────────────────────────────────────
-- 3. league_messages  (scoped to league members)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.league_messages ENABLE ROW LEVEL SECURITY;

-- Authenticated league members may read messages in their leagues
CREATE POLICY "league_messages: members can read"
  ON public.league_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.league_members lm
      WHERE lm.league_id = league_messages.league_id
        AND lm.user_id   = auth.uid()::text
    )
  );

-- Authenticated league members may post messages (author = themselves)
CREATE POLICY "league_messages: members can insert own"
  ON public.league_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.league_members lm
      WHERE lm.league_id = league_messages.league_id
        AND lm.user_id   = auth.uid()::text
    )
  );

-- Users may update only their own messages (e.g. reactions stored on the row)
CREATE POLICY "league_messages: owner can update"
  ON public.league_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Users may delete only their own messages
CREATE POLICY "league_messages: owner can delete"
  ON public.league_messages
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);
