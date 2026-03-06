/**
 * Retry Utility with Exponential Backoff + Jitter
 *
 * Based on ByteByteGo best practices (PDF-DEVELOPER-ADVICE-ANALYSIS.md)
 * Implements exponential jitter backoff to prevent thundering herd on provider outages
 *
 * Session: Enterprise Readiness - Retry Logic Implementation
 */

export interface RetryOptions {
  /**
   * Maximum number of attempts (including initial attempt)
   * @default 3
   */
  maxAttempts?: number

  /**
   * Initial delay in milliseconds before first retry
   * Subsequent retries use exponential backoff: initialDelay * (2 ^ attemptNumber)
   * @default 1000
   */
  initialDelay?: number

  /**
   * Jitter percentage (0-1) to add randomness to backoff delays
   * Prevents thundering herd when many clients retry simultaneously
   * @default 0.25 (±25% randomness)
   */
  jitter?: number

  /**
   * Maximum delay cap in milliseconds
   * Prevents exponential backoff from growing too large
   * @default 10000 (10 seconds)
   */
  maxDelay?: number

  /**
   * Optional function to determine if an error should trigger a retry
   * If not provided, all errors trigger retry
   * @returns true to retry, false to fail immediately
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean

  /**
   * Optional callback called before each retry
   * Useful for logging retry attempts
   */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  jitter: 0.25,
  maxDelay: 10000,
  shouldRetry: () => true,
  onRetry: () => {},
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  jitter: number,
  maxDelay: number
): number {
  // Exponential backoff: initialDelay * (2 ^ attempt)
  // attempt 0 (first retry): initialDelay * 1 = initialDelay
  // attempt 1 (second retry): initialDelay * 2
  // attempt 2 (third retry): initialDelay * 4
  const exponentialDelay = initialDelay * Math.pow(2, attempt)

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelay)

  // Add jitter: random value between (1 - jitter) and (1 + jitter)
  // Example with jitter=0.25: delay will be between 75% and 125% of exponentialDelay
  const jitterMultiplier = 1 + (Math.random() * 2 - 1) * jitter
  const delayWithJitter = cappedDelay * jitterMultiplier

  return Math.max(0, Math.floor(delayWithJitter))
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry an async operation with exponential backoff + jitter
 *
 * @param operation - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with operation result or rejects with final error
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => fetch('https://api.example.com/data'),
 *   {
 *     maxAttempts: 3,
 *     initialDelay: 1000,
 *     shouldRetry: (error) => {
 *       // Only retry on network errors or 5xx server errors
 *       if (error instanceof Response) {
 *         return error.status >= 500
 *       }
 *       return true // Retry network errors
 *     },
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry attempt ${attempt} after ${delay}ms`)
 *     }
 *   }
 * )
 * ```
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  let lastError: unknown

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      // Execute the operation
      const result = await operation()
      return result
    } catch (error) {
      lastError = error

      // Check if we should retry
      const isLastAttempt = attempt === opts.maxAttempts - 1

      if (isLastAttempt) {
        // No more retries left, throw the error
        throw error
      }

      const shouldRetry = opts.shouldRetry(error, attempt + 1)

      if (!shouldRetry) {
        // Error is not retryable, throw immediately
        throw error
      }

      // Calculate delay with exponential backoff + jitter
      const delay = calculateDelay(attempt, opts.initialDelay, opts.jitter, opts.maxDelay)

      // Call onRetry callback if provided
      opts.onRetry(error, attempt + 1, delay)

      // Wait before retrying
      await sleep(delay)
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError
}

/**
 * Helper function to check if an HTTP response should be retried
 * Retries on:
 * - 408 Request Timeout
 * - 429 Too Many Requests (rate limiting)
 * - 500+ Server Errors
 *
 * Does NOT retry on:
 * - 4xx Client Errors (except 408, 429)
 * - 2xx Success
 * - 3xx Redirects
 */
export function isRetryableHttpStatus(status: number): boolean {
  return (
    status === 408 || // Request Timeout
    status === 429 || // Too Many Requests
    status >= 500     // Server Errors
  )
}

/**
 * Helper function to create a shouldRetry callback for fetch operations
 *
 * @example
 * ```typescript
 * await retryWithBackoff(
 *   () => fetch('https://api.example.com/data'),
 *   {
 *     shouldRetry: createFetchRetryChecker()
 *   }
 * )
 * ```
 */
export function createFetchRetryChecker() {
  return (error: unknown): boolean => {
    // Retry on network errors (fetch throws TypeError for network failures)
    if (error instanceof TypeError) {
      return true
    }

    // Retry on Response objects with retryable status codes
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status
      return isRetryableHttpStatus(status)
    }

    // Retry on other errors (generic Error objects)
    if (error instanceof Error) {
      // Check error message for common retryable patterns
      const message = error.message.toLowerCase()
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('enotfound') ||
        message.includes('econnrefused')
      )
    }

    // Default: don't retry unknown error types
    return false
  }
}
