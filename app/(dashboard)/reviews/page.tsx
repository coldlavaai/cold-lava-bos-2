/**
 * Session 104: Reviews Page
 * View and manage customer reviews
 */

"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import {
  Star,
  MessageSquare,
  Filter,
  X,
  User,
  Briefcase,
  Calendar,
  Send
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ReviewWithRelations } from "@/app/api/reviews/route"
import { formatDistanceToNow } from "date-fns"

export default function ReviewsPage() {
  const [selectedReview, setSelectedReview] = React.useState<ReviewWithRelations | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [sourceFilter, setSourceFilter] = React.useState<string>("all")
  const [ratingFilter, setRatingFilter] = React.useState<string>("all")

  const queryClient = useQueryClient()

  // Fetch reviews
  const { data, isLoading, error } = useQuery({
    queryKey: ["reviews", statusFilter, sourceFilter, ratingFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (sourceFilter !== "all") params.append("source", sourceFilter)
      if (ratingFilter !== "all") {
        if (ratingFilter === "5") {
          params.append("rating_min", "5")
          params.append("rating_max", "5")
        } else if (ratingFilter === "4+") {
          params.append("rating_min", "4")
        } else if (ratingFilter === "3-") {
          params.append("rating_max", "3")
        }
      }

      const res = await fetch(`/api/reviews?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch reviews")
      return res.json()
    },
  })

  const reviews = data?.data || []

  return (
    
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h1 className="text-lg md:text-xl font-display font-bold gradient-text-solar">
              Reviews
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage customer feedback and testimonials
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <Label className="text-xs">Status</Label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full mt-1 flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="all">All</option>
                  <option value="new">New</option>
                  <option value="replied">Replied</option>
                  <option value="flagged">Flagged</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              {/* Source Filter */}
              <div>
                <Label className="text-xs">Source</Label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full mt-1 flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="all">All</option>
                  <option value="invited">Invited</option>
                  <option value="imported">Imported</option>
                  <option value="manual">Manual</option>
                  <option value="external">External</option>
                </select>
              </div>

              {/* Rating Filter */}
              <div>
                <Label className="text-xs">Rating</Label>
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="w-full mt-1 flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="all">All</option>
                  <option value="5">5 Stars</option>
                  <option value="4+">4+ Stars</option>
                  <option value="3-">3 Stars or Less</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all")
                    setSourceFilter("all")
                    setRatingFilter("all")
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-3">
            {isLoading ? (
              <>
                <LoadingSkeleton className="h-32" />
                <LoadingSkeleton className="h-32" />
                <LoadingSkeleton className="h-32" />
              </>
            ) : error ? (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <p className="text-sm text-destructive">Failed to load reviews</p>
                </CardContent>
              </Card>
            ) : reviews.length === 0 ? (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No reviews found</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Send review invitations from customer or job pages
                  </p>
                </CardContent>
              </Card>
            ) : (
              reviews.map((review: ReviewWithRelations) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  isSelected={selectedReview?.id === review.id}
                  onClick={() => setSelectedReview(review)}
                />
              ))
            )}
          </div>

          {/* Review Detail Panel */}
          <div className="lg:col-span-1">
            {selectedReview ? (
              <ReviewDetailPanel
                review={selectedReview}
                onClose={() => setSelectedReview(null)}
                onUpdate={(updated) => {
                  setSelectedReview(updated)
                  queryClient.invalidateQueries({ queryKey: ["reviews"] })
                }}
              />
            ) : (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    Select a review to view details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    
  )
}

function ReviewCard({
  review,
  isSelected,
  onClick,
}: {
  review: ReviewWithRelations
  isSelected: boolean
  onClick: () => void
}) {
  const customerName = review.customer
    ? `${review.customer.first_name} ${review.customer.last_name}`
    : "Unknown Customer"

  return (
    <Card
      className={`cursor-pointer transition-colors ${
        isSelected
          ? "border-primary bg-muted/50"
          : "hover:border-primary/50 hover:bg-muted/30"
      }`}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-4">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <p className="font-medium truncate">{customerName}</p>
              </div>
              {review.job && (
                <div className="flex items-center gap-2 mt-1">
                  <Briefcase className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground truncate">
                    {review.job.job_number}
                  </p>
                </div>
              )}
            </div>

            {/* Rating */}
            {review.rating && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < review.rating!
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Title & Body Preview */}
          {review.title && (
            <p className="text-sm font-medium">{review.title}</p>
          )}
          {review.body && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {review.body}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                {review.status}
              </span>
              <span className="capitalize">{review.source}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ReviewDetailPanel({
  review,
  onClose,
  onUpdate,
}: {
  review: ReviewWithRelations
  onClose: () => void
  onUpdate: (updated: ReviewWithRelations) => void
}) {
  const [replyBody, setReplyBody] = React.useState(review.reply_body || "")
  const [status, setStatus] = React.useState(review.status)
  const [isVisible, setIsVisible] = React.useState(review.is_visible)

  const updateMutation = useMutation({
    mutationFn: async (data: {
      reply_body?: string
      status?: string
      is_visible?: boolean
      version: number
    }) => {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to update review")
      return res.json()
    },
    onSuccess: (data) => {
      onUpdate(data.data)
    },
  })

  const handleSave = () => {
    updateMutation.mutate({
      reply_body: replyBody,
      status,
      is_visible: isVisible,
      version: review.version,
    })
  }

  const customerName = review.customer
    ? `${review.customer.first_name} ${review.customer.last_name}`
    : "Unknown Customer"

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">Review Details</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Info */}
        <div>
          <Label className="text-xs text-muted-foreground">Customer</Label>
          <p className="text-sm font-medium">{customerName}</p>
          {review.customer?.email && (
            <p className="text-xs text-muted-foreground">{review.customer.email}</p>
          )}
        </div>

        {/* Job Info */}
        {review.job && (
          <div>
            <Label className="text-xs text-muted-foreground">Job</Label>
            <p className="text-sm font-medium">{review.job.job_number}</p>
            <p className="text-xs text-muted-foreground">{review.job.site_address}</p>
          </div>
        )}

        {/* Rating */}
        {review.rating && (
          <div>
            <Label className="text-xs text-muted-foreground">Rating</Label>
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < review.rating!
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Review Content */}
        {review.title && (
          <div>
            <Label className="text-xs text-muted-foreground">Title</Label>
            <p className="text-sm font-medium">{review.title}</p>
          </div>
        )}

        {review.body && (
          <div>
            <Label className="text-xs text-muted-foreground">Review</Label>
            <p className="text-sm whitespace-pre-wrap">{review.body}</p>
          </div>
        )}

        {/* Reply */}
        <div>
          <Label htmlFor="reply">Your Reply</Label>
          <Textarea
            id="reply"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write a reply to this review..."
            rows={4}
            className="mt-1"
          />
        </div>

        {/* Status */}
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="w-full mt-1 flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="new">New</option>
            <option value="replied">Replied</option>
            <option value="flagged">Flagged</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>

        {/* Visibility */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="visible"
            checked={isVisible}
            onChange={(e) => setIsVisible(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="visible" className="text-sm cursor-pointer">
            Visible to customers
          </Label>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>

        {updateMutation.isError && (
          <p className="text-xs text-destructive">
            Failed to update review. Please try again.
          </p>
        )}

        {updateMutation.isSuccess && (
          <p className="text-xs text-green-400">Review updated successfully!</p>
        )}
      </CardContent>
    </Card>
  )
}

function getStatusColor(status: string): string {
  switch (status) {
    case "new":
      return "bg-blue-500/15 text-blue-300"
    case "replied":
      return "bg-green-500/15 text-green-300"
    case "flagged":
      return "bg-yellow-500/15 text-yellow-300"
    case "hidden":
      return "bg-white/[0.06] text-white/50"
    default:
      return "bg-white/[0.06] text-white/50"
  }
}
