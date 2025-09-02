<template>
  <div class="container">
    <h1>Nuxt Lettermint Module Playground</h1>

    <div class="demo-section">
      <h2>Send Email Demo</h2>

      <form
        class="email-form"
        @submit.prevent="sendTestEmail"
      >
        <div class="form-group">
          <label for="from">From:</label>
          <input
            id="from"
            v-model="emailForm.from"
            type="email"
            placeholder="sender@example.com"
            required
          >
        </div>

        <div class="form-group">
          <label for="to">To:</label>
          <input
            id="to"
            v-model="emailForm.to"
            type="email"
            placeholder="recipient@example.com"
            required
          >
        </div>

        <div class="form-group">
          <label for="subject">Subject:</label>
          <input
            id="subject"
            v-model="emailForm.subject"
            type="text"
            placeholder="Test Email from Nuxt Lettermint"
            required
          >
        </div>

        <div class="form-group">
          <label for="emailType">Email Type:</label>
          <select
            id="emailType"
            v-model="emailType"
          >
            <option value="text">
              Plain Text
            </option>
            <option value="html">
              HTML
            </option>
            <option value="both">
              Both
            </option>
          </select>
        </div>

        <div
          v-if="emailType === 'text' || emailType === 'both'"
          class="form-group"
        >
          <label for="text">Text Content:</label>
          <textarea
            id="text"
            v-model="emailForm.text"
            rows="5"
            placeholder="Plain text email content..."
          />
        </div>

        <div
          v-if="emailType === 'html' || emailType === 'both'"
          class="form-group"
        >
          <label for="html">HTML Content:</label>
          <textarea
            id="html"
            v-model="emailForm.html"
            rows="5"
            placeholder="<h1>HTML email content...</h1>"
          />
        </div>

        <div class="form-group">
          <label for="tag">Tag:</label>
          <input
            id="tag"
            v-model="emailForm.tag"
            type="text"
            placeholder="nuxt"
          >
          <small class="help-text">Add a tag to categorize and track your email</small>
        </div>

        <button
          type="submit"
          :disabled="sending"
          class="submit-btn"
        >
          {{ sending ? 'Sending...' : 'Send Email' }}
        </button>
      </form>

      <div
        v-if="error"
        class="error-message"
      >
        Error: {{ error }}
      </div>

      <div
        v-if="successMessage"
        class="success-message"
      >
        {{ successMessage }}
      </div>

      <div
        v-if="lastMessageId"
        class="info-message"
      >
        Last Message ID: {{ lastMessageId }}
      </div>
    </div>

    <div class="demo-section">
      <h2>Server-Side Email Example</h2>
      <button
        :disabled="sendingServer"
        class="submit-btn"
        @click="sendServerEmail"
      >
        {{ sendingServer ? 'Sending...' : 'Send Server Email' }}
      </button>
      <div
        v-if="serverResult"
        class="info-message"
      >
        Server Result: {{ serverResult }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const { send, sending, error, lastMessageId } = useLettermint()

const emailType = ref('both')
const emailForm = ref({
  from: 'demo@lettermint.co',
  to: 'ok@testing.lettermint.co',
  subject: 'Test Email from Nuxt Lettermint Module',
  text: 'This is a test email sent from the Nuxt Lettermint module playground.\n\nIt demonstrates the integration with Lettermint email service.',
  html: '<h1>Test Email</h1><p>This is a <strong>test email</strong> sent from the Nuxt Lettermint module playground.</p><p>It demonstrates the integration with Lettermint email service.</p>',
  tag: 'nuxt',
})

const successMessage = ref('')
const sendingServer = ref(false)
const serverResult = ref('')

const sendTestEmail = async () => {
  successMessage.value = ''

  const emailData = {
    from: emailForm.value.from,
    to: emailForm.value.to,
    subject: emailForm.value.subject,
  }

  if (emailType.value === 'text' || emailType.value === 'both') {
    emailData.text = emailForm.value.text
  }

  if (emailType.value === 'html' || emailType.value === 'both') {
    emailData.html = emailForm.value.html
  }

  if (emailForm.value.tag && emailForm.value.tag.trim()) {
    emailData.tags = [emailForm.value.tag.trim()]
  }

  const result = await send(emailData)

  if (result.success) {
    successMessage.value = `Email sent successfully! Message ID: ${result.messageId}`
  }
}

const sendServerEmail = async () => {
  sendingServer.value = true
  serverResult.value = ''

  try {
    const response = await $fetch('/api/server-email-demo')
    serverResult.value = JSON.stringify(response, null, 2)
  }
  catch (err) {
    serverResult.value = `Error: ${err.message}`
  }
  finally {
    sendingServer.value = false
  }
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

h1 {
  color: #00dc82;
  margin-bottom: 2rem;
}

h2 {
  color: #333;
  margin-bottom: 1rem;
}

.demo-section {
  background: #f5f5f5;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.email-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: 600;
  color: #555;
}

input,
textarea,
select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #00dc82;
}

.submit-btn {
  background: #00dc82;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background: #00c074;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background: #fee;
  color: #c00;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.success-message {
  background: #efe;
  color: #060;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.info-message {
  background: #eef;
  color: #006;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
  word-break: break-all;
  white-space: pre-wrap;
}

.help-text {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
  display: block;
}
</style>
