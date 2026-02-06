<script setup>
import { useRouter } from 'vue-router'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'

const router = useRouter()
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-2xl items-center px-6">
    <Card class="w-full text-center">
      <h1 class="text-2xl font-display font-semibold">Page not found</h1>
      <p class="mt-2 text-sm text-foreground/70">The page you are looking for does not exist.</p>
      <Button class="mt-6" @click="router.push({ name: 'dashboard' })">Back home</Button>
    </Card>
  </div>
</template>
