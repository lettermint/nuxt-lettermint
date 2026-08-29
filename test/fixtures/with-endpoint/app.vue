<template>
  <div>
    <h1>With Auto Endpoint Test</h1>
    <button @click="sendEmail">
      Send Email
    </button>
    <div v-if="sending">
      Sending...
    </div>
    <div v-if="error">
      Error: {{ error }}
    </div>
    <div v-if="lastMessageId">
      Message ID: {{ lastMessageId }}
    </div>
    <p>auto-endpoint: {{ config.public.lettermint.autoEndpoint }}</p>
  </div>
</template>

<script setup>
const config = useRuntimeConfig()
const { send, sending, error, lastMessageId } = useLettermint()

async function sendEmail() {
  await send({
    from: 'nuxt@lettermint.dev',
    to: 'ok@testing.lettermint.co',
    subject: 'Test Email',
    html: '<h1>Hello World</h1>',
  })
}
</script>
