export const fetchURL = async (url: string): Promise<any> => {
  const res = await fetch(url)
  if (!res.ok) {
    const errorMessage = await res.text()
    throw new Error(`${res.statusText}: ${errorMessage}`)
  }
  return (await res.json()) as any
}

// In production, WASM files are served by nginx with proper MIME type and CORS headers
// In development, Create React App's dev server will serve the file with correct MIME type
// thanks to the Accept header we set in the request
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
