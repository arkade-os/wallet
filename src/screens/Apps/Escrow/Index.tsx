import { useContext, useState } from 'react'
import Shadow from '../../../components/Shadow'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Text, { TextLabel } from '../../../components/Text'
// import { SettingsIconLight } from '../../../icons/Settings'
import { EscrowContext } from '../../../providers/escrow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import Button from '../../../components/Button'

export default function AppEscrow() {
  // const { signin, signout, isSignedIn } = useContext(EscrowContext)
  const { navigate } = useContext(NavigationContext)
  const [isSignedIn, setIsSignedIn] = useState(false)

  const performSignIn = async () => {
    const password = prompt('Enter your password')
    console.log('got the password!', password)


    if (password) {
      try {
        console.log('sing igg!', password)

        // await signin(password)
      } catch (err) {
        console.error(err)
        alert('Invalid password')
      }
    }
  }

  return (
    <>
      <Header
        // auxFunc={() => navigate(Pages.AppBoltzSettings)}
        // auxIcon={<SettingsIconLight />}
        text='Escrow on Ark'
        back={() => navigate(Pages.Apps)}
      />
      <Content>
        <Padded>
          <FlexCol gap='2rem'>
            <h1>Escrow</h1>
            <FlexRow gap='0'>
                  <Text>{isSignedIn ? 'IN' : 'OUT'}</Text>
            </FlexRow>
            <FlexRow end><Button label="Sign in" onClick={performSignIn}/></FlexRow>
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}