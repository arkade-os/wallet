export const getAlert = async (): Promise<string | undefined> => {
  try {
    const response = await fetch('https://raw.githubusercontent.com/arkade-os/wallet/riga/motd.html')
    const message = await response.text()
    return message
  } catch (error) {
    console.error('Error fetching alert:', error)
  }
}
