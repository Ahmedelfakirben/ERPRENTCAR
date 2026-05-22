-- ============================================
-- ERP RENTACAR — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (linked to auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  full_name_ar TEXT DEFAULT '',
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. VEHICLES
-- ============================================
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate TEXT NOT NULL UNIQUE,          -- Matricule (e.g., 12345-A-1)
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT NOT NULL,
  fuel TEXT NOT NULL DEFAULT 'Diesel' CHECK (fuel IN ('Diesel', 'Essence', 'Hybride', 'Électrique')),
  color TEXT,
  seats INT DEFAULT 5,
  transmission TEXT DEFAULT 'Manuelle' CHECK (transmission IN ('Manuelle', 'Automatique')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance', 'blocked')),
  daily_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_km INT DEFAULT 0,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. VEHICLE DOCUMENTS (Carte Grise, Assurance, VT)
-- ============================================
CREATE TABLE public.vehicle_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('carte_grise', 'assurance', 'visite_technique')),
  doc_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  file_url TEXT,                        -- Supabase Storage path
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicle_docs_vehicle ON public.vehicle_documents(vehicle_id);
CREATE INDEX idx_vehicle_docs_expiry ON public.vehicle_documents(expiry_date);

-- ============================================
-- 4. MAINTENANCE
-- ============================================
CREATE TABLE public.maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('oil_change', 'tires', 'brakes', 'general', 'other')),
  description TEXT,
  cost NUMERIC(10,2) DEFAULT 0,
  km_at_service INT,
  performed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  next_due_date DATE,
  next_due_km INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maintenance_vehicle ON public.maintenance(vehicle_id);

-- ============================================
-- 5. VEHICLE DAMAGE PHOTOS
-- ============================================
CREATE TABLE public.vehicle_damage_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  contract_id UUID,                     -- will reference contracts(id) once created
  photo_type TEXT NOT NULL CHECK (photo_type IN ('check_in', 'check_out')),
  file_url TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 6. CLIENTS (CRM)
-- ============================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  phone TEXT,
  email TEXT,
  cin TEXT,                             -- Carte d'Identité Nationale
  passport TEXT,
  driver_license TEXT,
  nationality TEXT DEFAULT 'Marocaine',
  address TEXT,
  foreign_address TEXT,
  birth_date DATE,
  birth_place TEXT,
  license_date DATE,
  is_blacklisted BOOLEAN NOT NULL DEFAULT FALSE,
  blacklist_reason TEXT,
  is_vip BOOLEAN NOT NULL DEFAULT FALSE,
  discount_pct NUMERIC(5,2) DEFAULT 0,  -- Loyalty discount %
  total_rentals INT DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0,
  cin_scan_url TEXT,                    -- Supabase Storage
  license_scan_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_cin ON public.clients(cin);
CREATE INDEX idx_clients_blacklist ON public.clients(is_blacklisted);

-- ============================================
-- 7. CONTRACTS
-- ============================================
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_number TEXT NOT NULL UNIQUE,  -- e.g., CT-2026-001
  client_id UUID NOT NULL REFERENCES public.clients(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  created_by UUID REFERENCES public.profiles(id),

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  actual_return_date DATE,

  -- Financial
  daily_rate NUMERIC(10,2) NOT NULL,
  total_days INT NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,       -- daily_rate * total_days
  discount_amount NUMERIC(10,2) DEFAULT 0,
  tva_rate NUMERIC(5,2) DEFAULT 20.00,   -- TVA %
  tva_amount NUMERIC(10,2) DEFAULT 0,
  total_ttc NUMERIC(12,2) NOT NULL,
  deposit_amount NUMERIC(10,2) DEFAULT 0,
  deposit_returned BOOLEAN DEFAULT FALSE,

  -- Check-in / Check-out
  fuel_level_out TEXT CHECK (fuel_level_out IN ('empty', '1/4', '1/2', '3/4', 'full')),
  fuel_level_in TEXT CHECK (fuel_level_in IN ('empty', '1/4', '1/2', '3/4', 'full')),
  km_out INT,
  km_in INT,
  cleanliness_out TEXT CHECK (cleanliness_out IN ('clean', 'acceptable', 'dirty')),
  cleanliness_in TEXT CHECK (cleanliness_in IN ('clean', 'acceptable', 'dirty')),
  time_out TEXT DEFAULT '10:00',
  time_in TEXT DEFAULT '20:00',
  actual_return_time TEXT,
  second_driver_name TEXT,
  second_driver_birth TEXT,
  second_driver_address TEXT,
  second_driver_license TEXT,
  second_driver_license_date DATE,

  -- Metadata
  contract_language TEXT DEFAULT 'fr' CHECK (contract_language IN ('fr', 'ar', 'en', 'es')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'overdue')),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK for damage photos now that contracts exist
ALTER TABLE public.vehicle_damage_photos
  ADD CONSTRAINT fk_damage_contract
  FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;

CREATE INDEX idx_contracts_client ON public.contracts(client_id);
CREATE INDEX idx_contracts_vehicle ON public.contracts(vehicle_id);
CREATE INDEX idx_contracts_dates ON public.contracts(start_date, end_date);
CREATE INDEX idx_contracts_status ON public.contracts(status);

