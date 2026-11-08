import UsersRound from '../icons/UsersRound'

type ContactActivityLineProps = {
  name: string
  label: string
  onSelect: () => void
}

export default function ContactActivityLine({ name, label, onSelect }: ContactActivityLineProps) {
  return (
    <button type='button' className='contact-activity-line' aria-label={name} onClick={onSelect}>
      <span className='activity-row__icon'>
        <UsersRound size={24} />
      </span>
      <span className='activity-row__copy'>
        <span className='activity-row__kind'>{label}</span>
        <span className='activity-row__meta'>Contact</span>
      </span>
    </button>
  )
}
