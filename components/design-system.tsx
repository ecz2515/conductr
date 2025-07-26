"use client"

import type React from "react"

// =============================================================================
// COLOR SYSTEM & DESIGN TOKENS
// =============================================================================

export const colors = {
  // Spotify-inspired palette
  primary: "#1ed760",
  primaryHover: "#1db954",
  primaryDark: "#1aa34a",

  // Backgrounds
  bgPrimary: "#191414",
  bgSecondary: "#222326",
  bgCard: "#232323",
  bgInput: "#181818",
  bgMuted: "#282828",

  // Text
  textPrimary: "#ffffff",
  textSecondary: "#b3b3b3",
  textMuted: "#666666",

  // States
  error: "#ff5555",
  success: "#1ed760",

  // Borders
  border: "#282828",
  borderHover: "#1ed760",
  borderFocus: "#1ed760",
}

// =============================================================================
// LAYOUT COMPONENTS
// =============================================================================

interface PageContainerProps {
  children: React.ReactNode
  centered?: boolean
  className?: string
}

export function PageContainer({ children, centered = false, className = "" }: PageContainerProps) {
  return (
    <div className={`flex flex-col min-h-screen bg-gradient-to-br from-[#191414] to-[#222326] ${className}`}>
      <main
        className={`
          flex flex-1 flex-col items-center w-full transition-all duration-700
          ${centered ? "justify-center" : "justify-start"}
        `}
        style={{
          minHeight: 0,
          transition: "justify-content 0.5s cubic-bezier(.73,0,.23,1)",
          ...(centered ? { minHeight: "60vh", justifyContent: "center" } : {}),
        }}
      >
        {children}
      </main>
    </div>
  )
}

interface ContentWrapperProps {
  children: React.ReactNode
  maxWidth?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export function ContentWrapper({ children, maxWidth = "lg", className = "" }: ContentWrapperProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  }

  return <div className={`w-full ${maxWidthClasses[maxWidth]} px-3 ${className}`}>{children}</div>
}

// =============================================================================
// UI COMPONENTS
// =============================================================================

// Spinner Component
export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: { width: 20, height: 20 },
    md: { width: 28, height: 28 },
    lg: { width: 36, height: 36 },
  }

  const { width, height } = sizeClasses[size]

  return (
    <span className="inline-block align-middle">
      <svg
        className="animate-spin"
        style={{ color: colors.primary }}
        width={width}
        height={height}
        viewBox="0 0 44 44"
        fill="none"
      >
        <circle className="opacity-25" cx="22" cy="22" r="18" stroke={colors.primary} strokeWidth="5" />
        <path
          d="M40 22c0-9.94-8.06-18-18-18"
          stroke={colors.primary}
          strokeWidth="5"
          strokeLinecap="round"
          className="opacity-85"
        />
      </svg>
    </span>
  )
}

