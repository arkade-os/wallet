interface SegmentedControlProps {
  options: string[]
  selected: string
  onChange: (value: string) => void
  getLabel?: (value: string) => string
}

export default function SegmentedControl({ options, selected, onChange, getLabel }: SegmentedControlProps) {
  return (
    <div
      role='tablist'
      style={{
        display: 'flex',
        width: '100%',
      }}
    >
      {options.map((opt, i) => {
        const isSelected = selected === opt
        return (
          <button
            key={opt}
            role='tab'
            className='focusable'
            aria-selected={isSelected}
            onClick={() => onChange(opt)}
            style={{
              flex: 1,
              display: 'flex',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.75rem 0.25rem',
              WebkitTapHighlightColor: 'transparent',
              borderTopLeftRadius: i === 0 ? '0.5rem' : undefined,
              borderBottomLeftRadius: i === 0 ? '0.5rem' : undefined,
              borderTopRightRadius: i === options.length - 1 ? '0.5rem' : undefined,
              borderBottomRightRadius: i === options.length - 1 ? '0.5rem' : undefined,
              backgroundColor: isSelected ? 'var(--neutral-100)' : 'transparent',
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: isSelected ? 600 : 400,
                color: isSelected ? 'var(--text)' : 'var(--neutral-500)',
                whiteSpace: 'nowrap',
              }}
            >
              {getLabel ? getLabel(opt) : opt}
            </span>
          </button>
        )
      })}
    </div>
  )
}
