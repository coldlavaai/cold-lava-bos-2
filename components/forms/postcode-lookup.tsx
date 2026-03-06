"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Loader2, MapPin, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Address {
  uprn: string
  fullAddress: string
  postcode: string
  postTown: string
  latitude: number
  longitude: number
}

interface PostcodeLookupProps {
  onAddressSelect: (address: ParsedAddress) => void
  onManualEntry: () => void
}

export interface ParsedAddress {
  address_line_1: string
  address_line_2: string
  city: string
  postcode: string
}

export function PostcodeLookup({ onAddressSelect, onManualEntry }: PostcodeLookupProps) {
  const [postcode, setPostcode] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)
  const [addresses, setAddresses] = React.useState<Address[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [areaData, setAreaData] = React.useState<{
    city: string
    county: string
    region: string
  } | null>(null)

  const formatPostcode = (input: string): string => {
    const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (cleaned.length > 4) {
      const inward = cleaned.slice(-3)
      const outward = cleaned.slice(0, -3)
      return `${outward} ${inward}`
    }
    return cleaned
  }

  const handlePostcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPostcode(formatPostcode(e.target.value))
    setError(null)
  }

  const searchPostcode = async () => {
    if (!postcode || postcode.length < 5) {
      setError("Please enter a valid postcode")
      return
    }

    setIsSearching(true)
    setError(null)
    setAddresses([])
    setAreaData(null)

    try {
      const response = await fetch(`/api/postcode-lookup?postcode=${encodeURIComponent(postcode)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to lookup postcode")
      }

      if (!data.addresses || data.addresses.length === 0) {
        setError("No addresses found for this postcode")
        return
      }

      // If postcodes.io returned area data (no individual addresses), show area info
      // and let user fill in address manually with city/county pre-filled
      if (data.source === "postcodes.io" && data.area) {
        setAreaData(data.area)
        // Auto-fill with area data and switch to manual entry
        onAddressSelect({
          address_line_1: "",
          address_line_2: "",
          city: data.area.city || "",
          postcode: postcode,
        })
        return
      }

      setAddresses(data.addresses)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to lookup postcode")
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      searchPostcode()
    }
  }

  const parseAddress = (address: Address): ParsedAddress => {
    // OS Places format: "HOUSE_NUMBER, STREET_NAME, TOWN, POSTCODE"
    // Example: "5, BEACON LANE, HESWALL, CH60 0DG"
    const parts = address.fullAddress.split(",").map(p => p.trim())

    let address_line_1 = ""
    let address_line_2 = ""
    let city = ""

    if (parts.length >= 3) {
      // parts[0] = house number, parts[1] = street name, parts[2] = town
      address_line_1 = `${parts[0]}, ${parts[1]}`
      city = parts[2]

      // If there are more parts before the postcode, they go to address_line_2
      if (parts.length > 4) {
        address_line_2 = parts.slice(3, -1).join(", ")
      }
    } else if (parts.length === 2) {
      address_line_1 = parts[0]
      city = parts[1]
    } else {
      address_line_1 = address.fullAddress
    }

    return {
      address_line_1,
      address_line_2,
      city: city || address.postTown,
      postcode: address.postcode,
    }
  }

  const handleAddressSelect = (address: Address) => {
    const parsed = parseAddress(address)
    onAddressSelect(parsed)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="postcode-lookup">Find Address by Postcode</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="postcode-lookup"
              type="text"
              value={postcode}
              onChange={handlePostcodeChange}
              onKeyPress={handleKeyPress}
              className="pl-9 uppercase"
              placeholder="SW1A 1AA"
              maxLength={8}
              disabled={isSearching}
            />
          </div>
          <Button
            type="button"
            onClick={searchPostcode}
            disabled={isSearching || !postcode}
            className="gap-2"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Find
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md p-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {areaData && (
        <div className="flex items-start gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md p-3">
          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Postcode found: {areaData.city}{areaData.county ? `, ${areaData.county}` : ""}</p>
            <p className="text-xs text-blue-500 mt-1">
              City and postcode have been filled in. Please enter your street address below.
            </p>
          </div>
        </div>
      )}

      {addresses.length > 0 && (
        <div className="space-y-2">
          <Label>Select an Address ({addresses.length} found)</Label>
          <div className="border rounded-md max-h-[300px] overflow-y-auto">
            {addresses.map((address, index) => (
              <button
                key={address.uprn || index}
                type="button"
                onClick={() => handleAddressSelect(address)}
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0",
                  "focus:outline-none focus:bg-muted"
                )}
              >
                <div className="text-sm font-medium">{address.fullAddress}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 border-t" />
        <span className="text-sm text-muted-foreground">or</span>
        <div className="flex-1 border-t" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onManualEntry}
        className="w-full"
      >
        Enter Address Manually
      </Button>
    </div>
  )
}