// Button Component with variants
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  children: React.ReactNode
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const baseClasses =
    "font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1ed760]"

  const variantClasses = {
    primary: `bg-[#1ed760] hover:bg-[#1db954] text-black shadow-md ${loading || disabled ? "opacity-60 cursor-not-allowed" : "hover:scale-105"}`,
    secondary: `bg-[#232323] hover:bg-[#333] text-white border border-[#282828] ${disabled ? "opacity-60 cursor-not-allowed" : ""}`,
    ghost: `bg-transparent hover:bg-[#282828] text-[#b3b3b3] hover:text-white ${disabled ? "opacity-60 cursor-not-allowed" : ""}`,
  }

  const sizeClasses = {
    sm: "px-4 py-2 text-sm min-w-[80px]",
    md: "px-6 py-3 text-base min-w-[120px]",
    lg: "px-8 py-4 text-lg min-w-[140px]",
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  )
}

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-[#b3b3b3] text-sm font-medium mb-2">{label}</label>}
      <input
        className={`
          w-full bg-[#181818] text-white px-5 py-3 rounded-lg outline-none 
          focus:ring-2 focus:ring-[#1ed760] border border-[#1ed760] 
          transition-all duration-200 text-base
          ${error ? "border-[#ff5555] focus:ring-[#ff5555]" : ""}
          ${props.disabled ? "opacity-60 cursor-not-allowed" : ""}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-[#ff5555] text-sm mt-1">{error}</p>}
    </div>
  )
}

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className = "", ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-[#b3b3b3] text-sm font-medium mb-2">{label}</label>}
      <textarea
        className={`
          w-full bg-[#232323] text-white px-5 py-3 rounded-lg outline-none 
          focus:ring-2 focus:ring-[#1ed760] border border-[#333] 
          shadow-sm text-base resize-none transition-all duration-200
          ${error ? "border-[#ff5555] focus:ring-[#ff5555]" : ""}
          ${props.disabled ? "opacity-60 cursor-not-allowed" : ""}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-[#ff5555] text-sm mt-1">{error}</p>}
    </div>
  )
}

// Card Component
interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: "default" | "elevated" | "interactive"
  style?: React.CSSProperties
  onClick?: () => void
}

export function Card({ children, className = "", variant = "default", style, onClick }: CardProps) {
  const variantClasses = {
    default: "bg-[#181818] border border-[#282828]",
    elevated: "bg-[#232323] border border-[#282828] shadow-lg",
    interactive:
      "bg-[#232323] border-2 border-[#282828] hover:border-[#1ed760]/40 cursor-pointer transition-all duration-150",
  }

  return (
    <div className={`rounded-2xl ${variantClasses[variant]} ${className}`} style={style} onClick={onClick}>
      {children}
    </div>
  )
}

// Album Card Component
interface AlbumCardProps {
  album: {
    id: string
    image: string
    conductor?: string
    orchestra?: string
    release_date?: string
    uri: string
  }
  isSelected?: boolean
  onToggle?: (id: string) => void
  showCheckbox?: boolean
}

export function AlbumCard({ album, isSelected = false, onToggle, showCheckbox = false }: AlbumCardProps) {
  return (
    <Card
      variant="interactive"
      className={`
        flex items-center relative p-4 gap-6 group
        ${isSelected ? "border-[#1ed760] ring-2 ring-[#1ed760]/40 shadow-[#1ed760] shadow-md" : ""}
      `}
      style={{ minHeight: "112px", touchAction: "manipulation" }}
      onClick={() => onToggle?.(album.id)}
    >
      {showCheckbox && (
        <span
          className={`
            absolute top-3 right-3 z-10 flex items-center justify-center
            h-7 w-7 rounded-full border-2 border-[#1ed760]
            ${isSelected ? "bg-[#1ed760]" : "bg-[#191414]"}
            transition-all duration-150 shadow
            ${isSelected ? "shadow-[#1ed760]/60" : ""}
          `}
        >
          {isSelected && (
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <path
                d="M5 10.5L9 14L15 7"
                stroke="#191414"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      )}

      <img
        src={album.image || "/placeholder.svg"}
        alt={album.conductor || "album cover"}
        className="w-20 h-20 sm:w-28 sm:h-28 object-cover rounded-xl flex-shrink-0"
        style={{ minWidth: "80px" }}
      />

      <div className="flex flex-col gap-2 ml-2 text-left w-2/3">
        <div className="text-white text-base font-semibold leading-snug break-words">
          {album.conductor && <div>{album.conductor}</div>}
          {album.orchestra && <div>{album.orchestra}</div>}
          {album.release_date && <div>{album.release_date.substring(0, 4)}</div>}
        </div>

        <a
          href={
            album.uri && album.uri.startsWith("spotify:") ? `https://open.spotify.com/album/${album.id}` : album.uri
          }
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-block mt-2 w-32 px-2 py-1 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black text-xs font-semibold transition text-center"
        >
          Open in Spotify
        </a>
      </div>
    </Card>
  )
}

// Typography Components
export function PageTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h1
      className={`text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-lg mb-2 text-center ${className}`}
    >
      {children}
    </h1>
  )
}

export function PageSubtitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={`text-base sm:text-lg text-[#b3b3b3] mt-2 sm:mt-1 transition-opacity duration-200 text-center ${className}`}
    >
      {children}
    </p>
  )
}

// Alert/Notice Component
interface AlertProps {
  children: React.ReactNode
  variant?: "info" | "warning" | "error" | "success"
  className?: string
}

export function Alert({ children, variant = "info", className = "" }: AlertProps) {
  const variantClasses = {
    info: "bg-[#232323] border-[#1ed760]/60 text-[#ffe082]",
    warning: "bg-[#232323] border-[#ffa500]/60 text-[#ffe082]",
    error: "bg-[#232323] border-[#ff5555]/60 text-[#ff5555]",
    success: "bg-[#232323] border-[#1ed760]/60 text-[#1ed760]",
  }

  return (
    <div
      className={`
      flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg border
      ${variantClasses[variant]}
      ${className}
    `}
      style={{
        background: "linear-gradient(90deg, #232323 80%, #1ed76022 100%)",
        fontSize: "1.08rem",
        fontWeight: 500,
        boxShadow: "0 2px 12px 0 #1ed76022",
        letterSpacing: "0.01em",
        minHeight: 44,
      }}
    >
      <span style={{ fontSize: "1.3em", lineHeight: 1 }}>⚠️</span>
      <span>{children}</span>
    </div>
  )
}

// Footer Component
export function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className="text-[#b3b3b3] text-sm py-6 text-center border-t border-[#282828]">
        Built with ❤️ for conductors • Not affiliated with Spotify
        <div className="mt-4">
          <a href="https://buy.stripe.com/eVqfZgdHD078bUhaso5kk06" target="_blank" rel="noopener noreferrer" className="text-[#1ed760] hover:text-[#1db954]">
            Love it? Buy me a coffee ☕
          </a>
        </div>
      </footer>
  )
}