-- ============================================
-- 8. TRANSACTIONS (FINANCES LEDGER)
-- ============================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  category TEXT NOT NULL,               -- 'contract', 'deposit', 'repair', 'salary', 'rent', 'fine', 'fuel', 'other'
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  tva_amount NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer', 'check')),
  
  -- Linked entities
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,

  recorded_by UUID REFERENCES public.profiles(id),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);

-- ============================================
-- 9. INVOICES
-- ============================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL UNIQUE,   -- e.g., FAC-2026-042
  contract_id UUID REFERENCES public.contracts(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  
  amount_ht NUMERIC(12,2) NOT NULL,
  tva_rate NUMERIC(5,2) DEFAULT 20.00,
  tva_amount NUMERIC(10,2) NOT NULL,
  amount_ttc NUMERIC(12,2) NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_method TEXT,
  payment_date DATE,
  
  issued_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 10. FINES (AMENDES / MULTAS)
-- ============================================
CREATE TABLE public.fines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  contract_id UUID REFERENCES public.contracts(id),
  client_id UUID REFERENCES public.clients(id),
  
  fine_date DATE NOT NULL,
  fine_type TEXT NOT NULL,               -- 'speed', 'parking', 'red_light', 'other'
  plate TEXT,
  amount NUMERIC(10,2) NOT NULL,
  reference TEXT,                        -- Official reference number
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'charged', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fines_vehicle ON public.fines(vehicle_id);
CREATE INDEX idx_fines_date ON public.fines(fine_date);

-- ============================================
-- 11. PRICING RULES (SEASONAL)
-- ============================================
CREATE TABLE public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_name TEXT NOT NULL,
  season_name_ar TEXT,
  start_month INT NOT NULL CHECK (start_month BETWEEN 1 AND 12),
  start_day INT NOT NULL CHECK (start_day BETWEEN 1 AND 31),
  end_month INT NOT NULL CHECK (end_month BETWEEN 1 AND 12),
  end_day INT NOT NULL CHECK (end_day BETWEEN 1 AND 31),
  multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default seasons
INSERT INTO public.pricing_rules (season_name, season_name_ar, start_month, start_day, end_month, end_day, multiplier) VALUES
  ('Haute Saison (Été)', 'الموسم المرتفع (صيف)', 6, 1, 9, 30, 1.50),
  ('Basse Saison (Hiver)', 'الموسم المنخفض (شتاء)', 11, 1, 2, 28, 0.80),
  ('Saison Normale', 'الموسم العادي', 3, 1, 5, 31, 1.00);

-- ============================================
-- 12. COMPANY SETTINGS
-- ============================================
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT DEFAULT 'RentaCar',
  phone TEXT,
  address TEXT,
  city TEXT DEFAULT 'Tétouan',
  ice TEXT,                              -- Identifiant Commun de l\'Entreprise
  tva_default_rate NUMERIC(5,2) DEFAULT 20.00,
  currency TEXT DEFAULT 'MAD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.company_settings (company_name, city, ice)
VALUES ('RentaCar Maroc', 'Tétouan', '001234567000012');

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_damage_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Authenticated users can read everything
CREATE POLICY "Authenticated users can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Authenticated can manage vehicles" ON public.vehicles FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can read documents" ON public.vehicle_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage documents" ON public.vehicle_documents FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated can read maintenance" ON public.maintenance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage maintenance" ON public.maintenance FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated can read damage photos" ON public.vehicle_damage_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert damage photos" ON public.vehicle_damage_photos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can manage clients" ON public.clients FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can read contracts" ON public.contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert contracts" ON public.contracts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update contracts" ON public.contracts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can manage contracts" ON public.contracts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated can read transactions" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage transactions" ON public.transactions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated can read invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage invoices" ON public.invoices FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated can read fines" ON public.fines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage fines" ON public.fines FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated can read pricing" ON public.pricing_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage pricing" ON public.pricing_rules FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated can read settings" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage settings" ON public.company_settings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Auto-generate contract numbers
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(contract_number, '-', 3) AS INT)), 0) + 1
  INTO next_num
  FROM public.contracts
  WHERE contract_number LIKE 'CT-' || EXTRACT(YEAR FROM NOW())::TEXT || '-%';
  
  RETURN 'CT-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '-', 3) AS INT)), 0) + 1
  INTO next_num
  FROM public.invoices
  WHERE invoice_number LIKE 'FAC-' || EXTRACT(YEAR FROM NOW())::TEXT || '-%';
  
  RETURN 'FAC-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Updates for Contract Printing matching physical docs
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS time_out TEXT DEFAULT '10:00',
ADD COLUMN IF NOT EXISTS time_in TEXT DEFAULT '20:00',
ADD COLUMN IF NOT EXISTS second_driver_name TEXT,
ADD COLUMN IF NOT EXISTS second_driver_birth TEXT,
ADD COLUMN IF NOT EXISTS second_driver_address TEXT,
ADD COLUMN IF NOT EXISTS second_driver_license TEXT,
ADD COLUMN IF NOT EXISTS second_driver_license_date DATE,
ADD COLUMN IF NOT EXISTS actual_return_time TEXT;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS birth_place TEXT,
ADD COLUMN IF NOT EXISTS license_date DATE,
ADD COLUMN IF NOT EXISTS foreign_address TEXT;
