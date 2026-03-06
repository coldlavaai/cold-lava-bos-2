"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

export default function OAuthSuccessPage() {
  const searchParams = useSearchParams()
  const provider = searchParams?.get("provider") || "Provider"

  useEffect(() => {
    // Close popup window after a brief delay
    const timer = setTimeout(() => {
      if (window.opener) {
        window.close()
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-white mb-2">
          {provider} Connected Successfully!
        </h1>
        <p className="text-white/60">
          This window will close automatically...
        </p>
      </div>
    </div>
  )
}
