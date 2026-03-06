-- ============================================
-- EQUIPMENT SYSTEM - MIGRATION 6: SEED DATA
-- Solar BOS - Enterprise Edition
-- Date: 2026-01-29
-- ============================================

-- ============================================
-- PANELS - Top UK Sellers
-- ============================================

-- JA Solar DeepBlue 4.0 Pro
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, mcs_certified, available_in_uk, typical_trade_price_pence)
SELECT 'JA-JAM54D41-420-LB', id, 'JA Solar', 'DeepBlue 4.0 Pro', '420W All Black', 'panel', true, true, 12500
FROM manufacturers WHERE slug = 'ja-solar';

INSERT INTO panel_specs (equipment_id, power_rating_wp, efficiency_percent, voc_v, isc_a, vmp_v, imp_a, length_mm, width_mm, weight_kg, cell_type, cell_count, half_cut, frame_colour, backsheet_colour, product_warranty_years, performance_warranty_years)
SELECT id, 420, 21.5, 37.90, 14.03, 31.57, 13.31, 1722, 1134, 21.5, 'n-type', 108, true, 'black', 'black', 12, 25
FROM equipment_catalogue WHERE sku = 'JA-JAM54D41-420-LB';

-- JA Solar 440W
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, mcs_certified, available_in_uk, typical_trade_price_pence)
SELECT 'JA-JAM54D40-440-MB', id, 'JA Solar', 'DeepBlue 4.0 Pro', '440W', 'panel', true, true, 13000
FROM manufacturers WHERE slug = 'ja-solar';

INSERT INTO panel_specs (equipment_id, power_rating_wp, efficiency_percent, voc_v, isc_a, vmp_v, imp_a, length_mm, width_mm, weight_kg, cell_type, cell_count, half_cut, frame_colour, backsheet_colour, product_warranty_years, performance_warranty_years)
SELECT id, 440, 22.3, 38.58, 14.38, 32.28, 13.63, 1722, 1134, 21.5, 'n-type', 108, true, 'black', 'white', 12, 25
FROM equipment_catalogue WHERE sku = 'JA-JAM54D40-440-MB';

-- LONGi Hi-MO 6
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, mcs_certified, available_in_uk, typical_trade_price_pence)
SELECT 'LONGI-LR5-54HTH-430M', id, 'LONGi', 'Hi-MO 6', '430W', 'panel', true, true, 13500
FROM manufacturers WHERE slug = 'longi';

INSERT INTO panel_specs (equipment_id, power_rating_wp, efficiency_percent, voc_v, isc_a, vmp_v, imp_a, length_mm, width_mm, weight_kg, cell_type, cell_count, half_cut, frame_colour, backsheet_colour, product_warranty_years, performance_warranty_years)
SELECT id, 430, 22.0, 38.60, 14.20, 32.30, 13.32, 1722, 1134, 21.8, 'n-type', 108, true, 'black', 'white', 12, 25
FROM equipment_catalogue WHERE sku = 'LONGI-LR5-54HTH-430M';

-- Jinko Tiger Neo
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, mcs_certified, available_in_uk, typical_trade_price_pence)
SELECT 'JINKO-JKM435N-54HL4R-V', id, 'Jinko Solar', 'Tiger Neo', '435W N-type', 'panel', true, true, 13000
FROM manufacturers WHERE slug = 'jinko';

INSERT INTO panel_specs (equipment_id, power_rating_wp, efficiency_percent, voc_v, isc_a, vmp_v, imp_a, length_mm, width_mm, weight_kg, cell_type, cell_count, half_cut, frame_colour, backsheet_colour, product_warranty_years, performance_warranty_years)
SELECT id, 435, 22.26, 38.22, 14.44, 32.12, 13.54, 1722, 1134, 21.5, 'n-type', 108, true, 'silver', 'white', 12, 30
FROM equipment_catalogue WHERE sku = 'JINKO-JKM435N-54HL4R-V';

-- Trina Vertex S+
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, mcs_certified, available_in_uk, typical_trade_price_pence)
SELECT 'TRINA-TSM-NEG9R.28-440', id, 'Trina Solar', 'Vertex S+', '440W', 'panel', true, true, 13200
FROM manufacturers WHERE slug = 'trina';

