<template>
  <div class="reservation-form">
    <div class="quiz-info-container">
      <div class="quiz-info-header">
        <span class="material-icons">event_available</span>
        <h2>Rezervace na {{ quizTitle }}</h2>
      </div>
      <div class="quiz-info-details">
        <div class="info-item">
          <span class="material-icons">event</span>
          <div>
            <span class="info-label">Datum</span>
            <span class="info-value">{{ quizDate }}</span>
          </div>
        </div>
        <div class="info-item">
          <span class="material-icons">schedule</span>
          <div>
            <span class="info-label">Čas</span>
            <span class="info-value">{{ quizTime }}</span>
          </div>
        </div>
        <div class="info-item">
          <span class="material-icons">place</span>
          <div>
            <span class="info-label">Adresa</span>
            <span class="info-value">{{ quizLocation }}</span>
          </div>
        </div>
        <div class="info-item">
          <span class="material-icons">payments</span>
          <div>
            <span class="info-label">Vstupné za člena týmu</span>
            <span class="info-value">100 Kč</span>
          </div>
        </div>
      </div>
    </div>

    <div class="form-container">
      <div class="form-header">
        <span class="material-icons">group_add</span>
        <h3>Údaje o týmu</h3>
      </div>
      
      <form @submit.prevent="submitReservation">
        <div class="form-grid">
          <div class="form-group">
            <label for="team-name">
              <span class="material-icons">badge</span>
              Název týmu
            </label>
            <input 
              type="text" 
              id="team-name" 
              v-model="teamName" 
              required 
              placeholder="Zadejte název vašeho týmu"
            />
          </div>

          <div class="form-group">
            <label for="players">
              <span class="material-icons">group</span>
              Počet hráčů
            </label>
            <input 
              type="number" 
              id="players" 
              v-model="numberOfPlayers" 
              min="1" 
              max="8"
              required
              placeholder="Zadejte počet hráčů"
            />
            <span class="form-hint">Maximálně 8 hráčů na tým</span>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="submit-button">
            <span class="material-icons">how_to_reg</span>
            Rezervovat místo
          </button>
        </div>
      </form>
    </div>
    
    <div class="reservations-list-container">
      <div class="reservations-header">
        <span class="material-icons">groups</span>
        <h3>Již rezervované týmy</h3>
        <div class="team-count">{{ existingReservations.length }}</div>
      </div>
      
      <div v-if="existingReservations.length > 0" class="reservations-list">
        <div v-for="reservation in existingReservations" :key="reservation.id" class="reservation-item">
          <div class="team-info">
            <div class="team-name">{{ reservation.teams.name }}</div>
            <div class="team-players">
              <span class="material-icons">person</span>
              {{ reservation.number_of_players }} hráčů
            </div>
          </div>
          <div class="reservation-status">
            <span class="material-icons">check_circle</span>
          </div>
        </div>
      </div>
      
      <div v-else class="no-reservations">
        <span class="material-icons">group_off</span>
        <p>Zatím žádné rezervace.</p>
        <p class="sub-text">Buďte první, kdo si zarezervuje místo!</p>
      </div>
    </div>

    <MessageBox ref="messageBox" />
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';
import { supabase } from '../supabase/supabaseClient';
import MessageBox from './MessageBox.vue';

