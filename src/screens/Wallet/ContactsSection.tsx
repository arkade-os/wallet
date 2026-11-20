import { useContext } from 'react'
import ArrowIcon from '../../icons/Arrow'
import { hapticLight } from '../../lib/haptics'
import { Contact, contactDisplayName } from '../../lib/contacts'
import { SettingsOptions } from '../../lib/types'
import { FlowContext, emptySendInfo } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { OptionsContext } from '../../providers/options'
import { useTranslation } from '../../providers/language'
import '../Settings/Contacts.css'

/** How many contacts the row holds before View all takes over. */
export const HOME_CONTACTS_LIMIT = 12

const initialFor = (label: string): string => label.trim().charAt(0).toUpperCase() || '?'

/**
 * Saved contacts on Home, most recently paid first. Tapping one opens Send with that contact as the
 * recipient, as a scanned code does. Home passes the contacts in and leaves the row out when there
 * are none.
 */
export default function ContactsSection({ contacts }: { contacts: Contact[] }) {
  const { setSendInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { setOption } = useContext(OptionsContext)
  const { t } = useTranslation()

  const pay = (contact: Contact) => {
    hapticLight()
    setSendInfo({ ...emptySendInfo, recipient: contact.address })
    navigate(Pages.SendForm)
  }

  const viewAll = () => {
    hapticLight()
    setOption(SettingsOptions.Contacts)
    navigate(Pages.Settings)
  }

  return (
    <section className='home-section home-contacts' aria-labelledby='home-contacts-title'>
      <div className='home-section__header'>
        <h2 className='home-section-label' id='home-contacts-title'>
          {t('contacts.title')}
        </h2>
        <button
          type='button'
          onClick={viewAll}
          aria-describedby='home-contacts-title'
          data-testid='contacts-view-all'
          className='home-section-action home-section-action--quiet'
        >
          {t('wallet.viewAll')}
          <ArrowIcon small />
        </button>
      </div>
      <ul className='home-contacts__list'>
        {contacts.slice(0, HOME_CONTACTS_LIMIT).map((contact) => {
          const label = contactDisplayName(contact)
          return (
            <li key={contact.address}>
              <button
                type='button'
                className='home-contact'
                aria-label={t('contacts.sendToName', { name: label })}
                onClick={() => pay(contact)}
              >
                <span className='contact-avatar' aria-hidden='true'>
                  {initialFor(label)}
                </span>
                <span
                  className={
                    contact.name?.trim() ? 'home-contact__name' : 'home-contact__name home-contact__name--address'
                  }
                  aria-hidden='true'
                >
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
