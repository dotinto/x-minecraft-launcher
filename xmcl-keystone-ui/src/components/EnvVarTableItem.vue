<template>
  <v-list-item
    v-if="Object.keys(env).length > 0"
    class="gap-2 grid grid-cols-2"
    dense
  >
    <div
      v-for="(value, key) in env"
      :key="key"
      v-shared-tooltip="value"
      class="flex items-center v-list-item__subtitle"
    >
      <v-icon left>
        key
      </v-icon>
      {{ key }}
      <v-spacer class="mr-4" />
      <span
        class="overflow-hidden text-ellipsis"
      >
        {{ value }}
      </span>
      <v-btn
        v-if="!readonly"
        icon
        color="error"
        @click="emit('delete', key)"
      >
        <v-icon class="material-icons-outlined">
          delete
        </v-icon>
      </v-btn>
    </div>
  </v-list-item>
</template>

<script setup lang="ts">
defineProps<{
  env: Record<string, string>
  readonly?: boolean
}>()
const emit = defineEmits(['delete'])
</script>
