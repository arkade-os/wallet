import { useContext, useState } from 'react'
import './Contacts.css'
import Button from '../../components/Button'
import Content from '../../components/Content'
import ErrorMessage from '../../components/Error'
import Header from './Header'
import Padded from '../../components/Padded'
import UsersRound from '../../icons/UsersRound'
import {
  contactDisplayName,
  isReusableContact,
  readContacts,
  saveContact,
  takeSelectedContact,
} from '../../lib/contacts'
import { prettyLongText } from '../../lib/format'
import { emptySendInfo, FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { useTranslation } from '../../providers/language'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'

export default function Contacts() {
  const { navigate } = useContext(NavigationContext)
  const { setSendInfo } = useContext(FlowContext)
  const { t } = useTranslation()
  const copyAddress = useCopyToClipboard()
  const [contacts, setContacts] = useState(readContacts)
  // Activity opens a contact by handing over its address; land on the details
  // view rather than making the user find the row again.
  const [selected, setSelected] = useState<string | undefined>(() => {
    const address = takeSelectedContact()
    return address && contacts.some((contact) => contact.address === address) ? address : undefined
  })
  const initial = contacts.find(({ address }) => address === selected)
  const [address, setAddress] = useState(initial?.address ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const contact = contacts.find(({ address }) => address === selected)

  const select = (address: string) => {
    const item = contacts.find((contact) => contact.address === address)
    if (!item) return
    setSelected(item.address)
    setAddress(item.address)
    setName(item.name || '')
    setDeleting(false)
    setError('')
  }

  const save = () => {
    setError('')
    if (!isReusableContact(address.trim())) return setError(t('contacts.invalidAddress'))
    if (!saveContact(address, name, selected)) return setError(t('contacts.saveFailed'))
    setContacts(readContacts())
    setSelected(undefined)
    setAddress('')
    setName('')
  }

  const remove = () => {
    if (!saveContact(address, '', selected)) return setError(t('contacts.saveFailed'))
    setContacts(readContacts())
    setSelected(undefined)
    setAddress('')
    setName('')
    setDeleting(false)
  }

  const send = () => {
    if (!contact) return
    setSendInfo({ ...emptySendInfo, recipient: contact.address })
    navigate(Pages.SendForm)
  }

  return (
    <>
      <Header text={t('contacts.title')} back />
      <Content>
        <Padded>
          <div className='settings-page contact-page'>
            <h2 className='settings-section-label' role='heading'>
              {t('contacts.count', { count: contacts.length })}
            </h2>
            {contact ? (
              <section className='contact-detail'>
                <div className='contact-avatar'>
                  <UsersRound size={28} />
                </div>
                <div className='contact-detail-copy'>
                  <h2>{contactDisplayName(contact)}</h2>
                  <button
                    type='button'
                    className='contact-destination'
                    title={t('components.copyAddress')}
                    onClick={() => copyAddress(contact.address)}
                  >
                    {prettyLongText(contact.address)}
                  </button>
                </div>
                <div className='contact-stats'>
                  <span>{t('contacts.sentTimes', { count: contact.sendCount })}</span>
                  {contact.lastSentAt ? (
                    <span>{t('contacts.lastSent', { date: new Date(contact.lastSentAt).toLocaleDateString() })}</span>
                  ) : null}
                </div>
                <Button label={t('contacts.sendToName', { name: contactDisplayName(contact) })} onClick={send} />
              </section>
            ) : (
              <section className='settings-section'>
                <p className='settings-section-label'>{t('contacts.count', { count: contacts.length })}</p>
                {contacts.length ? (
                  <div className='contact-list settings-row-group'>
                    {contacts.map((item) => (
                      <button
                        key={item.address}
                        className='settings-row contact-list-item'
                        aria-label={contactDisplayName(item)}
                        onClick={() => select(item.address)}
                      >
                        <span className='settings-row__main'>
                          <span className='settings-row__icon'>
                            <UsersRound size={20} />
                          </span>
                          <span className='contact-list-item-copy'>
                            <strong>{contactDisplayName(item)}</strong>
                            <small>{prettyLongText(item.address)}</small>
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className='contact-empty'>
                    <UsersRound size={24} />
                    <h2>{t('contacts.empty')}</h2>
                    <p>{t('contacts.emptyHint')}</p>
                  </div>
                )}
              </section>
            )}
            <section className='contact-form'>
              <p className='settings-section-label'>{contact ? t('contacts.edit') : t('contacts.add')}</p>
              <ErrorMessage error={Boolean(error)} text={error} />
              <label htmlFor='contact-name' className='settings-section-label'>
                {t('contacts.name')}
              </label>
              <input id='contact-name' className='input' value={name} onChange={(e) => setName(e.target.value)} />
              <label htmlFor='contact-address' className='settings-section-label'>
                {t('common.address')}
              </label>
              <textarea
                id='contact-address'
                className='input contact-address-input'
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
              />
              <Button label={contact ? t('contacts.save') : t('contacts.add')} onClick={save} />
              {contact ? (
                <Button
                  label={deleting ? t('contacts.confirmDelete') : t('contacts.delete')}
                  secondary
                  onClick={() => (deleting ? remove() : setDeleting(true))}
                />
              ) : null}
            </section>
          </div>
        </Padded>
      </Content>
    </>
  )
}
