interface AlertResponse {
  id: number
  quote: string
  author: string
}

export const getAlert = async (): Promise<string | undefined> => {
  try {
    const response = await fetch('https://dummyjson.com/quotes/random')
    const data: AlertResponse = await response.json()
    return 'Arkade Bulletin Board System goes here'
    return data.quote
  } catch (error) {
    console.error('Error fetching alert:', error)
  }
}
