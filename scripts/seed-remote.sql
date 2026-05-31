-- Seed public data for remote D1

-- Vehicles (6)
INSERT OR IGNORE INTO vehicles (id, name, plate_number, type, brand, model, year, category, specs, description, daily_rate_idr, status, photo_url, created_at, updated_at) VALUES
('6080faa7-44e7-422e-93b2-236c9fa4ab6f', 'Honda CRF 150L', 'B 1234 SV', 'TrailBike', 'Honda', 'CRF 150L', 2024, '150cc Trail', '{"engine":"149.15 cc","power":"12.4 HP","weight":"122 kg","seat":"865 mm"}', 'A real Indonesian dual-sport favorite. Lightweight, reliable, and perfectly suited for Bromo''s volcanic sand terrain.', 200000, 'Available', '/images/bike_crf150.jpg', '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z'),
('a1711bfe-d78c-4488-bb8e-e26b622b0e63', 'Honda CRF 250L', 'B 5678 SV', 'TrailBike', 'Honda', 'CRF 250L', 2024, '250cc Trail', '{"engine":"249.6 cc","power":"24.4 HP","weight":"153 kg","seat":"875 mm"}', 'More power for experienced riders who want to tackle Bromo''s challenging trails with confidence.', 350000, 'Available', '/images/bike_crf250.jpg', '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z'),
('46856fa6-74f6-48b1-a111-2c94fcbe67a9', 'Kawasaki KLX 150', 'B 9012 SV', 'TrailBike', 'Kawasaki', 'KLX 150', 2024, '150cc Trail', '{"engine":"144 cc","power":"11.5 HP","weight":"114 kg","seat":"830 mm"}', 'Lightweight and nimble, the KLX 150 is perfect for beginners exploring Bromo for the first time.', 200000, 'Available', '/images/bike_klx150.jpg', '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z'),
('697a297f-0cd2-4bb3-81f1-9f7227b5c282', 'Kawasaki KLX 250', 'B 3456 SV', 'TrailBike', 'Kawasaki', 'KLX 250', 2024, '250cc Trail', '{"engine":"249 cc","power":"23.2 HP","weight":"138 kg","seat":"855 mm"}', 'A capable dual-sport machine that handles both on-road and off-road terrain with ease.', 350000, 'Available', '/images/bike_klx250.jpg', '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z'),
('e3cb8c89-0b22-4031-8659-6624584c0b2c', 'Yamaha NMAX', 'B 7890 SV', 'StreetBike', 'Yamaha', 'NMAX', 2024, '155cc Scooter', '{"engine":"155 cc","power":"15.4 HP","weight":"131 kg","seat":"765 mm"}', 'Comfortable scooter for city riding and easy trips around the Bromo area.', 150000, 'Available', '/images/bike_nmax.jpg', '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z'),
('e014e692-8c7f-41c0-af97-5b9fd462a6d5', 'Toyota Avanza', 'B 2345 SV', 'Car', 'Toyota', 'Avanza', 2024, 'MPV', '{"engine":"1496 cc","power":"104 HP","weight":"1155 kg","seat":"5 seats"}', 'Spacious family car perfect for group trips to Bromo with comfort and reliability.', 400000, 'Available', '/images/car_avanza.jpg', '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z');

-- Packages (4)
INSERT OR IGNORE INTO packages (id, name, tagline, description, image, duration, distance, group_size, price, trail_id, sort_order, is_active, created_at, updated_at) VALUES
('2333cc35-228d-440f-86fe-24ff2cb351d1', 'Self-Ride Day', 'Bike, helmet, route map.', 'A clean trail bike, basic gear, and a mapped Bromo route. You ride solo, at your own pace, with 24/7 phone support if needed.', '/images/package_sunrise.jpg', '1 day', 'Flexible', '1-2 riders', 180000, 'sea-of-sand', 0, 1, '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z'),
('7dd315d7-6b28-4e5b-8fd2-89b782b763f8', 'Guided Sunrise Tour', 'Guided sunrise, breakfast included.', 'An expert local guide leads you to Bromo''s famous sunrise viewpoint, then across the Sea of Sand. Breakfast at a local warung included.', '/images/package_guided.jpg', '1 day', '60 km', '2-6 riders', 350000, 'sea-of-sand', 1, 1, '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z'),
('a109334e-6814-43bd-9646-ceed01acc463', 'Multi-Day Adventure', '3 days, 2 nights, full support.', 'Explore Bromo, the Whispering Savanna, and hidden waterfalls over 3 days. Accommodation, meals, and full mechanical support included.', '/images/package_adventure.jpg', '3 days', '200 km', '4-8 riders', 750000, 'whispering-savanna', 2, 1, '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z'),
('23525aaa-7ff8-4482-b8f1-b519903115c1', 'Custom Bromo Trip', 'Tell us your dream trip.', 'Have something specific in mind? We''ll build a custom itinerary just for you — routes, duration, group size, all flexible.', '/images/package_custom.jpg', 'Flexible', 'Custom', 'Any', 0, NULL, 3, 1, '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z');

