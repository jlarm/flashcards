<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Select from '@/components/ui/Select.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const deck = ref(null)
const queue = ref([])
const allCards = ref([])
const currentIndex = ref(0)
const showBack = ref(false)
const isLoading = ref(false)
const error = ref('')
const studyMode = ref('front')
const sessionId = ref(null)
const sessionStartedAt = ref(null)
const sessionTotals = ref({ total: 0, correct: 0, avgMs: 0 })
const responseTimes = ref([])
const cardInsights = ref({})
const shownAtMap = ref({})
const guess = ref('')
const guessChecked = ref(false)
const guessCorrect = ref(false)
const choices = ref([])
const selectedOption = ref('')
const sessionComplete = ref(false)
const finalStats = ref({ accuracy: 0, wrong: 0 })
const answeredMap = ref({})
const showResults = ref(false)
const sessionResults = ref([])

const currentCard = computed(() => queue.value[currentIndex.value])
const canGoPrev = computed(() => currentIndex.value > 0)
const canGoNext = computed(() => currentIndex.value < queue.value.length - 1)
const promptText = computed(() => {
  if (!currentCard.value) return ''
  return studyMode.value === 'front' ? currentCard.value.front : currentCard.value.back
})
const answerText = computed(() => {
  if (!currentCard.value) return ''
  return studyMode.value === 'front' ? currentCard.value.back : currentCard.value.front
})

const sessionAccuracy = computed(() => {
  if (!sessionTotals.value.total) return 0
  return Math.round((sessionTotals.value.correct / sessionTotals.value.total) * 100)
})

const sessionAvgMs = computed(() => {
  if (!responseTimes.value.length) return 0
  const sum = responseTimes.value.reduce((acc, ms) => acc + ms, 0)
  return Math.round(sum / responseTimes.value.length)
})

onMounted(async () => {
  await loadStudyQueue()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  endSession()
})

async function loadStudyQueue() {
  if (!route.params.id || !authStore.user?.id) return
  isLoading.value = true
  error.value = ''
  await startSession()
  const { data: deckData, error: deckError } = await supabase
    .from('decks')
    .select('*')
    .eq('id', route.params.id)
    .single()
  if (deckError) {
    error.value = deckError.message
    isLoading.value = false
    return
  }
  deck.value = deckData

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', route.params.id)
    .order('position', { ascending: true })
  if (cardsError) {
    error.value = cardsError.message
    isLoading.value = false
    return
  }
  allCards.value = cards ?? []

  const { data: reviews } = await supabase
    .from('card_reviews')
    .select('*')
    .eq('user_id', authStore.user.id)
    .in(
      'card_id',
      (cards ?? []).map((card) => card.id),
    )

  const reviewMap = new Map((reviews ?? []).map((review) => [review.card_id, review]))
  const now = new Date()
  queue.value = (cards ?? []).map((card) => {
    const review = reviewMap.get(card.id)
    return {
      ...card,
      review,
      dueAt: review?.due_at ? new Date(review.due_at) : now,
    }
  })

  currentIndex.value = 0
  showBack.value = false
  guess.value = ''
  guessChecked.value = false
  guessCorrect.value = false
  answeredMap.value = {}
  sessionComplete.value = false
  showResults.value = false
  sessionResults.value = []
  buildChoices()
  isLoading.value = false
}

watch(
  () => currentCard.value?.id,
  async (cardId) => {
    if (!cardId || !sessionId.value) return
    if (!shownAtMap.value[cardId]) {
      const shownAt = new Date().toISOString()
      shownAtMap.value[cardId] = shownAt
      await supabase.from('study_session_cards').upsert(
        {
          study_session_id: sessionId.value,
          card_id: cardId,
          shown_at: shownAt,
        },
        { onConflict: 'study_session_id,card_id' },
      )
    }
  },
  { immediate: true },
)

watch(
  [() => currentCard.value?.id, studyMode],
  () => {
    buildChoices()
  },
  { immediate: true },
)

async function startSession() {
  if (!authStore.user?.id || !route.params.id) return
  sessionStartedAt.value = new Date().toISOString()
  const { data, error: sessionError } = await supabase
    .from('study_sessions')
    .insert({
      user_id: authStore.user.id,
      deck_id: route.params.id,
      started_at: sessionStartedAt.value,
    })
    .select()
    .single()
  if (sessionError) {
    error.value = sessionError.message
    return
  }
  sessionId.value = data.id
  sessionTotals.value = { total: 0, correct: 0, avgMs: 0 }
  responseTimes.value = []
  shownAtMap.value = {}
  await loadCardInsights()
}

