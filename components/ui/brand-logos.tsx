"use client"
/**
 * Brand logo SVG components — inline, transparent backgrounds, brand colours.
 * No external requests. Works on dark backgrounds.
 * SVG paths sourced from Simple Icons (simpleicons.org) where available.
 */

interface Props { className?: string }

export function TwilioLogo({ className = "h-7 w-7" }: Props) {
  // Twilio: red circle with 4 white dots (their actual brand mark)
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#F22F46"/>
      <circle cx="12" cy="12" r="4.8" fill="none" stroke="white" strokeWidth="0"/>
      <circle cx="8.4"  cy="8.4"  r="2.2" fill="white"/>
      <circle cx="15.6" cy="8.4"  r="2.2" fill="white"/>
      <circle cx="8.4"  cy="15.6" r="2.2" fill="white"/>
      <circle cx="15.6" cy="15.6" r="2.2" fill="white"/>
    </svg>
  )
}

export function SendGridLogo({ className = "h-7 w-7" }: Props) {
  // SendGrid: teal pinwheel/target symbol
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="8" height="8" x="0" y="0"   fill="#1A82E2"/>
      <rect width="8" height="8" x="8" y="0"   fill="#1A82E2" opacity="0.5"/>
      <rect width="8" height="8" x="16" y="0"  fill="#1A82E2"/>
      <rect width="8" height="8" x="0" y="8"   fill="#1A82E2" opacity="0.5"/>
      <rect width="8" height="8" x="8" y="8"   fill="#1A82E2"/>
      <rect width="8" height="8" x="16" y="8"  fill="#1A82E2" opacity="0.5"/>
      <rect width="8" height="8" x="0" y="16"  fill="#1A82E2" opacity="0"/>
      <rect width="8" height="8" x="8" y="16"  fill="#1A82E2" opacity="0.5"/>
      <rect width="8" height="8" x="16" y="16" fill="#1A82E2"/>
    </svg>
  )
}

export function StripeLogo({ className = "h-7 w-7" }: Props) {
  // Official Stripe S path from Simple Icons
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#635BFF"
        d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"
      />
    </svg>
  )
}

export function XeroLogo({ className = "h-7 w-7" }: Props) {
  // Official Xero path from Simple Icons
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#13B5EA"
        d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1.243 16.352l-3.27-3.27-2.115 2.116-.849-.85L6.64 12.23 3.37 8.96l.849-.849 3.27 3.27 3.27-3.27.849.849-3.27 3.27 3.27 3.271-.849.85h-.002zm8.487 0l-.849.85-3.27-3.271-3.27 3.271-.85-.85 3.27-3.27-3.27-3.271.85-.849 3.27 3.27 3.27-3.27.849.849-3.27 3.271 3.27 3.27z"
      />
    </svg>
  )
}

export function QuickBooksLogo({ className = "h-7 w-7" }: Props) {
  // Official QuickBooks path from Simple Icons
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#2CA01C"
        d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm.642 4.1335c.9554 0 1.7296.776 1.7296 1.7332v9.0667h1.6c1.614 0 2.9275-1.3156 2.9275-2.933 0-1.6173-1.3136-2.9333-2.9276-2.9333h-.6654V7.3334h.6654c2.5722 0 4.6577 2.0897 4.6577 4.667 0 2.5774-2.0855 4.6666-4.6577 4.6666H12.642zM7.9837 7.333h3.3291v12.533c-.9555 0-1.73-.7759-1.73-1.7332V9.0662H7.9837c-1.6146 0-2.9277 1.316-2.9277 2.9334 0 1.6175 1.3131 2.9333 2.9277 2.9333h.6654v1.7332h-.6654c-2.5725 0-4.6577-2.0892-4.6577-4.6665 0-2.5771 2.0852-4.6666 4.6577-4.6666Z"
      />
    </svg>
  )
}

export function GoogleCalendarLogo({ className = "h-7 w-7" }: Props) {
  // Official Google Calendar path from Simple Icons (multicolour version)
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#4285F4"
        d="M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557zM22.105 0h-3.289v5.184H24V1.895A1.894 1.894 0 0 0 22.105 0zm-3.289 23.5l4.684-4.684h-4.684V23.5zM0 22.105C0 23.152.848 24 1.895 24h3.289v-5.184H0v3.289z"
      />
    </svg>
  )
}

export function GmailLogo({ className = "h-7 w-7" }: Props) {
  // Official Gmail path from Simple Icons
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#EA4335"
        d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
      />
    </svg>
  )
}

export function OutlookLogo({ className = "h-7 w-7" }: Props) {
  // Microsoft Outlook — clean O mark on transparent
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Envelope background */}
      <rect x="9" y="3" width="15" height="11" rx="1.5" fill="#0078D4"/>
      <path d="M9 5.5l7.5 5 7.5-5" stroke="white" strokeWidth="1" fill="none"/>
      {/* Left O panel */}
      <rect x="0" y="5" width="13" height="14" rx="2" fill="#0078D4"/>
      <ellipse cx="6.5" cy="12" rx="3.5" ry="4" fill="white"/>
      <ellipse cx="6.5" cy="12" rx="2" ry="2.5" fill="#0078D4"/>
    </svg>
  )
}

export function OtterLogo({ className = "h-7 w-7" }: Props) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#4B3FFF"/>
      <ellipse cx="50" cy="58" rx="22" ry="17" fill="white"/>
      <circle cx="33" cy="42" r="12" fill="white"/>
      <circle cx="67" cy="42" r="12" fill="white"/>
      <circle cx="33" cy="42" r="5" fill="#4B3FFF"/>
      <circle cx="67" cy="42" r="5" fill="#4B3FFF"/>
      <circle cx="35" cy="40" r="2" fill="white"/>
      <circle cx="69" cy="40" r="2" fill="white"/>
      <ellipse cx="50" cy="64" rx="9" ry="5" fill="#9b93ff"/>
    </svg>
  )
}

export function OpenSolarLogo({ className = "h-7 w-7" }: Props) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="18" fill="#FF6B35"/>
      <rect x="46" y="4"  width="8" height="22" rx="4" fill="#FF6B35"/>
      <rect x="46" y="74" width="8" height="22" rx="4" fill="#FF6B35"/>
      <rect x="4"  y="46" width="22" height="8" rx="4" fill="#FF6B35"/>
      <rect x="74" y="46" width="22" height="8" rx="4" fill="#FF6B35"/>
      <rect x="18" y="14" width="8" height="20" rx="4" fill="#FF6B35" transform="rotate(45 22 24)"/>
      <rect x="66" y="14" width="8" height="20" rx="4" fill="#FF6B35" transform="rotate(-45 70 24)"/>
      <rect x="18" y="65" width="8" height="20" rx="4" fill="#FF6B35" transform="rotate(-45 22 75)"/>
      <rect x="66" y="65" width="8" height="20" rx="4" fill="#FF6B35" transform="rotate(45 70 75)"/>
    </svg>
  )
}
