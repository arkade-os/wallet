import { useEffect } from 'react'
import { getChatwootVars, getChatwootSettings, injectAndRunChatwootScript } from '../lib/chatwoot'

const ChatwootWidget = () => {
  useEffect(() => {
    const vars = getChatwootVars()
    if (!vars.websiteToken || !vars.baseUrl) return

    // Set Chatwoot settings
    window.chatwootSettings = getChatwootSettings()

    // Chatwoot script injection logic
    injectAndRunChatwootScript(vars)

    // Cleanup function
    return () => {
      const scriptTag = document.querySelector(`script[src*="${vars.baseUrl}/packs/js/sdk.js"]`)
      if (scriptTag) scriptTag.remove()
    }
  }, [])

  return null // Component does not render UI
}

export default ChatwootWidget
