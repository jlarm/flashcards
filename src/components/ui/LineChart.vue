<script setup>
import { computed, ref } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  values: {
    type: Array,
    default: () => [],
  },
  height: {
    type: Number,
    default: 140,
  },
  class: {
    type: String,
    default: '',
  },
})

const width = 320
const padding = 16

const lastValue = computed(() => {
  if (!props.values.length) return null
  return props.values[props.values.length - 1]
})

const normalized = computed(() => {
  if (!props.values.length) return []
  const max = 100
  const min = 0
  return props.values.map((value, index) => {
    const x =
      padding +
      (index / Math.max(1, props.values.length - 1)) * (width - padding * 2)
    const clamped = Math.min(max, Math.max(min, value))
    const y =
      padding + ((max - clamped) / (max - min || 1)) * (props.height - padding * 2)
    return { x, y, value: clamped }
  })
})

const points = computed(() => normalized.value.map((point) => `${point.x},${point.y}`).join(' '))
const svgRef = ref(null)
const tooltip = ref({ visible: false, x: 0, y: 0, value: 0 })

function showTooltip(point, event) {
  const rect = svgRef.value?.getBoundingClientRect()
  if (!rect) return
  tooltip.value = {
    visible: true,
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    value: point.value,
  }
}

function hideTooltip() {
  tooltip.value = { visible: false, x: 0, y: 0, value: 0 }
}
</script>

<template>
  <div :class="cn('w-full relative', props.class)">
    <div class="grid grid-cols-[auto_1fr] gap-3">
      <div class="flex flex-col items-end justify-between text-xs text-foreground/60">
        <span class="leading-none">100%</span>
        <span class="leading-none">0%</span>
      </div>
      <div>
        <svg
          v-if="normalized.length"
          :viewBox="`0 0 ${width} ${height}`"
          :height="height"
          class="w-full"
          ref="svgRef"
          @mouseleave="hideTooltip"
        >
          <polyline
            :points="points"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="text-foreground"
          />
      <g v-for="point in normalized" :key="`${point.x}-${point.y}`">
        <circle
          :cx="point.x"
          :cy="point.y"
          r="4"
          class="fill-foreground"
        />
        <rect
          :x="point.x - 10"
          :y="point.y - 10"
          width="20"
          height="20"
          fill="transparent"
          @mousemove="showTooltip(point, $event)"
          @mouseenter="showTooltip(point, $event)"
          @mouseleave="hideTooltip"
        >
        </rect>
      </g>
    </svg>
        <div v-else class="text-sm text-foreground/60">No sessions yet.</div>
      </div>
    </div>
    <div v-if="lastValue !== null" class="mt-3 text-xs text-foreground/60">
      Latest score: <span class="font-semibold text-foreground">{{ lastValue }}%</span>
    </div>
    <div
      v-if="tooltip.visible"
      class="pointer-events-none absolute z-10 rounded-lg bg-foreground px-2 py-1 text-xs text-background shadow"
      :style="{ left: `${tooltip.x + 12}px`, top: `${tooltip.y - 12}px` }"
    >
      {{ tooltip.value }}%
    </div>
  </div>
</template>
