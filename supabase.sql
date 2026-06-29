-- Enable UUID extension for unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: suppliers
-- Stores supplier information
-- =============================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password VARCHAR(255) NOT NULL,      -- Should be hashed in production!
    business_address TEXT,               -- Stores location / City / Region from registration
    subcategory VARCHAR(255),            -- Resolved subcategory (free-text if "Other" was chosen)
    business_reg_no VARCHAR(255),
    vat_no VARCHAR(255),
    about TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending/approved/rejected
    approval_note TEXT,
    rejection_reason TEXT,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: categories
-- Stores all available categories
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories matching the supplier registration form
INSERT INTO categories (name) VALUES
    ('Event Production & Infrastructure'),
    ('Branding, Print & Merchandising'),
    ('Creative Production & Media'),
    ('Logistics & Field Operations'),
    ('Hospitality & Catering'),
    ('Other')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- TABLE: supplier_categories
-- Junction table for supplier <> category relationship
-- =============================================
CREATE TABLE IF NOT EXISTS supplier_categories (
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (supplier_id, category_id)
);

-- =============================================
-- TABLE: products
-- Stores supplier products/services
-- =============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(255),
    unit VARCHAR(50),
    price NUMERIC(10,2),
    quantity_in_stock INTEGER DEFAULT 0,
    price_per_item NUMERIC(10,2),
    total_cost NUMERIC(12,2),
    description TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: documents
-- Stores supplier documents metadata (actual files in Supabase Storage)
-- =============================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    size BIGINT,
    file_path TEXT NOT NULL, -- Path in Supabase Storage
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: staff_users
-- Stores Exp staff/admin users
-- =============================================
CREATE TABLE IF NOT EXISTS staff_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a default admin (for demo purposes - use Supabase Auth in production!)
INSERT INTO staff_users (email, name) VALUES
    ('admin@exp.com', 'Exp Admin')
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- TABLE: supplier_contacts
-- Stores contact messages from staff to suppliers
-- =============================================
CREATE TABLE IF NOT EXISTS supplier_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist first to avoid conflicts
DROP TRIGGER IF EXISTS suppliers_updated_at ON suppliers;
DROP TRIGGER IF EXISTS products_updated_at ON products;

CREATE TRIGGER suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================
-- Enable RLS on all tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for each table (public access for testing)
-- You can make these more restrictive later!

-- Suppliers table policies
DROP POLICY IF EXISTS "Allow public read access on suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow public insert access on suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow public update access on suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow public delete access on suppliers" ON suppliers;

CREATE POLICY "Allow public read access on suppliers"
    ON suppliers FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on suppliers"
    ON suppliers FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on suppliers"
    ON suppliers FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on suppliers"
    ON suppliers FOR DELETE USING (true);

-- Categories table policies
DROP POLICY IF EXISTS "Allow public read access on categories" ON categories;
DROP POLICY IF EXISTS "Allow public insert access on categories" ON categories;
DROP POLICY IF EXISTS "Allow public update access on categories" ON categories;
DROP POLICY IF EXISTS "Allow public delete access on categories" ON categories;

CREATE POLICY "Allow public read access on categories"
    ON categories FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on categories"
    ON categories FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on categories"
    ON categories FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on categories"
    ON categories FOR DELETE USING (true);

-- Supplier_categories table policies
DROP POLICY IF EXISTS "Allow public read access on supplier_categories" ON supplier_categories;
DROP POLICY IF EXISTS "Allow public insert access on supplier_categories" ON supplier_categories;
DROP POLICY IF EXISTS "Allow public update access on supplier_categories" ON supplier_categories;
DROP POLICY IF EXISTS "Allow public delete access on supplier_categories" ON supplier_categories;

CREATE POLICY "Allow public read access on supplier_categories"
    ON supplier_categories FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on supplier_categories"
    ON supplier_categories FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on supplier_categories"
    ON supplier_categories FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on supplier_categories"
    ON supplier_categories FOR DELETE USING (true);

-- Products table policies
DROP POLICY IF EXISTS "Allow public read access on products" ON products;
DROP POLICY IF EXISTS "Allow public insert access on products" ON products;
DROP POLICY IF EXISTS "Allow public update access on products" ON products;
DROP POLICY IF EXISTS "Allow public delete access on products" ON products;

CREATE POLICY "Allow public read access on products"
    ON products FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on products"
    ON products FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on products"
    ON products FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on products"
    ON products FOR DELETE USING (true);

-- Documents table policies
DROP POLICY IF EXISTS "Allow public read access on documents" ON documents;
DROP POLICY IF EXISTS "Allow public insert access on documents" ON documents;
DROP POLICY IF EXISTS "Allow public update access on documents" ON documents;
DROP POLICY IF EXISTS "Allow public delete access on documents" ON documents;

CREATE POLICY "Allow public read access on documents"
    ON documents FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on documents"
    ON documents FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on documents"
    ON documents FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on documents"
    ON documents FOR DELETE USING (true);

-- Staff_users table policies
DROP POLICY IF EXISTS "Allow public read access on staff_users" ON staff_users;
DROP POLICY IF EXISTS "Allow public insert access on staff_users" ON staff_users;
DROP POLICY IF EXISTS "Allow public update access on staff_users" ON staff_users;
DROP POLICY IF EXISTS "Allow public delete access on staff_users" ON staff_users;

CREATE POLICY "Allow public read access on staff_users"
    ON staff_users FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on staff_users"
    ON staff_users FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on staff_users"
    ON staff_users FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on staff_users"
    ON staff_users FOR DELETE USING (true);

-- Supplier_contacts table policies
DROP POLICY IF EXISTS "Allow public read access on supplier_contacts" ON supplier_contacts;
DROP POLICY IF EXISTS "Allow public insert access on supplier_contacts" ON supplier_contacts;
DROP POLICY IF EXISTS "Allow public update access on supplier_contacts" ON supplier_contacts;
DROP POLICY IF EXISTS "Allow public delete access on supplier_contacts" ON supplier_contacts;

CREATE POLICY "Allow public read access on supplier_contacts"
    ON supplier_contacts FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on supplier_contacts"
    ON supplier_contacts FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on supplier_contacts"
    ON supplier_contacts FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on supplier_contacts"
    ON supplier_contacts FOR DELETE USING (true);

-- =============================================
-- SUPABASE STORAGE
-- Create a bucket for supplier documents (do this in Supabase Dashboard):
-- Storage > Buckets > New Bucket
-- Name: supplier-documents
-- Public: No (or Yes, depending on your needs)
-- File size limit: 10MB (or your preferred limit)
-- Allowed mime types: application/pdf, image/*

-- =============================================
-- MIGRATION: add subcategory column if upgrading
-- an existing database (safe to run on new DBs too)
-- =============================================
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS subcategory VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory VARCHAR(255);
