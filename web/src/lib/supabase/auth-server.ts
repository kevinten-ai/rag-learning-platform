import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/** Shared demo user ID used when no auth session exists */
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000'

/**
 * Create a Supabase client with the current user session.
 * If no authenticated user is found, falls back to a service-role client
 * with a demo user ID so the app works without login (competition mode).
 */
export async function createAuthenticatedSupabaseClient() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return { supabase, user }
  }

  // No authenticated user — fall back to service-role client for demo access
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  return {
    supabase: serviceClient,
    user: { id: DEMO_USER_ID } as { id: string },
  }
}