async function endSession() {
  if (!sessionId.value) return
  const { error: updateError } = await supabase
    .from('study_sessions')
    .update({
      ended_at: new Date().toISOString(),
      review_count: sessionTotals.value.total,
      correct_count: sessionTotals.value.correct,
      wrong_count: Math.max(0, sessionTotals.value.total - sessionTotals.value.correct),
      avg_response_ms: sessionAvgMs.value,
      accuracy_percent: sessionAccuracy.value,
      correct_percent: sessionAccuracy.value,
      wrong_percent: Math.max(0, 100 - sessionAccuracy.value),
    })
    .eq('id', sessionId.value)
  if (updateError) {
    error.value = updateError.message
  }
}

async function loadCardInsights() {
  if (!authStore.user?.id || !route.params.id) return
  const { data } = await supabase
    .from('review_logs')
    .select('card_id,rating,reviewed_at')
    .eq('user_id', authStore.user.id)
    .eq('deck_id', route.params.id)
    .order('reviewed_at', { ascending: false })
    .limit(200)

  const map = {}
  for (const log of data ?? []) {
    if (!map[log.card_id]) {
      map[log.card_id] = { last: log.rating, prev: null }
    } else if (map[log.card_id].prev === null) {
      map[log.card_id].prev = log.rating
    }
  }

  for (const [cardId, entry] of Object.entries(map)) {
    map[cardId].delta =
      entry.prev === null || entry.prev === undefined ? null : entry.last - entry.prev
  }
  cardInsights.value = map
}

function computeNextReview(review, rating) {
  const base = review ?? {
    ease: 2.5,
    interval_days: 0,
    state: 'new',
    lapses: 0,
    correct_streak: 0,
    total_reviews: 0,
  }
  let ease = Number(base.ease ?? 2.5)
  let interval = Number(base.interval_days ?? 0)

  if (rating === 0) {
    ease = Math.max(1.3, ease - 0.2)
    interval = 1
  } else if (rating === 1) {
    ease = Math.max(1.3, ease - 0.1)
    interval = Math.max(1, interval || 1)
  } else if (rating === 2) {
    interval = Math.max(1, Math.round((interval || 1) * ease))
  } else {
    interval = Math.max(2, Math.round((interval || 2) * ease * 1.3))
  }

  return {
    ease,
    interval_days: interval,
    due_at: new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString(),
  }
}

async function rateCard(rating, { advance = true } = {}) {
  if (!currentCard.value || !authStore.user?.id) return
  const card = currentCard.value
  const review = card.review
  const next = computeNextReview(review, rating)
  const previousRating = cardInsights.value[card.id]?.last ?? null
  const shownAt = shownAtMap.value[card.id]
  const responseMs = shownAt ? Math.max(0, Date.now() - new Date(shownAt).getTime()) : null
  const payload = {
    user_id: authStore.user.id,
    card_id: card.id,
    state: rating === 0 ? 'relearning' : 'review',
    ease: next.ease,
    interval_days: next.interval_days,
    due_at: next.due_at,
    last_reviewed_at: new Date().toISOString(),
    lapses: (review?.lapses ?? 0) + (rating === 0 ? 1 : 0),
    correct_streak: rating >= 2 ? (review?.correct_streak ?? 0) + 1 : 0,
    total_reviews: (review?.total_reviews ?? 0) + 1,
  }

  sessionTotals.value.total += 1
  if (rating >= 2) sessionTotals.value.correct += 1
  if (responseMs !== null) responseTimes.value.push(responseMs)
  cardInsights.value[card.id] = {
    last: rating,
    prev: cardInsights.value[card.id]?.last ?? null,
    delta:
      cardInsights.value[card.id]?.last !== undefined
        ? rating - (cardInsights.value[card.id]?.last ?? 0)
        : null,
    total: (cardInsights.value[card.id]?.total ?? 0) + 1,
    correct: (cardInsights.value[card.id]?.correct ?? 0) + (rating >= 2 ? 1 : 0),
  }

  await supabase.from('card_reviews').upsert(payload, { onConflict: 'user_id,card_id' })
  await supabase.from('review_logs').insert({
    user_id: authStore.user.id,
    deck_id: deck.value?.id,
    card_id: card.id,
    rating,
    response_ms: responseMs,
    reviewed_at: new Date().toISOString(),
  })
  await supabase.from('card_stats').upsert(
    {
      user_id: authStore.user.id,
      card_id: card.id,
      deck_id: deck.value?.id,
      last_rating: rating,
      previous_rating: previousRating,
      delta_rating:
        previousRating === null || previousRating === undefined ? null : rating - previousRating,
      last_response_ms: responseMs,
      total_reviews: (cardInsights.value[card.id]?.total ?? 0) + 1,
      correct_reviews:
        (cardInsights.value[card.id]?.correct ?? 0) + (rating >= 2 ? 1 : 0),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,card_id' },
  )
  if (sessionId.value) {
    await supabase
      .from('study_session_cards')
      .update({
        answered_at: new Date().toISOString(),
        rating,
        response_ms: responseMs,
      })
      .eq('study_session_id', sessionId.value)
      .eq('card_id', card.id)
  }

  if (!advance) return

  if (currentIndex.value < queue.value.length - 1) {
    currentIndex.value += 1
    showBack.value = false
    guess.value = ''
    guessChecked.value = false
    guessCorrect.value = false
    selectedOption.value = ''
    buildChoices()
  } else {
    await finalizeSession()
  }

  if (sessionId.value) {
    await supabase
      .from('study_sessions')
      .update({
        review_count: sessionTotals.value.total,
        correct_count: sessionTotals.value.correct,
        wrong_count: Math.max(0, sessionTotals.value.total - sessionTotals.value.correct),
        avg_response_ms: sessionAvgMs.value,
        accuracy_percent: sessionAccuracy.value,
        correct_percent: sessionAccuracy.value,
        wrong_percent: Math.max(0, 100 - sessionAccuracy.value),
      })
      .eq('id', sessionId.value)
  }
}

function goPrev() {
  if (!canGoPrev.value) return
  currentIndex.value -= 1
  showBack.value = false
  guess.value = ''
  guessChecked.value = false
  guessCorrect.value = false
  selectedOption.value = ''
  buildChoices()
}

async function goNext() {
  if (!guessChecked.value) return
  if (canGoNext.value) {
    currentIndex.value += 1
    showBack.value = false
    guess.value = ''
    guessChecked.value = false
    guessCorrect.value = false
    selectedOption.value = ''
    buildChoices()
  } else {
    await finalizeSession()
  }
}

function handleKeydown(event) {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    goPrev()
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    goNext()
  }
}

