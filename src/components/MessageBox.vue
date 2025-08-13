<template>
  <div v-if="isVisible" class="modal-overlay">
    <div class="message-box">
      <div class="message-box-header" :class="headerClass">
        <div class="header-content">
          <div class="header-icon">
            <span class="material-icons">{{ headerIcon }}</span>
          </div>
          <h3>{{ title }}</h3>
        </div>
        <button v-if="!isPrompt" @click="cancel" class="close-button">
          <span class="material-icons">close</span>
        </button>
      </div>
      <div class="message-box-body">
        <p>{{ message }}</p>
        <div v-if="inputs.length > 0" class="input-form">
          <div v-for="(input, index) in inputs" :key="index" class="form-group">
            <label :for="`input-${index}`">{{ input.input_label }}</label>
            <input 
              :type="input.input_type" 
              :id="`input-${index}`" 
              v-model="input.input_value" 
              class="form-control"
            />
          </div>
        </div>
      </div>
      <div class="message-box-footer">
        <button v-if="showConfirmButtons" @click="confirm" class="button primary-button">
          <span class="material-icons">check</span>
          Potvrdit
        </button>
        <button v-if="showConfirmButtons" @click="cancel" class="button secondary-button">
          <span class="material-icons">close</span>
          Zrušit
        </button>
        <button v-else @click="cancel" class="button primary-button">
          <span class="material-icons">check</span>
          OK
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineExpose } from 'vue';

const isVisible = ref(false);
const title = ref('');
const message = ref('');
const resolvePromise = ref(null);
const isSuccess = ref(false);
const isError = ref(false);
const isWarning = ref(false);
const isInfo = ref(false);
const isPrompt = ref(false);
const inputs = ref([]);
const showConfirmButtons = ref(false);

const headerClass = computed(() => ({
  'header-success': isSuccess.value,
  'header-error': isError.value,
  'header-warning': isWarning.value,
  'header-info': isInfo.value,
  'header-prompt': isPrompt.value,
  'header-default': !isSuccess.value && !isError.value && !isWarning.value && !isInfo.value && !isPrompt.value,
}));

const headerIcon = computed(() => {
  if (isSuccess.value) return 'check_circle';
  if (isError.value) return 'error';
  if (isWarning.value) return 'warning';
  if (isInfo.value) return 'info';
  if (isPrompt.value) return 'help';
  return 'notifications';
});

const show = (options) => {
  return new Promise((resolve) => {
    title.value = options.title || 'Upozornění';
    message.value = options.message || '';
    isSuccess.value = options.type === 'success';
    isError.value = options.type === 'error';
    isWarning.value = options.type === 'warning';
    isInfo.value = options.type === 'info';
    isPrompt.value = options.type === 'prompt';
    inputs.value = options.inputs || [];
    showConfirmButtons.value = options.showConfirmButtons || false;
    isVisible.value = true;
    resolvePromise.value = resolve;

    if (!isPrompt.value && !showConfirmButtons.value) {
      setTimeout(() => {
        cancel();
      }, 3000);
    }
  });
};

const confirm = () => {
  isVisible.value = false;
  if (isPrompt.value) {
    const inputValues = inputs.value.map(input => input.input_value);
    resolvePromise.value(inputValues);
  } else {
    resolvePromise.value(true);
  }
};

const cancel = () => {
  isVisible.value = false;
  resolvePromise.value(false);
};

const success = (title, message) => show({ title, message, type: 'success' });
const error = (title, message) => show({ title, message, type: 'error' });
const warning = (title, message) => show({ title, message, type: 'warning' });
const info = (title, message) => show({ title, message, type: 'info' });
const prompt = (title, message, inputs) => show({ title, message, type: 'prompt', inputs, showConfirmButtons: true });

defineExpose({
  show,
  success,
  error,
  warning,
  info,
  prompt,
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.message-box {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(20, 83, 45, 0.3);
  width: 90%;
  max-width: 450px;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  animation: fadeInScale 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border: 1px solid rgba(20, 83, 45, 0.1);
}

@keyframes fadeInScale {
  from {
    transform: scale(0.9) translateY(20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.message-box-header {
  padding: 1.5rem 2rem;
  color: #fdf6e3;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  /* Ensure header always has a background - fallback */
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.header-icon {
  background: rgba(253, 246, 227, 0.2);
  padding: 0.75rem;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(253, 246, 227, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-icon .material-icons {
  font-size: 1.5rem;
  color: inherit;
}

.message-box-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  flex: 1;
}

/* Specific header background classes - these will override the default */
.header-success { 
  background: linear-gradient(135deg, #2f855a 0%, #38a169 100%) !important;
  color: #fdf6e3 !important;
}

.header-error { 
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%) !important;
  color: #fdf6e3 !important;
}

.header-warning { 
  background: linear-gradient(135deg, #fcbf49 0%, #f59e0b 100%) !important;
  color: #4a3621 !important;
}

.header-info { 
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
  color: #fdf6e3 !important;
}

.header-prompt {
  background: linear-gradient(135deg, #14532d 0%, #2f855a 100%) !important;
  color: #fdf6e3 !important;
}

.header-default {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%) !important;
  color: #fdf6e3 !important;
}

.close-button {
  background: rgba(253, 246, 227, 0.1);
  border: 2px solid rgba(253, 246, 227, 0.2);
  border-radius: 8px;
  color: inherit;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.close-button:hover {
  background: rgba(253, 246, 227, 0.2);
  border-color: rgba(253, 246, 227, 0.4);
  transform: translateY(-1px);
}

.close-button .material-icons {
  font-size: 1.25rem;
}

.message-box-body {
  padding: 2rem;
  color: #4a3621;
  line-height: 1.5;
  background: #fdf6e3;
}

.message-box-body p {
  margin: 0;
  font-size: 1rem;
}

.input-form {
  margin-top: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #4a3621;
}

.form-control {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid rgba(107, 114, 128, 0.2);
  border-radius: 12px;
  font-size: 1rem;
  box-sizing: border-box;
  background-color: #ffffff;
  color: #4a3621;
  transition: all 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: #14532d;
  box-shadow: 0 0 0 3px rgba(20, 83, 45, 0.1);
}

.message-box-footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid rgba(20, 83, 45, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background: #ffffff;
}

.button {
  padding: 0.875rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  letter-spacing: 0.25px;
  white-space: nowrap;
}

.primary-button {
  background: linear-gradient(135deg, #14532d 0%, #2f855a 100%);
  color: #fdf6e3;
  box-shadow: 0 4px 16px rgba(20, 83, 45, 0.2);
}

.primary-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(20, 83, 45, 0.3);
  background: linear-gradient(135deg, #0f3f21 0%, #276749 100%);
}

.secondary-button {
  background: rgba(20, 83, 45, 0.1);
  color: #14532d;
  border: 2px solid rgba(20, 83, 45, 0.2);
}

.secondary-button:hover {
  background: rgba(20, 83, 45, 0.15);
  border-color: rgba(20, 83, 45, 0.3);
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .message-box {
    margin: 1rem;
    max-width: none;
  }
  
  .message-box-header {
    padding: 1.25rem 1.5rem;
  }
  
  .header-content {
    gap: 0.75rem;
  }
  
  .header-icon {
    padding: 0.5rem;
  }
  
  .header-icon .material-icons {
    font-size: 1.25rem;
  }
  
  .message-box-body {
    padding: 1.5rem;
  }
  
  .message-box-footer {
    padding: 1.25rem 1.5rem;
    flex-direction: column;
  }
  
  .button {
    width: 100%;
    justify-content: center;
  }
}
</style>