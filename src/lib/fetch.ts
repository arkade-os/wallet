export const fetchURL = async (url: string): Promise<any> => {
  const res = await fetch(url)
  if (!res.ok) {
    const errorMessage = await res.text()
    throw new Error(`${res.statusText}: ${errorMessage}`)
  }
  return (await res.json()) as any
}

// WASM files are served by nginx with proper MIME type (application/wasm)
// and CORS headers. The nginx config ensures 404 for non-existing files
// instead of falling back to index.html
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
