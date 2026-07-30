<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    modelValue: number
    min?: number
    max?: number
    step?: number
    unit?: string
    /** 显示值格式化 */
    format?: (v: number) => string
    disabled?: boolean
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    unit: '',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const display = computed(() => {
  if (props.format) return props.format(props.modelValue)
  const v = Number.isInteger(props.step) || props.step >= 1
    ? Math.round(props.modelValue)
    : Math.round(props.modelValue * 100) / 100
  return `${v}${props.unit}`
})

function onInput(e: Event) {
  emit('update:modelValue', Number((e.target as HTMLInputElement).value))
}

const pct = computed(() => {
  const span = props.max - props.min
  if (span <= 0) return 0
  return ((props.modelValue - props.min) / span) * 100
})
</script>

<template>
  <label class="slider-field" :class="{ disabled }">
    <div class="slider-field__head">
      <span class="slider-field__label">{{ label }}</span>
      <span class="slider-field__value">{{ display }}</span>
    </div>
    <div class="slider-field__track-wrap">
      <input
        type="range"
        class="slider-field__input"
        :min="min"
        :max="max"
        :step="step"
        :value="modelValue"
        :disabled="disabled"
        :style="{ '--pct': pct + '%' }"
        @input="onInput"
      />
    </div>
    <div class="slider-field__ends">
      <small>{{ min }}{{ unit }}</small>
      <small>{{ max }}{{ unit }}</small>
    </div>
  </label>
</template>

<style scoped>
.slider-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--theme-text-secondary, #475569);
}

.slider-field.disabled {
  opacity: 0.45;
  pointer-events: none;
}

.slider-field__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.slider-field__label {
  font-weight: 500;
}

.slider-field__value {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--theme-primary, #4f46e5);
  background: color-mix(in srgb, var(--theme-primary, #4f46e5) 10%, transparent);
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  min-width: 48px;
  text-align: center;
}

.slider-field__track-wrap {
  position: relative;
  height: 28px;
  display: flex;
  align-items: center;
}

.slider-field__input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    var(--theme-primary, #4f46e5) 0%,
    var(--theme-primary, #4f46e5) var(--pct, 0%),
    var(--theme-border, #e2e8f0) var(--pct, 0%),
    var(--theme-border, #e2e8f0) 100%
  );
  outline: none;
  cursor: pointer;
  margin: 0;
  padding: 0;
}

.slider-field__input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--theme-primary, #4f46e5);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  cursor: grab;
  transition: transform 0.12s;
}

.slider-field__input::-webkit-slider-thumb:active {
  cursor: grabbing;
  transform: scale(1.12);
}

.slider-field__input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--theme-primary, #4f46e5);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  cursor: grab;
}

.slider-field__ends {
  display: flex;
  justify-content: space-between;
  color: var(--theme-text-muted, #94a3b8);
  font-size: 10px;
  margin-top: -2px;
}
</style>