async function restartSession() {
  sessionComplete.value = false
  await loadStudyQueue()
}

function normalizeAnswer(value) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function checkGuess() {
  const raw = answerText.value || ''
  const variants = raw
    .split(/[|;]/g)
    .map((item) => normalizeAnswer(item))
    .filter(Boolean)
  const guessValue = normalizeAnswer(guess.value)
  if (!guessValue) return
  guessCorrect.value = variants.length ? variants.includes(guessValue) : false
  guessChecked.value = true
}

function buildChoices() {
  if (!currentCard.value) {
    choices.value = []
    return
  }
  const correct = answerText.value
  const pool = allCards.value
    .filter((card) => card.id !== currentCard.value.id)
    .map((card) => (studyMode.value === 'front' ? card.back : card.front))
    .filter(Boolean)

  const unique = Array.from(new Set(pool))
  const selected = []
  while (selected.length < 3 && unique.length) {
    const index = Math.floor(Math.random() * unique.length)
    selected.push(unique.splice(index, 1)[0])
  }
  const options = [correct, ...selected].filter(Boolean)
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  choices.value = options
}

async function chooseOption(option) {
  if (guessChecked.value || !currentCard.value) return
  guess.value = option
  selectedOption.value = option
  currentCard.value.userChoice = option
  checkGuess()
  if (answeredMap.value[currentCard.value.id]) return
  answeredMap.value[currentCard.value.id] = true
  const autoRating = guessCorrect.value ? 3 : 1
  await rateCard(autoRating, { advance: false })
  if (!canGoNext.value) {
    await finalizeSession()
  }
}

