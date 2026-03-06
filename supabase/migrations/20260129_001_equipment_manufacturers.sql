-- ============================================
-- EQUIPMENT SYSTEM - MIGRATION 1: MANUFACTURERS
-- Solar BOS - Enterprise Edition
-- Date: 2026-01-29
-- ============================================

-- Manufacturers table (platform level, no tenant_id)
CREATE TABLE manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(150) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  
  -- Contact & support
  website_url VARCHAR(500),
  support_email VARCHAR(255),
  support_phone VARCHAR(50),
  uk_support_phone VARCHAR(50),
  country VARCHAR(2) DEFAULT 'GB',
  uk_office_address TEXT,
  
  -- Warranty & registration
  warranty_registration_url VARCHAR(500),
  warranty_portal_url VARCHAR(500),
  
  -- API & monitoring
  has_api BOOLEAN DEFAULT false,
  api_documentation_url VARCHAR(500),
  monitoring_platform_name VARCHAR(100),
  monitoring_platform_url VARCHAR(500),
  app_name VARCHAR(100),
  app_ios_url VARCHAR(500),
  app_android_url VARCHAR(500),
  
  -- Branding
  logo_url VARCHAR(500),
  logo_dark_url VARCHAR(500),
  brand_colour VARCHAR(7),
  
  -- Categories this manufacturer provides
  categories TEXT[] DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_manufacturers_name ON manufacturers(name);
CREATE INDEX idx_manufacturers_slug ON manufacturers(slug);
CREATE INDEX idx_manufacturers_active ON manufacturers(is_active) WHERE is_active = true;
CREATE INDEX idx_manufacturers_categories ON manufacturers USING GIN(categories);

-- Updated at trigger
CREATE TRIGGER trigger_manufacturers_updated_at
  BEFORE UPDATE ON manufacturers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- RLS (read-only for authenticated users, admins can modify)
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;

CREATE POLICY manufacturers_read_all ON manufacturers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY manufacturers_admin_all ON manufacturers
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================
-- SEED DATA: UK SOLAR MANUFACTURERS
-- ============================================

INSERT INTO manufacturers (name, display_name, slug, website_url, country, categories, is_featured, uk_support_phone, monitoring_platform_name, app_name) VALUES

-- Tier 1: UK Market Leaders (Inverters/Batteries)
('givenergy', 'GivEnergy', 'givenergy', 'https://givenergy.co.uk', 'GB', ARRAY['inverter', 'battery'], true, '+44 191 625 0989', 'GivEnergy Portal', 'GivEnergy'),
('sunsynk', 'SunSynk', 'sunsynk', 'https://sunsynk.com', 'CN', ARRAY['inverter', 'battery'], true, NULL, 'SolarMan', 'SolarMan Smart'),
('fox-ess', 'Fox ESS', 'fox-ess', 'https://www.fox-ess.com', 'CN', ARRAY['inverter', 'battery'], true, '+44 1onal247 267 0505', 'Fox ESS Cloud', 'Fox ESS'),

-- Tier 2: Widely Used Inverters
('growatt', 'Growatt', 'growatt', 'https://www.growatt.com', 'CN', ARRAY['inverter', 'battery'], false, NULL, 'ShinePhone', 'ShinePhone'),
('solax', 'SolaX Power', 'solax', 'https://www.solaxpower.com', 'CN', ARRAY['inverter', 'battery'], false, NULL, 'SolaX Cloud', 'SolaX'),
('solis', 'Solis', 'solis', 'https://www.solisinverters.com', 'CN', ARRAY['inverter'], false, NULL, 'Solis Cloud', 'Solis Cloud'),
('huawei', 'Huawei', 'huawei', 'https://solar.huawei.com', 'CN', ARRAY['inverter', 'battery', 'optimiser'], false, NULL, 'FusionSolar', 'FusionSolar'),
('sungrow', 'Sungrow', 'sungrow', 'https://en.sungrowpower.com', 'CN', ARRAY['inverter', 'battery'], false, NULL, 'iSolarCloud', 'iSolarCloud'),

-- Premium/Specialist Inverters
('solaredge', 'SolarEdge', 'solaredge', 'https://www.solaredge.com', 'IL', ARRAY['inverter', 'optimiser', 'battery'], true, '+44 1onal234 865 016', 'mySolarEdge', 'mySolarEdge'),
('enphase', 'Enphase', 'enphase', 'https://enphase.com', 'US', ARRAY['microinverter', 'battery'], true, NULL, 'Enlighten', 'Enlighten'),
('fronius', 'Fronius', 'fronius', 'https://www.fronius.com', 'AT', ARRAY['inverter'], false, NULL, 'Solar.Web', 'Solar.Web'),
('sma', 'SMA', 'sma', 'https://www.sma.de', 'DE', ARRAY['inverter', 'battery'], false, NULL, 'Sunny Portal', 'SMA Energy'),

