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
            placeholder="ok@testing.lettermint.co"
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
          <label for="scheduledAt">Deliver at:</label>
          <input
            id="scheduledAt"
            v-model="emailForm.scheduledAt"
            type="datetime-local"
            :min="scheduleWindow.min"
            :max="scheduleWindow.max"
          >
          <small class="help-text">Leave empty to send immediately. Scheduling works up to 30 days ahead; a scheduled message can be moved or cancelled below until it is released.</small>
        </div>

        <div class="form-group">
          <label for="tag">Tag:</label>
          <input
            id="tag"
            v-model="emailForm.tag"
            type="text"
            placeholder="nuxt"
          >
          <small class="help-text">A plain label to categorize and track your email</small>
        </div>

        <div class="form-group">
          <label>Key/value tag:</label>
          <div class="field-row">
            <input
              v-model="emailForm.tagName"
              type="text"
              placeholder="name (e.g. campaign)"
            >
            <input
              v-model="emailForm.tagValue"
              type="text"
              placeholder="value (e.g. launch)"
            >
          </div>
        </div>

        <div class="form-group">
          <label>Settings:</label>
          <div class="field-row">
            <label class="checkbox-label"><input
              v-model="emailForm.trackOpens"
              type="checkbox"
            > Track opens</label>
            <label class="checkbox-label"><input
              v-model="emailForm.trackClicks"
              type="checkbox"
            > Track clicks</label>
            <select v-model="emailForm.tls">
              <option value="">
                TLS: project default
              </option>
              <option value="opportunistic">
                TLS: opportunistic
              </option>
              <option value="enforced">
                TLS: enforced
              </option>
            </select>
          </div>
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
      <h2>Message Details (Team API)</h2>
      <p
        v-if="teamTokenConfigured === false"
        class="error-message"
      >
        These routes use <code>useLettermintApi()</code> on the server, so they need
        <code>NUXT_LETTERMINT_API_TOKEN</code>: a team credential, separate from the sending key.
      </p>
      <p
        v-else
        class="help-text"
      >
        Look up any sent message by id.
      </p>
      <div class="form-group">
        <label for="messageId">Message ID:</label>
        <input
          id="messageId"
          v-model="manageId"
          type="text"
          placeholder="Send a message first, or paste an id"
        >
      </div>
      <div class="field-row">
        <button
          class="submit-btn"
          :disabled="!manageId || managing"
          @click="checkStatus"
        >
          {{ messageDetails ? 'Refresh' : 'Check status' }}
        </button>
        <template v-if="messageDetails?.status === 'scheduled'">
          <button
            class="submit-btn"
            :disabled="managing"
            @click="reschedule"
          >
            Reschedule +1 day
          </button>
          <button
            class="submit-btn danger-btn"
            :disabled="managing"
            @click="cancel"
          >
            Cancel delivery
          </button>
        </template>
      </div>
      <div
        v-if="manageError"
        class="error-message"
      >
        Error: {{ manageError }}
      </div>
      <dl
        v-if="messageDetails"
        class="details"
      >
        <dt>Status</dt>
        <dd>
          <span
            class="badge"
            :class="statusClass"
          >{{ messageDetails.status }}</span>
        </dd>
        <template
          v-for="[label, value] in detailRows"
          :key="label"
        >
          <dt>{{ label }}</dt>
          <dd>{{ value }}</dd>
        </template>
      </dl>
    </div>

    <div class="demo-section">
      <h2>Batch Sending</h2>
      <p class="help-text">
        Sends two messages in one request through <code>sendEmails()</code>: one immediately, one scheduled an hour out.
      </p>
      <button
        :disabled="sendingBatch"
        class="submit-btn"
        @click="sendBatch"
      >
        {{ sendingBatch ? 'Sending...' : 'Send Batch' }}
      </button>
      <div
        v-if="batchResult"
        class="info-message"
      >
        {{ batchResult }}
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
import { computed, onMounted, ref, watch } from 'vue'

const { send, sending, error, lastMessageId } = useLettermint()

const emailType = ref('both')
const emailForm = ref({
  from: 'demo@lettermint.co',
  to: 'ok@testing.lettermint.co',
  subject: 'Test Email from Nuxt Lettermint Module',
  text: 'This is a test email sent from the Nuxt Lettermint module playground.\n\nIt demonstrates the integration with Lettermint email service.',
  html: '<h1>Test Email</h1><p>This is a <strong>test email</strong> sent from the Nuxt Lettermint module playground.</p><p>It demonstrates the integration with Lettermint email service.</p>',
  scheduledAt: '',
  tag: 'nuxt',
  tagName: '',
  tagValue: '',
  trackOpens: false,
  trackClicks: false,
  tls: '',
})

const successMessage = ref('')
const sendingServer = ref(false)
const serverResult = ref('')
const sendingBatch = ref(false)
const batchResult = ref('')
const manageId = ref('')
const managing = ref(false)
const manageError = ref('')
const messageDetails = ref(null)
const teamTokenConfigured = ref(null)

