import { signInWithPassword, signOut } from '../../../lib/supabase/auth'

interface SignInPayload {
  email: string
  password: string
}

export const authService = {
  async signIn(payload: SignInPayload) {
    return signInWithPassword(payload)
  },
  async signOut() {
    return signOut()
  },
}
