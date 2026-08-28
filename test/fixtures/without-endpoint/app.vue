<template>
  <div>
    <h1>Without Auto Endpoint Test</h1>
    <p>Auto endpoint is disabled. Custom endpoints can be used.</p>
    <p>auto-endpoint: {{ config.public.lettermint.autoEndpoint }}</p>
  </div>
</template>

<script setup>
const config = useRuntimeConfig()
</script>
