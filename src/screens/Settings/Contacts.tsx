import { useContext, useState } from 'react'
import './Contacts.css'
import Button from '../../components/Button'
import Content from '../../components/Content'
import ErrorMessage from '../../components/Error'
import Header from './Header'
import Padded from '../../components/Padded'
import SheetModal from '../../components/SheetModal'
import TransactionsList from '../../components/TransactionsList'
import UsersRound from '../../icons/UsersRound'
import BackIcon from '../../icons/Back'
import {
  contactAddressForActivity,
  contactDisplayName,
  forgetContact,
  isReusableContact,
  readContacts,
  readRecents,
  saveContact,
  saveRecentAsContact,
} from '../../lib/contacts'
import { prettyLongText } from '../../lib/format'
import { emptySendInfo, FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { useTranslation } from '../../providers/language'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { WalletContext } from '../../providers/wallet'

export default function Contacts() {
  const { navigate } = useContext(NavigationContext)
  const { setSendInfo } = useContext(FlowContext)
  const { txs } = useContext(WalletContext)
  const { t } = useTranslation()
  const copyAddress = useCopyToClipboard()
  const [contacts, setContacts] = useState(readContacts)
  const [recents, setRecents] = useState(readRecents)
  const [selected, setSelected] = useState<string>()
  const [editing, setEditing] = useState(false)
  const [address, setAddress] = useState('')
  const [name, setName] = useState('')
  const [editTarget, setEditTarget] = useState<string>()
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const contact = contacts.find(({ address }) => address === selected)

  const refresh = () => {
    setContacts(readContacts())
    setRecents(readRecents())
  }

  const closeEditor = () => {
    setEditing(false)
    setAddress('')
    setName('')
    setEditTarget(undefined)
    setError('')
  }

  const openNew = (preset?: string) => {
    setAddress(preset ?? '')
    setName('')
    setEditTarget(undefined)
    setError('')
    setEditing(true)
  }

  const select = (address: string) => {
    const item = contacts.find((contact) => contact.address === address)
    if (!item) return
    setSelected(item.address)
    setDeleting(false)
    setError('')
  }

  const save = () => {
    setError('')
    const target = address.trim()
    if (!isReusableContact(target)) return setError(t('contacts.invalidAddress'))
    if (contacts.some((contact) => contact.address === target && contact.address !== editTarget)) {
      return setError(t('contacts.addressTaken'))
    }
    if (!saveContact(target, name, editTarget)) return setError(t('contacts.saveFailed'))
    refresh()
    setSelected(target)
    closeEditor()
  }

  const remove = () => {
    if (!selected || !forgetContact(selected)) return setError(t('contacts.saveFailed'))
    refresh()
    setSelected(undefined)
    setDeleting(false)
  }

  const convert = (recent: string) => {
    if (!saveRecentAsContact(recent, '')) return setError(t('contacts.saveFailed'))
    refresh()
    setSelected(recent)
  }

  const send = () => {
    if (!contact) return
    setSendInfo({ ...emptySendInfo, recipient: contact.address })
    navigate(Pages.SendForm)
  }

  // Only this payee's own rows, matched on the same destination the recorder used.
  const history = contact ? txs.filter((tx) => contactAddressForActivity(tx) === contact.address) : []

  return (
    <>
      <Header text={t('contacts.title')} back />
      <Content>
        <Padded>
          <div className='settings-page contact-page'>
            {contact ? (
              <section className='contact-detail'>
                <div className='contact-detail-head'>
                  <button
                    type='button'
                    className='contact-detail-back'
                    aria-label={t('contacts.title')}
                    onClick={() => setSelected(undefined)}
                  >
                    <BackIcon />
                  </button>
                  <span className='settings-section-label'>{t('contacts.title')}</span>
                </div>
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
                <div className='contact-detail-actions'>
                  <Button
                    label={t('contacts.edit')}
                    secondary
                    onClick={() => {
                      setAddress(contact.address)
                      setName(contact.name ?? '')
                      setEditTarget(contact.address)
                      setError('')
                      setEditing(true)
                    }}
                  />
                  <Button
                    label={deleting ? t('contacts.confirmDelete') : t('contacts.delete')}
                    secondary
                    onClick={() => (deleting ? remove() : setDeleting(true))}
                  />
                </div>
                <ErrorMessage error={Boolean(error)} text={error} />
              </section>
            ) : (
              <section className='settings-section'>
                <div className='contact-section-head'>
                  <h2 className='settings-section-label' role='heading'>
                    {t('contacts.count', { count: contacts.length })}
                  </h2>
                  <Button label={t('contacts.addNew')} secondary onClick={() => openNew()} />
                </div>
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
            {contact ? (
              <section className='settings-section contact-history'>
                <p className='settings-section-label'>{t('contacts.history')}</p>
                {history.length ? (
                  <TransactionsList mode='static' addressFilter={contact.address} />
                ) : (
                  <p className='contact-history-empty'>{t('contacts.historyEmpty')}</p>
                )}
              </section>
            ) : null}
            {contact ? null : recents.length ? (
              <section className='settings-section'>
                <p className='settings-section-label'>{t('contacts.recents')}</p>
                <div className='contact-list settings-row-group'>
                  {recents.map((item) => (
                    <div key={item.address} className='settings-row contact-list-item contact-recent'>
                      <span className='settings-row__main'>
                        <span className='settings-row__icon'>
                          <UsersRound size={20} />
                        </span>
                        <span className='contact-list-item-copy'>
                          <strong>{prettyLongText(item.address, 12)}</strong>
                          <small>{t('contacts.sentTimes', { count: item.sendCount })}</small>
                        </span>
                      </span>
                      {contacts.some((saved) => saved.address === item.address) ? (
                        <button
                          type='button'
                          className='contact-convert'
                          onClick={() => select(item.address)}
                          aria-label={t('contacts.edit')}
                        >
                          {t('contacts.edit')}
                        </button>
                      ) : (
                        <button
                          type='button'
                          className='contact-convert'
                          onClick={() => convert(item.address)}
                          aria-label={t('contacts.convert')}
                        >
                          {t('contacts.convert')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <p className='contact-history-empty'>{t('contacts.recentsEmpty')}</p>
            )}
          </div>
        </Padded>
      </Content>
      <SheetModal isOpen={editing} onClose={closeEditor}>
        <div className='contact-form'>
          <p className='settings-section-label'>{t('contacts.addNew')}</p>
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
          <Button label={t('contacts.save')} onClick={save} />
          <Button label={t('common.cancel')} secondary onClick={closeEditor} />
        </div>
      </SheetModal>
    </>
  )
}
