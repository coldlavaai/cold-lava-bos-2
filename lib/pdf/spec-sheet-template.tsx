import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type { JobEquipmentAssignment, SystemDesign } from '@/types/equipment'

// Register fonts (using system fonts for now)
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff2', fontWeight: 700 },
  ],
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#f97316',
  },
  logo: {
    width: 120,
    height: 40,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#6b7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#f97316',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: {
    width: '40%',
    color: '#6b7280',
  },
  value: {
    width: '60%',
    fontWeight: 600,
  },
  summaryBox: {
    backgroundColor: '#fff7ed',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#9a3412',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 700,
    color: '#c2410c',
  },
  equipmentCard: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  equipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  equipmentName: {
    fontSize: 12,
    fontWeight: 600,
  },
  equipmentQty: {
    fontSize: 11,
    color: '#6b7280',
  },
  equipmentManufacturer: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 6,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  specItem: {
    width: '50%',
    paddingVertical: 3,
  },
  specLabel: {
    fontSize: 9,
    color: '#9ca3af',
  },
  specValue: {
    fontSize: 10,
    fontWeight: 600,
  },
  complianceBox: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  complianceTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#166534',
    marginBottom: 6,
  },
  complianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  complianceCheck: {
    width: 12,
    height: 12,
    backgroundColor: '#22c55e',
    borderRadius: 6,
    marginRight: 8,
  },
  complianceText: {
    fontSize: 10,
    color: '#166534',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
  warrantySection: {
    marginTop: 10,
  },
  warrantyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  warrantyLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  warrantyValue: {
    fontSize: 10,
    fontWeight: 600,
  },
})

interface SpecSheetProps {
  customerName: string
  customerAddress: string
  jobReference: string
  quoteDate: string
  equipment: JobEquipmentAssignment[]
  systemDesign: SystemDesign
  installerName?: string
  installerMcsNumber?: string
}

