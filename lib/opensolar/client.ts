/**
 * OpenSolar API Client - Phase 1
 *
 * Minimal client for interacting with the OpenSolar REST API.
 * Supports read and write operations for projects and proposals.
 *
 * Documentation: https://developers.opensolar.com/api/
 * 
 * API Structure: All endpoints require org_id in the path
 * Example: GET /api/orgs/:org_id/projects/
 */

interface OpenSolarConfig {
  baseUrl: string
  apiKey?: string
  organizationId?: string
  // Legacy auth (deprecated)
  username?: string
  password?: string
  machineUserToken?: string
}

interface OpenSolarProject {
  id: string
  name?: string
  status?: string
  address?: string
  system_size_kw?: number
  total_price?: number
  currency?: string
  created_at?: string
  updated_at?: string
  proposals?: OpenSolarProposal[]
}

interface OpenSolarProposal {
  id: string
  name?: string
  status?: string
  system_size_kw?: number
  total_price?: number
  currency?: string
  pdf_url?: string
  proposal_url?: string
  created_at?: string
  updated_at?: string
}

interface CreateProjectRequest {
  name: string
  address?: string
  customer_name?: string
  customer_email?: string
  system_size_kw?: number
  estimated_price?: number
}

interface UpdateProjectRequest {
  name?: string
  address?: string
  system_size_kw?: number
  estimated_price?: number
}

class OpenSolarClient {
  private config: OpenSolarConfig

  constructor(config?: Partial<OpenSolarConfig>) {
    this.config = {
      baseUrl: process.env.OPENSOLAR_BASE_URL || 'https://api.opensolar.com/api/',
      apiKey: process.env.OPENSOLAR_API_KEY,
      organizationId: process.env.OPENSOLAR_ORGANIZATION_ID,
      // Legacy auth (deprecated)
      username: process.env.OPENSOLAR_USERNAME,
      password: process.env.OPENSOLAR_PASSWORD,
      machineUserToken: process.env.OPENSOLAR_MACHINE_USER_TOKEN,
      ...config,
    }
  }

  /**
   * Get the API key for authentication
   * Priority: apiKey > machineUserToken
   */
  private getApiKey(): string {
    if (this.config.apiKey) {
      return this.config.apiKey
    }
    if (this.config.machineUserToken) {
      return this.config.machineUserToken
    }
    throw new Error('OpenSolar API key not configured')
  }

  /**
   * Get the organization ID (required for all API calls)
   */
  private getOrgId(): string {
    if (!this.config.organizationId) {
      throw new Error('OpenSolar organization ID not configured')
    }
    return this.config.organizationId
  }

  /**
   * Build the full URL for an endpoint
   * OpenSolar API structure: /api/orgs/:org_id/endpoint/
   */
  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint
    }
    
    const orgId = this.getOrgId()
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    // Ensure trailing slash (OpenSolar requires it)
    const withTrailingSlash = cleanEndpoint.endsWith('/') ? cleanEndpoint : `${cleanEndpoint}/`
    
    return `${this.config.baseUrl}orgs/${orgId}/${withTrailingSlash}`
  }

  /**
   * Make an authenticated request to the OpenSolar API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const apiKey = this.getApiKey()
    const url = this.buildUrl(endpoint)

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenSolar API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Get a project by ID, including proposals if available
   */
  async getProject(projectId: string): Promise<OpenSolarProject> {
    return this.request<OpenSolarProject>(`projects/${projectId}`)
  }

  /**
   * Get all proposals for a project
   */
  async getProposalsForProject(projectId: string): Promise<OpenSolarProposal[]> {
    try {
      return this.request<OpenSolarProposal[]>(`projects/${projectId}/proposals`)
    } catch (err) {
      // If proposals endpoint doesn't exist, return empty array
      console.warn('Failed to fetch proposals:', err)
      return []
    }
  }

  /**
   * Create a new OpenSolar project
   */
  async createProject(data: CreateProjectRequest): Promise<OpenSolarProject> {
    return this.request<OpenSolarProject>('projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update an existing OpenSolar project
   */
  async updateProject(
    projectId: string,
    data: UpdateProjectRequest
  ): Promise<OpenSolarProject> {
    return this.request<OpenSolarProject>(`projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  /**
   * Check if a project exists (used for validation)
   */
  async projectExists(projectId: string): Promise<boolean> {
    try {
      await this.getProject(projectId)
      return true
    } catch (_error) {
      return false
    }
  }
}

// Export singleton instance
export const openSolarClient = new OpenSolarClient()

// Export types
export type {
  OpenSolarProject,
  OpenSolarProposal,
  CreateProjectRequest,
  UpdateProjectRequest,
}
