"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Phone,
  Voicemail,
  Disc,
  FileText,
  Hash,
  Save,
  Loader2,
  AlertCircle,
  Building2,
  Link as LinkIcon,
} from "lucide-react"
import { toast } from "sonner"

interface PhoneSettings {
  voicemail_enabled: boolean
  voicemail_greeting: string
  ring_timeout: number
  recording_enabled: boolean
  record_from: "record-from-answer" | "record-from-ringing"
  transcription_enabled: boolean
  ai_summary_enabled: boolean
  caller_id: string
}

const DEFAULT_SETTINGS: PhoneSettings = {
  voicemail_enabled: true,
  voicemail_greeting:
    "Sorry, we can't take your call right now. Please leave a message after the beep.",
  ring_timeout: 20,
  recording_enabled: true,
  record_from: "record-from-answer",
  transcription_enabled: false,
  ai_summary_enabled: false,
  caller_id: "+447480486658",
}

export default function PhoneSettingsPage() {
  const [settings, setSettings] = React.useState<PhoneSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Load settings on mount
  React.useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings/phone")
        if (!res.ok) throw new Error("Failed to load phone settings")
        const data = await res.json()
        setSettings(data)
      } catch (err) {
        console.error("Failed to load phone settings:", err)
        setError("Failed to load phone settings")
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/settings/phone", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save")
      }
      const data = await res.json()
      setSettings(data)
      toast.success("Phone settings saved")
    } catch (err) {
      console.error("Failed to save phone settings:", err)
      toast.error("Failed to save phone settings")
    } finally {
      setIsSaving(false)
    }
  }

  const update = <K extends keyof PhoneSettings>(key: K, value: PhoneSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }))
  }

  return (
    <div className="space-y-4">
      {/* Compact header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h1 className="text-lg md:text-xl font-display font-bold gradient-text-solar">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your company settings and preferences
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
              href="/settings/organisation"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              <Building2 className="h-4 w-4" />
              Organisation
            </a>
            <a
              href="/settings/users"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              <Building2 className="h-4 w-4" />
              Users
            </a>
            <a
              href="/settings/integrations"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              <LinkIcon className="h-4 w-4" />
              Integrations
            </a>
            <a
              href="/settings/phone"
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 text-sm font-medium"
            >
              <Phone className="h-4 w-4" />
              Phone
            </a>
            <a
              href="/settings/ai"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              <Building2 className="h-4 w-4" />
              AI Settings
            </a>
            <a
              href="/settings/automation"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              <Building2 className="h-4 w-4" />
              Automation
            </a>
          </CardContent>
        </Card>

        {/* Phone Settings Content */}
        <div className="lg:col-span-3 space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="pt-8 pb-8 text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin opacity-50" />
                <p className="text-sm text-muted-foreground">Loading phone settings...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="pt-8 pb-8 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Caller ID */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Hash className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Caller ID</CardTitle>
                      <CardDescription>
                        Your Twilio phone number used for outbound calls
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      value={settings.caller_id}
                      readOnly
                      disabled
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      This number is configured in your Twilio account and cannot be changed here.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Voicemail */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Voicemail className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Voicemail</CardTitle>
                        <CardDescription>
                          Configure voicemail for unanswered calls
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={settings.voicemail_enabled}
                      onCheckedChange={(checked) => update("voicemail_enabled", checked)}
                    />
                  </div>
                </CardHeader>
                {settings.voicemail_enabled && (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="voicemail-greeting">Voicemail Greeting</Label>
                      <Textarea
                        id="voicemail-greeting"
                        value={settings.voicemail_greeting}
                        onChange={(e) => update("voicemail_greeting", e.target.value)}
                        placeholder="Enter the voicemail greeting message..."
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        This message will be read aloud to callers when the call goes to voicemail.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Ring Timeout</Label>
                        <span className="text-sm font-mono text-muted-foreground">
                          {settings.ring_timeout}s
                        </span>
                      </div>
                      <Slider
                        value={[settings.ring_timeout]}
                        onValueChange={([v]) => update("ring_timeout", v)}
                        min={5}
                        max={60}
                        step={5}
                      />
                      <p className="text-xs text-muted-foreground">
                        How long to ring before the call goes to voicemail (5–60 seconds).
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Call Recording */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <Disc className="h-5 w-5 text-red-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Call Recording</CardTitle>
                        <CardDescription>
                          Automatically record calls for review
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={settings.recording_enabled}
                      onCheckedChange={(checked) => update("recording_enabled", checked)}
                    />
                  </div>
                </CardHeader>
                {settings.recording_enabled && (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Record From</Label>
                      <Select
                        value={settings.record_from}
                        onValueChange={(v) =>
                          update(
                            "record_from",
                            v as "record-from-answer" | "record-from-ringing"
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="record-from-answer">
                            Answer — Record after the call is answered
                          </SelectItem>
                          <SelectItem value="record-from-ringing">
                            Ringing — Record from when the phone starts ringing
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Choose when recording begins. &quot;Answer&quot; is recommended for most use cases.
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Transcription */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Transcription</CardTitle>
                      <CardDescription>
                        Automatically transcribe and summarise call recordings
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm">Auto-Transcription</p>
                      <p className="text-xs text-muted-foreground">
                        Transcribe call recordings using OpenAI Whisper (requires OPENAI_API_KEY)
                      </p>
                    </div>
                    <Switch
                      checked={settings.transcription_enabled}
                      onCheckedChange={(checked) =>
                        update("transcription_enabled", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-border pt-4">
                    <div>
                      <p className="font-medium text-sm">AI Summary</p>
                      <p className="text-xs text-muted-foreground">
                        Generate an AI summary of each transcribed call
                      </p>
                    </div>
                    <Switch
                      checked={settings.ai_summary_enabled}
                      onCheckedChange={(checked) =>
                        update("ai_summary_enabled", checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