export function SpecSheetDocument({
  customerName,
  customerAddress,
  jobReference,
  quoteDate,
  equipment,
  systemDesign,
  installerName,
  installerMcsNumber,
}: SpecSheetProps) {
  const panels = equipment.filter(e => e.category === 'panel')
  const inverters = equipment.filter(e => e.category === 'inverter')
  const batteries = equipment.filter(e => e.category === 'battery')
  // Reserved for future spec sheet sections
  const _mounting = equipment.filter(e => e.category === 'mounting')
  const _evChargers = equipment.filter(e => e.category === 'ev_charger')
  const _other = equipment.filter(e => 
    !['panel', 'inverter', 'battery', 'mounting', 'ev_charger'].includes(e.category)
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>System Specification</Text>
            <Text style={styles.subtitle}>Project Specification</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={{ fontSize: 10, color: '#6b7280' }}>Reference: {jobReference}</Text>
            <Text style={{ fontSize: 10, color: '#6b7280' }}>Date: {quoteDate}</Text>
          </View>
        </View>

        {/* Customer Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Installation Address</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Customer</Text>
            <Text style={styles.value}>{customerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>{customerAddress}</Text>
          </View>
        </View>

        {/* System Summary */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>System Size</Text>
              <Text style={styles.summaryValue}>{systemDesign.total_kwp.toFixed(2)} kWp</Text>
            </View>
            <View>
              <Text style={styles.summaryLabel}>Est. Annual Generation</Text>
              <Text style={styles.summaryValue}>{systemDesign.estimated_annual_kwh.toLocaleString()} kWh</Text>
            </View>
            {systemDesign.battery_capacity_kwh && (
              <View>
                <Text style={styles.summaryLabel}>Battery Storage</Text>
                <Text style={styles.summaryValue}>{systemDesign.battery_capacity_kwh.toFixed(1)} kWh</Text>
              </View>
            )}
            <View>
              <Text style={styles.summaryLabel}>Grid Connection</Text>
              <Text style={styles.summaryValue}>{systemDesign.requires_g99 ? 'G99' : 'G98'}</Text>
            </View>
          </View>
        </View>

        {/* Solar Panels */}
        {panels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Solar Panels</Text>
            {panels.map((panel, idx) => (
              <View key={idx} style={styles.equipmentCard}>
                <View style={styles.equipmentHeader}>
                  <Text style={styles.equipmentName}>{panel.model_name}</Text>
                  <Text style={styles.equipmentQty}>Qty: {panel.quantity}</Text>
                </View>
                <Text style={styles.equipmentManufacturer}>{panel.manufacturer_name}</Text>
                {panel.equipment?.panel_specs && (
                  <View style={styles.specGrid}>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Power Rating</Text>
                      <Text style={styles.specValue}>{panel.equipment.panel_specs.power_rating_wp}W</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Efficiency</Text>
                      <Text style={styles.specValue}>{panel.equipment.panel_specs.efficiency_percent?.toFixed(1)}%</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Dimensions</Text>
                      <Text style={styles.specValue}>{panel.equipment.panel_specs.length_mm} × {panel.equipment.panel_specs.width_mm} mm</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Warranty</Text>
                      <Text style={styles.specValue}>{panel.equipment.panel_specs.product_warranty_years} / {panel.equipment.panel_specs.performance_warranty_years} years</Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Inverter */}
        {inverters.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Inverter</Text>
            {inverters.map((inv, idx) => (
              <View key={idx} style={styles.equipmentCard}>
                <View style={styles.equipmentHeader}>
                  <Text style={styles.equipmentName}>{inv.model_name}</Text>
                  <Text style={styles.equipmentQty}>Qty: {inv.quantity}</Text>
                </View>
                <Text style={styles.equipmentManufacturer}>{inv.manufacturer_name}</Text>
                {inv.equipment?.inverter_specs && (
                  <View style={styles.specGrid}>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Rated Power</Text>
                      <Text style={styles.specValue}>{(inv.equipment.inverter_specs.rated_ac_power_w / 1000).toFixed(1)} kW</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Type</Text>
                      <Text style={styles.specValue}>{inv.equipment.inverter_specs.inverter_type}</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>MPPT</Text>
                      <Text style={styles.specValue}>{inv.equipment.inverter_specs.mppt_count} × MPPT</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Warranty</Text>
                      <Text style={styles.specValue}>{inv.equipment.inverter_specs.warranty_years} years</Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Battery */}
        {batteries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Battery Storage</Text>
            {batteries.map((bat, idx) => (
              <View key={idx} style={styles.equipmentCard}>
                <View style={styles.equipmentHeader}>
                  <Text style={styles.equipmentName}>{bat.model_name}</Text>
                  <Text style={styles.equipmentQty}>Qty: {bat.quantity}</Text>
                </View>
                <Text style={styles.equipmentManufacturer}>{bat.manufacturer_name}</Text>
                {bat.equipment?.battery_specs && (
                  <View style={styles.specGrid}>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Usable Capacity</Text>
                      <Text style={styles.specValue}>{bat.equipment.battery_specs.usable_capacity_kwh} kWh</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Chemistry</Text>
                      <Text style={styles.specValue}>{bat.equipment.battery_specs.chemistry}</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Cycle Life</Text>
                      <Text style={styles.specValue}>{bat.equipment.battery_specs.cycle_life_cycles?.toLocaleString()} cycles</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Warranty</Text>
                      <Text style={styles.specValue}>{bat.equipment.battery_specs.warranty_years} years</Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Compliance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compliance & Certifications</Text>
          <View style={styles.complianceBox}>
            <View style={styles.complianceItem}>
              <View style={styles.complianceCheck} />
              <Text style={styles.complianceText}>MCS Certified Installation</Text>
            </View>
            <View style={styles.complianceItem}>
              <View style={styles.complianceCheck} />
              <Text style={styles.complianceText}>{systemDesign.g98_g99_recommendation}</Text>
            </View>
            <View style={styles.complianceItem}>
              <View style={styles.complianceCheck} />
              <Text style={styles.complianceText}>Eligible for Smart Export Guarantee (SEG)</Text>
            </View>
          </View>
        </View>

        {/* Installer */}
        {installerName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Installer</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Company</Text>
              <Text style={styles.value}>{installerName}</Text>
            </View>
            {installerMcsNumber && (
              <View style={styles.row}>
                <Text style={styles.label}>MCS Number</Text>
                <Text style={styles.value}>{installerMcsNumber}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Cold Lava BOS</Text>
          <Text style={styles.footerText}>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  )
}
