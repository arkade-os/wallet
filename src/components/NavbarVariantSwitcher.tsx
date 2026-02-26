import { createContext, useContext, useState, type ReactNode } from 'react'

export type NavbarVariant = 'border' | 'blur' | 'pill'

interface NavbarVariantContextType {
  variant: NavbarVariant
  setVariant: (variant: NavbarVariant) => void
}

export const NavbarVariantContext = createContext<NavbarVariantContextType>({
  variant: 'border',
  setVariant: () => {},
})

export function NavbarVariantProvider({ children }: { children: ReactNode }) {
  const [variant, setVariant] = useState<NavbarVariant>('border')
  return (
    <NavbarVariantContext.Provider value={{ variant, setVariant }}>
      {children}
    </NavbarVariantContext.Provider>
  )
}

const variants: NavbarVariant[] = ['border', 'blur', 'pill']

export default function NavbarVariantSwitcher() {
  const { variant, setVariant } = useContext(NavbarVariantContext)

  const container: React.CSSProperties = {
    position: 'fixed',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    padding: 4,
  }

  const btn = (active: boolean): React.CSSProperties => ({
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 500,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    background: active ? 'white' : 'transparent',
    color: active ? 'black' : 'rgba(255, 255, 255, 0.7)',
    transition: 'background 150ms ease, color 150ms ease',
    touchAction: 'manipulation',
  })

  return (
    <div style={container}>
      {variants.map((v) => (
        <button key={v} style={btn(variant === v)} onClick={() => setVariant(v)}>
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </button>
      ))}
    </div>
  )
}
