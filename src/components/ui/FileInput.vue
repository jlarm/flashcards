<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  label: {
    type: String,
    default: 'Choose file',
  },
  accept: {
    type: String,
    default: '',
  },
  class: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['change'])

const wrapperClass = computed(() =>
  cn(
    'flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm',
    props.class,
  ),
)

function onChange(event) {
  emit('change', event)
}
</script>

<template>
  <label :class="wrapperClass">
    <span>{{ label }}</span>
    <span class="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide">
      Browse
    </span>
    <input class="sr-only" type="file" :accept="accept" @change="onChange" />
  </label>
</template>
