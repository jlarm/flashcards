import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const session = ref(null)
  const isLoading = ref(true)
  const error = ref('')

  async function init() {
    isLoading.value = true
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    user.value = data.session?.user ?? null
    isLoading.value = false
  }

  async function signInWithEmail(email) {
    error.value = ''
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (signInError) {
      error.value = signInError.message
      return false
    }
    return true
  }

  async function signOut() {
    error.value = ''
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      error.value = signOutError.message
    }
  }

  supabase.auth.onAuthStateChange((_event, newSession) => {
    session.value = newSession
    user.value = newSession?.user ?? null
  })

  return { user, session, isLoading, error, init, signInWithEmail, signOut }
})
