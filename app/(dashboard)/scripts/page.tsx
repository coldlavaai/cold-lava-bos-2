"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Check, Globe, GlobeIcon, Star, Phone, PhoneOff, MessageSquare, Zap, ArrowRight, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface Script {
  id: string
  title: string
  icon: React.ReactNode
  description: string
  scenario: string
  body: string
  objectionHandlers?: { objection: string; response: string }[]
  tips?: string[]
}

const scripts: Script[] = [
  {
    id: "no-website",
    title: "No Website",
    icon: <Globe className="h-5 w-5 text-cyan-400" />,
    description: "Lead has no website at all",
    scenario: "You've found a business on Google with great reviews but no website. They're leaving money on the table.",
    body: `Hi, is that [name]? My name's JJ from Cold Lava. I came across [company] on Google — you've got great reviews, [X] stars. I noticed you don't have a website yet, and I actually built a quick mockup of what one could look like for you. Would you mind if I sent it over? It'll take 30 seconds to look at.`,
    objectionHandlers: [
      {
        objection: "I don't need a website, I get all my work through word of mouth",
        response: "That's amazing — shows your work speaks for itself. Here's the thing though: when someone gets recommended to you and Googles your name, they find nothing. A simple site just backs up what people already say about you. And the mockup's already done — worth 30 seconds of your time?",
      },
      {
        objection: "I'm too busy / not the right time",
        response: "I totally get that — that's actually a great sign. Look, the mockup is already done. Can I just text it over? When things quiet down, you can have a look. No pressure at all.",
      },
      {
        objection: "How much does it cost?",
        response: "Great question. Our sites start from £499 one-off — no monthly fees, no contracts. But honestly, have a look at the mockup first and we'll chat costs after. Sound fair?",
      },
    ],
    tips: [
      "Always mention their star rating — it flatters and builds rapport",
      "The mockup is the hook. Always offer to SEND, not SELL",
      "Keep it under 30 seconds before the question",
    ],
  },
  {
    id: "bad-website",
    title: "Bad / Outdated Website",
    icon: <GlobeIcon className="h-5 w-5 text-teal-400" />,
    description: "Lead has a dated, slow, or non-mobile-friendly site",
    scenario: "Their current website is hurting them — slow, not mobile-friendly, outdated design, or missing key info.",
    body: `Hi, is that [name]? JJ from Cold Lava. I was looking at your website and honestly I think it could be costing you customers. It's not loading properly on mobile and it's missing a few things that help you rank on Google. I've put together a quick side-by-side showing what a modern version could look like versus what you've got now. Can I send it across? Takes 30 seconds to look at.`,
    objectionHandlers: [
      {
        objection: "My nephew / mate built it, it's fine",
        response: "Fair enough — I'm not trying to knock it. But 70% of people browse on their phone now and it's not displaying right on mobile. That means you could be losing leads without knowing it. The comparison I've made will show you exactly what I mean. Can I send it?",
      },
      {
        objection: "I've been meaning to update it",
        response: "Perfect timing then! I've actually done the work already — I've mocked up what a new version could look like using your actual branding and reviews. Shall I send it over so you've got something concrete to look at?",
      },
      {
        objection: "What's wrong with it specifically?",
        response: "Three main things: it's not mobile-optimised, it's missing some SEO basics so you're not showing up as high as you could on Google, and there's no clear call-to-action — so visitors don't know what to do next. The comparison I've made shows all of that. Shall I send it?",
      },
    ],
    tips: [
      "Be specific about what's wrong — don't just say 'bad'",
      "The side-by-side comparison is killer — they can see the difference instantly",
      "Never insult their current site directly. Focus on 'potential'",
    ],
  },
  {
    id: "upsell-automations",
    title: "Upsell: Review Automation",
    icon: <Star className="h-5 w-5 text-yellow-400" />,
    description: "Existing client or lead with great reviews — automate getting more",
    scenario: "They already have good reviews. Offer a system that automatically requests reviews after every job.",
    body: `Hi [name], JJ from Cold Lava. I noticed [company] has fantastic reviews — [X] stars, that's impressive. Quick question: are you actively asking for reviews after every job, or do they just come in naturally? [pause for answer] Yeah — most people tell me the same thing. We've built a system that sends an automatic review request after every job is completed. No chasing, no awkwardness. Takes 5 minutes to set up. Would that be useful?`,
    objectionHandlers: [
      {
        objection: "I already ask for reviews",
        response: "Brilliant — sounds like you know the value. But let me ask: do you remember to ask EVERY time? The automated system means it happens after every single job without you thinking about it. Consistent reviews is what moves you up Google rankings.",
      },
      {
        objection: "My reviews are already good",
        response: "They are — that's exactly why I called you. But here's the thing: Google favours recent reviews. If your latest review is from 6 months ago, you start dropping. This system keeps them flowing in weekly. It's a small thing that compounds over time.",
      },
    ],
    tips: [
      "This works best as an add-on conversation, not a cold open",
      "Mention the specific star rating — shows you've done research",
      "The 5-minute setup line removes friction",
    ],
  },
  {
    id: "follow-up-1",
    title: "Follow Up: Day 2",
    icon: <Phone className="h-5 w-5 text-blue-400" />,
    description: "Following up after sending the mockup/demo",
    scenario: "You sent a mockup or demo yesterday. This is the follow-up call.",
    body: `Hi [name], JJ from Cold Lava — I sent over that mockup for [company] yesterday. Did you get a chance to have a look? [If yes] Great — what did you think? [If no] No worries, I know you're busy. It's sitting in your texts — have a quick look when you get a sec and I'll give you a ring tomorrow. Sound good?`,
    tips: [
      "Keep it light and low-pressure",
      "If they liked it, transition to pricing naturally",
      "If no answer, leave a voicemail and text",
    ],
  },
  {
    id: "follow-up-voicemail",
    title: "Voicemail Script",
    icon: <MessageSquare className="h-5 w-5 text-purple-400" />,
    description: "What to say when you hit voicemail",
    scenario: "They didn't answer. Leave a clear, short voicemail that prompts a callback or text reply.",
    body: `Hi [name], it's JJ from Cold Lava. I built a quick website mockup for [company] and wanted to send it across. Give me a text back on this number and I'll fire it over — takes 30 seconds to look at. Cheers!`,
    tips: [
      "Under 20 seconds. Always.",
      "Always say 'text back' — it's lower friction than calling back",
      "Send a text immediately after the voicemail",
    ],
  },
  {
    id: "gatekeeper",
    title: "Getting Past the Gatekeeper",
    icon: <PhoneOff className="h-5 w-5 text-red-400" />,
    description: "When a receptionist or employee answers instead of the decision-maker",
    scenario: "You're calling a business and someone other than the owner picks up.",
    body: `Hi there, is [name / the owner] available? [If asked what it's about] I was just looking at [company]'s website and had a quick question about it — won't take a minute. [If not available] No problem — when's the best time to catch them? I'll ring back then.`,
    tips: [
      "Be confident and casual — like you already know them",
      "Never pitch to the gatekeeper. Get the decision-maker.",
      "Ask for best time and ring back at exactly that time",
    ],
  },
  {
    id: "pricing-transition",
    title: "Pricing Conversation",
    icon: <Zap className="h-5 w-5 text-emerald-400" />,
    description: "When they've seen the mockup and want to know pricing",
    scenario: "They liked the mockup and asked 'how much'. This is the transition from demo to deal.",
    body: `So glad you liked it! Here's how it works: the site is a one-off £[price] — that includes the design, build, mobile optimisation, and getting it live. There's a small monthly fee of £[monthly] that covers hosting, security updates, and any small changes you need. No contracts — if you want to leave, you can. Most of our clients have been with us from day one though. Want me to get yours started?`,
    objectionHandlers: [
      {
        objection: "That's more than I expected",
        response: "I get that. Think of it this way though — if your site brings in even one extra job a month, it's paid for itself. And compared to paying for Google ads, this is a fraction of the cost and it works 24/7.",
      },
      {
        objection: "I need to think about it",
        response: "Of course — no rush. I'll send you a summary of everything that's included and the pricing by text. If you've got any questions, just ping me. When would be good to follow up?",
      },
      {
        objection: "Can you do it cheaper?",
        response: "I hear you. The price reflects the quality — you've seen the mockup. But tell you what: if you want to go ahead this week, I can [offer]. Fair?",
      },
    ],
    tips: [
      "Silence after the price is your friend. Don't fill it.",
      "Always anchor the value before the price",
      "One-off + small monthly is easier to swallow than a big monthly",
    ],
  },
  {
    id: "callback-booked",
    title: "Callback: After Missed Appointment",
    icon: <RefreshCw className="h-5 w-5 text-teal-400" />,
    description: "They said they'd call back or had a callback booked but didn't show",
    scenario: "A lead was supposed to ring back or had a scheduled call but ghosted. Re-engage them.",
    body: `Hi [name], it's JJ from Cold Lava. We had a chat [last week / the other day] about the website for [company]. I know things get busy — just wanted to check in. Is now a good time for a quick 2-minute catch-up, or is there a better time this week?`,
    tips: [
      "Don't guilt-trip them. Life happens.",
      "Offer them an easy out ('better time this week')",
      "If they dodge twice, send a final text and move on",
    ],
  },
]

