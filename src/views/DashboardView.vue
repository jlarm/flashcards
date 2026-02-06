<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDecksStore } from '@/stores/decks'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Select from '@/components/ui/Select.vue'
import Card from '@/components/ui/Card.vue'
import Dialog from '@/components/ui/Dialog.vue'
import Badge from '@/components/ui/Badge.vue'

const authStore = useAuthStore()
const decksStore = useDecksStore()
const router = useRouter()

const isDialogOpen = ref(false)
const title = ref('')
const description = ref('')
const visibility = ref('private')
const lastScores = ref({})

const userInitials = computed(() => {
  const email = authStore.user?.email ?? ''
  return email.slice(0, 2).toUpperCase()
})

onMounted(() => {
  if (authStore.user?.id) {
    decksStore.fetchDecks(authStore.user.id)
    loadLastScores()
  }
})

async function loadLastScores() {
  if (!authStore.user?.id) return
  const { data } = await supabase
    .from('study_sessions')
    .select('deck_id,correct_percent,accuracy_percent,correct_count,review_count,ended_at')
    .eq('user_id', authStore.user.id)
    .not('ended_at', 'is', null)
    .order('ended_at', { ascending: false })
  const map = {}
  for (const row of data ?? []) {
    if (map[row.deck_id] === undefined) {
      if (row.correct_percent !== null && row.correct_percent !== undefined) {
        map[row.deck_id] = row.correct_percent
      } else if (row.accuracy_percent !== null && row.accuracy_percent !== undefined) {
        map[row.deck_id] = row.accuracy_percent
      } else if (row.review_count) {
        map[row.deck_id] = Math.round((row.correct_count / row.review_count) * 100)
      } else {
        map[row.deck_id] = null
      }
    }
  }
  lastScores.value = map
}

async function createDeck() {
  if (!title.value.trim() || !authStore.user?.id) return
  const deck = await decksStore.createDeck({
    owner_id: authStore.user.id,
    title: title.value.trim(),
    description: description.value.trim() || null,
    visibility: visibility.value,
  })
  if (deck) {
    isDialogOpen.value = false
    title.value = ''
    description.value = ''
    visibility.value = 'private'
    router.push({ name: 'deck', params: { id: deck.id } })
  }
}

function resetCreateForm() {
  title.value = ''
  description.value = ''
  visibility.value = 'private'
}

async function logout() {
  await authStore.signOut()
  router.push({ name: 'auth' })
}
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-6xl flex-col px-6 pb-16 pt-8">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="grid h-12 w-12 place-items-center rounded-2xl bg-foreground text-background">
          <span class="text-sm font-display">{{ userInitials || 'FX' }}</span>
        </div>
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-foreground/70">Deck dashboard</p>
          <h1 class="text-2xl font-display font-semibold">Your flashcard library</h1>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <Button variant="secondary" @click="isDialogOpen = true">New deck</Button>
        <Button variant="ghost" @click="logout">Sign out</Button>
      </div>
    </header>

    <section class="mt-10">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-lg font-display font-semibold">Recent decks</h2>
        <Badge variant="default">{{ decksStore.decks.length }} decks</Badge>
      </div>
      <div v-if="decksStore.isLoading" class="text-sm text-foreground/70">Loading decks...</div>
      <div v-else class="grid gap-6 md:grid-cols-2">
        <Card v-for="deck in decksStore.decks" :key="deck.id" class="flex flex-col gap-4">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="text-lg font-display font-semibold">{{ deck.title }}</h3>
              <p v-if="deck.description" class="mt-2 text-sm text-foreground/70">
                {{ deck.description }}
              </p>
            </div>
            <Badge>{{ deck.visibility }}</Badge>
          </div>
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase tracking-[0.2em] text-foreground/60">
                Updated {{ new Date(deck.updated_at).toLocaleDateString() }}
              </span>
              <div class="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" @click="router.push({ name: 'deck', params: { id: deck.id } })">
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                @click="router.push({ name: 'study', params: { id: deck.id } })"
              >
                Start
              </Button>
            </div>
            <div class="text-xs text-foreground/60">
              Last score:
              <span class="font-semibold text-foreground">
                {{ lastScores[deck.id] === null || lastScores[deck.id] === undefined ? '—' : `${lastScores[deck.id]}%` }}
              </span>
            </div>
          </div>
        </Card>
        <Card v-if="!decksStore.decks.length" class="border-dashed text-center">
          <p class="text-sm text-foreground/70">No decks yet. Start by creating one.</p>
        </Card>
      </div>
      <p v-if="decksStore.error" class="mt-4 text-sm text-red-600">{{ decksStore.error }}</p>
    </section>

    <Dialog
      v-model:open="isDialogOpen"
      @update:open="(open) => (open ? null : resetCreateForm())"
    >
      <template #title>
        <div>
          <h2 class="text-xl font-display font-semibold">Create a new deck</h2>
          <p class="text-sm text-foreground/70">Define the focus and visibility.</p>
        </div>
      </template>
      <div class="space-y-4">
        <Input v-model="title" placeholder="Deck title" />
        <Textarea v-model="description" placeholder="Short description (optional)" />
        <Select v-model="visibility">
          <option value="private">Private</option>
          <option value="unlisted">Unlisted</option>
          <option value="public">Public</option>
        </Select>
        <Button class="w-full" @click="createDeck">Create deck</Button>
      </div>
    </Dialog>

  </div>
</template>
