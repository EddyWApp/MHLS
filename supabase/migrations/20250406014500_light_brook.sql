/*
  # Add installment number column

  1. Changes
    - Add installment_number column to appointments table
    - This column will track which installment number each payment represents
*/

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS installment_number integer DEFAULT 1;