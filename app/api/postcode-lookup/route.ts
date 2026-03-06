import { NextRequest, NextResponse } from "next/server"

interface PostcodesIoResponse {
  status: number
  result: {
    postcode: string
    quality: number
    eastings: number
    northings: number
    country: string
    nhs_ha: string
    longitude: number
    latitude: number
    european_electoral_region: string
    primary_care_trust: string
    region: string
    lsoa: string
    msoa: string
    incode: string
    outcode: string
    parliamentary_constituency: string
    admin_district: string
    parish: string
    admin_county: string | null
    date_of_introduction: string
    admin_ward: string
    ced: string | null
    ccg: string
    nuts: string
    pfa: string
    codes: Record<string, string>
  } | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postcode = searchParams.get("postcode")

    if (!postcode) {
      return NextResponse.json(
        { error: "Postcode parameter is required" },
        { status: 400 }
      )
    }

    // Format UK postcode: remove all spaces
    const noSpaces = postcode.trim().toUpperCase().replace(/\s+/g, "")

    // Create display format with space
    const displayPostcode = noSpaces.length > 3
      ? `${noSpaces.slice(0, -3)} ${noSpaces.slice(-3)}`
      : noSpaces

    // First, try GetAddress.io if API key is available (returns full addresses)
    const getAddressApiKey = process.env.GETADDRESS_API_KEY?.trim()
    
    if (getAddressApiKey) {
      const result = await lookupWithGetAddress(noSpaces, displayPostcode, getAddressApiKey)
      // Check if GetAddress returned actual addresses
      const body = await result.clone().json()
      if (body.addresses && body.addresses.length > 0) {
        return result
      }
      // GetAddress returned empty — fall through to postcodes.io
      console.log("[Postcode Lookup] GetAddress.io returned empty, falling back to postcodes.io")
    }

    // Fallback: Use postcodes.io (free, no API key needed)
    return await lookupWithPostcodesIo(noSpaces, displayPostcode)
  } catch (error) {
    console.error("[Postcode Lookup API] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to lookup postcode" },
      { status: 500 }
    )
  }
}

/**
 * Lookup using postcodes.io (free, no API key)
 * Returns area-level data (city, county, region) — user fills in specific address
 */
async function lookupWithPostcodesIo(noSpaces: string, displayPostcode: string) {
  const response = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(noSpaces)}`,
    {
      method: "GET",
      headers: { "Accept": "application/json" },
    }
  )

  if (!response.ok) {
    if (response.status === 404) {
      return NextResponse.json({ addresses: [], source: "postcodes.io" })
    }
    const errorData = await response.json().catch(() => ({}))
    console.error("[Postcode Lookup] postcodes.io error:", { status: response.status, data: errorData })
    return NextResponse.json(
      { error: `Postcode lookup failed: ${response.statusText}` },
      { status: 502 }
    )
  }

  const data: PostcodesIoResponse = await response.json()

  if (!data.result) {
    return NextResponse.json({ addresses: [], source: "postcodes.io" })
  }

  const result = data.result
  const city = result.admin_district || ""
  const county = result.admin_county || result.region || ""

  // Return a single "area" entry — the user will need to fill in their specific address
  // This is the best we can do without a paid address API
  const addresses = [
    {
      uprn: "",
      fullAddress: [city, county, displayPostcode].filter(Boolean).join(", "),
      postcode: displayPostcode,
      postTown: city,
      latitude: result.latitude || 0,
      longitude: result.longitude || 0,
      address_line_1: "",
      address_line_2: "",
      city,
      county,
    },
  ]

  return NextResponse.json({
    addresses,
    source: "postcodes.io",
    // Additional area data that the frontend can use
    area: {
      city,
      county,
      region: result.region || "",
      country: result.country || "",
      parish: result.parish || "",
      ward: result.admin_ward || "",
      constituency: result.parliamentary_constituency || "",
      latitude: result.latitude,
      longitude: result.longitude,
    },
  })
}

/**
 * Lookup using GetAddress.io (paid, requires API key)
 * Returns full individual addresses for a postcode
 */
async function lookupWithGetAddress(noSpaces: string, displayPostcode: string, apiKey: string) {
  const response = await fetch(
    `https://api.getaddress.io/find/${noSpaces}?api-key=${apiKey}&expand=true&sort=true`,
    {
      method: "GET",
      headers: { "Accept": "application/json" },
    }
  )

  if (!response.ok) {
    if (response.status === 404) {
      return NextResponse.json({ addresses: [], source: "getaddress.io" })
    }

    if (response.status === 401) {
      console.error("[Postcode Lookup] GetAddress.io API key rejected, falling back to postcodes.io")
      // Fall back to postcodes.io if key is invalid
      return await lookupWithPostcodesIo(noSpaces, displayPostcode)
    }

    if (response.status === 429) {
      return NextResponse.json(
        { error: "Address lookup rate limit exceeded - please try again later" },
        { status: 429 }
      )
    }

    const errorData = await response.json().catch(() => ({}))
    return NextResponse.json(
      { error: `Address lookup failed: ${(errorData as { Message?: string }).Message || response.statusText}` },
      { status: 502 }
    )
  }

  const data = await response.json() as {
    postcode: string
    latitude: number
    longitude: number
    addresses: string[]
  }

  if (!data.addresses || data.addresses.length === 0) {
    return NextResponse.json({ addresses: [], source: "getaddress.io" })
  }

  const addresses = data.addresses.map((addressString: string) => {
    const parts = addressString.split(",").map((p: string) => p.trim())
    const line1 = parts[0] || ""
    const line2 = parts[1] || ""
    const line3 = parts[2] || ""
    const line4 = parts[3] || ""
    const locality = parts[4] || ""
    const town = parts[5] || ""
    const county = parts[6] || ""

    const fullParts = [line1, line2, line3, line4, locality, town, county, displayPostcode]
      .filter((p: string) => p && p.trim())
    const fullAddress = fullParts.join(", ")
    const streetParts = [line1, line2, line3, line4].filter((p: string) => p && p.trim())
    const streetAddress = streetParts.join(", ")

    return {
      uprn: "",
      fullAddress,
      postcode: displayPostcode,
      postTown: town,
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      address_line_1: streetAddress,
      address_line_2: locality,
      city: town,
      county,
    }
  })

  return NextResponse.json({ addresses, source: "getaddress.io" })
}
