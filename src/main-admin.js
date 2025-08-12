import { createApp } from 'vue';
import AdminPanel from './components/AdminPanel.vue';
import './assets/style.css';

const app = createApp(AdminPanel);
app.mount('#app');