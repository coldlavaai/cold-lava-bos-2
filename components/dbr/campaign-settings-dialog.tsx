"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUpdateDBRCampaign } from "@/lib/api/hooks"
import { toast } from "sonner"
import { Loader2, Save, MessageSquare, Clock, User, Zap } from "lucide-react"
import type { DBRCampaign } from "@/lib/api/types"

interface CampaignSettingsDialogProps {
  campaign: DBRCampaign | null
  open: boolean
  onClose: () => void
}

interface MessageTemplates {
  m1: string
  m2: string
  m3: string
}

interface MessageDelays {
  m1_to_m2_hours: number
  m2_to_m3_hours: number
}

export function CampaignSettingsDialog({ campaign, open, onClose }: CampaignSettingsDialogProps) {
  const updateMutation = useUpdateDBRCampaign()

  // Message templates
  const [m1, setM1] = React.useState("")
  const [m2, setM2] = React.useState("")
  const [m3, setM3] = React.useState("")

  // Delays
  const [m1ToM2Hours, setM1ToM2Hours] = React.useState(24)
  const [m2ToM3Hours, setM2ToM3Hours] = React.useState(48)

  // Agent / settings
  const [assignedAgent, setAssignedAgent] = React.useState("")
  const [calcomLink, setCalcomLink] = React.useState("")
  const [autoReply, setAutoReply] = React.useState(false)
  const [autoReplyPrompt, setAutoReplyPrompt] = React.useState("")

  // Rate limiting
  const [rateLimit, setRateLimit] = React.useState(10)
  const [rateLimitInterval, setRateLimitInterval] = React.useState(600)

  // Working hours
  const [workingHoursStart, setWorkingHoursStart] = React.useState("09:00")
  const [workingHoursEnd, setWorkingHoursEnd] = React.useState("17:00")
  const [workWeekdays, setWorkWeekdays] = React.useState(true)

  // Load campaign data
  React.useEffect(() => {
    if (!campaign) return
    const templates = (campaign as unknown as { message_templates?: MessageTemplates }).message_templates || { m1: "", m2: "", m3: "" }
    const delays = (campaign.message_delays || {}) as unknown as MessageDelays

    setM1(templates.m1 || "Hi {{name}}, we installed your solar panels a while back. How are they performing? We've got some great new battery options that could save you even more. Would you be interested in a quick chat?")
    setM2(templates.m2 || "Hi {{name}}, just following up on my last message. We're offering free solar health checks for previous customers this month. Would you like to book one in?")
    setM3(templates.m3 || "Last one from me {{name}}! We've got limited slots for our free battery assessment. If you'd like one, just reply and I'll get you booked in. If not, no worries at all 👍")

    setM1ToM2Hours(delays.m1_to_m2_hours || 24)
    setM2ToM3Hours(delays.m2_to_m3_hours || 48)

    setAssignedAgent((campaign as unknown as { assigned_user_id?: string }).assigned_user_id || "")
    setCalcomLink(campaign.calcom_link || "")
    setAutoReply((campaign as unknown as { auto_reply_enabled?: boolean }).auto_reply_enabled || false)
    setAutoReplyPrompt((campaign as unknown as { auto_reply_prompt?: string }).auto_reply_prompt || "You are a friendly solar energy consultant following up with previous customers. Be helpful, not pushy. If they're interested, try to book a call or site visit. Use their name and be conversational.")

    setRateLimit(campaign.rate_limit_per_interval || 10)
    setRateLimitInterval(campaign.rate_limit_interval_seconds || 600)

    const wh = (campaign.working_hours || {}) as { start?: string; end?: string; weekdays_only?: boolean }
    setWorkingHoursStart(wh.start || "09:00")
    setWorkingHoursEnd(wh.end || "17:00")
    setWorkWeekdays(wh.weekdays_only !== false)
  }, [campaign])

  const handleSave = () => {
    if (!campaign) return
    updateMutation.mutate(
      {
        campaignId: campaign.id,
        data: {
          message_templates: { m1, m2, m3 },
          message_delays: { m1_to_m2_hours: m1ToM2Hours, m2_to_m3_hours: m2ToM3Hours },
          assigned_user_id: assignedAgent || null,
          calcom_link: calcomLink || null,
          auto_reply_enabled: autoReply,
          auto_reply_prompt: autoReplyPrompt || null,
          rate_limit_per_interval: rateLimit,
          rate_limit_interval_seconds: rateLimitInterval,
          working_hours: { start: workingHoursStart, end: workingHoursEnd, weekdays_only: workWeekdays },
        } as Record<string, unknown>,
      },
      {
        onSuccess: () => {
          toast.success("Campaign settings saved")
          onClose()
        },
        onError: () => toast.error("Failed to save settings"),
      }
    )
  }

  if (!campaign) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Campaign Settings — {campaign.name}</DialogTitle>
          <DialogDescription>Configure the message flow, agent, and automation for this campaign.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="messages" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="messages" className="gap-1.5 text-xs"><MessageSquare className="h-3 w-3" /> Messages</TabsTrigger>
            <TabsTrigger value="automation" className="gap-1.5 text-xs"><Zap className="h-3 w-3" /> Automation</TabsTrigger>
            <TabsTrigger value="schedule" className="gap-1.5 text-xs"><Clock className="h-3 w-3" /> Schedule</TabsTrigger>
          </TabsList>

          {/* MESSAGES TAB */}
          <TabsContent value="messages" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">Use <code className="bg-muted px-1 rounded">{"{{name}}"}</code> for the contact&apos;s name. Messages are sent in order with delays between them.</p>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Message 1 (Initial Outreach)</CardTitle>
                <CardDescription className="text-xs">Sent immediately when the campaign starts</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea value={m1} onChange={(e) => setM1(e.target.value)} rows={3} className="text-sm" placeholder="Hi {{name}}, ..." />
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 px-4">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Wait</span>
              <Input type="number" value={m1ToM2Hours} onChange={(e) => setM1ToM2Hours(Number(e.target.value))} className="w-16 h-7 text-xs text-center" min={1} />
              <span className="text-xs text-muted-foreground">hours before Message 2</span>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Message 2 (Follow-up)</CardTitle>
                <CardDescription className="text-xs">Sent if no reply to M1</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea value={m2} onChange={(e) => setM2(e.target.value)} rows={3} className="text-sm" placeholder="Hi {{name}}, just following up..." />
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 px-4">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Wait</span>
              <Input type="number" value={m2ToM3Hours} onChange={(e) => setM2ToM3Hours(Number(e.target.value))} className="w-16 h-7 text-xs text-center" min={1} />
              <span className="text-xs text-muted-foreground">hours before Message 3</span>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Message 3 (Final)</CardTitle>
                <CardDescription className="text-xs">Last message if still no reply</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea value={m3} onChange={(e) => setM3(e.target.value)} rows={3} className="text-sm" placeholder="Last one from me {{name}}..." />
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUTOMATION TAB */}
          <TabsContent value="automation" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Assigned Agent</CardTitle>
                <CardDescription className="text-xs">Team member responsible for this campaign</CardDescription>
              </CardHeader>
              <CardContent>
                <Input value={assignedAgent} onChange={(e) => setAssignedAgent(e.target.value)} placeholder="Enter user ID or name" className="text-sm" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Booking Link</CardTitle>
                <CardDescription className="text-xs">Cal.com or booking link to include when leads want to book</CardDescription>
              </CardHeader>
              <CardContent>
                <Input value={calcomLink} onChange={(e) => setCalcomLink(e.target.value)} placeholder="https://cal.com/your-team/solar-consultation" className="text-sm" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" /> AI Auto-Reply</CardTitle>
                    <CardDescription className="text-xs mt-1">Automatically respond to incoming replies using AI</CardDescription>
                  </div>
                  <Switch checked={autoReply} onCheckedChange={setAutoReply} />
                </div>
              </CardHeader>
              {autoReply && (
                <CardContent>
                  <Label className="text-xs text-muted-foreground mb-2 block">AI Prompt / Instructions</Label>
                  <Textarea value={autoReplyPrompt} onChange={(e) => setAutoReplyPrompt(e.target.value)} rows={4} className="text-sm" placeholder="You are a friendly solar consultant..." />
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* SCHEDULE TAB */}
          <TabsContent value="schedule" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Working Hours</CardTitle>
                <CardDescription className="text-xs">Messages will only be sent during these hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Start</Label>
                    <Input type="time" value={workingHoursStart} onChange={(e) => setWorkingHoursStart(e.target.value)} className="w-28 h-8 text-sm" />
                  </div>
                  <span className="text-muted-foreground mt-5">to</span>
                  <div className="space-y-1">
                    <Label className="text-xs">End</Label>
                    <Input type="time" value={workingHoursEnd} onChange={(e) => setWorkingHoursEnd(e.target.value)} className="w-28 h-8 text-sm" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={workWeekdays} onCheckedChange={setWorkWeekdays} id="weekdays" />
                  <Label htmlFor="weekdays" className="text-sm">Weekdays only (Mon-Fri)</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Rate Limiting</CardTitle>
                <CardDescription className="text-xs">Control how fast messages are sent to avoid spam flags</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Send</span>
                  <Input type="number" value={rateLimit} onChange={(e) => setRateLimit(Number(e.target.value))} className="w-16 h-7 text-xs text-center" min={1} />
                  <span className="text-xs text-muted-foreground">messages every</span>
                  <Select value={String(rateLimitInterval)} onValueChange={(v) => setRateLimitInterval(Number(v))}>
                    <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="600">10 minutes</SelectItem>
                      <SelectItem value="1800">30 minutes</SelectItem>
                      <SelectItem value="3600">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2 border-t mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-1.5">
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