-- Panel Manufacturers
('ja-solar', 'JA Solar', 'ja-solar', 'https://www.jasolar.com', 'CN', ARRAY['panel'], true, NULL, NULL, NULL),
('longi', 'LONGi', 'longi', 'https://www.longi.com', 'CN', ARRAY['panel'], true, NULL, NULL, NULL),
('jinko', 'Jinko Solar', 'jinko', 'https://www.jinkosolar.com', 'CN', ARRAY['panel'], true, NULL, NULL, NULL),
('trina', 'Trina Solar', 'trina', 'https://www.trinasolar.com', 'CN', ARRAY['panel'], true, NULL, NULL, NULL),
('qcells', 'Q CELLS', 'qcells', 'https://www.q-cells.com', 'KR', ARRAY['panel'], true, NULL, NULL, NULL),
('canadian-solar', 'Canadian Solar', 'canadian-solar', 'https://www.canadiansolar.com', 'CA', ARRAY['panel'], false, NULL, NULL, NULL),
('rec', 'REC Group', 'rec', 'https://www.recgroup.com', 'NO', ARRAY['panel'], false, NULL, NULL, NULL),
('aiko', 'AIKO', 'aiko', 'https://www.aikosolar.com', 'CN', ARRAY['panel'], false, NULL, NULL, NULL),
('maxeon', 'Maxeon (SunPower)', 'maxeon', 'https://maxeon.com', 'SG', ARRAY['panel'], false, NULL, NULL, NULL),

-- Battery Specialists
('pylontech', 'Pylontech', 'pylontech', 'https://www.pylontech.com.cn', 'CN', ARRAY['battery'], true, NULL, NULL, NULL),
('byd', 'BYD', 'byd', 'https://www.byd.com', 'CN', ARRAY['battery'], true, NULL, NULL, NULL),
('puredrive', 'Puredrive Energy', 'puredrive', 'https://www.puredrive.energy', 'GB', ARRAY['battery'], false, '+44 1onalonalonalonal011onal263 0490', NULL, NULL),
('tesla', 'Tesla', 'tesla', 'https://www.tesla.com', 'US', ARRAY['battery'], true, NULL, 'Tesla App', 'Tesla'),

-- Mounting Systems
('clenergy', 'Clenergy', 'clenergy', 'https://www.clenergy.com', 'AU', ARRAY['mounting'], true, NULL, NULL, NULL),
('renusol', 'Renusol', 'renusol', 'https://www.renusol.com', 'DE', ARRAY['mounting'], true, NULL, NULL, NULL),
('k2-systems', 'K2 Systems', 'k2-systems', 'https://k2-systems.com', 'DE', ARRAY['mounting'], false, NULL, NULL, NULL),
('van-der-valk', 'Van der Valk Solar', 'van-der-valk', 'https://www.valksolarsystems.com', 'NL', ARRAY['mounting'], false, NULL, NULL, NULL),
('schletter', 'Schletter', 'schletter', 'https://www.schletter-group.com', 'DE', ARRAY['mounting'], false, NULL, NULL, NULL),
('gse', 'GSE Integration', 'gse', 'https://www.gse-integration.com', 'FR', ARRAY['mounting'], false, NULL, NULL, NULL),

-- EV Chargers
('myenergi', 'myenergi', 'myenergi', 'https://myenergi.com', 'GB', ARRAY['ev_charger'], true, '+44 1onal online-only', 'myenergi App', 'myenergi'),
('ohme', 'Ohme', 'ohme', 'https://www.ohme.io', 'GB', ARRAY['ev_charger'], true, NULL, 'Ohme App', 'Ohme'),
('andersen', 'Andersen EV', 'andersen', 'https://andersen-ev.com', 'GB', ARRAY['ev_charger'], false, NULL, 'Konnect', 'Konnect'),
('easee', 'Easee', 'easee', 'https://easee.com', 'NO', ARRAY['ev_charger'], true, NULL, 'Easee App', 'Easee'),
('wallbox', 'Wallbox', 'wallbox', 'https://wallbox.com', 'ES', ARRAY['ev_charger'], false, NULL, 'Wallbox App', 'Wallbox'),

-- Accessories / Other
('santon', 'Santon', 'santon', 'https://www.santon.co.uk', 'GB', ARRAY['accessory'], false, NULL, NULL, NULL),
('staubli', 'Stäubli', 'staubli', 'https://www.staubli.com', 'CH', ARRAY['accessory'], false, NULL, NULL, NULL),
('tigo', 'Tigo Energy', 'tigo', 'https://www.tigoenergy.com', 'US', ARRAY['optimiser'], false, NULL, 'Tigo EI', 'Tigo EI');

-- Fix typos in seed data
UPDATE manufacturers SET uk_support_phone = '+44 1onal247 267 0505' WHERE slug = 'fox-ess';
UPDATE manufacturers SET uk_support_phone = '+44 121 234 8016' WHERE slug = 'solaredge';
UPDATE manufacturers SET uk_support_phone = '+44 191 625 0989' WHERE slug = 'givenergy';
UPDATE manufacturers SET uk_support_phone = '+44 1onal263 0490' WHERE slug = 'puredrive';
UPDATE manufacturers SET uk_support_phone = NULL WHERE slug = 'myenergi';

COMMENT ON TABLE manufacturers IS 'Platform-level manufacturer directory for all equipment';
