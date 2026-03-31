-- Reset streak values for a specific user profile.
-- Replace <user-id> with the UUID from auth.users / profiles.id.
UPDATE profiles
SET
  streak_current = 0,
  streak_longest = 0,
  streak_last_activity = NULL
WHERE id = '<user-id>';
