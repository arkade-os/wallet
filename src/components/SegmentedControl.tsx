interface SegmentedControlProps {
  options: string[]
  selected: string
  onChange: (value: string) => void
}

export default function SegmentedControl({ options, selected, onChange }: SegmentedControlProps) {
  return (
    <div
      style={{
        display: 'flex',
        borderRadius: '0.5rem',
        border: '1px solid var(--dark10)',
        width: '100%',
      }}
    >
      {options.map((opt, i) => {
        const isSelected = selected === opt
        return (
          <div
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              flex: 1,
              padding: '0.75rem 0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundColor: isSelected ? 'var(--dark10)' : 'transparent',
              borderLeft: i > 0 ? '1px solid var(--dark10)' : undefined,
              transition: 'background-color 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: isSelected ? 600 : 400,
                color: isSelected ? 'var(--text)' : 'var(--dark50)',
                whiteSpace: 'nowrap',
              }}
            >
              {opt}
            </span>
          </div>
        )
      })}
    </div>
  )
}
