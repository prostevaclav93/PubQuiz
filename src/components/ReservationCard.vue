<template>
  <div class="card" @click="handleCardClick">
    <div class="card-image-container">
      <img :src="quizInstance.places.image_url" alt="Místo konání kvízu" class="card-image" />
      <div class="card-overlay">
        <div class="reservation-badge">
          <span class="material-icons">group</span>
          <span>{{ reservationText }}</span>
        </div>
      </div>
    </div>
    <div class="card-content">
      <h3 class="card-title">{{ quizInstance.places.name }}</h3>
      <div class="card-details">
        <div class="detail-item">
          <div class="detail-icon">
            <span class="material-icons">event</span>
          </div>
          <div class="detail-text">
            <span class="detail-label">Datum</span>
            <p class="detail-value">{{ formattedDate }}</p>
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-icon">
            <span class="material-icons">schedule</span>
          </div>
          <div class="detail-text">
            <span class="detail-label">Čas</span>
            <p class="detail-value">{{ formattedTime }}</p>
          </div>
        </div>
      </div>
      <div class="card-actions">
        <button 
          v-if="!hasReservation"
          class="button primary-button"
          @click.stop="$emit('reserve', quizInstance.id)"
        >
          <span class="material-icons">how_to_reg</span>
          Rezervovat místo
        </button>
        <button v-else class="button reserved-button" @click.stop>
          <span class="material-icons">check_circle</span>
          Již rezervováno
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  quizInstance: {
    type: Object,
    required: true,
  },
  userReservations: {
    type: Array,
    required: true,
  }
});

const emit = defineEmits(['reserve', 'card-click']);

const formattedDate = computed(() => {
  const dateStr = props.quizInstance.quiz_date;
  if (!dateStr) return 'Datum není k dispozici';
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Neplatné datum';
  
  return new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'long', timeZone: 'Europe/Prague' }).format(date);
});

const formattedTime = computed(() => {
  const timeStr = props.quizInstance.quiz_time;
  if (!timeStr) return 'Čas není k dispozici';
  
  // Předpokládáme, že čas je ve formátu HH:mm
  const [hours, minutes] = timeStr.split(':');
  if (!hours || !minutes) return 'Neplatný čas';
  
  return `${hours}:${minutes}`;
});

const reservationText = computed(() => {
  const count = props.quizInstance.teams_playing;
  
  if (count === null || typeof count === 'undefined' || count === 0) {
    return 'Zatím žádná rezervace';
  } else if (count === 1) {
    return '1 tým rezervován';
  } else if (count >= 2 && count <= 4) {
    return `${count} týmy rezervovány`;
  } else {
    return `${count} týmů rezervováno`;
  }
});

const hasReservation = computed(() => {
  return props.userReservations?.some(reservation => reservation.quiz_instance_id === props.quizInstance.id);
});

const handleCardClick = () => {
  emit('card-click', props.quizInstance.id);
};
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(74, 54, 33, 0.08);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  height: 100%;
  border: 1px solid rgba(20, 83, 45, 0.1);
}

.card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(74, 54, 33, 0.15);
  border-color: rgba(20, 83, 45, 0.2);
}

.card-image-container {
  width: 100%;
  height: 220px;
  overflow: hidden;
  position: relative;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.card:hover .card-image {
  transform: scale(1.08);
}

.card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(74, 54, 33, 0.3) 0%, transparent 50%, rgba(74, 54, 33, 0.6) 100%);
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 1rem;
}

.reservation-badge {
  background: rgba(252, 191, 73, 0.95);
  color: #4a3621;
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.reservation-badge .material-icons {
  font-size: 1rem;
}

.card-content {
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: 1.5rem;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: #14532d;
  line-height: 1.3;
}

.card-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.detail-icon {
  background: rgba(20, 83, 45, 0.1);
  padding: 0.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.detail-icon .material-icons {
  font-size: 1.25rem;
  color: #14532d;
}

.detail-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  margin: 0;
  font-size: 1rem;
  color: #4a3621;
  font-weight: 600;
  line-height: 1.4;
}

.card-actions {
  margin-top: auto;
}

.button {
  width: 100%;
  padding: 0.875rem 1.5rem;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.25px;
}

.primary-button {
  background: linear-gradient(135deg, #14532d 0%, #2f855a 100%);
  color: #fdf6e3;
  box-shadow: 0 4px 16px rgba(20, 83, 45, 0.3);
}

.primary-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(20, 83, 45, 0.4);
  background: linear-gradient(135deg, #0f3f21 0%, #276749 100%);
}

.primary-button:active {
  transform: translateY(0);
}

.reserved-button {
  background: linear-gradient(135deg, #2f855a 0%, #38a169 100%);
  color: #fdf6e3;
  cursor: default;
  opacity: 0.8;
}

.material-icons {
  font-size: 1.125rem;
}

@media (max-width: 768px) {
  .card-content {
    padding: 1.25rem;
    gap: 1.25rem;
  }
  
  .card-title {
    font-size: 1.25rem;
  }
  
  .card-image-container {
    height: 180px;
  }
}
</style>