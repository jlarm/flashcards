import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useCardsStore = defineStore('cards', () => {
  const cards = ref([])
  const isLoading = ref(false)
  const error = ref('')

  async function fetchCards(deckId) {
    isLoading.value = true
    error.value = ''
    const { data, error: fetchError } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('position', { ascending: true })
    if (fetchError) {
      error.value = fetchError.message
    } else {
      cards.value = data ?? []
    }
    isLoading.value = false
  }

  async function createCard(payload) {
    error.value = ''
    const { data, error: createError } = await supabase
      .from('cards')
      .insert(payload)
      .select()
      .single()
    if (createError) {
      error.value = createError.message
      return null
    }
    cards.value = [...cards.value, data]
    return data
  }

  async function updateCard(id, payload) {
    error.value = ''
    const { data, error: updateError } = await supabase
      .from('cards')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (updateError) {
      error.value = updateError.message
      return null
    }
    cards.value = cards.value.map((card) => (card.id === id ? data : card))
    return data
  }

  async function deleteCard(id) {
    error.value = ''
    const { error: deleteError } = await supabase.from('cards').delete().eq('id', id)
    if (deleteError) {
      error.value = deleteError.message
      return false
    }
    cards.value = cards.value.filter((card) => card.id !== id)
    return true
  }

  async function bulkCreateCards(payload) {
    error.value = ''
    const { data, error: createError } = await supabase.from('cards').insert(payload).select()
    if (createError) {
      error.value = createError.message
      return null
    }
    cards.value = [...cards.value, ...(data ?? [])]
    return data
  }

  return {
    cards,
    isLoading,
    error,
    fetchCards,
    createCard,
    updateCard,
    deleteCard,
    bulkCreateCards,
  }
})
