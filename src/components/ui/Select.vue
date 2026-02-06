<script setup>
import { cn } from '@/lib/utils'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  class: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="relative">
    <select
      :value="modelValue"
      :class="
        cn(
          'h-11 w-full appearance-none rounded-xl border border-border bg-card px-4 pr-10 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30',
          props.class,
        )
      "
      @change="emit('update:modelValue', $event.target.value)"
    >
      <slot />
    </select>
    <span class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-foreground/70">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-4 w-4"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </span>
  </div>
</template>
