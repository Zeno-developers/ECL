-- Add gallery_images field to blog_posts
-- This fixes blog create/update operations that persist gallery image URLs/metadata.

ALTER TABLE `blog_posts`
  ADD COLUMN `gallery_images` LONGTEXT NULL;

