-- Make panel electrical specs nullable (not always available from catalogs)
ALTER TABLE panel_specs ALTER COLUMN voc_v DROP NOT NULL;
ALTER TABLE panel_specs ALTER COLUMN isc_a DROP NOT NULL;
ALTER TABLE panel_specs ALTER COLUMN vmp_v DROP NOT NULL;
ALTER TABLE panel_specs ALTER COLUMN imp_a DROP NOT NULL;
ALTER TABLE panel_specs ALTER COLUMN length_mm DROP NOT NULL;
ALTER TABLE panel_specs ALTER COLUMN width_mm DROP NOT NULL;

COMMENT ON TABLE panel_specs IS 'Electrical specs now optional - populated when available from datasheets';