-- Pricing Tiers (3)
INSERT OR IGNORE INTO pricing_tiers (id, name, description, daily_price, multi_day_price, features, not_included, highlighted, icon, sort_order, is_active, created_at, updated_at) VALUES
('0d6de2a2-3cb2-4926-8133-2e287283c46c', 'Ride Only', 'For the independent rider', 150000, 120000, '["Motorcycle rental","Standard helmet","Basic insurance","24/7 roadside support"]', '["Riding gear","Raincoat","Phone holder","Route guide"]', 0, 'Bike', 0, 1, '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z'),
('9486c998-583e-402b-a172-361c445623f5', 'Ride + Guide', 'The most popular choice', 250000, 200000, '["Motorcycle rental","Full riding gear","Insurance included","Local route guide","Breakfast & water","Photo spots tour"]', '["Hotel pickup","Lunch/dinner"]', 1, 'Compass', 1, 1, '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z'),
('96e9863e-a44a-49d3-9c34-5ea783393c35', 'Full Package', 'All-inclusive adventure', 400000, 350000, '["Premium motorcycle","Full riding gear","Comprehensive insurance","Expert guide","All meals included","Hotel pickup & drop-off","Souvenir photo pack"]', '[]', 0, 'Crown', 2, 1, '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z');

-- Reviews (5)
INSERT OR IGNORE INTO reviews (id, name, location, rating, text, avatar, is_published, created_at, updated_at) VALUES
('fcc6a15e-04e4-4feb-94ea-27298d6ccb50', 'Ahmad Rizki', 'Jakarta', 5, 'Motor bersih, pelayanan ramah, rutenya jelas. Pengalaman pertama naik trail di Bromo dan sangat memuaskan!', 'AR', 1, '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z'),
('d1d7e73b-2ae6-4f1f-ab7c-65c26a19d0cd', 'Sarah Chen', 'Singapore', 5, 'Amazing experience! The bike was in perfect condition and the guide knew all the best spots. Will definitely come back.', 'SC', 1, '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z'),
('f92482e4-bbca-4b48-9250-4525cce8b948', 'Budi Santoso', 'Surabaya', 4, 'Trailnya seru, tapi agak menantang buat pemula. Untung guide-nya sabar dan sangat membantu. Recommended!', 'BS', 1, '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z'),
('17cba6e5-6479-4887-9d01-8dbd541cc73d', 'Lisa Wijaya', 'Bandung', 5, 'Sewa motor trail terbaik di Bromo! Harga reasonable, motor terawat, dan tim-nya super helpful.', 'LW', 1, '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z'),
('f8f800de-320a-4fa0-b74e-02f1342e2b3e', 'Tom Miller', 'Australia', 4, 'Great value for money. The KLX 150 was perfect for the terrain. Just wish there were more trail options.', 'TM', 1, '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z');

