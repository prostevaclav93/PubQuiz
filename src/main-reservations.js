import { createApp } from 'vue';
import ReservationSystem from './components/ReservationSystem.vue';
import './assets/style.css';

const app = createApp(ReservationSystem);
app.mount('#reservation-app');