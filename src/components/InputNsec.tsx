import { useId, useLayoutEffect, useRef, useState } from 'react'
import { Autocomplete } from '@base-ui/react/autocomplete'
import { useTranslation } from '../providers/language'
import { getRecoverySuggestions, getRecoveryWord } from '../lib/recoveryInput'
import { hapticLight } from '../lib/haptics'

interface InputNsecProps {
  value: string
  cursor: number | null
  error?: string
  helperText: string
  onChange: (value: string, cursor: number | null) => void
  onSubmit: () => void
}

export default function InputNsec({ value, cursor, error, helperText, onChange, onSubmit }: InputNsecProps) {
  const { t } = useTranslation()
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingCursor = useRef<number | null>(null)
  const [composing, setComposing] = useState(false)
  const suggestions = composing ? [] : getRecoverySuggestions(value, cursor)

  useLayoutEffect(() => {
    if (pendingCursor.current !== null) {
      inputRef.current?.setSelectionRange(pendingCursor.current, pendingCursor.current)
      pendingCursor.current = null
    }
  }, [value, cursor])

  return (
    <div className='flex w-full flex-col gap-2'>
      <label htmlFor={id} className='text-sm text-neutral-500'>
        {t('components.recoveryPhraseOrKey')}
      </label>
      <Autocomplete.Root
        value={value}
        items={suggestions}
        filter={null}
        openOnInputClick
        onValueChange={(next, details) => {
          if (details.reason === 'item-press') {
            const token = getRecoveryWord(value, cursor)
            if (!token) return
            const suffix = value.slice(token.end)
            const separator = /^\s/.test(suffix) ? '' : ' '
            const completed = value.slice(0, token.start) + next + separator + suffix
            // Advance over the inserted or existing space to the next word.
            const nextCursor = token.start + next.length + 1
            pendingCursor.current = nextCursor
            hapticLight()
            onChange(completed, nextCursor)
          } else {
            onChange(next, inputRef.current?.selectionStart ?? next.length)
          }
        }}
      >
        <div className='input-shell'>
          <Autocomplete.Input
            id={id}
            ref={inputRef}
            name='private-key'
            aria-describedby={`${id}-feedback`}
            aria-invalid={Boolean(error)}
            autoCapitalize='none'
            autoCorrect='off'
            autoComplete='off'
            spellCheck={false}
            className='w-full py-1 text-base'
            onSelect={(event) => onChange(value, event.currentTarget.selectionStart)}
            onFocus={(event) => onChange(value, event.currentTarget.selectionStart)}
            onBlur={() => onChange(value, null)}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.nativeEvent.isComposing &&
                !event.currentTarget.getAttribute('aria-activedescendant')
              ) {
                event.preventDefault()
                onSubmit()
              }
            }}
          />
        </div>
        {suggestions.length > 0 ? (
          <Autocomplete.Portal>
            <Autocomplete.Positioner sideOffset={8} className='z-50 w-(--anchor-width)'>
              <Autocomplete.Popup className='max-h-(--available-height) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md'>
                <Autocomplete.List aria-label={t('init.wordSuggestions')} className='max-h-60 overflow-y-auto'>
                  {(word: string) => (
                    <Autocomplete.Item
                      key={word}
                      value={word}
                      className='flex min-h-11 cursor-pointer items-center rounded-md px-3 text-base outline-none data-highlighted:bg-neutral-100'
                    >
                      {word}
                    </Autocomplete.Item>
                  )}
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        ) : null}
      </Autocomplete.Root>
      <p
        id={`${id}-feedback`}
        aria-live='polite'
        className={`min-h-10 text-sm ${error ? 'text-red-700' : 'text-neutral-500'}`}
      >
        {error || helperText}
      </p>
    </div>
  )
}
