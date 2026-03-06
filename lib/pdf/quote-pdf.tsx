import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Quote } from '@/lib/api/types'

// Create styles for PDF document
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #000',
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
  },
  value: {
    width: '70%',
  },
  table: {
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1 solid #000',
    paddingBottom: 5,
    marginBottom: 5,
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottom: '0.5 solid #ccc',
  },
  tableCol1: {
    width: '50%',
  },
  tableCol2: {
    width: '15%',
    textAlign: 'right',
  },
  tableCol3: {
    width: '17%',
    textAlign: 'right',
  },
  tableCol4: {
    width: '18%',
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: '40%',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalValue: {
    fontWeight: 'bold',
  },
  grandTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
    paddingTop: 5,
    borderTop: '1 solid #000',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 9,
    color: '#666',
    borderTop: '0.5 solid #ccc',
    paddingTop: 10,
  },
})

interface QuotePDFProps {
  quote: Quote
  tenantName: string
}

export const QuotePDF: React.FC<QuotePDFProps> = ({ quote, tenantName }) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB')
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '£0.00'
    return `£${amount.toFixed(2)}`
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{tenantName}</Text>
          <Text>Cold Lava BOS Platform</Text>
        </View>

        {/* Quote Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUOTE</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Quote Number:</Text>
            <Text style={styles.value}>{quote.quote_number}</Text>
          </View>
          {quote.job && (
            <View style={styles.row}>
              <Text style={styles.label}>Job Number:</Text>
              <Text style={styles.value}>{quote.job.job_number}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{formatDate(quote.created_at)}</Text>
          </View>
          {quote.valid_until && (
            <View style={styles.row}>
              <Text style={styles.label}>Valid Until:</Text>
              <Text style={styles.value}>{formatDate(quote.valid_until)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{quote.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Customer Information */}
        {quote.job?.customer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CUSTOMER INFORMATION</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{quote.job.customer.name}</Text>
            </View>
            {quote.job.customer.email && (
              <View style={styles.row}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{quote.job.customer.email}</Text>
              </View>
            )}
            {quote.job.customer.phone && (
              <View style={styles.row}>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value}>{quote.job.customer.phone}</Text>
              </View>
            )}
            {(quote.job.customer.address_line_1 || quote.job.customer.city || quote.job.customer.postcode) && (
              <View style={styles.row}>
                <Text style={styles.label}>Address:</Text>
                <View style={styles.value}>
                  {quote.job.customer.address_line_1 && <Text>{quote.job.customer.address_line_1}</Text>}
                  {quote.job.customer.address_line_2 && <Text>{quote.job.customer.address_line_2}</Text>}
                  {quote.job.customer.city && quote.job.customer.postcode && (
                    <Text>{quote.job.customer.city}, {quote.job.customer.postcode}</Text>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Line Items Table */}
        <View style={styles.table}>
          <Text style={styles.sectionTitle}>LINE ITEMS</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCol1}>Description</Text>
            <Text style={styles.tableCol2}>Quantity</Text>
            <Text style={styles.tableCol3}>Unit Price</Text>
            <Text style={styles.tableCol4}>Total</Text>
          </View>
          {quote.line_items && quote.line_items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCol1}>{item.description}</Text>
              <Text style={styles.tableCol2}>{item.quantity}</Text>
              <Text style={styles.tableCol3}>{formatCurrency(item.unit_price)}</Text>
              <Text style={styles.tableCol4}>{formatCurrency(item.total_price)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.totalLabel}>TOTAL:</Text>
            <Text style={styles.totalValue}>{formatCurrency(quote.total_amount)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your business.</Text>
          <Text>This quote is valid until {quote.valid_until ? formatDate(quote.valid_until) : 'the date specified above'}.</Text>
          <Text>All prices are in GBP (£). Payment terms: As agreed.</Text>
        </View>
      </Page>
    </Document>
  )
}

/**
 * Generate a PDF buffer from a quote
 * @param quote - The quote data with expanded job and customer
 * @param tenantName - The tenant/company name
 * @returns Promise<Buffer> - The PDF as a buffer
 */
export async function generateQuotePDF(quote: Quote, tenantName: string): Promise<Buffer> {
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const pdfBuffer = await renderToBuffer(<QuotePDF quote={quote} tenantName={tenantName} />)
  return pdfBuffer
}
