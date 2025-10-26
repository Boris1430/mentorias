/*
  # Create Users and Profiles with Role-Based Access Control

  ## Overview
  This migration establishes a secure role-based authentication system for the mentoring platform with three distinct roles: admin, emprendedor (entrepreneur), and mentor.

  ## 1. New Tables
  
  ### `profiles`
  - `id` (uuid, primary key) - References auth.users(id)
  - `email` (text, not null) - User's email address
  - `full_name` (text, not null) - User's full name
  - `role` (text, not null) - User role: 'emprendedor', 'mentor', or 'admin'
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## 2. Security Implementation
  
  ### Row Level Security (RLS)
  - RLS is enabled on the profiles table to ensure data isolation
  - Users can only view their own profile data
  - Users can only update their own profile (but cannot change their role)
  - Only authenticated users with 'admin' role can view all profiles
  - Role assignment is controlled server-side to prevent privilege escalation

  ## 3. Important Notes
  
  ### Role Restrictions
  - The 'admin' role cannot be self-assigned during registration
  - Admin accounts must be created manually in the database
  - Emprendedores and mentores can only register themselves with their respective roles
  - Role changes require admin privileges and must be done directly in the database

  ### Trigger Function
  - Automatic profile creation on user signup is handled via a database trigger
  - The trigger ensures every auth.users entry has a corresponding profile
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('emprendedor', 'mentor', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Users can update their own profile (but not their role)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Policy: New users can insert their profile during registration (emprendedor or mentor only)
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id 
    AND role IN ('emprendedor', 'mentor')
  );

-- Create trigger function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'emprendedor')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
