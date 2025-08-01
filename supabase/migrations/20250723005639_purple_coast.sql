/*
  # Create cash flow tables for clinic management

  1. New Tables
    - `expense_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `is_custom` (boolean, default false)
      - `created_at` (timestamptz)
    
    - `expenses`
      - `id` (uuid, primary key)
      - `name` (text)
      - `amount` (numeric)
      - `date` (date)
      - `observations` (text)
      - `category_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `created_at` (timestamptz)
    
    - `revenues`
      - `id` (uuid, primary key)
      - `description` (text)
      - `amount` (numeric)
      - `date` (date)
      - `source` (text)
      - `user_id` (uuid, foreign key)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    
  3. Initial Data
    - Insert predefined expense categories
*/

-- Create expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  is_custom boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric NOT NULL,
  date date NOT NULL,
  observations text,
  category_id uuid REFERENCES expense_categories(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create revenues table
CREATE TABLE IF NOT EXISTS revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL,
  date date NOT NULL,
  source text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;

-- Policies for expense_categories (all users can read, only authenticated can create custom)
CREATE POLICY "Anyone can view expense categories"
  ON expense_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create custom categories"
  ON expense_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (is_custom = true);

-- Policies for expenses
CREATE POLICY "Users can view their own expenses"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create expenses"
  ON expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON expenses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON expenses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for revenues
CREATE POLICY "Users can view their own revenues"
  ON revenues
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create revenues"
  ON revenues
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revenues"
  ON revenues
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own revenues"
  ON revenues
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert predefined categories
INSERT INTO expense_categories (name, is_custom) VALUES
  ('Contadora', false),
  ('GPS', false),
  ('FGTS', false),
  ('Vale Transporte', false),
  ('Salário Secretária', false),
  ('Fisioterapeuta', false),
  ('Esteticista', false),
  ('Escelsa', false),
  ('Condomínio', false),
  ('Vivo', false),
  ('Claro', false),
  ('Dermamelan', false),
  ('Toxina Botulínica', false),
  ('Preenchedor', false),
  ('Sculptra', false),
  ('Cirúrgica Confiança', false),
  ('Ar Condicionado', false),
  ('CRM', false),
  ('SBCD', false),
  ('SBCD Soc. Bras. Dermatologia', false),
  ('Prefeitura', false),
  ('Hi Doctor', false)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses(date);
CREATE INDEX IF NOT EXISTS expenses_category_idx ON expenses(category_id);
CREATE INDEX IF NOT EXISTS expenses_user_idx ON expenses(user_id);
CREATE INDEX IF NOT EXISTS revenues_date_idx ON revenues(date);
CREATE INDEX IF NOT EXISTS revenues_user_idx ON revenues(user_id);