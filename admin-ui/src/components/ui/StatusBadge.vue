<script setup>
defineProps({ status: String })

const map = {
  pending:   { label: 'En attente',   cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  confirmed: { label: 'Confirmé',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  preparing: { label: 'En prépa.',    cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  ready:     { label: 'Prêt',         cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  delivered: { label: 'Livré',        cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  cancelled: { label: 'Annulé',       cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  available: { label: 'Disponible',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  unavailable:{ label: 'Épuisé',      cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}
</script>

<template>
  <span class="badge" :class="map[status]?.cls || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'">
    {{ map[status]?.label || status }}
  </span>
</template>
