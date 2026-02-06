import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useDecksStore = defineStore('decks', () => {
  const decks = ref([])
  const isLoading = ref(false)
  const error = ref('')

  async function fetchDecks(userId) {
    isLoading.value = true
    error.value = ''
    const { data, error: fetchError } = await supabase
      .from('decks')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
    if (fetchError) {
      error.value = fetchError.message
    } else {
      decks.value = data ?? []
    }
    isLoading.value = false
  }

  async function createDeck(payload) {
    error.value = ''
    const { data, error: createError } = await supabase
      .from('decks')
      .insert(payload)
      .select()
      .single()
    if (createError) {
      error.value = createError.message
      return null
    }
    decks.value = [data, ...decks.value]
    return data
  }

  async function updateDeck(id, payload) {
    error.value = ''
    const { data, error: updateError } = await supabase
      .from('decks')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (updateError) {
      error.value = updateError.message
      return null
    }
    decks.value = decks.value.map((deck) => (deck.id === id ? data : deck))
    return data
  }

  return { decks, isLoading, error, fetchDecks, createDeck, updateDeck }
})
