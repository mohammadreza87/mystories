/*
  # Add Story Images Storage Bucket

  1. Storage Bucket
    - Create `story-images` bucket for storing AI-generated story illustrations
    - Enable public access for story images
    
  2. Security Policies
    - Allow authenticated users to upload images
    - Allow public read access to all images
    - Images are permanent and don't expire
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('story-images', 'story-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload story images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'story-images');

CREATE POLICY "Public access to story images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'story-images');
