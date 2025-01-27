export const fetchURL = async (url: string): Promise<any> => {
  const res = await fetch(url)
  if (!res.ok) {
    const errorMessage = await res.text()
    throw new Error(`${res.statusText}: ${errorMessage}`)
  }
  return (await res.json()) as any
}

// since this is a PWA, non existing files still responde with 200,
// so to check if a given wasm file exists we need to check the
// returned content-type and act accordingly
export const fetchWasm = async (url: string): Promise<Response> => {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      'Accept': 'application/wasm'
    }
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response
}
