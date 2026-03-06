"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bot,
  Sparkles,
  MessageSquare,
  Mail,
  CheckCircle2,
  FileText,
  Wand2,
  Save,
  Key,
} from "lucide-react"
import { toast } from "sonner"

interface AISettings {
  enabled: boolean
  provider: 'openai' | 'anthropic'
  api_key_configured: boolean
  model: string
  max_tokens: number
  temperature: number
  default_tone: 'professional' | 'friendly' | 'formal'
  auto_suggestions: boolean
  log_prompts: boolean
}

export default function AISettingsPage() {
  const [settings, setSettings] = React.useState<AISettings>({
    enabled: false,
    provider: 'openai',
    api_key_configured: false,
    model: 'gpt-4o-mini',
    max_tokens: 1000,
    temperature: 0.7,
    default_tone: 'professional',
    auto_suggestions: true,
    log_prompts: true,
  })
  
  const [apiKey, setApiKey] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // TODO: Save to API
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success("AI settings saved")
    setIsSaving(false)
  }

  const handleTestConnection = async () => {
    toast.info("Testing AI connection...")
    // TODO: Test API connection
    await new Promise(resolve => setTimeout(resolve, 1500))
    toast.success("AI connection successful!")
  }

  return (
    
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h1 className="text-xl font-display font-bold gradient-text-solar">
              AI Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure AI-powered features and content generation
            </p>
          </div>
          <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/20">
            <Sparkles className="h-3 w-3 mr-1" />
            Pro Feature
          </Badge>
        </div>

        {/* Enable/Disable */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-base">AI Assistant</CardTitle>
                  <CardDescription>
                    Enable AI-powered features across the platform
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, enabled: checked }))}
              />
            </div>
          </CardHeader>
        </Card>

        {settings.enabled && (
          <>
            {/* API Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">API Configuration</CardTitle>
                <CardDescription>
                  Connect your AI provider API key
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Provider</Label>
                    <Select 
                      value={settings.provider} 
                      onValueChange={(v) => setSettings(s => ({ ...s, provider: v as 'openai' | 'anthropic' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                        <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>API Key</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder={settings.api_key_configured ? "••••••••••••••••" : "sk-..."}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Button variant="outline" onClick={handleTestConnection}>
                        Test
                      </Button>
                    </div>
                    {settings.api_key_configured && (
                      <p className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        API key configured
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label>Model</Label>
                    <Select 
                      value={settings.model} 
                      onValueChange={(v) => setSettings(s => ({ ...s, model: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {settings.provider === 'openai' ? (
                          <>
                            <SelectItem value="gpt-4o">GPT-4o (Best quality)</SelectItem>
                            <SelectItem value="gpt-4o-mini">GPT-4o Mini (Faster, cheaper)</SelectItem>
                            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet (Recommended)</SelectItem>
                            <SelectItem value="claude-3-haiku">Claude 3 Haiku (Faster)</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Features</CardTitle>
                <CardDescription>
                  Choose which AI capabilities to enable
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">AI Assistant Chat</p>
                      <p className="text-xs text-muted-foreground">
                        Ask questions about your data in natural language
                      </p>
                    </div>
                  </div>
                  <Switch checked={true} />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-border pt-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Email Generation</p>
                      <p className="text-xs text-muted-foreground">
                        Generate professional emails with AI
                      </p>
                    </div>
                  </div>
                  <Switch checked={true} />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-border pt-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Quote Descriptions</p>
                      <p className="text-xs text-muted-foreground">
                        Auto-generate quote line item descriptions
                      </p>
                    </div>
                  </div>
                  <Switch checked={true} />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-border pt-4">
                  <div className="flex items-center gap-3">
                    <Wand2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Auto-Suggestions</p>
                      <p className="text-xs text-muted-foreground">
                        Show AI suggestions while typing
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.auto_suggestions} 
                    onCheckedChange={(checked) => setSettings(s => ({ ...s, auto_suggestions: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Generation Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generation Settings</CardTitle>
                <CardDescription>
                  Configure how AI generates content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Default Tone</Label>
                  <Select 
                    value={settings.default_tone} 
                    onValueChange={(v) => setSettings(s => ({ ...s, default_tone: v as AISettings['default_tone'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    value={settings.max_tokens}
                    onChange={(e) => setSettings(s => ({ ...s, max_tokens: parseInt(e.target.value) || 1000 }))}
                    min={100}
                    max={4000}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum length of generated content (100-4000)
                  </p>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-sm">Log AI Prompts</p>
                    <p className="text-xs text-muted-foreground">
                      Save prompts and responses for debugging
                    </p>
                  </div>
                  <Switch 
                    checked={settings.log_prompts} 
                    onCheckedChange={(checked) => setSettings(s => ({ ...s, log_prompts: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    
  )
}
