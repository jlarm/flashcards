<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDecksStore } from '@/stores/decks'
import { supabase } from '@/lib/supabase'
import Sparkline from '@/components/ui/Sparkline.vue'
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
const deckTrends = ref({})

const userInitials = computed(() => {
  const email = authStore.user?.email ?? ''
  return email.slice(0, 2).toUpperCase()
})

onMounted(() => {
  if (authStore.user?.id) {
    decksStore.fetchDecks(authStore.user.id)
    loadDeckTrends()
  }
})

function scoreFromRow(row) {
  if (row.correct_percent !== null && row.correct_percent !== undefined) return row.correct_percent
  if (row.accuracy_percent !== null && row.accuracy_percent !== undefined)
    return row.accuracy_percent
  if (row.review_count) {
    return Math.round((row.correct_count / row.review_count) * 100)
  }
  return 0
}

async function loadDeckTrends() {
  if (!authStore.user?.id) return
  const { data } = await supabase
    .from('study_sessions')
    .select('deck_id,correct_percent,accuracy_percent,correct_count,review_count,ended_at')
    .eq('user_id', authStore.user.id)
    .not('ended_at', 'is', null)
    .order('ended_at', { ascending: false })
    .limit(300)

  const trendMap = {}
  const latestMap = {}
  for (const row of data ?? []) {
    const score = scoreFromRow(row)
    if (!trendMap[row.deck_id]) trendMap[row.deck_id] = []
    if (trendMap[row.deck_id].length < 20) {
      trendMap[row.deck_id].push({
        value: score,
        label: new Date(row.ended_at).toLocaleDateString(),
      })
    }
    if (latestMap[row.deck_id] === undefined) {
      latestMap[row.deck_id] = score
    }
  }

  const normalizedTrends = {}
  for (const [deckId, points] of Object.entries(trendMap)) {
    normalizedTrends[deckId] = points.slice().reverse()
  }

  deckTrends.value = normalizedTrends
  lastScores.value = latestMap
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
        <Card v-for="deck in decksStore.decks" :key="deck.id" class="flex flex-col gap-6">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-display font-semibold">{{ deck.title }}</h3>
            <Badge>{{ deck.visibility }}</Badge>
          </div>
          <p v-if="deck.description" class="text-sm text-foreground/70">
            {{ deck.description }}
          </p>
          <div class="flex items-center justify-between gap-6">
            <div class="w-full max-w-xs text-left">
              <Sparkline :points="deckTrends[deck.id] || []" class="text-[#2563eb]" />
            </div>
            <div class="text-sm text-foreground/60 text-right">
              Last score:
              <span class="font-semibold text-foreground">
                {{ lastScores[deck.id] === null || lastScores[deck.id] === undefined ? '—' : `${lastScores[deck.id]}%` }}
              </span>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs uppercase tracking-[0.2em] text-foreground/60">
              Updated {{ new Date(deck.updated_at).toLocaleDateString() }}
            </span>
            <div class="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                @click="router.push({ name: 'deck', params: { id: deck.id } })"
              >
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
