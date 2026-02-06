<script setup>
import { cn } from '@/lib/utils'

const props = defineProps({
  class: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div :class="cn('rounded-2xl border border-border bg-card p-6 shadow-soft', props.class)">
    <slot />
  </div>
</template>
