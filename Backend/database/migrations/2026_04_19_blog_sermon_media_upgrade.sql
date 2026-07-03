-- Blog and sermon media upgrade
-- Adds support for multi-photo blog posts and sermon file references on existing databases.

ALTER TABLE blog_posts
    ADD COLUMN gallery_images LONGTEXT NULL;

ALTER TABLE sermons
    ADD COLUMN video_file_id INT NULL,
    ADD COLUMN audio_file_id INT NULL,
    ADD COLUMN thumbnail_file_id INT NULL;

ALTER TABLE sermons
    ADD CONSTRAINT fk_sermons_video_file
        FOREIGN KEY (video_file_id) REFERENCES uploaded_files(id) ON DELETE SET NULL;

ALTER TABLE sermons
    ADD CONSTRAINT fk_sermons_audio_file
        FOREIGN KEY (audio_file_id) REFERENCES uploaded_files(id) ON DELETE SET NULL;

ALTER TABLE sermons
    ADD CONSTRAINT fk_sermons_thumbnail_file
        FOREIGN KEY (thumbnail_file_id) REFERENCES uploaded_files(id) ON DELETE SET NULL;
 