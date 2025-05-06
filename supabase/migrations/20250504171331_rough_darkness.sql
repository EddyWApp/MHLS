/*
  # Add payment method column to appointments table

  1. Changes
    - Add payment_method column to appointments table to track how the payment was made
*/

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'credit_card';