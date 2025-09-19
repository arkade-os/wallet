import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Unlock from '../../../screens/Wallet/Unlock'
import { IonApp } from '@ionic/react'

let pwaCanInstall = false
vi.mock('../../../lib/pwa', () => ({
  pwaCanInstall: () => pwaCanInstall,
}))

describe('Unlock screen', () => {
  it('renders the unlock screen with the correct elements', async () => {
    render(
      <IonApp>
        <Unlock />
      </IonApp>,
    )

    const title = screen.getByText('Unlock')
    const button = screen.getByText('Unlock wallet')
    const input = (await screen.findByPlaceholderText('password')) as HTMLInputElement
    expect(title).toBeInTheDocument()
    expect(button).toBeInTheDocument()
    expect(input).toBeInTheDocument()

    input.value = 'testpassword'
    expect(input).toHaveValue('testpassword')
  })
})