onMounted(async () => {
  try {
    teamTokenConfigured.value = (await $fetch('/api/team-token')).configured
  }
  catch {
    teamTokenConfigured.value = null
  }
})

const asLocalTime = value => value ? new Date(value).toLocaleString() : value

// datetime-local wants local time without a zone suffix
const asLocalInput = (date) => {
  const offset = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const scheduleWindow = {
  min: asLocalInput(new Date()),
  max: asLocalInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
}

const detailRows = computed(() => {
  const message = messageDetails.value
  if (!message) return []

  return [
    ['Subject', message.subject],
    ['From', message.from_name ? `${message.from_name} <${message.from_email}>` : message.from_email],
    ['To', message.to?.map(recipient => recipient.email).join(', ')],
    ['Tag', message.tag],
    ['Scheduled for', asLocalTime(message.scheduled_at)],
    ['Status changed', asLocalTime(message.status_changed_at)],
    ['Created', asLocalTime(message.created_at)],
  ].filter(([, value]) => value)
})

const statusClass = computed(() => {
  const status = messageDetails.value?.status

  if (['delivered', 'opened', 'clicked'].includes(status)) return 'badge-ok'
  if (status === 'scheduled') return 'badge-scheduled'
  if (['pending', 'queued', 'processed'].includes(status)) return 'badge-progress'
  if (['canceled', 'unsubscribed'].includes(status)) return 'badge-muted'
  return 'badge-bad'
})

watch(lastMessageId, (id) => {
  if (id) {
    manageId.value = id
    checkStatus()
  }
})

const sendTestEmail = async () => {
  successMessage.value = ''

  const form = emailForm.value
  const emailData = {
    from: form.from,
    to: form.to,
    subject: form.subject,
  }

  if (emailType.value === 'text' || emailType.value === 'both') {
    emailData.text = form.text
  }

  if (emailType.value === 'html' || emailType.value === 'both') {
    emailData.html = form.html
  }

  if (form.scheduledAt) {
    emailData.scheduledAt = new Date(form.scheduledAt)
  }

  if (form.tag.trim()) {
    emailData.tag = form.tag.trim()
  }

  if (form.tagName.trim() && form.tagValue.trim()) {
    emailData.tags = [{ name: form.tagName.trim(), value: form.tagValue.trim() }]
  }

  if (form.trackOpens || form.trackClicks || form.tls) {
    emailData.settings = {
      ...form.trackOpens && { trackOpens: true },
      ...form.trackClicks && { trackClicks: true },
      ...form.tls && { tls: form.tls },
    }
  }

  const result = await send(emailData)

  if (result.success) {
    successMessage.value = result.scheduledAt
      ? `Email scheduled for ${result.scheduledAt} (status: ${result.status}). Message ID: ${result.messageId}`
      : `Email sent successfully (status: ${result.status})! Message ID: ${result.messageId}`
  }
}

const manage = async (run) => {
  managing.value = true
  manageError.value = ''

  try {
    await run()
    messageDetails.value = await $fetch(`/api/message-status?id=${encodeURIComponent(manageId.value.trim())}`)
  }
  catch (err) {
    manageError.value = err.data?.message || err.message
  }
  finally {
    managing.value = false
  }
}

const checkStatus = () => manage(() => {})

const reschedule = () => manage(() => {
  const current = messageDetails.value?.scheduled_at
  const base = current ? new Date(current).getTime() : Date.now()

  return $fetch('/api/message-reschedule', {
    method: 'POST',
    body: {
      id: manageId.value.trim(),
      scheduledAt: new Date(base + 24 * 60 * 60 * 1000).toISOString(),
    },
  })
})

const cancel = () => manage(() => $fetch('/api/message-cancel', {
  method: 'POST',
  body: { id: manageId.value.trim() },
}))

const sendBatch = async () => {
  sendingBatch.value = true
  batchResult.value = ''

  try {
    const response = await $fetch('/api/batch-demo', { method: 'POST' })
    batchResult.value = JSON.stringify(response, null, 2)
  }
  catch (err) {
    batchResult.value = `Error: ${err.data?.message || err.message}`
  }
  finally {
    sendingBatch.value = false
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
    serverResult.value = `Error: ${err.data?.message || err.message}`
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
  margin-bottom: 1rem;
}

.field-row {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.field-row input[type='text'] {
  flex: 1;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-weight: 400;
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

.details {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.5rem 1.5rem;
  background: #eef;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.details dt {
  font-weight: 600;
  color: #555;
}

.details dd {
  margin: 0;
  word-break: break-word;
}

.badge {
  display: inline-block;
  padding: 0.125rem 0.625rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.badge-ok {
  background: #d9f5e8;
  color: #04724d;
}

.badge-scheduled {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-progress {
  background: #fef3c7;
  color: #92400e;
}

.badge-muted {
  background: #e5e5e5;
  color: #555;
}

.badge-bad {
  background: #fee;
  color: #c00;
}

.danger-btn {
  background: #dc2626;
}

.danger-btn:hover:not(:disabled) {
  background: #b91c1c;
}
</style>
