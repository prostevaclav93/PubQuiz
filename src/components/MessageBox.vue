<template>
  <div v-if="isVisible" class="modal-overlay">
    <div class="message-box">
      <div class="message-box-header" :class="headerClass">
        <h3>{{ title }}</h3>
        <button v-if="!isPrompt" @click="cancel" class="close-button">&times;</button>
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
        <button v-if="showConfirmButtons" @click="confirm" class="button primary-button">Potvrdit</button>
        <button v-if="showConfirmButtons" @click="cancel" class="button secondary-button">Zrušit</button>
        <button v-else @click="cancel" class="button primary-button">OK</button>
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
}));

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
  background: white;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 450px;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  animation: fadeInScale 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
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
  padding: 1rem 1.5rem;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.message-box-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.header-success { background-color: #28a745; }
.header-error { background-color: #dc3545; }
.header-warning { background-color: #ffc107; color: #333; }
.header-info { background-color: #17a2b8; }

.close-button {
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  position: absolute;
  top: 0.5rem;
  right: 1rem;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.close-button:hover {
  opacity: 1;
}

.message-box-body {
  padding: 1.5rem;
  color: #34495e;
  line-height: 1.5;
}

.message-box-body p {
  margin: 0;
}

.input-form {
  margin-top: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.form-control {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 1rem;
  box-sizing: border-box;
}

.message-box-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.button {
  padding: 0.6rem 1.2rem;
  border-radius: 5px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.primary-button {
  background-color: #3498db;
  color: white;
}

.primary-button:hover {
  background-color: #2980b9;
}

.secondary-button {
  background-color: #ecf0f1;
  color: #34495e;
}

.secondary-button:hover {
  background-color: #bdc3c7;
}
</style>