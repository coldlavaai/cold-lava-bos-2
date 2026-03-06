import twilio from 'twilio'

/**
 * Normalize a phone number to E.164 format.
 * Ported from CL-BOS-DEC25/lib/integrations/twilio.ts
 * 
 * @example
 *   ensureE164('+447359821793') => '+447359821793'
 *   ensureE164('07359821793')   => '+4407359821793' (digits only, prefixed with +)
 *   ensureE164('447359821793')  => '+447359821793'
 */
export function ensureE164(value: string): string {
  const v = (value || '').trim()
  if (!v) throw new Error('Phone number is required')
  if (v.startsWith('+')) return v

  // Best-effort: strip spaces/dashes and force + prefix.
  const cleaned = v.replace(/[\s\-()]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  if (/^\d+$/.test(cleaned)) return `+${cleaned}`

  throw new Error('Invalid phone number format. Expected E.164 like +447700900123')
}

/**
 * Convert a UK local number (07xxx) to E.164 (+447xxx) and vice versa.
 * Returns an array of phone variations to try when matching.
 */
export function phoneVariations(phone: string): string[] {
  const v = (phone || '').trim()
  if (!v) return []

  const cleaned = v.replace(/[\s\-()]/g, '')
  const variations = new Set<string>()

  // Add the original
  variations.add(cleaned)

  // If starts with +44, also try 0-prefixed UK format
  if (cleaned.startsWith('+44')) {
    variations.add('0' + cleaned.slice(3))
    variations.add(cleaned.slice(1)) // without +
  }

  // If starts with 44 (no +), add with + and 0-prefixed
  if (cleaned.startsWith('44') && !cleaned.startsWith('+')) {
    variations.add('+' + cleaned)
    variations.add('0' + cleaned.slice(2))
  }

  // If starts with 0 (UK local), add +44 version
  if (cleaned.startsWith('0') && cleaned.length >= 10) {
    variations.add('+44' + cleaned.slice(1))
    variations.add('44' + cleaned.slice(1))
  }

  // If starts with +, also add without
  if (cleaned.startsWith('+')) {
    variations.add(cleaned.slice(1))
  }

  return Array.from(variations)
}

export function ensureWhatsAppAddress(value: string): string {
  const v = (value || '').trim()
  if (!v) throw new Error('WhatsApp address is required')
  if (v.startsWith('whatsapp:')) return v
  return `whatsapp:${ensureE164(v)}`
}

export function stripWhatsAppPrefix(value: string): string {
  const v = (value || '').trim()
  return v.startsWith('whatsapp:') ? v.slice('whatsapp:'.length) : v
}

export function createTwilioClient(accountSid: string, authToken: string) {
  return twilio(accountSid, authToken)
}

export function validateTwilioWebhook(
  params: Record<string, string>,
  opts: { authToken: string; signature: string | null; url: string }
): boolean {
  if (!opts.signature) return false
  try {
    return twilio.validateRequest(opts.authToken, opts.signature, opts.url, params)
  } catch {
    return false
  }
}
