/*
  # Fix Quest Points to Update Total Points
  
  1. Changes
    - Update the increment_points function to add to total_points instead of points
    - Quest rewards should reflect in the profile's total points display
  
  2. Notes
    - The points field appears to be legacy
    - The profile displays total_points, reading_points, and creating_points
    - Quest points are general activity rewards and should go to total_points
*/

-- Drop and recreate the increment_points function to update total_points
CREATE OR REPLACE FUNCTION increment_points(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE user_profiles
  SET 
    total_points = COALESCE(total_points, 0) + p_amount,
    points = COALESCE(points, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;
