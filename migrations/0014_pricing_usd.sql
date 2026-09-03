-- LC-006: pricing tiers get optional USD prices, mirroring vehicles.daily_rate_usd
ALTER TABLE `pricing_tiers` ADD COLUMN `daily_price_usd` integer;
ALTER TABLE `pricing_tiers` ADD COLUMN `multi_day_price_usd` integer;
