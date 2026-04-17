import { createBrowserClient } from '@supabase/ssr'

// Module-level singleton — one client for the entire app lifetime.
// Creating a new client on every render breaks realtime subscriptions.
let _client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.'
    )
  }

  _client = createBrowserClient(url, key)
  return _client
}
