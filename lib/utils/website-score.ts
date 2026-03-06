import type { Job } from "@/lib/api/types"

/**
 * Extract website score from a job.
 * Checks (in order):
 * 1. job.website_score (direct field)
 * 2. job.metadata.website_score (metadata object)
 * 3. Parses from job.notes (e.g. "Website Score: 37/100" or "website_score: 37")
 */
export function getWebsiteScore(job: Job): number | null {
  // 1. Direct field
  if (job.website_score != null) {
    return job.website_score
  }

  // 2. Metadata
  if (job.metadata) {
    const metaScore = (job.metadata as Record<string, unknown>).website_score
    if (typeof metaScore === "number") return metaScore
    if (typeof metaScore === "string") {
      const parsed = parseInt(metaScore, 10)
      if (!isNaN(parsed)) return parsed
    }
  }

  // 3. Parse from notes
  if (job.notes) {
    // Match patterns like "Website Score: 37", "website_score: 37/100", "Web Score: 37"
    const match = job.notes.match(/website[\s_-]*score\s*[:\-=]\s*(\d+)/i)
    if (match) {
      return parseInt(match[1], 10)
    }
  }

  return null
}
