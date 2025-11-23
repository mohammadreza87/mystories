/*
  # Activity tracking triggers

  Adds a helper trigger to stamp last_active_at when quests progress is updated.
*/

CREATE OR REPLACE FUNCTION public.touch_user_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_profiles
  SET last_active_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_activity_on_quests ON user_quests;

CREATE TRIGGER touch_activity_on_quests
AFTER UPDATE ON user_quests
FOR EACH ROW
EXECUTE FUNCTION touch_user_activity();
