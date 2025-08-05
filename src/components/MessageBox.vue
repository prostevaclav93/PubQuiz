<template>
  <div v-if="isVisible" class="message-box-overlay" @click.self="cancel">
    <div class="message-box-container">
      <div class="message-box-header">
        <h3 class="message-box-title">{{ title }}</h3>
      </div>
      <div class="message-box-body">
        <p>{{ message }}</p>
      </div>
      <div class="message-box-footer">
        <button v-if="showConfirmButtons" @click="confirm" class="confirm-button">Potvrdit</button>
        <button v-if="showConfirmButtons" @click="cancel" class="cancel-button">Zrušit</button>
        <button v-else @click="cancel" class="ok-button">OK</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  setup() {
    const isVisible = ref(false);
    const title = ref('');
    const message = ref('');
    const showConfirmButtons = ref(false);
    let resolvePromise;

    const showMessage = (msg, t = 'Upozornění') => {
      title.value = t;
      message.value = msg;
      showConfirmButtons.value = false;
      isVisible.value = true;
      return new Promise(resolve => {
        resolvePromise = resolve;
      });
    };

    const showConfirm = (msg, t = 'Potvrzení') => {
      title.value = t;
      message.value = msg;
      showConfirmButtons.value = true;
      isVisible.value = true;
      return new Promise(resolve => {
        resolvePromise = resolve;
      });
    };

    const confirm = () => {
      isVisible.value = false;
      resolvePromise(true);
    };

    const cancel = () => {
      isVisible.value = false;
      resolvePromise(false);
    };

    return {
      isVisible,
      title,
      message,
      showConfirmButtons,
      showMessage,
      showConfirm,
      confirm,
      cancel
    };
  }
};
</script>

<style scoped>
.message-box-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.message-box-container {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  font-family: Arial, sans-serif;
}

.message-box-header {
  background-color: #4a5568;
  color: white;
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.message-box-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.message-box-body {
  padding: 1.5rem;
  color: #2d3748;
}

.message-box-body p {
  margin: 0;
}

.message-box-footer {
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
  text-align: right;
}

.confirm-button,
.cancel-button,
.ok-button {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background-color 0.2s;
}

.confirm-button {
  background-color: #22c55e;
  color: white;
  margin-right: 0.5rem;
}

.confirm-button:hover {
  background-color: #15803d;
}

.cancel-button {
  background-color: #e53e3e;
  color: white;
}

.cancel-button:hover {
  background-color: #c53030;
}

.ok-button {
  background-color: #4299e1;
  color: white;
}

.ok-button:hover {
  background-color: #3182ce;
}
</style>