INSERT INTO panel_specs (equipment_id, power_rating_wp, efficiency_percent, voc_v, isc_a, vmp_v, imp_a, length_mm, width_mm, weight_kg, cell_type, cell_count, half_cut, frame_colour, backsheet_colour, product_warranty_years, performance_warranty_years)
SELECT id, 440, 22.5, 38.80, 14.35, 32.50, 13.54, 1762, 1134, 22.0, 'n-type', 120, true, 'black', 'white', 12, 25
FROM equipment_catalogue WHERE sku = 'TRINA-TSM-NEG9R.28-440';

-- Q CELLS Q.Peak DUO
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, mcs_certified, available_in_uk, typical_trade_price_pence)
SELECT 'QCELLS-Q.PEAK-DUO-ML-G11-400', id, 'Q CELLS', 'Q.Peak DUO', 'ML-G11 400W', 'panel', true, true, 14000
FROM manufacturers WHERE slug = 'qcells';

INSERT INTO panel_specs (equipment_id, power_rating_wp, efficiency_percent, voc_v, isc_a, vmp_v, imp_a, length_mm, width_mm, weight_kg, cell_type, cell_count, half_cut, frame_colour, backsheet_colour, product_warranty_years, performance_warranty_years)
SELECT id, 400, 20.6, 37.30, 13.65, 31.10, 12.87, 1722, 1134, 21.3, 'mono', 120, true, 'black', 'white', 12, 25
FROM equipment_catalogue WHERE sku = 'QCELLS-Q.PEAK-DUO-ML-G11-400';

-- ============================================
-- INVERTERS - UK Market Leaders
-- ============================================

-- GivEnergy Gen 3 5kW Hybrid
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, mcs_certified, g98_compliant, available_in_uk, typical_trade_price_pence)
SELECT 'GE-GIV-HY-5.0-3PH', id, 'GivEnergy', 'Gen 3 Hybrid', '5kW', 'inverter', true, true, 185000
FROM manufacturers WHERE slug = 'givenergy';

INSERT INTO inverter_specs (equipment_id, inverter_type, phase_type, rated_ac_power_w, max_dc_power_w, max_dc_voltage_v, mppt_voltage_range_min_v, mppt_voltage_range_max_v, mppt_count, strings_per_mppt, max_efficiency_percent, battery_compatible, max_charge_power_w, max_discharge_power_w, eps_capable, eps_rated_power_w, g98_compliant, g99_compliant, wifi_built_in, warranty_years)
SELECT id, 'hybrid', 'single', 5000, 6500, 600, 125, 550, 2, 1, 97.6, true, 5000, 5000, true, 5000, true, true, true, 12
FROM equipment_catalogue WHERE sku = 'GE-GIV-HY-5.0-3PH';

-- GivEnergy Gen 3 3.6kW Hybrid
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, mcs_certified, available_in_uk, typical_trade_price_pence)
SELECT 'GE-GIV-HY-3.6-3PH', id, 'GivEnergy', 'Gen 3 Hybrid', '3.6kW', 'inverter', true, true, 165000
FROM manufacturers WHERE slug = 'givenergy';

INSERT INTO inverter_specs (equipment_id, inverter_type, phase_type, rated_ac_power_w, max_dc_power_w, max_dc_voltage_v, mppt_voltage_range_min_v, mppt_voltage_range_max_v, mppt_count, strings_per_mppt, max_efficiency_percent, battery_compatible, max_charge_power_w, max_discharge_power_w, eps_capable, g98_compliant, wifi_built_in, warranty_years)
SELECT id, 'hybrid', 'single', 3600, 5000, 600, 125, 550, 2, 1, 97.5, true, 3600, 3600, true, true, true, 12
FROM equipment_catalogue WHERE sku = 'GE-GIV-HY-3.6-3PH';

-- SunSynk ECCO 5kW
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, mcs_certified, available_in_uk, typical_trade_price_pence)
SELECT 'SS-ECCO-5K-SG01LP1-EU', id, 'SunSynk', 'ECCO', '5kW', 'inverter', true, true, 145000
FROM manufacturers WHERE slug = 'sunsynk';

INSERT INTO inverter_specs (equipment_id, inverter_type, phase_type, rated_ac_power_w, max_dc_power_w, max_dc_voltage_v, mppt_voltage_range_min_v, mppt_voltage_range_max_v, mppt_count, max_efficiency_percent, battery_compatible, max_charge_power_w, max_discharge_power_w, eps_capable, g98_compliant, wifi_built_in, warranty_years, monitoring_platform)
SELECT id, 'hybrid', 'single', 5000, 6500, 500, 90, 450, 2, 97.5, true, 5000, 5000, true, true, true, 5, 'SolarMan'
FROM equipment_catalogue WHERE sku = 'SS-ECCO-5K-SG01LP1-EU';

