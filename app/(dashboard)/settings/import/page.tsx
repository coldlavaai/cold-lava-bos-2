"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Building2, Upload, Download, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

type ImportType = 'customers' | 'jobs'
type ImportResult = {
  success: boolean
  data: {
    total: number
    created: number
    updated?: number
    errors: Array<{ row: number; email?: string; customer_id?: string; error: string }>
  }
  message: string
}

export default function ImportPage() {
  const [importType, setImportType] = React.useState<ImportType>('customers')
  const [jsonData, setJsonData] = React.useState('')
  const [isImporting, setIsImporting] = React.useState(false)
  const [result, setResult] = React.useState<ImportResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const handleImport = async () => {
    setIsImporting(true)
    setResult(null)
    setError(null)

    try {
      // Parse JSON
      const data = JSON.parse(jsonData)

      // Determine endpoint
      const endpoint = importType === 'customers'
        ? '/api/import/customers'
        : '/api/import/jobs'

      // Make request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      setResult(result)
    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Failed to import data')
    } finally {
      setIsImporting(false)
    }
  }

  const handleExport = async (type: 'customers' | 'jobs', format: 'json' | 'csv') => {
    try {
      const endpoint = `/api/export/${type}?format=${format}`
      const response = await fetch(endpoint)

      if (!response.ok) {
        throw new Error('Export failed')
      }

      if (format === 'csv') {
        // Download CSV file
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        // Show JSON in textarea
        const data = await response.json()
        setJsonData(JSON.stringify(data.data, null, 2))
      }
    } catch (err) {
      console.error('Export error:', err)
      setError(err instanceof Error ? err.message : 'Failed to export data')
    }
  }

  const exampleCustomersJSON = JSON.stringify({
    customers: [
      {
        name: "John Doe",
        email: "john@example.com",
        phone: "01234567890",
        address_line_1: "123 Main St",
        city: "London",
        postcode: "SW1A 1AA"
      }
    ]
  }, null, 2)

  const exampleJobsJSON = JSON.stringify({
    jobs: [
      {
        customer_id: "00000000-0000-0000-0000-000000000000",
        estimated_value: 15000,
        source: "import"
      }
    ]
  }, null, 2)

  return (
    
      <div className="space-y-4">
        {/* Compact header */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h1 className="text-xl font-display font-bold gradient-text-solar">
              Import / Export
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Bulk import and export data
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Settings Navigation */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <a
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <Building2 className="h-4 w-4" />
                General
              </a>
              <a
                href="/settings/users"
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <Building2 className="h-4 w-4" />
                Users
              </a>
              <a
                href="/settings/import"
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 text-sm font-medium"
              >
                <Upload className="h-4 w-4" />
                Import / Export
              </a>
            </CardContent>
          </Card>

          {/* Import/Export Content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Export Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Data
                </CardTitle>
                <CardDescription>
                  Download your data in JSON or CSV format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('customers', 'json')}
                  >
                    Export Customers (JSON)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('customers', 'csv')}
                  >
                    Export Customers (CSV)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('jobs', 'json')}
                  >
                    Export Jobs (JSON)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('jobs', 'csv')}
                  >
                    Export Jobs (CSV)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Import Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import Data
                </CardTitle>
                <CardDescription>
                  Paste JSON data to import customers or jobs in bulk
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Import Type Selection */}
                <div className="space-y-2">
                  <Label htmlFor="import-type">Import Type</Label>
                  <select
                    id="import-type"
                    value={importType}
                    onChange={(e) => setImportType(e.target.value as ImportType)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="customers">Customers</option>
                    <option value="jobs">Jobs</option>
                  </select>
                </div>

                {/* JSON Data Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="json-data">JSON Data</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setJsonData(importType === 'customers' ? exampleCustomersJSON : exampleJobsJSON)}
                    >
                      Load Example
                    </Button>
                  </div>
                  <Textarea
                    id="json-data"
                    placeholder={`Paste your JSON data here...\n\nExample:\n${importType === 'customers' ? exampleCustomersJSON : exampleJobsJSON}`}
                    value={jsonData}
                    onChange={(e) => setJsonData(e.target.value)}
                    className="font-mono text-xs min-h-[300px]"
                  />
                </div>

                {/* Import Button */}
                <Button
                  onClick={handleImport}
                  disabled={isImporting || !jsonData.trim()}
                  className="w-full"
                >
                  {isImporting ? 'Importing...' : 'Import Data'}
                </Button>

                {/* Error Display */}
                {error && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Results Display */}
                {result && (
                  <div className="space-y-3">
                    <Alert variant={result.success ? "default" : "destructive"}>
                      {result.success ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>{result.message}</AlertDescription>
                    </Alert>

                    {/* Statistics */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Import Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-medium">{result.data.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created:</span>
                          <span className="font-medium text-green-400">{result.data.created}</span>
                        </div>
                        {result.data.updated !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Updated:</span>
                            <span className="font-medium text-blue-400">{result.data.updated}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Errors:</span>
                          <span className="font-medium text-red-400">{result.data.errors.length}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Error Details */}
                    {result.data.errors.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-red-400">Errors</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            {result.data.errors.map((err, index) => (
                              <div key={index} className="p-2 bg-red-500/10 border border-red-500/20 rounded">
                                <div className="font-medium">Row {err.row}</div>
                                {err.email && <div className="text-xs text-muted-foreground">{err.email}</div>}
                                {err.customer_id && <div className="text-xs text-muted-foreground">{err.customer_id}</div>}
                                <div className="text-xs text-red-400 mt-1">{err.error}</div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    
  )
}
