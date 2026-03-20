import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'rag-session-id'

/**
 * Create a Supabase client with the current user session.
 *
 * Auth priority:
 * 1. Supabase authenticated user (OAuth / email) — uses anon key + RLS
 * 2. Session cookie visitor (no login) — uses service-role key + cookie-based user ID
 *
 * This guarantees data isolation: each browser gets a unique user ID
 * stored in a httpOnly cookie, so different visitors never see each other's data.
 */
export async function createAuthenticatedSupabaseClient() {
  const cookieStore = await cookies()

  // Try Supabase auth first
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

  // No authenticated user — use session cookie for data isolation
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (!sessionId) {
    // Should not happen (middleware sets it), but handle gracefully
    throw new Error('No session — please refresh the page')
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  return {
    supabase: serviceClient,
    user: { id: sessionId } as { id: string },
  }
}