-- Fox ESS H1-5.0-E
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, mcs_certified, available_in_uk, typical_trade_price_pence)
SELECT 'FOX-H1-5.0-E', id, 'Fox ESS', 'H1', '5.0kW', 'inverter', true, true, 155000
FROM manufacturers WHERE slug = 'fox-ess';

INSERT INTO inverter_specs (equipment_id, inverter_type, phase_type, rated_ac_power_w, max_dc_power_w, max_dc_voltage_v, mppt_voltage_range_min_v, mppt_voltage_range_max_v, mppt_count, max_efficiency_percent, battery_compatible, max_charge_power_w, max_discharge_power_w, eps_capable, g98_compliant, wifi_built_in, warranty_years)
SELECT id, 'hybrid', 'single', 5000, 7500, 600, 80, 550, 2, 97.8, true, 5000, 5000, true, true, true, 10
FROM equipment_catalogue WHERE sku = 'FOX-H1-5.0-E';

-- SolarEdge SE5000H
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, mcs_certified, available_in_uk, typical_trade_price_pence)
SELECT 'SE-SE5000H-STOREY', id, 'SolarEdge', 'Home Wave', '5kW', 'inverter', true, true, 175000
FROM manufacturers WHERE slug = 'solaredge';

INSERT INTO inverter_specs (equipment_id, inverter_type, phase_type, rated_ac_power_w, max_dc_power_w, max_dc_voltage_v, mppt_voltage_range_min_v, mppt_voltage_range_max_v, mppt_count, max_efficiency_percent, battery_compatible, g98_compliant, wifi_built_in, warranty_years, monitoring_platform)
SELECT id, 'hybrid', 'single', 5000, 7500, 500, 200, 480, 1, 99.2, true, true, true, 12, 'mySolarEdge'
FROM equipment_catalogue WHERE sku = 'SE-SE5000H-STOREY';

-- ============================================
-- BATTERIES - UK Market Leaders
-- ============================================

-- GivEnergy 9.5kWh
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, available_in_uk, typical_trade_price_pence)
SELECT 'GE-BAT-9.5-V2', id, 'GivEnergy', 'Giv-Bat', '9.5kWh', 'battery', true, 240000
FROM manufacturers WHERE slug = 'givenergy';

INSERT INTO battery_specs (equipment_id, total_capacity_kwh, usable_capacity_kwh, depth_of_discharge_percent, nominal_power_kw, max_charge_power_kw, max_discharge_power_kw, nominal_voltage_v, chemistry, round_trip_efficiency_percent, cycle_life_cycles, weight_kg, warranty_years, is_modular, compatible_inverter_brands)
SELECT id, 9.5, 9.5, 100, 3.6, 3.6, 3.6, 51.2, 'LFP', 95.0, 6000, 116, 12, true, ARRAY['givenergy']
FROM equipment_catalogue WHERE sku = 'GE-BAT-9.5-V2';

-- GivEnergy All-in-One 5kW
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, available_in_uk, typical_trade_price_pence)
SELECT 'GE-AIO-5.0-9.5', id, 'GivEnergy', 'All-in-One', '5kW / 9.5kWh', 'battery', true, 400000
FROM manufacturers WHERE slug = 'givenergy';

INSERT INTO battery_specs (equipment_id, total_capacity_kwh, usable_capacity_kwh, nominal_power_kw, max_charge_power_kw, max_discharge_power_kw, nominal_voltage_v, chemistry, cycle_life_cycles, warranty_years, compatible_inverter_brands)
SELECT id, 9.5, 9.5, 5.0, 5.0, 5.0, 51.2, 'LFP', 6000, 12, ARRAY['givenergy']
FROM equipment_catalogue WHERE sku = 'GE-AIO-5.0-9.5';

-- Fox ESS Energy Cube 10.4kWh
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, available_in_uk, typical_trade_price_pence)
SELECT 'FOX-EC-10.4', id, 'Fox ESS', 'Energy Cube', '10.4kWh', 'battery', true, 280000
FROM manufacturers WHERE slug = 'fox-ess';

