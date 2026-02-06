<script setup>
import { computed, ref } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  points: {
    type: Array,
    default: () => [],
  },
  height: {
    type: Number,
    default: 64,
  },
  class: {
    type: String,
    default: '',
  },
})

const width = 200
const padding = 6
const svgRef = ref(null)
const tooltip = ref({ visible: false, x: 0, y: 0, label: '', value: 0 })

const normalized = computed(() => {
  if (!props.points.length) return []
  const max = 100
  const min = 0
  return props.points.map((point, index) => {
    const x =
      padding +
      (index / Math.max(1, props.points.length - 1)) * (width - padding * 2)
    const clamped = Math.min(max, Math.max(min, point.value))
    const y = padding + ((max - clamped) / (max - min || 1)) * (props.height - padding * 2)
    return { x, y, value: clamped, label: point.label }
  })
})

const points = computed(() => normalized.value.map((point) => `${point.x},${point.y}`).join(' '))

function showTooltip(point, event) {
  const rect = svgRef.value?.getBoundingClientRect()
  if (!rect) return
  tooltip.value = {
    visible: true,
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    label: point.label,
    value: point.value,
  }
}

function hideTooltip() {
  tooltip.value = { visible: false, x: 0, y: 0, label: '', value: 0 }
}
</script>

<template>
  <div :class="cn('relative', props.class)">
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
        <circle :cx="point.x" :cy="point.y" r="3" class="fill-foreground" />
        <rect
          :x="point.x - 8"
          :y="point.y - 8"
          width="16"
          height="16"
          fill="transparent"
          @mousemove="showTooltip(point, $event)"
          @mouseenter="showTooltip(point, $event)"
          @mouseleave="hideTooltip"
        />
      </g>
    </svg>
    <div v-else class="text-xs text-foreground/60">No sessions yet.</div>
    <div
      v-if="tooltip.visible"
      class="pointer-events-none absolute z-10 rounded-lg bg-foreground px-2 py-1 text-xs text-background shadow"
      :style="{ left: `${tooltip.x + 10}px`, top: `${tooltip.y - 28}px` }"
    >
      <div class="font-semibold">{{ tooltip.label }}</div>
      <div>{{ tooltip.value }}%</div>
    </div>
  </div>
</template>
