declare module 'next-pwa' {
  import { NextConfig } from 'next'
  
  interface PWAConfig {
    dest?: string
    disable?: boolean
    register?: boolean
    skipWaiting?: boolean
    scope?: string
    sw?: string
    runtimeCaching?: Array<{
      urlPattern: RegExp | string
      handler: string
      options?: {
        cacheName?: string
        expiration?: {
          maxEntries?: number
          maxAgeSeconds?: number
        }
        networkTimeoutSeconds?: number
        cacheableResponse?: {
          statuses?: number[]
        }
      }
    }>
    buildExcludes?: Array<string | RegExp>
    publicExcludes?: string[]
    fallbacks?: {
      document?: string
      image?: string
      font?: string
      audio?: string
      video?: string
    }
  }
  
  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig
  
  export default withPWA
}