INSERT INTO battery_specs (equipment_id, total_capacity_kwh, usable_capacity_kwh, nominal_power_kw, max_charge_power_kw, max_discharge_power_kw, nominal_voltage_v, chemistry, cycle_life_cycles, weight_kg, warranty_years, is_modular, compatible_inverter_brands)
SELECT id, 10.4, 10.4, 5.0, 5.0, 5.0, 51.2, 'LFP', 6000, 138, 10, true, ARRAY['fox-ess']
FROM equipment_catalogue WHERE sku = 'FOX-EC-10.4';

-- Pylontech US5000
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, available_in_uk, typical_trade_price_pence)
SELECT 'PYLON-US5000', id, 'Pylontech', 'US5000', '4.8kWh', 'battery', true, 120000
FROM manufacturers WHERE slug = 'pylontech';

INSERT INTO battery_specs (equipment_id, total_capacity_kwh, usable_capacity_kwh, nominal_power_kw, max_charge_power_kw, max_discharge_power_kw, nominal_voltage_v, chemistry, cycle_life_cycles, weight_kg, warranty_years, is_modular, min_modules, max_modules)
SELECT id, 4.8, 4.8, 2.56, 2.56, 2.56, 48.0, 'LFP', 6000, 52, 10, true, 1, 16
FROM equipment_catalogue WHERE sku = 'PYLON-US5000';

-- BYD Battery-Box Premium HVS 10.2
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, available_in_uk, typical_trade_price_pence)
SELECT 'BYD-BBOX-HVS-10.2', id, 'BYD', 'Battery-Box Premium HVS', '10.2kWh', 'battery', true, 450000
FROM manufacturers WHERE slug = 'byd';

INSERT INTO battery_specs (equipment_id, total_capacity_kwh, usable_capacity_kwh, nominal_power_kw, max_charge_power_kw, max_discharge_power_kw, nominal_voltage_v, voltage_type, chemistry, cycle_life_cycles, weight_kg, warranty_years, is_modular)
SELECT id, 10.2, 10.2, 10.2, 10.2, 10.2, 409.0, 'high_voltage', 'LFP', 6000, 168, 10, true
FROM equipment_catalogue WHERE sku = 'BYD-BBOX-HVS-10.2';

-- Tesla Powerwall 3
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, available_in_uk, typical_trade_price_pence)
SELECT 'TESLA-PW3', id, 'Tesla', 'Powerwall', '3', 'battery', true, 750000
FROM manufacturers WHERE slug = 'tesla';

INSERT INTO battery_specs (equipment_id, total_capacity_kwh, usable_capacity_kwh, nominal_power_kw, max_charge_power_kw, max_discharge_power_kw, peak_power_kw, chemistry, round_trip_efficiency_percent, weight_kg, warranty_years)
SELECT id, 13.5, 13.5, 11.5, 11.5, 11.5, 22.0, 'NMC', 90.0, 130, 10
FROM equipment_catalogue WHERE sku = 'TESLA-PW3';

-- ============================================
-- MOUNTING SYSTEMS
-- ============================================

-- Clenergy PV-ezRack On-Roof
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, available_in_uk, typical_trade_price_pence)
SELECT 'CLEN-EZRACK-ROOF-KIT', id, 'Clenergy', 'PV-ezRack', 'On-Roof Kit (10 panel)', 'mounting', true, 25000
FROM manufacturers WHERE slug = 'clenergy';

INSERT INTO mounting_specs (equipment_id, mounting_type, roof_type_compatible, component_type, max_wind_load_pa, max_snow_load_pa, material, colour, warranty_years)
SELECT id, 'on_roof', ARRAY['tile', 'slate'], 'kit', 2400, 5400, 'aluminium', 'silver', 20
FROM equipment_catalogue WHERE sku = 'CLEN-EZRACK-ROOF-KIT';

-- Renusol VarioSole+
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, available_in_uk, typical_trade_price_pence)
SELECT 'RENU-VARIOSOLE-PLUS', id, 'Renusol', 'VarioSole+', 'Rail System', 'mounting', true, 2500
FROM manufacturers WHERE slug = 'renusol';

INSERT INTO mounting_specs (equipment_id, mounting_type, roof_type_compatible, component_type, material, colour, warranty_years)
SELECT id, 'on_roof', ARRAY['tile', 'slate', 'metal'], 'rail', 'aluminium', 'silver', 10
FROM equipment_catalogue WHERE sku = 'RENU-VARIOSOLE-PLUS';

