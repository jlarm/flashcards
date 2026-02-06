<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { parseCsv, normalizeCardRows } from '@/lib/csv'
import { useAuthStore } from '@/stores/auth'
import { useDecksStore } from '@/stores/decks'
import { useCardsStore } from '@/stores/cards'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import FileInput from '@/components/ui/FileInput.vue'
import Select from '@/components/ui/Select.vue'
import LineChart from '@/components/ui/LineChart.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const decksStore = useDecksStore()
const cardsStore = useCardsStore()

const deck = ref(null)
const deckError = ref('')
const isLoadingDeck = ref(false)
const isSavingDeck = ref(false)
const sessionScores = ref([])
const weakCards = ref([])

const deckTitle = ref('')
const deckDescription = ref('')
const deckVisibility = ref('private')

const front = ref('')
const back = ref('')
const hint = ref('')
const editingCardId = ref(null)
const editingFront = ref('')
const editingBack = ref('')
const editingHint = ref('')
const importPreview = ref([])
const importError = ref('')
const isImporting = ref(false)

const deckId = computed(() => route.params.id)

async function loadDeck() {
  if (!deckId.value) return
  isLoadingDeck.value = true
  deckError.value = ''
  const { data, error } = await supabase.from('decks').select('*').eq('id', deckId.value).single()
  if (error) {
    deckError.value = error.message
  } else {
    deck.value = data
    deckTitle.value = data.title
    deckDescription.value = data.description ?? ''
    deckVisibility.value = data.visibility ?? 'private'
  }
  isLoadingDeck.value = false
}

async function loadCards() {
  if (!deckId.value) return
  await cardsStore.fetchCards(deckId.value)
}

async function loadSessionHistory() {
  if (!deckId.value || !authStore.user?.id) return
  const { data } = await supabase
    .from('study_sessions')
    .select('correct_percent,accuracy_percent,correct_count,review_count,ended_at')
    .eq('deck_id', deckId.value)
    .eq('user_id', authStore.user.id)
    .not('ended_at', 'is', null)
    .order('ended_at', { ascending: true })
    .limit(20)
  sessionScores.value = (data ?? []).map((row) => {
    if (row.correct_percent !== null && row.correct_percent !== undefined) return row.correct_percent
    if (row.accuracy_percent !== null && row.accuracy_percent !== undefined)
      return row.accuracy_percent
    if (row.review_count) {
      return Math.round((row.correct_count / row.review_count) * 100)
    }
    return 0
  })
}

async function loadWeakCards() {
  if (!deckId.value || !authStore.user?.id) return
  const { data } = await supabase
    .from('review_logs')
    .select('card_id,rating,cards ( front, back )')
    .eq('deck_id', deckId.value)
    .eq('user_id', authStore.user.id)
    .order('reviewed_at', { ascending: false })
    .limit(500)

  const map = new Map()
  for (const row of data ?? []) {
    if (row.rating === null || row.rating === undefined) continue
    const key = row.card_id
    const entry = map.get(key) ?? {
      id: row.card_id,
      front: row.cards?.front ?? '',
      back: row.cards?.back ?? '',
      wrong: 0,
      total: 0,
    }
    entry.total += 1
    if (row.rating < 2) entry.wrong += 1
    map.set(key, entry)
  }

  weakCards.value = Array.from(map.values())
    .filter((item) => item.total > 0)
    .sort((a, b) => b.wrong - a.wrong)
    .slice(0, 10)
}

onMounted(async () => {
  await loadDeck()
  await loadCards()
  await loadSessionHistory()
  await loadWeakCards()
})

watch(deckId, async () => {
  await loadDeck()
  await loadCards()
  await loadSessionHistory()
  await loadWeakCards()
})

async function addCard() {
  if (!front.value.trim() || !back.value.trim() || !deckId.value) return
  await cardsStore.createCard({
    deck_id: deckId.value,
    front: front.value.trim(),
    back: back.value.trim(),
    hint: hint.value.trim() || null,
    position: cardsStore.cards.length + 1,
  })
  front.value = ''
  back.value = ''
  hint.value = ''
}

