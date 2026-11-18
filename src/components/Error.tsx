import Glyph from '../icons/Glyph'

interface ErrorProps {
  error: boolean
  text: string
}

/** An inline problem, stated once and announced to assistive tech. Calm tint, no filled red box. */
export default function ErrorMessage({ error, text }: ErrorProps) {
  if (!error) return null
  return (
    <div className='error-note' role='alert'>
      <Glyph name='info' size={18} />
      <p data-testid='error-message'>{text}</p>
    </div>
  )
}
