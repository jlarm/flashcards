<script setup>
import { cn } from '@/lib/utils'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
  },
  class: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <span
    :class="
      cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
        props.variant === 'default' && 'bg-muted text-foreground',
        props.variant === 'accent' && 'bg-foreground text-background',
        props.class,
      )
    "
  >
    <slot />
  </span>
</template>
