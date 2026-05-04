export interface Profile {
  id: string;
  full_name: string;
  full_name_ar?: string;
  email?: string;
  phone?: string;
  role: 'admin' | 'employee';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  fuel: 'Diesel' | 'Essence' | 'Hybride' | 'Électrique';
  color?: string;
  seats: number;
  transmission: 'Manuelle' | 'Automatique';
  status: 'available' | 'rented' | 'maintenance' | 'blocked';
  daily_rate: number;
  current_km: number;
  image_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  doc_type: 'carte_grise' | 'assurance' | 'visite_technique';
  doc_number?: string;
  issue_date?: string;
  expiry_date?: string;
  file_url?: string;
  notes?: string;
  created_at: string;
}

export interface Maintenance {
  id: string;
  vehicle_id: string;
  maintenance_type: 'oil_change' | 'tires' | 'brakes' | 'general' | 'other';
  description?: string;
  cost: number;
  km_at_service?: number;
  performed_at: string;
  next_due_date?: string;
  next_due_km?: number;
  created_at: string;
}

export interface VehicleDamagePhoto {
  id: string;
  vehicle_id: string;
  contract_id?: string;
  photo_type: 'check_in' | 'check_out';
  file_url: string;
  notes?: string;
  created_at: string;
}

export interface Client {
  id: string;
  full_name: string;
  full_name_ar?: string;
  phone?: string;
  email?: string;
  cin?: string;
  passport?: string;
  driver_license?: string;
  nationality: string;
  address?: string;
  is_blacklisted: boolean;
  blacklist_reason?: string;
  is_vip: boolean;
  discount_pct: number;
  total_rentals: number;
  total_spent: number;
  cin_scan_url?: string;
  license_scan_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  contract_number: string;
  client_id: string;
  vehicle_id: string;
  created_by?: string;

  start_date: string;
  end_date: string;
  actual_return_date?: string;

  daily_rate: number;
  total_days: number;
  subtotal: number;
  discount_amount: number;
  tva_rate: number;
  tva_amount: number;
  total_ttc: number;
  deposit_amount: number;
  deposit_returned: boolean;

  fuel_level_out?: 'empty' | '1/4' | '1/2' | '3/4' | 'full';
  fuel_level_in?: 'empty' | '1/4' | '1/2' | '3/4' | 'full';
  km_out?: number;
  km_in?: number;
  cleanliness_out?: 'clean' | 'acceptable' | 'dirty';
  cleanliness_in?: 'clean' | 'acceptable' | 'dirty';

  contract_language: 'fr' | 'ar' | 'en' | 'es';
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'overdue';
  notes?: string;

  created_at: string;
  updated_at: string;

  // Joined fields
  client?: Client;
  vehicle?: Vehicle;
}

export interface Transaction {
  id: string;
  transaction_type: 'income' | 'expense';
  category: string;
  description?: string;
  amount: number;
  tva_amount: number;
  payment_method?: 'cash' | 'card' | 'transfer' | 'check';
  contract_id?: string;
  vehicle_id?: string;
  client_id?: string;
  recorded_by?: string;
  transaction_date: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  contract_id?: string;
  client_id: string;
  amount_ht: number;
  tva_rate: number;
  tva_amount: number;
  amount_ttc: number;
  status: 'pending' | 'paid' | 'cancelled';
  payment_method?: string;
  payment_date?: string;
  issued_at: string;
  created_at: string;
}

export interface Fine {
  id: string;
  vehicle_id: string;
  contract_id?: string;
  client_id?: string;
  fine_date: string;
  fine_type: string;
  plate?: string;
  amount: number;
  reference?: string;
  status: 'pending' | 'charged' | 'paid';
  notes?: string;
  created_at: string;
}

export interface PricingRule {
  id: string;
  season_name: string;
  season_name_ar?: string;
  start_month: number;
  start_day: number;
  end_month: number;
  end_day: number;
  multiplier: number;
  is_active: boolean;
  created_at: string;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  phone?: string;
  address?: string;
  city: string;
  ice?: string;
  tva_default_rate: number;
  currency: string;
  created_at: string;
  updated_at: string;
}
