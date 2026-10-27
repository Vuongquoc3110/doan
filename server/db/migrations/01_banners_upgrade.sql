-- ==============================================================================
-- MIGRATION 01: UPGRADE BANNERS & ADD BANNER_EVENTS
-- Klever Fruit Omnichannel Platform
-- Tương thích ngược tuyệt đối: Không xóa dữ liệu, chỉ mở rộng cột và bảng
-- ==============================================================================

-- 1. Bổ sung các cột mở rộng cho bảng banners
ALTER TABLE `banners`
  ADD COLUMN IF NOT EXISTS `subtitle` VARCHAR(255) NULL AFTER `title`,
  ADD COLUMN IF NOT EXISTS `image_web` VARCHAR(255) NULL AFTER `image_url`,
  ADD COLUMN IF NOT EXISTS `image_mobile` VARCHAR(255) NULL AFTER `image_web`,
  ADD COLUMN IF NOT EXISTS `placement` ENUM('home_hero', 'home_mid', 'category_top') NOT NULL DEFAULT 'home_hero' AFTER `image_mobile`,
  ADD COLUMN IF NOT EXISTS `platform` ENUM('web', 'mobile', 'all') NOT NULL DEFAULT 'all' AFTER `placement`,
  ADD COLUMN IF NOT EXISTS `link_type` ENUM('collection', 'product', 'article', 'url') NOT NULL DEFAULT 'url' AFTER `link_url`,
  ADD COLUMN IF NOT EXISTS `link_value` VARCHAR(255) NULL AFTER `link_type`,
  ADD COLUMN IF NOT EXISTS `cta_label` VARCHAR(100) NULL DEFAULT 'Mua ngay' AFTER `link_value`,
  ADD COLUMN IF NOT EXISTS `start_at` DATETIME NULL AFTER `sort`,
  ADD COLUMN IF NOT EXISTS `end_at` DATETIME NULL AFTER `start_at`,
  ADD COLUMN IF NOT EXISTS `countdown_at` DATETIME NULL AFTER `end_at`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `is_active`;

-- 2. Đồng bộ giá trị mặc định cho image_web nếu rỗng
UPDATE `banners` SET `image_web` = `image_url` WHERE `image_web` IS NULL OR `image_web` = '';
UPDATE `banners` SET `image_mobile` = `image_url` WHERE `image_mobile` IS NULL OR `image_mobile` = '';

-- 3. Tạo bảng banner_events phục vụ tracking VIEW / CLICK
CREATE TABLE IF NOT EXISTS `banner_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `banner_id` INT NOT NULL,
  `event_type` ENUM('VIEW', 'CLICK') NOT NULL,
  `platform` ENUM('web', 'mobile') NOT NULL DEFAULT 'web',
  `session_id` VARCHAR(100) NULL,
  `user_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`banner_id`) REFERENCES `banners` (`id`) ON DELETE CASCADE,
  INDEX `idx_banner_events_banner` (`banner_id`),
  INDEX `idx_banner_events_type` (`event_type`),
  INDEX `idx_banner_events_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