async function finalizeSession() {
  await endSession()
  finalStats.value = {
    accuracy: sessionAccuracy.value,
    wrong: Math.max(0, 100 - sessionAccuracy.value),
  }
  sessionResults.value = queue.value.map((card) => ({
    id: card.id,
    prompt: studyMode.value === 'front' ? card.front : card.back,
    answer: studyMode.value === 'front' ? card.back : card.front,
    selected: card.userChoice ?? null,
    correct: card.userChoice
      ? normalizeAnswer(card.userChoice) ===
        normalizeAnswer(studyMode.value === 'front' ? card.back : card.front)
      : false,
  }))
  showResults.value = false
  sessionComplete.value = true
}
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-4xl flex-col px-6 pb-16 pt-8">
    <header class="flex items-center justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-foreground/60">Study session</p>
        <h1 class="text-3xl font-display font-semibold">{{ deck?.title || 'Study deck' }}</h1>
      </div>
      <div class="flex items-center gap-3">
        <Select v-model="studyMode" class="w-44">
          <option value="front">Guess back</option>
          <option value="back">Guess front</option>
        </Select>
        <Button variant="ghost" @click="router.push({ name: 'deck', params: { id: route.params.id } })">
          Back to deck
        </Button>
      </div>
    </header>

    <div v-if="error" class="mt-6 text-sm text-red-600">{{ error }}</div>
    <div v-if="isLoading" class="mt-6 text-sm text-foreground/70">Preparing session...</div>

    <section v-if="currentCard && !sessionComplete" class="mt-10 space-y-6">
      <Card class="text-center">
        <div class="flex items-center justify-between">
          <Badge variant="default">
            Card {{ currentIndex + 1 }} / {{ queue.length }}
          </Badge>
          <Badge variant="accent">
            {{ showBack ? 'Answer' : studyMode === 'front' ? 'Front' : 'Back' }}
          </Badge>
        </div>
        <div class="mt-8 text-2xl font-display font-semibold">
          {{ promptText }}
        </div>
        <p v-if="currentCard.hint && !showBack && studyMode === 'front'" class="mt-4 text-sm text-foreground/60">
          Hint: {{ currentCard.hint }}
        </p>
        <div class="mt-6 space-y-3">
          <div class="grid gap-3">
            <Button
              v-for="option in choices"
              :key="option"
              variant="secondary"
              :disabled="guessChecked"
              :class="[
                'w-full justify-start',
                guessChecked && option === answerText && 'border-2 border-emerald-500 bg-emerald-500/10',
                guessChecked && option === selectedOption && option !== answerText && 'border-2 border-red-500 bg-red-500/10',
              ]"
              @click="chooseOption(option)"
            >
              {{ option }}
            </Button>
          </div>
          <p v-if="!choices.length" class="text-sm text-foreground/60">
            Add more cards to generate multiple choice options.
          </p>
          <p v-if="guessChecked" class="text-sm text-foreground/60">
            Correct answer: <span class="font-semibold text-foreground">{{ answerText }}</span>
          </p>
        </div>
        <div class="mt-10 flex flex-col items-center gap-3">
          <div class="flex flex-wrap justify-center gap-3">
            <Button variant="ghost" :disabled="!canGoPrev" @click="goPrev">
              Prev
            </Button>
            <Button variant="ghost" :disabled="!guessChecked" @click="goNext">
              Next
            </Button>
          </div>
        </div>
      </Card>

    </section>

    <section v-else-if="sessionComplete" class="mt-10">
      <Card class="text-center">
        <h2 class="text-2xl font-display font-semibold">Session complete</h2>
        <p class="mt-2 text-sm text-foreground/70">Here’s how you did.</p>
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <div class="rounded-2xl border border-border bg-background/70 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-foreground/60">Correct</p>
            <p class="mt-2 text-3xl font-display font-semibold text-emerald-600">
              {{ finalStats.accuracy }}%
            </p>
          </div>
          <div class="rounded-2xl border border-border bg-background/70 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-foreground/60">Incorrect</p>
            <p class="mt-2 text-3xl font-display font-semibold text-red-600">
              {{ finalStats.wrong }}%
            </p>
          </div>
        </div>
        <div class="mt-6 flex justify-center gap-3">
          <Button variant="ghost" @click="showResults = !showResults">
            {{ showResults ? 'Hide questions' : 'View questions' }}
          </Button>
          <Button variant="secondary" @click="restartSession">Review again</Button>
          <Button variant="ghost" @click="router.push({ name: 'deck', params: { id: route.params.id } })">
            Back to deck
          </Button>
        </div>
        <div v-if="showResults" class="mt-6 space-y-3 text-left">
          <div
            v-for="result in sessionResults"
            :key="result.id"
            class="rounded-2xl border border-border bg-background/70 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.2em] text-foreground/60">Prompt</p>
                <p class="text-sm font-semibold text-foreground">{{ result.prompt }}</p>
              </div>
              <span
                class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                :class="result.correct ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'"
              >
                {{ result.correct ? 'Correct' : 'Wrong' }}
              </span>
            </div>
            <div class="mt-3 text-sm text-foreground/70">
              <p>
                <span class="font-semibold text-foreground">Your answer:</span>
                {{ result.selected || '—' }}
              </p>
              <p class="mt-1">
                <span class="font-semibold text-foreground">Correct answer:</span>
                {{ result.answer }}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </section>

    <section v-else-if="!isLoading" class="mt-10">
      <Card class="text-center">
        <h2 class="text-xl font-display font-semibold">All caught up</h2>
        <p class="mt-2 text-sm text-foreground/70">No due cards right now.</p>
        <Button class="mt-6" @click="router.push({ name: 'deck', params: { id: route.params.id } })">
          Return to deck
        </Button>
      </Card>
    </section>
  </div>
</template>
