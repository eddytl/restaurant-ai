<script setup>
import { useThemeStore } from '@/stores/theme'
const theme = useThemeStore()
theme.init()
</script>

<template>
  <RouterView />
</template>