const props = defineProps({
  quizInstanceId: {
    type: String,
    required: true,
  },
  existingReservations: {
    type: Array,
    required: false,
    default: () => [],
  },
  quizTitle: {
    type: String,
    required: true,
  },
  quizDate: {
    type: String,
    required: true,
  },
  quizTime: {
    type: String,
    required: true,
  },
  quizLocation: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['reservation-submitted']);
const messageBox = ref(null);

const teamName = ref('');
const numberOfPlayers = ref('');

const submitReservation = async () => {
  try {
    const trimmedTeamName = teamName.value.trim();
    if (!trimmedTeamName) {
      messageBox.value.error('Chyba', 'Název týmu nesmí být prázdný.');
      return;
    }

    // Krok 1: Vytvoříme nebo najdeme existující tým
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .upsert({ name: trimmedTeamName }, { onConflict: 'name' })
      .select('id')
      .single();

    if (teamError) {
      throw teamError;
    }

    const teamId = teamData.id;

    // Krok 2: Nová spolehlivá kontrola pro duplicitní rezervaci
    const { count, error: checkError } = await supabase
      .from('reservations')
      .select('*', { count: 'exact' })
      .eq('quiz_instance_id', props.quizInstanceId)
      .eq('team_id', teamId);
    
    if (checkError) {
      throw checkError;
    }

    if (count > 0) {
      messageBox.value.error('Chyba', 'Pro tento kvíz již existuje rezervace s tímto týmem.');
      return;
    }

    // Krok 3: Pokud rezervace neexistuje, vytvoříme ji
    const reservationData = {
      quiz_instance_id: props.quizInstanceId,
      team_id: teamId,
      number_of_players: numberOfPlayers.value,
    };

    const { error: reservationError } = await supabase
      .from('reservations')
      .insert(reservationData);

    if (reservationError) {
      throw reservationError;
    } else {
      const { data: quizData, error: quizError } = await supabase
        .from('quiz_instances')
        .select('teams_playing')
        .eq('id', props.quizInstanceId)
        .single();
      
      if (!quizError) {
        const newTeamsPlaying = (quizData.teams_playing || 0) + 1;
        await supabase
          .from('quiz_instances')
          .update({ teams_playing: newTeamsPlaying })
          .eq('id', props.quizInstanceId);
      } else {
        console.error('Chyba při načítání počtu týmů pro aktualizaci:', quizError);
      }
      
      await messageBox.value.success('Rezervace úspěšná!', 'Vaše rezervace byla úspěšně odeslána!');
      
      teamName.value = '';
      numberOfPlayers.value = "";
      
      emit('reservation-submitted');
    }
  } catch (err) {
    console.error('Došlo k chybě při rezervaci:', err);
    messageBox.value.error('Chyba', 'Došlo k chybě při odesílání rezervace. Zkontrolujte prosím konzoli.');
  }
};
</script>

<style scoped>
.reservation-form {
  max-width: 700px;
  margin: 0 auto;
  background-color: #fdf6e3;
  min-height: 100vh;
  padding: 1rem;
}

.quiz-info-container {
  background: linear-gradient(135deg, #14532d 0%, #2f855a 100%);
  color: #fdf6e3;
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(20, 83, 45, 0.3);
}

.quiz-info-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.quiz-info-header .material-icons {
  font-size: 2rem;
  color: #fcbf49;
}

.quiz-info-header h2 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.3;
}

.quiz-info-details {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(253, 246, 227, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.info-item .material-icons {
  color: #fcbf49;
  font-size: 1.5rem;
}

.info-item div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.875rem;
  opacity: 0.8;
  font-weight: 500;
}

.info-value {
  font-weight: 600;
  font-size: 1rem;
}

.form-container {
  background: #ffffff;
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 20px rgba(74, 54, 33, 0.08);
  border: 1px solid rgba(20, 83, 45, 0.1);
}

.form-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(20, 83, 45, 0.1);
}

.form-header .material-icons {
  color: #14532d;
  font-size: 1.5rem;
}

.form-header h3 {
  margin: 0;
  color: #14532d;
  font-size: 1.25rem;
  font-weight: 600;
}

.form-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .form-grid {
    grid-template-columns: 2fr 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #4a3621;
}

.form-group label .material-icons {
  font-size: 1.25rem;
  color: #14532d;
}

.form-group input {
  padding: 0.875rem 1rem;
  border: 2px solid rgba(107, 114, 128, 0.2);
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.2s ease;
  background-color: #fdf6e3;
  color: #4a3621;
}

.form-group input:focus {
  outline: none;
  border-color: #14532d;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(20, 83, 45, 0.1);
}

.form-group input::placeholder {
  color: #6b7280;
}

.form-hint {
  font-size: 0.875rem;
  color: #6b7280;
  font-style: italic;
}

.form-actions {
  margin-top: 2rem;
  display: flex;
  justify-content: flex-end;
}

.submit-button {
  background: linear-gradient(135deg, #fcbf49 0%, #f59e0b 100%);
  color: #4a3621;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(252, 191, 73, 0.3);
  letter-spacing: 0.25px;
}

.submit-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(252, 191, 73, 0.4);
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.submit-button:active {
  transform: translateY(0);
}

.reservations-list-container {
  background: #ffffff;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(74, 54, 33, 0.08);
  border: 1px solid rgba(20, 83, 45, 0.1);
}

.reservations-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(20, 83, 45, 0.1);
}

.reservations-header .material-icons {
  color: #14532d;
  font-size: 1.5rem;
}

.reservations-header h3 {
  margin: 0;
  color: #14532d;
  font-size: 1.25rem;
  font-weight: 600;
  flex-grow: 1;
}

.team-count {
  background: #14532d;
  color: #fdf6e3;
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.875rem;
}

.reservations-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reservation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: rgba(20, 83, 45, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(20, 83, 45, 0.1);
  transition: all 0.2s ease;
}

.reservation-item:hover {
  background: rgba(20, 83, 45, 0.08);
  transform: translateX(4px);
}

.team-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.team-name {
  font-weight: 600;
  color: #14532d;
  font-size: 1.1rem;
}

.team-players {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.team-players .material-icons {
  font-size: 1rem;
}

.reservation-status .material-icons {
  color: #2f855a;
  font-size: 1.5rem;
}

.no-reservations {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.no-reservations .material-icons {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.no-reservations p {
  margin: 0.5rem 0;
  font-size: 1.1rem;
}

.sub-text {
  font-size: 0.875rem !important;
  font-style: italic;
}

@media (max-width: 768px) {
  .quiz-info-container {
    padding: 1.5rem;
  }
  
  .form-container {
    padding: 1.5rem;
  }
  
  .reservations-list-container {
    padding: 1.5rem;
  }
  
  .quiz-info-details {
    grid-template-columns: 1fr;
  }
  
  .info-item {
    padding: 1rem;
  }
}
</style>