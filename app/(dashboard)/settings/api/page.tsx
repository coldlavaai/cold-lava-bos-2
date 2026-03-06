"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Building2, Key, Webhook, Plus, Trash2, Copy, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  created_at: string
  last_used_at?: string
}

interface Webhook {
  id: string
  url: string
  events: string[]
  secret: string
  is_active: boolean
}

export default function ApiSettingsPage() {
  const [apiKeys, setApiKeys] = React.useState<ApiKey[]>([])
  const [webhooks, setWebhooks] = React.useState<Webhook[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [newKeyName, setNewKeyName] = React.useState("")
  const [newWebhookUrl, setNewWebhookUrl] = React.useState("")
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>([])
  const [createdKey, setCreatedKey] = React.useState<string | null>(null)
  const [copiedKey, setCopiedKey] = React.useState(false)

  const availableEvents = ["lead.created", "job.created"]

  React.useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [keysRes, webhooksRes] = await Promise.all([
        fetch("/api/api-keys"),
        fetch("/api/webhooks")
      ])
      const keysData = await keysRes.json()
      const webhooksData = await webhooksRes.json()
      setApiKeys(keysData.data || [])
      setWebhooks(webhooksData.data || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const createApiKey = async () => {
    if (!newKeyName.trim()) return
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName })
      })
      const data = await res.json()
      setCreatedKey(data.data.key)
      setNewKeyName("")
      await loadData()
    } catch (error) {
      console.error("Error creating API key:", error)
    }
  }

  const deleteApiKey = async (id: string) => {
    if (!confirm("Delete this API key? This cannot be undone.")) return
    try {
      await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" })
      await loadData()
    } catch (error) {
      console.error("Error deleting API key:", error)
    }
  }

  const createWebhook = async () => {
    if (!newWebhookUrl.trim() || selectedEvents.length === 0) return
    try {
      await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newWebhookUrl, events: selectedEvents })
      })
      setNewWebhookUrl("")
      setSelectedEvents([])
      await loadData()
    } catch (error) {
      console.error("Error creating webhook:", error)
    }
  }

  const deleteWebhook = async (id: string) => {
    if (!confirm("Delete this webhook?")) return
    try {
      await fetch(`/api/webhooks?id=${id}`, { method: "DELETE" })
      await loadData()
    } catch (error) {
      console.error("Error deleting webhook:", error)
    }
  }

  const toggleWebhook = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/webhooks?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive })
      })
      await loadData()
    } catch (error) {
      console.error("Error toggling webhook:", error)
    }
  }

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  if (isLoading) {
    return <div className="p-4">Loading...</div>
  }

  return (
    
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h1 className="text-xl font-display font-bold gradient-text-solar">API & Webhooks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage API keys and webhooks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card className="lg:col-span-1 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <a href="/settings" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground">
                <Building2 className="h-4 w-4" />
                General
              </a>
              <a href="/settings/users" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground">
                <Building2 className="h-4 w-4" />
                Users
              </a>
              <a href="/settings/import" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground">
                <Building2 className="h-4 w-4" />
                Import / Export
              </a>
              <a href="/settings/api" className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 text-sm font-medium">
                <Key className="h-4 w-4" />
                API & Webhooks
              </a>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 space-y-4">
            {/* New API Key Alert */}
            {createdKey && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">API Key Created!</p>
                    <p className="text-sm">Save this key - it will not be shown again:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">{createdKey}</code>
                      <Button size="sm" variant="outline" onClick={copyKey}>
                        {copiedKey ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button size="sm" onClick={() => setCreatedKey(null)}>Dismiss</Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* API Keys */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Keys
                </CardTitle>
                <CardDescription>Use API keys to authenticate external requests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="API key name (e.g., Production, Staging)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createApiKey()}
                  />
                  <Button onClick={createApiKey} disabled={!newKeyName.trim()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </div>

                {apiKeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No API keys yet</p>
                ) : (
                  <div className="space-y-2">
                    {apiKeys.map((key) => (
                      <div key={key.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <div className="font-medium">{key.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{key.key_prefix}...</div>
                          <div className="text-xs text-muted-foreground">
                            Created {new Date(key.created_at).toLocaleDateString()}
                            {key.last_used_at && ` • Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => deleteApiKey(key.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Webhooks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhooks
                </CardTitle>
                <CardDescription>Receive real-time notifications for events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Webhook URL (https://...)"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    {availableEvents.map((event) => (
                      <label key={event} className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-muted/30">
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(event)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEvents([...selectedEvents, event])
                            } else {
                              setSelectedEvents(selectedEvents.filter(e => e !== event))
                            }
                          }}
                        />
                        <span className="text-sm">{event}</span>
                      </label>
                    ))}
                  </div>
                  <Button onClick={createWebhook} disabled={!newWebhookUrl.trim() || selectedEvents.length === 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Webhook
                  </Button>
                </div>

                {webhooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No webhooks yet</p>
                ) : (
                  <div className="space-y-2">
                    {webhooks.map((webhook) => (
                      <div key={webhook.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex-1">
                          <div className="font-medium text-sm break-all">{webhook.url}</div>
                          <div className="text-xs text-muted-foreground">
                            Events: {webhook.events.join(", ")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Secret: {webhook.secret.substring(0, 16)}...
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant={webhook.is_active ? "default" : "outline"} onClick={() => toggleWebhook(webhook.id, webhook.is_active)}>
                            {webhook.is_active ? "Active" : "Inactive"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteWebhook(webhook.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    
  )
}
