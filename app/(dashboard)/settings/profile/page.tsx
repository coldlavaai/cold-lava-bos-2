"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Building2, 
  Save, 
  Loader2,
  CheckCircle,
  Camera,
  Settings,
  Users
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface Profile {
  id: string
  email: string
  name: string
  phone: string | null
  avatar_url: string | null
  created_at: string
  role: string
  tenant_name: string | null
}

async function fetchProfile(): Promise<Profile> {
  const res = await fetch("/api/profile")
  if (!res.ok) throw new Error("Failed to fetch profile")
  return res.json()
}

async function updateProfile(data: Partial<Profile>): Promise<Profile> {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to update profile")
  return res.json()
}

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = React.useState({
    name: "",
    phone: "",
  })
  const [saved, setSaved] = React.useState(false)

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  })

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  // Initialize form when profile loads
  React.useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        phone: profile.phone || "",
      })
    }
  }, [profile])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      name: formData.name,
      phone: formData.phone || null,
    })
  }

  const hasChanges = profile && (
    formData.name !== (profile.name || "") ||
    formData.phone !== (profile.phone || "")
  )

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-purple-500/15 text-purple-300"
      case "sales": return "bg-blue-500/15 text-blue-300"
      case "ops": return "bg-green-500/15 text-green-300"
      case "finance": return "bg-teal-500/15 text-teal-300"
      default: return "bg-white/[0.06] text-white/70"
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h1 className="text-xl font-display font-bold gradient-text-solar">My Profile</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your personal information</p>
          </div>
        </div>
        <LoadingSkeleton variant="card" count={2} />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h1 className="text-xl font-display font-bold gradient-text-solar">My Profile</h1>
          </div>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Failed to load profile. Please try again.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h1 className="text-xl font-display font-bold gradient-text-solar">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your personal information</p>
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
              href="/settings/profile"
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 text-primary text-sm font-medium"
            >
              <User className="h-4 w-4" />
              My Profile
            </a>
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
              <Users className="h-4 w-4" />
              Team
            </a>
            <a
              href="/settings/integrations"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              Integrations
            </a>
            <a
              href="/settings/phone"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              <Phone className="h-4 w-4" />
              Phone
            </a>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Profile Card */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-2 border-border">
                    <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
                    <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                      {getInitials(profile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <button 
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                    title="Change avatar (coming soon)"
                    disabled
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1 pt-1">
                  <h2 className="text-lg font-semibold">{profile.name}</h2>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getRoleBadgeColor(profile.role)}>
                      <Shield className="h-3 w-3 mr-1" />
                      {profile.role}
                    </Badge>
                    {profile.tenant_name && (
                      <Badge variant="outline">
                        <Building2 className="h-3 w-3 mr-1" />
                        {profile.tenant_name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Edit Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+44 7xxx xxxxxx"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                      Role
                    </Label>
                    <Input
                      value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                      disabled
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">Contact an admin to change your role</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button 
                    type="submit" 
                    disabled={!hasChanges || mutation.isPending}
                    className="gap-2"
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : saved ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  {hasChanges && !mutation.isPending && (
                    <span className="text-sm text-muted-foreground">You have unsaved changes</span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Information</CardTitle>
              <CardDescription>Your account details and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Account ID</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">{profile.id.slice(0, 8)}...</code>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Member Since</span>
                <span className="text-sm">{new Date(profile.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Organisation</span>
                <span className="text-sm font-medium">{profile.tenant_name || "—"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
