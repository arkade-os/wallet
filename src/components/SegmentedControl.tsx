interface SegmentedControlProps {
  options: string[]
  selected: string
  onChange: (value: string) => void
  getLabel?: (value: string) => string
}

export default function SegmentedControl({ options, selected, onChange, getLabel }: SegmentedControlProps) {
  return (
    <div role='tablist' className='segmented'>
      {options.map((opt) => (
        <button
          key={opt}
          type='button'
          role='tab'
          className='segmented__tab focusable'
          aria-selected={selected === opt}
          onClick={() => onChange(opt)}
        >
          {getLabel ? getLabel(opt) : opt}
        </button>
      ))}
    </div>
  )
}
