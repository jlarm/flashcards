<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  class: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:open'])

const containerClasses = computed(() =>
  cn(
    'w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-soft',
    props.class,
  ),
)

function close() {
  emit('update:open', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        class="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        aria-label="Close"
        @click="close"
      />
      <div :class="cn(containerClasses, 'relative z-10')">
        <div class="flex items-start justify-between gap-4">
          <slot name="title" />
          <button
            class="text-sm font-semibold uppercase tracking-wide text-foreground/60 hover:text-foreground"
            @click="close"
          >
            Close
          </button>
        </div>
        <div class="mt-4">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
