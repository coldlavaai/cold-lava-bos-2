"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Building2,
  Mail,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  AlertCircle,
  Link as LinkIcon,
  Phone,
  Pencil,
  Lock,
  Users,
  ShieldCheck,
} from "lucide-react"
import {
  useUsers,
  useInviteUser,
  useDeleteUser,
  useProfiles,
  useSaveProfile,
  useDeleteProfile,
} from "@/lib/api/hooks"
import type { UserProfile, ProfilePermissions, ModulePermissions } from "@/lib/api/types"

// Permission modules and actions
const MODULES = [
  { key: "customers", label: "Customers" },
  { key: "jobs", label: "Jobs" },
  { key: "calendar", label: "Calendar" },
  { key: "comms", label: "Comms" },
  { key: "settings", label: "Settings" },
] as const

const ACTIONS = ["view", "create", "edit", "delete"] as const

function emptyPermissions(): ProfilePermissions {
  const perms: Record<string, ModulePermissions> = {}
  for (const m of MODULES) {
    perms[m.key] = { view: false, create: false, edit: false, delete: false }
  }
  return perms as ProfilePermissions
}

export default function SettingsUsersPage() {
  const [activeTab, setActiveTab] = React.useState("users")

  return (
    <div className="space-y-4">
      {/* Compact header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h1 className="text-xl font-display font-bold gradient-text-solar">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage team members, roles, and access control
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Settings Navigation — horizontal on mobile, sidebar on desktop */}
        <div className="lg:col-span-1">
          {/* Mobile: horizontal scrollable pills */}
          <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-thin">
            <a href="/settings" className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground whitespace-nowrap shrink-0">General</a>
            <a href="/settings/organisation" className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground whitespace-nowrap shrink-0">Organisation</a>
            <a href="/settings/users" className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium whitespace-nowrap shrink-0">Users</a>
            <a href="/settings/integrations" className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground whitespace-nowrap shrink-0">Integrations</a>
            <a href="/settings/phone" className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground whitespace-nowrap shrink-0">Phone</a>
            <a href="/settings/ai" className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground whitespace-nowrap shrink-0">AI</a>
          </div>
          {/* Desktop: vertical card nav */}
          <Card className="hidden lg:block h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <a href="/settings" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"><Building2 className="h-4 w-4" />General</a>
              <a href="/settings/organisation" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"><Building2 className="h-4 w-4" />Organisation</a>
              <a href="/settings/users" className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 text-sm font-medium"><UserPlus className="h-4 w-4" />Users & Profiles</a>
              <a href="/settings/integrations" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"><LinkIcon className="h-4 w-4" />Integrations</a>
              <a href="/settings/phone" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"><Phone className="h-4 w-4" />Phone</a>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="users" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Users
              </TabsTrigger>
              <TabsTrigger value="profiles" className="gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Profiles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <UsersTab />
            </TabsContent>

            <TabsContent value="profiles">
              <ProfilesTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Users Tab
// ============================================================================

function UsersTab() {
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState("sales")
  const [inviteProfileId, setInviteProfileId] = React.useState<string>("")
  const [inviteError, setInviteError] = React.useState("")

  const { data: users, isLoading, error } = useUsers()
  const { data: profiles } = useProfiles()
  const inviteUserMutation = useInviteUser()

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) return
    setInviteError("")

    inviteUserMutation.mutate(
      { email: inviteEmail, role: inviteRole },
      {
        onSuccess: () => {
          setInviteDialogOpen(false)
          setInviteEmail("")
          setInviteRole("sales")
          setInviteProfileId("")
          setInviteError("")
        },
        onError: (error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to send invite"
          setInviteError(errorMessage)
        },
      }
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage user access and roles for your team
            </CardDescription>
          </div>
          <Button className="gap-1.5 h-8" onClick={() => setInviteDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Invite User
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <LoadingSkeleton className="h-12" />
              <LoadingSkeleton className="h-16" />
              <LoadingSkeleton className="h-16" />
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-destructive" />
              <p className="text-sm text-destructive">Failed to load users</p>
            </div>
          ) : !users || users.length === 0 ? (
            <EmptyState
              icon={<UserPlus className="h-12 w-12" />}
              title="No team members yet"
              description="Invite users to collaborate on your projects"
            />
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-xs">User</th>
                    <th className="text-left px-3 py-2 font-medium text-xs">Email</th>
                    <th className="text-left px-3 py-2 font-medium text-xs">Role</th>
                    <th className="text-left px-3 py-2 font-medium text-xs">Profile</th>
                    <th className="text-left px-3 py-2 font-medium text-xs">Joined</th>
                    <th className="text-right px-3 py-2 font-medium text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <UserRow key={user.id} user={user} profiles={profiles || []} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog
        open={inviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open)
          if (!open) {
            setInviteEmail("")
            setInviteRole("sales")
            setInviteProfileId("")
            setInviteError("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {inviteError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="ops">Operations</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Determines what the user can access and modify
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile">Profile (optional)</Label>
              <Select value={inviteProfileId} onValueChange={setInviteProfileId}>
                <SelectTrigger id="profile">
                  <SelectValue placeholder="Select a profile..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No profile</SelectItem>
                  {(profiles || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Permission template controlling module-level access
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendInvite}
              disabled={!inviteEmail.trim() || inviteUserMutation.isPending}
              loading={inviteUserMutation.isPending}
              className="gap-1.5"
            >
              <Mail className="h-4 w-4" />
              {inviteUserMutation.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function UserRow({
  user,
  profiles,
}: {
  user: {
    id: string
    email: string
    name: string
    role: string
    profile_id?: string | null
    status: string
    created_at: string
  }
  profiles: UserProfile[]
}) {
  const deleteUserMutation = useDeleteUser()

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default"
      case "sales":
        return "info"
      case "ops":
        return "secondary"
      case "finance":
        return "warning"
      default:
        return "outline"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const getInitials = () => {
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const handleDelete = () => {
    if (user.role === "admin") return
    deleteUserMutation.mutate(user.id)
  }

  const profileName =
    profiles.find((p) => p.id === user.profile_id)?.name || "—"

  return (
    <tr className="hover:bg-muted/30 transition-colors group">
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-xs">
            {getInitials()}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{user.name}</div>
            <Badge
              variant={user.status === "active" ? "success" : "outline"}
              className="text-xs h-4 mt-0.5"
            >
              {user.status}
            </Badge>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-muted-foreground truncate">
        {user.email}
      </td>
      <td className="px-3 py-3">
        <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
          <Shield className="h-3 w-3 mr-1" />
          {user.role}
        </Badge>
      </td>
      <td className="px-3 py-3 text-xs text-muted-foreground">
        {profileName}
      </td>
      <td className="px-3 py-3 text-xs text-muted-foreground">
        {formatDate(user.created_at)}
      </td>
      <td className="px-3 py-3 text-right">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          disabled={user.role === "admin"}
          loading={deleteUserMutation.isPending}
          onClick={handleDelete}
          data-testid={`delete-user-${user.id}`}
          aria-label="Delete user"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  )
}

// ============================================================================
// Profiles Tab
// ============================================================================

function ProfilesTab() {
  const { data: profiles, isLoading, error } = useProfiles()
  const [editingProfile, setEditingProfile] = React.useState<UserProfile | null>(null)
  const [creatingNew, setCreatingNew] = React.useState(false)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Permission Profiles</CardTitle>
            <CardDescription>
              Define permission templates that control what users can access
            </CardDescription>
          </div>
          <Button
            className="gap-1.5 h-8"
            onClick={() => setCreatingNew(true)}
          >
            <Plus className="h-4 w-4" />
            Create Profile
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <LoadingSkeleton className="h-12" />
              <LoadingSkeleton className="h-16" />
              <LoadingSkeleton className="h-16" />
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-destructive" />
              <p className="text-sm text-destructive">Failed to load profiles</p>
            </div>
          ) : !profiles || profiles.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-12 w-12" />}
              title="No profiles yet"
              description="Create permission profiles to control user access"
            />
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-xs">Profile</th>
                    <th className="text-left px-3 py-2 font-medium text-xs">Description</th>
                    <th className="text-left px-3 py-2 font-medium text-xs">Type</th>
                    <th className="text-left px-3 py-2 font-medium text-xs">Permissions</th>
                    <th className="text-right px-3 py-2 font-medium text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profiles.map((profile) => (
                    <ProfileRow
                      key={profile.id}
                      profile={profile}
                      onEdit={setEditingProfile}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      {editingProfile && (
        <ProfileEditorDialog
          profile={editingProfile}
          onClose={() => setEditingProfile(null)}
        />
      )}

      {/* Create Profile Dialog */}
      {creatingNew && (
        <ProfileEditorDialog
          profile={null}
          onClose={() => setCreatingNew(false)}
        />
      )}
    </>
  )
}

function ProfileRow({
  profile,
  onEdit,
}: {
  profile: UserProfile
  onEdit: (profile: UserProfile) => void
}) {
  const deleteProfileMutation = useDeleteProfile()

  const permSummary = React.useMemo(() => {
    const perms = profile.permissions
    if (!perms) return "No permissions"

    const enabledModules = MODULES.filter((m) => {
      const mp = perms[m.key]
      return mp && (mp.view || mp.create || mp.edit || mp.delete)
    })

    if (enabledModules.length === MODULES.length) return "Full access"
    if (enabledModules.length === 0) return "No access"
    return enabledModules.map((m) => m.label).join(", ")
  }, [profile.permissions])

  return (
    <tr className="hover:bg-muted/30 transition-colors group">
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            {profile.is_system ? (
              <Lock className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Shield className="h-3.5 w-3.5 text-primary" />
            )}
          </div>
          <span className="font-medium text-sm">{profile.name}</span>
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
        {profile.description || "—"}
      </td>
      <td className="px-3 py-3">
        <Badge variant={profile.is_system ? "secondary" : "outline"} className="text-xs">
          {profile.is_system ? "System" : "Custom"}
        </Badge>
      </td>
      <td className="px-3 py-3 text-xs text-muted-foreground">
        {permSummary}
      </td>
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onEdit(profile)}
            aria-label="Edit profile"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!profile.is_system && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              loading={deleteProfileMutation.isPending}
              onClick={() => deleteProfileMutation.mutate(profile.id)}
              aria-label="Delete profile"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ============================================================================
// Profile Editor Dialog (Create / Edit)
// ============================================================================

function ProfileEditorDialog({
  profile,
  onClose,
}: {
  profile: UserProfile | null
  onClose: () => void
}) {
  const isNew = !profile
  const [name, setName] = React.useState(profile?.name || "")
  const [description, setDescription] = React.useState(profile?.description || "")
  const [permissions, setPermissions] = React.useState<ProfilePermissions>(
    profile?.permissions || emptyPermissions()
  )
  const [saveError, setSaveError] = React.useState("")

  const saveProfileMutation = useSaveProfile()

  const togglePermission = (moduleKey: string, action: string) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [action]: !prev[moduleKey]?.[action as keyof ModulePermissions],
      },
    }))
  }

  const toggleModuleAll = (moduleKey: string) => {
    const mod = permissions[moduleKey]
    const allEnabled = mod && ACTIONS.every((a) => mod[a])
    const newVal = !allEnabled
    setPermissions((prev) => ({
      ...prev,
      [moduleKey]: {
        view: newVal,
        create: newVal,
        edit: newVal,
        delete: newVal,
      },
    }))
  }

  const handleSave = () => {
    if (!name.trim()) return
    setSaveError("")

    saveProfileMutation.mutate(
      {
        id: profile?.id,
        name: name.trim(),
        description: description.trim(),
        permissions: permissions as unknown as Record<string, Record<string, boolean>>,
      },
      {
        onSuccess: () => onClose(),
        onError: (err: unknown) => {
          setSaveError(
            err instanceof Error ? err.message : "Failed to save profile"
          )
        },
      }
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Create Profile" : `Edit Profile: ${profile.name}`}
          </DialogTitle>
          <DialogDescription>
            {isNew
              ? "Define a new permission template for users"
              : "Modify the permissions for this profile"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {saveError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Project Manager"
                disabled={profile?.is_system}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-desc">Description</Label>
              <Input
                id="profile-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this profile is for..."
              />
            </div>
          </div>

          {/* Permission Grid */}
          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-medium text-xs w-[140px]">
                      Module
                    </th>
                    {ACTIONS.map((action) => (
                      <th
                        key={action}
                        className="text-center px-3 py-2.5 font-medium text-xs capitalize"
                      >
                        {action}
                      </th>
                    ))}
                    <th className="text-center px-3 py-2.5 font-medium text-xs">
                      All
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MODULES.map((mod) => {
                    const mp = permissions[mod.key] || {
                      view: false,
                      create: false,
                      edit: false,
                      delete: false,
                    }
                    const allChecked = ACTIONS.every((a) => mp[a])

                    return (
                      <tr key={mod.key} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium text-sm">
                          {mod.label}
                        </td>
                        {ACTIONS.map((action) => (
                          <td key={action} className="text-center px-3 py-2.5">
                            <Checkbox
                              checked={!!mp[action]}
                              onCheckedChange={() =>
                                togglePermission(mod.key, action)
                              }
                              aria-label={`${mod.label} ${action}`}
                            />
                          </td>
                        ))}
                        <td className="text-center px-3 py-2.5">
                          <Checkbox
                            checked={allChecked}
                            onCheckedChange={() => toggleModuleAll(mod.key)}
                            aria-label={`${mod.label} all`}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || saveProfileMutation.isPending}
            loading={saveProfileMutation.isPending}
            className="gap-1.5"
          >
            <Shield className="h-4 w-4" />
            {saveProfileMutation.isPending
              ? "Saving..."
              : isNew
                ? "Create Profile"
                : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
