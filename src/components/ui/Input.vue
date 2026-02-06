<script setup>
import { cn } from '@/lib/utils'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  type: {
    type: String,
    default: 'text',
  },
  placeholder: {
    type: String,
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
  <input
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :class="
      cn(
        'h-11 w-full rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30',
        props.class,
      )
    "
    @input="emit('update:modelValue', $event.target.value)"
  />
</template>
