<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  authStore.init()
})
</script>

<template>
  <div
    class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(31,111,235,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(28,26,22,0.08),_transparent_60%)]"
  >
    <router-view />
  </div>
</template>
