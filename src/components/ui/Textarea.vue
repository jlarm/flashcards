<script setup>
import { nextTick, ref, watch } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  rows: {
    type: Number,
    default: 4,
  },
  class: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const textareaRef = ref(null)

function resize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

watch(
  () => props.modelValue,
  async () => {
    await nextTick()
    resize()
  },
  { immediate: true },
)
</script>

<template>
  <textarea
    ref="textareaRef"
    :rows="rows"
    :value="modelValue"
    :placeholder="placeholder"
    :class="
      cn(
        'w-full resize-none overflow-hidden rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30',
        props.class,
      )
    "
    @input="(event) => { emit('update:modelValue', event.target.value); resize() }"
  />
</template>
