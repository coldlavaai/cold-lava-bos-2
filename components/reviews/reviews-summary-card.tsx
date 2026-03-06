/**
 * Session 107: Reviews Summary Card
 * Displays review count, average rating, and recent reviews for a customer or job
 */

"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, MessageSquare, ExternalLink } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { ReviewWithRelations } from "@/app/api/reviews/route"
import { formatDistanceToNow } from "date-fns"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"

interface ReviewsSummaryCardProps {
  customerId?: string
  jobId?: string
  className?: string
}

export function ReviewsSummaryCard({ customerId, jobId, className }: ReviewsSummaryCardProps) {
  // Fetch reviews filtered by customer or job
  const { data, isLoading, error } = useQuery({
    queryKey: ["reviews-summary", customerId, jobId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (customerId) params.append("customer_id", customerId)
      if (jobId) params.append("job_id", jobId)
      params.append("limit", "5") // Only get 5 most recent

      const res = await fetch(`/api/reviews?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch reviews")
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const reviews = (data?.data as ReviewWithRelations[]) || []
  const totalReviews = data?.meta?.total || 0

  // Calculate average rating
  const reviewsWithRating = reviews.filter((r) => r.rating != null)
  const averageRating =
    reviewsWithRating.length > 0
      ? reviewsWithRating.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewsWithRating.length
      : 0

  if (isLoading) {
    return <LoadingSkeleton className={className} />
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">Failed to load reviews</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Reviews</CardTitle>
            <CardDescription className="text-xs">
              Customer feedback and testimonials
            </CardDescription>
          </div>
          <Link href="/reviews">
            <Button variant="ghost" size="sm" className="gap-1 text-xs h-8">
              View All
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {totalReviews === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="flex items-center gap-4 pb-3 border-b">
              <div>
                <div className="text-2xl font-display font-bold">{totalReviews}</div>
                <div className="text-xs text-muted-foreground">
                  {totalReviews === 1 ? "Review" : "Reviews"}
                </div>
              </div>
              {reviewsWithRating.length > 0 && (
                <>
                  <div className="h-8 w-px bg-border" />
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.round(averageRating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {averageRating.toFixed(1)} average
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Recent Reviews */}
            {reviews.length > 0 && (
              <div className="space-y-3">
                {reviews.slice(0, 3).map((review) => (
                  <div key={review.id} className="text-sm space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {review.rating && (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < review.rating!
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(review.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[0.65rem] font-medium ${getStatusColor(
                          review.status
                        )}`}
                      >
                        {review.status}
                      </span>
                    </div>
                    {review.title && (
                      <p className="font-medium text-xs line-clamp-1">{review.title}</p>
                    )}
                    {review.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {review.body}
                      </p>
                    )}
                  </div>
                ))}
                {reviews.length > 3 && (
                  <Link href="/reviews">
                    <Button variant="ghost" size="sm" className="w-full text-xs h-8">
                      View {reviews.length - 3} more
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
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
