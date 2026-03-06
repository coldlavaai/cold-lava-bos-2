-- ============================================
-- ADD AIKO PANELS
-- Solar BOS - Equipment Expansion
-- Date: 2026-02-04
-- ============================================

-- AIKO Neostar 2S (ABC module - all black contact)
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, mcs_certified, available_in_uk, typical_trade_price_pence)
SELECT 'AIKO-NEOSTAR-2S-460', id, 'AIKO', 'Neostar 2S', '460W ABC Module', 'panel', true, true, 16500
FROM manufacturers WHERE slug = 'aiko'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO panel_specs (equipment_id, power_rating_wp, efficiency_percent, voc_v, isc_a, vmp_v, imp_a, length_mm, width_mm, weight_kg, cell_type, cell_count, half_cut, frame_colour, backsheet_colour, product_warranty_years, performance_warranty_years)
SELECT id, 460, 23.6, 38.70, 14.96, 32.50, 14.15, 1722, 1134, 21.0, 'n-type ABC', 108, true, 'black', 'black', 25, 30
FROM equipment_catalogue WHERE sku = 'AIKO-NEOSTAR-2S-460'
ON CONFLICT DO NOTHING;

-- AIKO Neostar 2S 470W
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, mcs_certified, available_in_uk, typical_trade_price_pence)
SELECT 'AIKO-NEOSTAR-2S-470', id, 'AIKO', 'Neostar 2S', '470W ABC Module', 'panel', true, true, 17000
FROM manufacturers WHERE slug = 'aiko'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO panel_specs (equipment_id, power_rating_wp, efficiency_percent, voc_v, isc_a, vmp_v, imp_a, length_mm, width_mm, weight_kg, cell_type, cell_count, half_cut, frame_colour, backsheet_colour, product_warranty_years, performance_warranty_years)
SELECT id, 470, 24.1, 39.00, 15.15, 32.80, 14.33, 1722, 1134, 21.0, 'n-type ABC', 108, true, 'black', 'black', 25, 30
FROM equipment_catalogue WHERE sku = 'AIKO-NEOSTAR-2S-470'
ON CONFLICT DO NOTHING;

-- AIKO Comet 2U (larger format)
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, mcs_certified, available_in_uk, typical_trade_price_pence)
SELECT 'AIKO-COMET-2U-615', id, 'AIKO', 'Comet 2U', '615W ABC Module', 'panel', true, true, 22000
FROM manufacturers WHERE slug = 'aiko'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO panel_specs (equipment_id, power_rating_wp, efficiency_percent, voc_v, isc_a, vmp_v, imp_a, length_mm, width_mm, weight_kg, cell_type, cell_count, half_cut, frame_colour, backsheet_colour, product_warranty_years, performance_warranty_years)
SELECT id, 615, 23.9, 43.80, 17.52, 36.80, 16.71, 2382, 1134, 29.5, 'n-type ABC', 144, true, 'black', 'black', 25, 30
FROM equipment_catalogue WHERE sku = 'AIKO-COMET-2U-615'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE equipment_catalogue IS 'Added AIKO ABC modules - February 2026';