-- Trails (3)
INSERT OR IGNORE INTO trails (id, name, description, terrain, elevation, difficulty, recommended, image, map_image, blog_overview, blog_tips, blog_gallery, gpx_url, estimated_duration, distance, best_time, sort_order, is_active, created_at, updated_at) VALUES
('sea-of-sand', 'Sea of Sand Loop', 'The classic Bromo crossing through volcanic sand dunes.', 'Volcanic Sand, Gravel', '2,100m - 2,329m', 'Moderate', 'CRF 150L / KLX 150', '/images/dayride_bike_landscape.jpg', '/images/map_sea_of_sand.png', 'The Sea of Sand is Bromo''s most iconic landscape — a vast, otherworldly plain of volcanic sand stretching between the caldera walls. This loop takes you across the sandy basin, up to the crater rim, and back through local village trails.

The terrain is mostly soft sand with some gravel sections, making it perfect for trail bikes. The total loop covers about 25km and takes 2-3 hours at a comfortable pace.', '- Start early (4-5 AM) for sunrise views from the crater rim
- Carry extra water — there are no shops on the trail
- Lower your tire pressure slightly for better sand traction
- Wear a dust mask or bandana over your nose and mouth
- The sand can be deep in some sections — maintain momentum', '["/images/trail/sea_1.jpg","/images/trail/sea_2.jpg","/images/trail/sea_3.jpg"]', '/gpx/sea_of_sand.gpx', '2-3 hours', '25 km', 'Dry season (April - October)', 0, 1, '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z'),
('whispering-savanna', 'Whispering Savanna', 'Gentle rolling hills with stunning views of the caldera.', 'Grassland, Dirt Track', '2,000m - 2,200m', 'Easy', 'Any trail bike', '/images/trail_savanna.jpg', '/images/map_whispering_savanna.png', 'The Whispering Savanna is a peaceful ride through Bromo''s highland meadows. Unlike the dramatic sand dunes, this trail offers gentle rolling hills covered in tussock grass, with panoramic views of the Tengger caldera.

Perfect for beginners or those who want a relaxed ride with spectacular scenery. The trail is mostly firm dirt with some grassy sections.', '- Great for beginners — very forgiving terrain
- Best during golden hour (early morning or late afternoon)
- Watch out for grazing horses and cattle
- Bring a camera — the views are incredible
- Can be combined with Sea of Sand for a longer ride', '["/images/trail/savanna_1.jpg","/images/trail/savanna_2.jpg"]', '/gpx/whispering_savanna.gpx', '1-2 hours', '15 km', 'Year-round (best in dry season)', 1, 1, '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z'),
('caldera-rim', 'Caldera Rim Trail', 'Challenging ride along the volcanic caldera edge.', 'Rocky, Steep inclines, Volcanic ash', '2,200m - 2,700m', 'Hard', 'CRF 250L / KLX 250', '/images/trail_caldera.jpg', '/images/map_caldera_rim.png', 'The Caldera Rim Trail is not for the faint of heart. This advanced route follows the edge of the ancient Tengger caldera, with steep climbs, rocky sections, and narrow paths along cliff edges.

The reward? Unparalleled views of the entire Bromo-Tengger-Semeru National Park, from the smoking crater of Semeru to the distant Indian Ocean on clear days.', '- NOT for beginners — requires confident off-road skills
- Use a 250cc bike or larger for the steep climbs
- Start early to avoid afternoon clouds obscuring views
- Bring warm clothing — it gets cold at 2,700m
- Never ride alone on this trail
- Check weather conditions before departing', '["/images/trail/caldera_1.jpg","/images/trail/caldera_2.jpg","/images/trail/caldera_3.jpg"]', '/gpx/caldera_rim.gpx', '4-5 hours', '40 km', 'Dry season only (June - September)', 2, 1, '2026-05-29T00:00:00.000Z', '2026-05-29T00:00:00.000Z');

-- System Configuration (settings)
INSERT OR IGNORE INTO system_configuration (key, value, description) VALUES
('public_api_enabled', 'true', 'Enable/disable public API'),
('public_api_key', 'savanna-dev-api-key-2026', 'API key for public endpoints'),
('contact_email', 'hello@savannabromo.com', 'Contact email'),
('contact_phone', '+6281234567890', 'Contact phone'),
('whatsapp_number', '6281234567890', 'WhatsApp number (without +)'),
('location', 'Malang, East Java', 'Business location'),
('instagram_url', 'https://instagram.com/savannabromorental', 'Instagram URL'),
('bank_name', 'BCA', 'Bank name for manual transfer'),
('bank_account_number', '315 089 1234', 'Bank account number'),
('bank_account_holder', 'Savanna Bromo Rental', 'Bank account holder name'),
('deposit_amount', '500000', 'Deposit amount in IDR'),
('deposit_description', 'Fully refundable', 'Deposit description');