-- ============================================
-- EV CHARGERS
-- ============================================

-- myenergi Zappi v2
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, available_in_uk, typical_trade_price_pence)
SELECT 'MYEN-ZAPPI-7KW-T2', id, 'myenergi', 'Zappi', 'v2 7kW', 'ev_charger', true, 66500
FROM manufacturers WHERE slug = 'myenergi';

INSERT INTO ev_charger_specs (equipment_id, rated_power_kw, current_rating_a, connector_type, solar_compatible, solar_divert_modes, ct_clamp_required, wifi_enabled, app_name, warranty_years)
SELECT id, 7.0, 32, 'Type 2', true, ARRAY['eco', 'eco+', 'fast'], true, true, 'myenergi', 3
FROM equipment_catalogue WHERE sku = 'MYEN-ZAPPI-7KW-T2';

-- Ohme Home Pro
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, available_in_uk, typical_trade_price_pence)
SELECT 'OHME-HOME-PRO', id, 'Ohme', 'Home Pro', '7.4kW', 'ev_charger', true, 89900
FROM manufacturers WHERE slug = 'ohme';

INSERT INTO ev_charger_specs (equipment_id, rated_power_kw, current_rating_a, connector_type, solar_compatible, wifi_enabled, scheduled_charging, tariff_integration, app_name, warranty_years)
SELECT id, 7.4, 32, 'Type 2', true, true, true, true, 'Ohme', 3
FROM equipment_catalogue WHERE sku = 'OHME-HOME-PRO';

-- Easee One
INSERT INTO equipment_catalogue (sku, manufacturer_id, manufacturer_name, model, model_variant, category, available_in_uk, typical_trade_price_pence)
SELECT 'EASEE-ONE', id, 'Easee', 'One', '7.4kW', 'ev_charger', true, 89900
FROM manufacturers WHERE slug = 'easee';

INSERT INTO ev_charger_specs (equipment_id, rated_power_kw, current_rating_a, connector_type, load_balancing, wifi_enabled, app_name, warranty_years)
SELECT id, 7.4, 32, 'Type 2', true, true, 'Easee', 3
FROM equipment_catalogue WHERE sku = 'EASEE-ONE';

-- ============================================
-- COMPATIBILITY RULES
-- ============================================

-- GivEnergy batteries only with GivEnergy inverters
INSERT INTO equipment_compatibility (equipment_a_id, equipment_b_id, relationship_type, compatibility_notes, confidence_level)
SELECT a.id, b.id, 'requires', 'GivEnergy batteries require GivEnergy inverters', 'confirmed'
FROM equipment_catalogue a, equipment_catalogue b
WHERE a.sku = 'GE-BAT-9.5-V2' AND b.sku = 'GE-GIV-HY-5.0-3PH';

INSERT INTO equipment_compatibility (equipment_a_id, equipment_b_id, relationship_type, compatibility_notes, confidence_level)
SELECT a.id, b.id, 'requires', 'GivEnergy batteries require GivEnergy inverters', 'confirmed'
FROM equipment_catalogue a, equipment_catalogue b
WHERE a.sku = 'GE-BAT-9.5-V2' AND b.sku = 'GE-GIV-HY-3.6-3PH';

-- Fox ESS batteries with Fox ESS inverters
INSERT INTO equipment_compatibility (equipment_a_id, equipment_b_id, relationship_type, compatibility_notes, confidence_level)
SELECT a.id, b.id, 'requires', 'Fox ESS batteries require Fox ESS inverters', 'confirmed'
FROM equipment_catalogue a, equipment_catalogue b
WHERE a.sku = 'FOX-EC-10.4' AND b.sku = 'FOX-H1-5.0-E';

-- Pylontech is universal (works with many)
INSERT INTO equipment_compatibility (equipment_a_id, equipment_b_id, relationship_type, compatibility_notes, confidence_level)
SELECT a.id, b.id, 'compatible', 'Pylontech works with most hybrid inverters', 'confirmed'
FROM equipment_catalogue a, equipment_catalogue b
WHERE a.sku = 'PYLON-US5000' AND b.sku IN ('SS-ECCO-5K-SG01LP1-EU', 'FOX-H1-5.0-E');

COMMENT ON TABLE equipment_catalogue IS 'Seeded with top UK solar equipment - January 2026';
