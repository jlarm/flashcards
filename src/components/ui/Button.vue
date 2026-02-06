<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
  },
  size: {
    type: String,
    default: 'md',
  },
  class: {
    type: String,
    default: '',
  },
})

const classes = computed(() =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-display text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
    props.variant === 'primary' &&
      'bg-foreground text-background hover:bg-foreground/90 shadow-soft',
    props.variant === 'secondary' && 'bg-muted text-foreground hover:bg-muted/80',
    props.variant === 'ghost' && 'bg-transparent text-foreground hover:bg-muted/60',
    props.size === 'sm' && 'h-9 px-4',
    props.size === 'md' && 'h-11 px-6',
    props.size === 'lg' && 'h-12 px-8 text-base',
    props.class,
  ),
)
</script>

<template>
  <button :class="classes">
    <slot />
  </button>
</template>
