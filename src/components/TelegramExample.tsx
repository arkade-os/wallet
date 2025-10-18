import React, { useEffect } from 'react'
// import { useTelegram } from '../providers/telegram'
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonItem, IonLabel } from '@ionic/react'

// Example component showing how to integrate Telegram Mini App features
const TelegramExample: React.FC = () => {
  // Uncomment when telegram provider is ready
  /*
  const {
    user,
    isTelegramEnvironment,
    colorScheme,
    hapticFeedback,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    showAlert,
    showConfirm,
    setHeaderColor,
    setBackgroundColor,
  } = useTelegram()
  */

  // Mock values for demonstration
  const user = null
  const isTelegramEnvironment = false
  const colorScheme = 'light'

  useEffect(() => {
    // When component mounts, configure Telegram UI
    if (isTelegramEnvironment) {
      // Show main button for primary action
      // showMainButton('Send Payment', () => {
      //   hapticFeedback('success')
      //   handleSendPayment()
      // })
      // Show back button if needed
      // showBackButton(() => {
      //   // Handle back navigation
      //   window.history.back()
      // })
      // Set theme colors
      // setHeaderColor(colorScheme === 'dark' ? '#1a1a1a' : '#ffffff')
      // setBackgroundColor(colorScheme === 'dark' ? '#000000' : '#f5f5f5')
    }

    // Cleanup on unmount
    return () => {
      // hideMainButton()
      // hideBackButton()
    }
  }, [isTelegramEnvironment, colorScheme])

  const handleHapticTest = () => {
    // hapticFeedback('medium')
    console.log('Haptic feedback triggered')
  }

  const handleShowAlert = async () => {
    // await showAlert('This is a Telegram alert!')
    alert('This is a browser alert (Telegram alert when in Mini App)')
  }

  const handleShowConfirm = async () => {
    // const confirmed = await showConfirm('Are you sure you want to proceed?')
    const confirmed = confirm('Are you sure you want to proceed?')
    console.log('User confirmed:', confirmed)
  }

  const handleSendPayment = () => {
    // This would be your actual payment logic
    console.log('Sending payment...')
    // hapticFeedback('success')
  }

  return (
    <div style={{ padding: '16px' }}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Telegram Mini App Features</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          {isTelegramEnvironment ? (
            <div>
              <IonItem>
                <IonLabel>
                  <h3>Welcome, {user?.first_name}!</h3>
                  <p>User ID: {user?.id}</p>
                  {user?.username ? <p>Username: @{user.username}</p> : null}
                </IonLabel>
              </IonItem>

              <IonItem>
                <IonLabel>
                  <h3>Theme</h3>
                  <p>Current theme: {colorScheme}</p>
                </IonLabel>
              </IonItem>

              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <IonButton expand='block' onClick={handleHapticTest}>
                  Test Haptic Feedback
                </IonButton>

                <IonButton expand='block' onClick={handleShowAlert}>
                  Show Telegram Alert
                </IonButton>

                <IonButton expand='block' onClick={handleShowConfirm}>
                  Show Telegram Confirm
                </IonButton>

                <IonButton expand='block' color='success' onClick={handleSendPayment}>
                  Send Payment (Main Button Action)
                </IonButton>
              </div>
            </div>
          ) : (
            <div>
              <IonItem>
                <IonLabel>
                  <h3>Web Browser Mode</h3>
                  <p>Running outside of Telegram</p>
                  <p>Telegram features will be simulated</p>
                </IonLabel>
              </IonItem>

              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <IonButton expand='block' onClick={handleHapticTest}>
                  Test Haptic (Console Log)
                </IonButton>

                <IonButton expand='block' onClick={handleShowAlert}>
                  Show Browser Alert
                </IonButton>

                <IonButton expand='block' onClick={handleShowConfirm}>
                  Show Browser Confirm
                </IonButton>
              </div>
            </div>
          )}
        </IonCardContent>
      </IonCard>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Integration Tips</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
            <p>
              <strong>Haptic Feedback:</strong> Use for button presses, success/error states
            </p>
            <p>
              <strong>Main Button:</strong> Use for primary actions like "Send", "Confirm", "Continue"
            </p>
            <p>
              <strong>Back Button:</strong> Show when users can navigate back
            </p>
            <p>
              <strong>Theme Integration:</strong> App automatically adapts to user's Telegram theme
            </p>
            <p>
              <strong>User Data:</strong> Access user's name, username, and profile photo
            </p>
          </div>
        </IonCardContent>
      </IonCard>
    </div>
  )
}

export default TelegramExample

/*
Usage in other components:

import { useTelegram } from '../providers/telegram'

function WalletComponent() {
  const { hapticFeedback, showMainButton, user, isTelegramEnvironment } = useTelegram()

  useEffect(() => {
    if (isTelegramEnvironment) {
      showMainButton('Send', handleSend)
    }
  }, [])

  const handleSend = () => {
    hapticFeedback('success')
    // Send logic
  }

  return (
    <div>
      {isTelegramEnvironment && user && (
        <div>Welcome, {user.first_name}!</div>
      )}
      // ... rest of component
    </div>
  )
}
*/