function startEdit(card) {
  editingCardId.value = card.id
  editingFront.value = card.front
  editingBack.value = card.back
  editingHint.value = card.hint ?? ''
}

function cancelEdit() {
  editingCardId.value = null
  editingFront.value = ''
  editingBack.value = ''
  editingHint.value = ''
}

async function saveEdit(card) {
  if (!editingFront.value.trim() || !editingBack.value.trim()) return
  const updated = await cardsStore.updateCard(card.id, {
    front: editingFront.value.trim(),
    back: editingBack.value.trim(),
    hint: editingHint.value.trim() || null,
  })
  if (updated) {
    cancelEdit()
  }
}

async function removeCard(card) {
  const ok = window.confirm('Delete this card? This cannot be undone.')
  if (!ok) return
  await cardsStore.deleteCard(card.id)
}

async function handleFileChange(event) {
  importError.value = ''
  const file = event.target.files?.[0]
  if (!file) return
  const text = await file.text()
  const rows = parseCsv(text)
  importPreview.value = normalizeCardRows(rows)
  if (!importPreview.value.length) {
    importError.value = 'No valid rows found. Ensure columns include front and back.'
  }
}

async function importCards() {
  if (!deckId.value || !importPreview.value.length) return
  isImporting.value = true
  importError.value = ''
  const payload = importPreview.value.map((row, index) => ({
    deck_id: deckId.value,
    front: row.front,
    back: row.back,
    hint: row.hint,
    extra: row.extra,
    position: cardsStore.cards.length + index + 1,
  }))
  const result = await cardsStore.bulkCreateCards(payload)
  if (!result) {
    importError.value = cardsStore.error || 'Import failed.'
  } else {
    importPreview.value = []
  }
  isImporting.value = false
}

function goToStudy() {
  router.push({ name: 'study', params: { id: deckId.value } })
}

