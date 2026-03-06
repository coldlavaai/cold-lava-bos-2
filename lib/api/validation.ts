import { z } from 'zod'

/**
 * Validation schemas for external API ingestion endpoints
 * Session 61 - Phase API-1
 */

// Base customer schema (for upsert in leads endpoint)
export const LeadCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().nullable().optional(),
  address_line_1: z.string().nullable().optional(),
  address_line_2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postcode: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

// Lead creation request (POST /api/leads)
export const CreateLeadSchema = z.object({
  // Customer fields (will be upserted by email)
  customer: LeadCustomerSchema,

  // Lead/Job fields
  source: z.string().nullable().optional(),
  estimated_value: z.number().nullable().optional(),
  system_size_kwp: z.number().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  notes: z.string().nullable().optional(),

  // Optional: assign to user
  assigned_to: z.string().uuid().nullable().optional(),

  // OpenSolar integration (Session 64 - Phase 1)
  opensolar_project_id: z.string().nullable().optional(),
  opensolar_project_url: z.string().url().nullable().optional(),
})

// Job creation request (POST /api/jobs)
export const CreateJobSchema = z.object({
  // Customer reference (required)
  customer_id: z.string().uuid('Valid customer_id UUID is required'),

  // Stage (optional - defaults to first in_progress stage)
  current_stage_id: z.string().uuid().nullable().optional(),

  // Assignment
  assigned_to: z.string().uuid().nullable().optional(),

  // Job details
  estimated_value: z.number().nullable().optional(),
  system_size_kwp: z.number().nullable().optional(),
  source: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  notes: z.string().nullable().optional(),

  // Compliance fields (optional)
  site_supply_type: z.string().nullable().optional(),
  export_capacity_kw: z.number().nullable().optional(),
  dno_required: z.boolean().nullable().optional(),
  dno_reference: z.string().nullable().optional(),
  installer_name: z.string().nullable().optional(),
  installer_mcs_number: z.string().nullable().optional(),
  inverter_model: z.string().nullable().optional(),
  panel_model: z.string().nullable().optional(),
  mounting_system: z.string().nullable().optional(),

  // OpenSolar integration (Session 64 - Phase 1)
  opensolar_project_id: z.string().nullable().optional(),
  opensolar_project_url: z.string().url().nullable().optional(),
})

// Bulk import schemas (Session 62 - Phase API-2)
export const BulkImportCustomersSchema = z.object({
  customers: z.array(LeadCustomerSchema).min(1, 'At least one customer is required')
})

export const BulkImportJobsSchema = z.object({
  jobs: z.array(CreateJobSchema).min(1, 'At least one job is required')
})

// Type exports
export type CreateLeadRequest = z.infer<typeof CreateLeadSchema>
export type CreateJobRequest = z.infer<typeof CreateJobSchema>
export type LeadCustomer = z.infer<typeof LeadCustomerSchema>
export type BulkImportCustomersRequest = z.infer<typeof BulkImportCustomersSchema>
export type BulkImportJobsRequest = z.infer<typeof BulkImportJobsSchema>
