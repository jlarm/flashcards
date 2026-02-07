<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Card from '@/components/ui/Card.vue'

const authStore = useAuthStore()
const email = ref('')
const submitted = ref(false)

async function handleSubmit() {
  if (!email.value) return
  const ok = await authStore.signInWithEmail(email.value)
  submitted.value = ok
}
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-6xl flex-col px-6 pb-16 pt-10">
    <header class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div
          class="h-10 w-10 rounded-2xl bg-foreground text-background grid place-items-center font-display"
        >
          FX
        </div>
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-foreground/70">Flux Cards</p>
          <p class="text-lg font-display font-semibold">Focus faster. Remember longer.</p>
        </div>
      </div>
    </header>

    <main class="mt-12 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <section class="space-y-6">
        <h1 class="text-4xl font-display font-semibold leading-tight">
          A clean, collaborative flashcard workspace powered by Supabase.
        </h1>
        <p class="text-lg text-foreground/70">
          Create decks, track progress, import CSV batches, and keep your study rhythm tight with a
          focused workflow.
        </p>
        <div class="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 class="text-lg font-display font-semibold">Deck Studio</h3>
            <p class="mt-2 text-sm text-foreground/70">
              Spin up decks, reorder cards, and manage visibility with a single click.
            </p>
          </Card>
          <Card>
            <h3 class="text-lg font-display font-semibold">Study Flow</h3>
            <p class="mt-2 text-sm text-foreground/70">
              Review, mark difficulty, and let the spaced-repetition engine do the rest.
            </p>
          </Card>
        </div>
      </section>

      <Card class="self-start">
        <h2 class="text-2xl font-display font-semibold">Sign in to your workspace</h2>
        <p class="mt-2 text-sm text-foreground/70">
          We use magic links. You will receive a secure login email.
        </p>
        <div class="mt-6 space-y-4">
          <Input v-model="email" type="email" placeholder="you@company.com" />
          <Button class="w-full" @click="handleSubmit">Send magic link</Button>
          <p v-if="authStore.error" class="text-sm text-red-600">{{ authStore.error }}</p>
          <p v-if="submitted" class="text-sm text-foreground/70">
            Check your inbox and follow the link to finish signing in.
          </p>
        </div>
      </Card>
    </main>
  </div>
</template>
