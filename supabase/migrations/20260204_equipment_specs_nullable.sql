-- Make equipment specs columns nullable
-- Allows importing catalog data without full spec sheets

-- Panel specs
ALTER TABLE panel_specs ALTER COLUMN voc_v DROP NOT NULL;
ALTER TABLE panel_specs ALTER COLUMN isc_a DROP NOT NULL;
ALTER TABLE panel_specs ALTER COLUMN vmp_v DROP NOT NULL;
ALTER TABLE panel_specs ALTER COLUMN imp_a DROP NOT NULL;
ALTER TABLE panel_specs ALTER COLUMN length_mm DROP NOT NULL;
ALTER TABLE panel_specs ALTER COLUMN width_mm DROP NOT NULL;

-- Inverter specs
ALTER TABLE inverter_specs ALTER COLUMN max_dc_voltage_v DROP NOT NULL;
ALTER TABLE inverter_specs ALTER COLUMN mppt_voltage_range_min_v DROP NOT NULL;
ALTER TABLE inverter_specs ALTER COLUMN mppt_voltage_range_max_v DROP NOT NULL;

COMMENT ON TABLE panel_specs IS 'Panel electrical specs - nullable fields populated from datasheets when available';
COMMENT ON TABLE inverter_specs IS 'Inverter specs - nullable fields populated from datasheets when available';