function ScriptCard({ script, isExpanded, onToggle }: { script: Script; isExpanded: boolean; onToggle: () => void }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = script.body
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card className={cn(
      "bg-gradient-to-b from-white/[0.04] to-white/[0.02]",
      "border border-white/[0.08]",
      "shadow-[0_4px_12px_-4px_rgba(0,0,0,0.3)]",
      "rounded-xl overflow-hidden",
      "transition-all duration-200",
      "hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)]",
      "hover:border-cyan-500/20"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <button onClick={onToggle} className="flex items-center gap-3 text-left flex-1 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-white/[0.06] flex items-center justify-center border border-white/[0.08] shrink-0">
              {script.icon}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg text-white">{script.title}</CardTitle>
              <CardDescription className="text-white/50 text-sm">{script.description}</CardDescription>
            </div>
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className={cn(
              "gap-1.5 h-8 text-xs transition-all shrink-0 ml-3",
              copied
                ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400"
                : "hover:bg-cyan-500/10 hover:border-cyan-500/20 hover:text-cyan-400"
            )}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scenario context */}
        {isExpanded && (
          <div className="rounded-lg px-3 py-2 bg-white/[0.02] border border-white/[0.04] text-xs text-white/50">
            <span className="font-semibold text-white/60">Scenario: </span>
            {script.scenario}
          </div>
        )}

        {/* Main script */}
        <div className={cn(
          "rounded-lg p-4",
          "bg-gradient-to-br from-white/[0.03] to-white/[0.01]",
          "border border-white/[0.06]",
          "font-mono text-sm leading-relaxed text-white/80",
          "selection:bg-cyan-500/30"
        )}>
          {script.body}
        </div>

        {/* Expandable sections */}
        {isExpanded && (
          <>
            {/* Objection handlers */}
            {script.objectionHandlers && script.objectionHandlers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">Objection Handling</h4>
                <div className="space-y-2">
                  {script.objectionHandlers.map((oh, i) => (
                    <div key={i} className="rounded-lg border border-white/[0.06] overflow-hidden">
                      <div className="px-3 py-2 bg-red-500/5 border-b border-white/[0.04]">
                        <p className="text-xs font-medium text-red-300/80">
                          &ldquo;{oh.objection}&rdquo;
                        </p>
                      </div>
                      <div className="px-3 py-2 bg-emerald-500/5">
                        <div className="flex gap-2">
                          <ArrowRight className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-emerald-300/80 leading-relaxed">
                            {oh.response}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {script.tips && script.tips.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">Tips</h4>
                <ul className="space-y-1">
                  {script.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                      <span className="text-cyan-400 mt-0.5 shrink-0">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Expand/collapse toggle */}
        {(script.objectionHandlers || script.tips) && (
          <button
            onClick={onToggle}
            className="text-xs text-cyan-400/60 hover:text-cyan-400 transition-colors"
          >
            {isExpanded ? "Show less" : "Show objection handling & tips →"}
          </button>
        )}
      </CardContent>
    </Card>
  )
}

export default function ScriptsPage() {
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  return (
    <div className="relative">
      {/* Subtle page background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-white/[0.04] to-cyan-950/20 pointer-events-none" />

      <div className="relative space-y-6 max-w-4xl">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Cold Calling Scripts
            </h1>
            <Badge variant="outline" className="text-xs text-cyan-400 border-cyan-500/30">
              {scripts.length} scripts
            </Badge>
          </div>
          <p className="text-white/50 text-sm">
            Click copy to grab a script. Replace <span className="font-mono text-cyan-400/80">[name]</span>, <span className="font-mono text-cyan-400/80">[company]</span>, and <span className="font-mono text-cyan-400/80">[X]</span> before calling. Click a script to see objection handling.
          </p>
        </div>

        {/* Scripts */}
        <div className="space-y-4">
          {scripts.map((script) => (
            <ScriptCard
              key={script.id}
              script={script}
              isExpanded={expandedId === script.id}
              onToggle={() => setExpandedId(prev => prev === script.id ? null : script.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
