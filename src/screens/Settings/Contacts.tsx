import { useContext, useState } from 'react'
import './Contacts.css'
import ArrowIcon from '../../icons/Arrow'
import BackIcon from '../../icons/Back'
import Button from '../../components/Button'
import Content from '../../components/Content'
import ErrorMessage from '../../components/Error'
import Header from './Header'
import InputContainer from '../../components/InputContainer'
import Padded from '../../components/Padded'
import SheetModal from '../../components/SheetModal'
import TransactionsList from '../../components/TransactionsList'
import UsersRound from '../../icons/UsersRound'
import {
  contactAddressForActivity,
  contactDisplayName,
  forgetContact,
  isReusableContact,
  readContacts,
  readRecents,
  saveContact,
} from '../../lib/contacts'
import { emptySendInfo, FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { useTranslation } from '../../providers/language'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { WalletContext } from '../../providers/wallet'

type EditorMode = 'new' | 'edit' | 'convert'

const initialFor = (label: string): string => label.trim().charAt(0).toUpperCase() || '?'

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
  const [mode, setMode] = useState<EditorMode>('new')
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
    setMode(preset ? 'convert' : 'new')
    setAddress(preset ?? '')
    setName('')
    setEditTarget(undefined)
    setError('')
    setEditing(true)
  }

  const openEdit = (target: string) => {
    const item = contacts.find((contact) => contact.address === target)
    if (!item) return
    setMode('edit')
    setAddress(item.address)
    setName(item.name ?? '')
    setEditTarget(item.address)
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

  const send = () => {
    if (!contact) return
    setSendInfo({ ...emptySendInfo, recipient: contact.address })
    navigate(Pages.SendForm)
  }

  // Only this payee's own rows, matched on the same destination the recorder used.
  const history = contact ? txs.filter((tx) => contactAddressForActivity(tx) === contact.address) : []
  const countLabel = contacts.length === 1 ? t('contacts.countOne') : t('contacts.count', { count: contacts.length })
  const sendCountLabel = (count: number) =>
    count === 1 ? t('contacts.sentTimesOne') : t('contacts.sentTimes', { count })
  const editorTitle =
    mode === 'edit' ? t('contacts.edit') : mode === 'convert' ? t('contacts.convert') : t('contacts.addNew')

  return (
    <>
      <Header text={t('contacts.title')} back />
      <Content>
        <Padded>
          <div className='settings-page contact-page'>
            {contact ? (
              <>
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
                    <span className='settings-section-label'>{t('contacts.saved')}</span>
                  </div>
                  <div className='contact-identity'>
                    <span className='contact-avatar' aria-hidden='true'>
                      {initialFor(contactDisplayName(contact))}
                    </span>
                    <div className='contact-identity-copy'>
                      <h2>{contactDisplayName(contact)}</h2>
                      <button
                        type='button'
                        className='contact-destination'
                        title={t('components.copyAddress')}
                        onClick={() => copyAddress(contact.address)}
                      >
                        {contact.address}
                      </button>
                      <div className='contact-stats'>
                        <span>{sendCountLabel(contact.sendCount)}</span>
                        {contact.lastSentAt ? (
                          <span>
                            {t('contacts.lastSent', {
                              date: new Date(contact.lastSentAt).toLocaleDateString(),
                            })}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <Button label={t('contacts.sendToName', { name: contactDisplayName(contact) })} onClick={send} />
                  <div className='contact-detail-actions'>
                    <Button label={t('contacts.edit')} secondary onClick={() => openEdit(contact.address)} />
                    <Button
                      label={deleting ? t('contacts.confirmDelete') : t('contacts.delete')}
                      secondary
                      onClick={() => (deleting ? remove() : setDeleting(true))}
                    />
                  </div>
                  <ErrorMessage error={Boolean(error)} text={error} />
                </section>
                <section className='settings-section contact-history'>
                  <p className='settings-section-label'>{t('contacts.history')}</p>
                  {history.length ? (
                    <TransactionsList mode='static' addressFilter={contact.address} />
                  ) : (
                    <p className='contact-history-empty'>{t('contacts.historyEmpty')}</p>
                  )}
                </section>
              </>
            ) : (
              <>
                <section className='settings-section'>
                  <div className='contact-section-head'>
                    <p className='settings-section-label'>{t('contacts.saved')}</p>
                    <span className='contact-count'>{countLabel}</span>
                  </div>
                  <Button label={t('contacts.addNew')} secondary onClick={() => openNew()} />
                  {contacts.length ? (
                    <div className='contact-list settings-row-group'>
                      {contacts.map((item) => (
                        <button
                          key={item.address}
                          type='button'
                          className='settings-row contact-list-item'
                          aria-label={contactDisplayName(item)}
                          onClick={() => select(item.address)}
                        >
                          <span className='settings-row__main'>
                            <span className='contact-avatar contact-avatar--row' aria-hidden='true'>
                              {initialFor(contactDisplayName(item))}
                            </span>
                            <span className='contact-list-item-copy'>
                              <strong>{contactDisplayName(item)}</strong>
                              <small>{item.name?.trim() ? item.address : sendCountLabel(item.sendCount)}</small>
                            </span>
                          </span>
                          <span className='settings-row__chevron' aria-hidden='true'>
                            <ArrowIcon />
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
                <section className='settings-section'>
                  <p className='settings-section-label'>{t('contacts.recents')}</p>
                  {recents.length ? (
                    <div className='contact-list settings-row-group'>
                      {recents.map((item) => {
                        const saved = contacts.find((contact) => contact.address === item.address)
                        return (
                          <button
                            key={item.address}
                            type='button'
                            className='settings-row contact-list-item contact-recent'
                            aria-label={saved ? t('contacts.open') : t('contacts.convert')}
                            onClick={() => (saved ? select(item.address) : openNew(item.address))}
                          >
                            <span className='settings-row__main'>
                              <span className='contact-avatar contact-avatar--row' aria-hidden='true'>
                                {initialFor(saved ? contactDisplayName(saved) : item.address)}
                              </span>
                              <span className='contact-list-item-copy'>
                                <strong>{saved ? contactDisplayName(saved) : item.address}</strong>
                                <small>{saved?.name?.trim() ? item.address : sendCountLabel(item.sendCount)}</small>
                              </span>
                            </span>
                            <span className='contact-recent-action'>
                              {saved ? t('contacts.open') : t('contacts.convert')}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className='contact-history-empty'>{t('contacts.recentsEmpty')}</p>
                  )}
                </section>
              </>
            )}
          </div>
        </Padded>
      </Content>
      <SheetModal isOpen={editing} onClose={closeEditor}>
        <div className='contact-form'>
          <p className='settings-section-label'>{editorTitle}</p>
          <ErrorMessage error={Boolean(error)} text={error} />
          <InputContainer label={t('contacts.name')}>
            <input
              id='contact-name'
              className='input'
              aria-label={t('contacts.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </InputContainer>
          <InputContainer label={t('common.address')}>
            <textarea
              id='contact-address'
              className='input contact-address-input'
              aria-label={t('common.address')}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
            />
          </InputContainer>
          <Button label={t('contacts.save')} onClick={save} />
          <Button label={t('common.cancel')} secondary onClick={closeEditor} />
        </div>
      </SheetModal>
    </>
  )
}
