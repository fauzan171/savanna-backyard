-- Add payment_page_url column to bookings table for iFortePay integration
ALTER TABLE bookings ADD COLUMN payment_page_url TEXT;
