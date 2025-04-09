/*
  # Create appointments table

  1. New Tables
    - `appointments`
      - `id` (uuid, primary key)
      - `patient_name` (text)
      - `cpf` (text)
      - `procedure` (text)
      - `total_value` (numeric)
      - `installments` (integer)
      - `installment_value` (numeric)
      - `procedure_date` (date)
      - `next_payment_date` (date)
      - `status` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `appointments` table
    - Add policies for authenticated users to manage their appointments
*/

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  cpf text NOT NULL,
  procedure text NOT NULL,
  total_value numeric NOT NULL,
  installments integer NOT NULL DEFAULT 1,
  installment_value numeric NOT NULL,
  procedure_date date NOT NULL,
  next_payment_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create appointments"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS appointments_cpf_idx ON appointments(cpf);
CREATE INDEX IF NOT EXISTS appointments_patient_name_idx ON appointments(patient_name);
CREATE INDEX IF NOT EXISTS appointments_next_payment_date_idx ON appointments(next_payment_date);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments(status);