async function saveDeckDetails() {
  if (!deckId.value || !deckTitle.value.trim()) return
  isSavingDeck.value = true
  const updated = await decksStore.updateDeck(deckId.value, {
    title: deckTitle.value.trim(),
    description: deckDescription.value.trim() || null,
    visibility: deckVisibility.value,
  })
  if (updated) {
    deck.value = updated
  }
  isSavingDeck.value = false
}
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pb-16 pt-8">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-foreground/60">Deck</p>
        <h1 class="text-3xl font-display font-semibold">
          {{ deck?.title || 'Loading deck...' }}
        </h1>
        <p v-if="deck?.description" class="mt-2 text-sm text-foreground/70">
          {{ deck.description }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <Button variant="secondary" @click="goToStudy">Start study</Button>
        <Button variant="ghost" @click="router.push({ name: 'dashboard' })">Back</Button>
      </div>
    </header>

    <div v-if="deckError" class="text-sm text-red-600">{{ deckError }}</div>
    <div v-if="isLoadingDeck" class="text-sm text-foreground/70">Loading deck...</div>

    <section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <h2 class="text-lg font-display font-semibold">Cards</h2>
        <p class="mt-1 text-sm text-foreground/70">
          Total cards: {{ cardsStore.cards.length }}
        </p>
        <div class="mt-6 space-y-4">
          <div
            v-for="(card, index) in cardsStore.cards"
            :key="card.id"
            class="rounded-2xl border border-border bg-background/70 p-4"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-semibold">Front</p>
                <p v-if="editingCardId !== card.id" class="text-sm text-foreground/70">
                  {{ card.front }}
                </p>
                <Input
                  v-else
                  v-model="editingFront"
                  class="mt-2"
                  placeholder="Front"
                />
              </div>
              <Badge variant="default">#{{ index + 1 }}</Badge>
            </div>
            <div class="mt-3">
              <p class="text-sm font-semibold">Back</p>
              <p v-if="editingCardId !== card.id" class="text-sm text-foreground/70">
                {{ card.back }}
              </p>
              <Textarea
                v-else
                v-model="editingBack"
                class="mt-2"
                rows="2"
                placeholder="Back"
              />
            </div>
            <div class="mt-2">
              <p v-if="card.hint && editingCardId !== card.id" class="text-xs text-foreground/60">
                Hint: {{ card.hint }}
              </p>
              <Input
                v-else-if="editingCardId === card.id"
                v-model="editingHint"
                class="mt-2"
                placeholder="Hint (optional)"
              />
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <Button v-if="editingCardId !== card.id" size="sm" @click="startEdit(card)">
                Edit
              </Button>
              <Button
                v-if="editingCardId === card.id"
                size="sm"
                variant="secondary"
                @click="saveEdit(card)"
              >
                Save
              </Button>
              <Button
                v-if="editingCardId === card.id"
                size="sm"
                variant="ghost"
                @click="cancelEdit"
              >
                Cancel
              </Button>
              <Button size="sm" variant="ghost" @click="removeCard(card)">
                Delete
              </Button>
            </div>
          </div>
          <p v-if="!cardsStore.cards.length" class="text-sm text-foreground/60">
            No cards yet. Add your first card or import a CSV.
          </p>
        </div>
      </Card>

      <div class="flex flex-col gap-6">
        <Card>
          <h2 class="text-lg font-display font-semibold">Progress trend</h2>
          <p class="mt-2 text-sm text-foreground/70">
            Accuracy across your last sessions.
          </p>
          <div class="mt-4">
            <LineChart :values="sessionScores" />
          </div>
        </Card>

        <Card>
          <h2 class="text-lg font-display font-semibold">Most missed cards</h2>
          <p class="mt-2 text-sm text-foreground/70">
            Based on your recent answers (wrong to least wrong).
          </p>
          <div class="mt-4 space-y-3 text-sm">
            <div
              v-for="card in weakCards"
              :key="card.id"
              class="rounded-xl border border-border bg-background/70 px-3 py-2"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate font-medium">{{ card.front }}</p>
                  <p class="truncate text-xs text-foreground/60">{{ card.back }}</p>
                </div>
                <span class="text-xs text-foreground/60">
                  {{ card.wrong }} / {{ card.total }} wrong
                </span>
              </div>
            </div>
            <p v-if="!weakCards.length" class="text-sm text-foreground/60">
              No misses recorded yet.
            </p>
          </div>
        </Card>

        <Card>
          <h2 class="text-lg font-display font-semibold">Deck settings</h2>
          <div class="mt-4 space-y-3">
            <Input v-model="deckTitle" placeholder="Deck title" />
            <Textarea v-model="deckDescription" placeholder="Short description (optional)" />
            <Select v-model="deckVisibility">
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </Select>
            <Button class="w-full" :disabled="isSavingDeck" @click="saveDeckDetails">
              {{ isSavingDeck ? 'Saving...' : 'Save deck' }}
            </Button>
          </div>
        </Card>

        <Card>
          <h2 class="text-lg font-display font-semibold">Add a card</h2>
          <div class="mt-4 space-y-3">
            <Input v-model="front" placeholder="Front of card" />
            <Textarea v-model="back" placeholder="Back of card" rows="3" />
            <Input v-model="hint" placeholder="Hint (optional)" />
            <Button class="w-full" @click="addCard">Add card</Button>
          </div>
        </Card>

        <Card>
          <h2 class="text-lg font-display font-semibold">Import CSV</h2>
          <p class="mt-2 text-sm text-foreground/70">
            Columns: front, back, hint (optional), extra (optional JSON).
          </p>
          <div class="mt-4 space-y-4">
            <FileInput label="Upload CSV" accept=".csv" @change="handleFileChange" />
            <Button
              :disabled="isImporting || !importPreview.length"
              class="w-full"
              @click="importCards"
            >
              {{ isImporting ? 'Importing...' : `Import ${importPreview.length} cards` }}
            </Button>
            <p v-if="importError" class="text-sm text-red-600">{{ importError }}</p>
            <div v-if="importPreview.length" class="text-xs text-foreground/60">
              Previewing {{ importPreview.length }} rows. First row:
              <div class="mt-2 rounded-xl border border-border bg-background/70 p-3">
                <p><strong>Front:</strong> {{ importPreview[0].front }}</p>
                <p><strong>Back:</strong> {{ importPreview[0].back }}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  </div>
</template>
