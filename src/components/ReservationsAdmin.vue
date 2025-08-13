<template>
  <div class="reservations-admin">
    <MessageBox ref="messageBox" />
    
    <!-- Header -->
    <div class="admin-header">
      <div class="header-content">
        <div class="header-info">
          <div class="header-icon">
            <span class="material-icons">group_add</span>
          </div>
          <div>
            <h2>Správa rezervací</h2>
            <p>Spravujte rezervace pro aktivní kvízy</p>
          </div>
        </div>
        <button @click="$emit('close')" class="close-button">
          <span class="material-icons">close</span>
          <span>Zavřít</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Načítám aktivní kvízy...</p>
    </div>

    <!-- Quiz Selection -->
    <div v-else-if="!selectedQuizInstanceId" class="content-card">
      <div class="card-header">
        <div>
          <h3>Vyberte kvíz k úpravě rezervací</h3>
          <p>Zobrazte a upravte rezervace pro vybraný kvíz</p>
        </div>
      </div>
      
      <div class="card-content">
        <div v-if="activeQuizInstances.length === 0" class="empty-state">
          <span class="material-icons">event_busy</span>
          <p>Momentálně nejsou dostupné žádné aktivní kvízy</p>
        </div>
        
        <div v-else class="quiz-grid">
          <div 
            v-for="instance in activeQuizInstances"
            :key="instance.id"
            @click="selectQuizInstance(instance)"
            class="quiz-card"
          >
            <div class="quiz-info">
              <h4>{{ instance.places.name }}</h4>
              <div class="quiz-details">
                <div class="detail-item">
                  <span class="material-icons">event</span>
                  <span>{{ formattedDate(instance.quiz_date) }}</span>
                </div>
                <div class="detail-item">
                  <span class="material-icons">schedule</span>
                  <span>{{ instance.quiz_time.slice(0, 5) }}</span>
                </div>
                <div class="detail-item">
                  <span class="material-icons">group</span>
                  <span>{{ instance.reservations?.length || 0 }} rezervací</span>
                </div>
              </div>
            </div>
            <div class="quiz-actions">
              <button @click.stop="deleteQuizInstance(instance.id)" class="button danger small">
                <span class="material-icons">delete</span>
                Smazat kvíz
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reservation Management -->
    <div v-else class="content-card">
      <div class="card-header">
        <div class="header-info">
          <button @click="selectedQuizInstanceId = null" class="header-icon">
            <span class="material-icons">arrow_back</span>
          </button>
          <div>
            <h3>Rezervace pro {{ selectedQuizInstance.places.name }}</h3>
            <p>{{ formattedDate(selectedQuizInstance.quiz_date) }} v {{ selectedQuizInstance.quiz_time.slice(0, 5) }}</p>
          </div>
        </div>
      </div>
      
      <div class="card-content">
        <!-- Current Reservations -->
        <div class="reservations-section">
          <div class="section-header">
            <h4>Aktuální rezervace</h4>
            <div class="team-count">{{ selectedQuizReservations.length }}</div>
          </div>
          
          <div v-if="selectedQuizReservations.length > 0" class="reservations-table">
            <div class="table-header">
              <div class="col-team">Tým</div>
              <div class="col-players">Hráči</div>
              <div class="col-actions">Akce</div>
            </div>
            <div v-for="reservation in selectedQuizReservations" :key="reservation.id" class="table-row">
              <div class="col-team">
                <div class="team-info">
                  <span class="team-name">{{ reservation.teams.name }}</span>
                </div>
              </div>
              <div class="col-players">
                <div class="player-count">
                  <span class="material-icons">person</span>
                  <span>{{ reservation.number_of_players }}</span>
                </div>
              </div>
              <div class="col-actions">
                <button @click="deleteReservation(reservation.id)" class="button danger small">
                  <span class="material-icons">delete_forever</span>
                  Odebrat
                </button>
              </div>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <span class="material-icons">group_off</span>
            <p>Žádné rezervace pro tento kvíz</p>
          </div>
        </div>

        <!-- Add New Team -->
        <div class="add-team-section">
          <div class="section-header">
            <h4>Přidat nový tým</h4>
          </div>
          
          <form @submit.prevent="addReservation" class="add-team-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="new-team-name">Název týmu</label>
                <input 
                  type="text" 
                  id="new-team-name" 
                  v-model="newTeamName" 
                  required 
                  placeholder="Zadejte název týmu"
                  class="text-input"
                />
              </div>
              <div class="form-group">
                <label for="new-team-players">Počet hráčů</label>
                <input 
                  type="number" 
                  id="new-team-players" 
                  v-model="newTeamPlayers" 
                  min="1" 
                  max="10" 
                  required 
                  class="text-input number-input"
                />
              </div>
              <div class="form-group">
                <label>&nbsp;</label>
                <button type="submit" class="button primary">
                  <span class="material-icons">add</span>
                  Přidat tým
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../supabase/supabaseClient';
import MessageBox from './MessageBox.vue';

const activeQuizInstances = ref([]);
const selectedQuizInstanceId = ref(null);
const selectedQuizInstance = ref(null);
const selectedQuizReservations = ref([]);
const loading = ref(true);
const newTeamName = ref('');
const newTeamPlayers = ref(4);

const messageBox = ref(null);

const fetchActiveQuizInstances = async () => {
  loading.value = true;
  const { data, error } = await supabase
    .from('quiz_instances')
    .select('*, places(*), reservations(id, number_of_players, teams(id, name))')
    .eq('is_completed', false)
    .order('quiz_date', { ascending: true });

  if (error) {
    console.error('Chyba při načítání kvízových instancí:', error);
    messageBox.value.error('Chyba', 'Nepodařilo se načíst aktivní kvízy.');
  } else {
    activeQuizInstances.value = data || [];
  }
  loading.value = false;
};

const selectQuizInstance = (instance) => {
  selectedQuizInstanceId.value = instance.id;
  selectedQuizInstance.value = instance;
  selectedQuizReservations.value = instance.reservations || [];
};

const deleteReservation = async (reservationId) => {
  const confirm = await messageBox.value.prompt('Potvrzení', 'Opravdu chcete odebrat tuto rezervaci?');
  if (confirm) {
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', reservationId);

    if (error) {
      console.error('Chyba při mazání rezervace:', error);
      messageBox.value.error('Chyba', 'Nepodařilo se odebrat rezervaci.');
    } else {
      // Aktualizace seznamu rezervací na klientovi
      selectedQuizReservations.value = selectedQuizReservations.value.filter(
        (res) => res.id !== reservationId
      );
      messageBox.value.success('Úspěch', 'Rezervace byla úspěšně odebrána.');
    }
  }
};

const addReservation = async () => {
  if (!newTeamName.value.trim() || !newTeamPlayers.value) return;

  try {
    // Upsert týmu pro získání ID
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .upsert({ name: newTeamName.value.trim() }, { onConflict: 'name' })
      .select('id')
      .single();

    if (teamError) {
      throw teamError;
    }

    const teamId = teamData.id;

    // Kontrola duplicity
    const { count } = await supabase
      .from('reservations')
      .select('*', { count: 'exact' })
      .eq('quiz_instance_id', selectedQuizInstanceId.value)
      .eq('team_id', teamId);

    if (count > 0) {
      messageBox.value.error('Chyba', 'Tento tým již má rezervaci pro tento kvíz.');
      return;
    }

    // Vytvoření rezervace
    const { error: reservationError } = await supabase
      .from('reservations')
      .insert({
        quiz_instance_id: selectedQuizInstanceId.value,
        team_id: teamId,
        number_of_players: newTeamPlayers.value,
      });

    if (reservationError) {
      throw reservationError;
    }

    messageBox.value.success('Úspěch', 'Tým byl úspěšně přidán do rezervací.');
    // Načtení aktualizovaných dat
    await fetchActiveQuizInstances();
    selectQuizInstance(activeQuizInstances.value.find(q => q.id === selectedQuizInstanceId.value));
    
    newTeamName.value = '';
    newTeamPlayers.value = 4;
  } catch (err) {
    console.error('Chyba při přidávání rezervace:', err);
    messageBox.value.error('Chyba', 'Nepodařilo se přidat rezervaci.');
  }
};

const deleteQuizInstance = async (quizId) => {
  const confirm = await messageBox.value.prompt('Potvrzení', 'Opravdu chcete smazat celou instanci kvízu včetně všech rezervací?');
  if (confirm) {
    // Smazání rezervací pro danou instanci
    const { error: reservationsError } = await supabase
      .from('reservations')
      .delete()
      .eq('quiz_instance_id', quizId);

    if (reservationsError) {
      console.error('Chyba při mazání rezervací pro instanci:', reservationsError);
      messageBox.value.error('Chyba', 'Nepodařilo se smazat rezervace.');
      return;
    }
    
    // Smazání samotné instance kvízu
    const { error: quizError } = await supabase
      .from('quiz_instances')
      .delete()
      .eq('id', quizId);
    
    if (quizError) {
      console.error('Chyba při mazání instance kvízu:', quizError);
      messageBox.value.error('Chyba', 'Nepodařilo se smazat kvízovou instanci.');
    } else {
      messageBox.value.success('Úspěch', 'Kvízová instance byla úspěšně smazána.');
      fetchActiveQuizInstances(); // Načtení aktualizovaného seznamu
    }
  }
};

const formattedDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
};

onMounted(fetchActiveQuizInstances);
</script>

<style scoped>
/* ===== PubQ Reservations Admin Design System ===== */
.reservations-admin {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fdf6e3;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Admin Header */
.admin-header {
  background: linear-gradient(135deg, #14532d 0%, #2f855a 100%);
  color: #fdf6e3;
  padding: 1.5rem 2rem;
  border-radius: 20px 20px 0 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-icon {
  background: rgba(252, 191, 73, 0.2);
  padding: 1rem;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(252, 191, 73, 0.3);
}

.header-icon .material-icons {
  font-size: 1.5rem;
  color: #fcbf49;
}

.admin-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.admin-header p {
  margin: 0.5rem 0 0 0;
  opacity: 0.9;
  font-size: 0.95rem;
}

.close-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: rgba(253, 246, 227, 0.1);
  border: 2px solid rgba(253, 246, 227, 0.2);
  border-radius: 12px;
  color: #fdf6e3;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.close-button:hover {
  background: rgba(253, 246, 227, 0.2);
  border-color: rgba(253, 246, 227, 0.4);
  transform: translateY(-2px);
}

.back-button {
  background: rgba(253, 246, 227, 0.1);
  border: 2px solid rgba(253, 246, 227, 0.2);
  border-radius: 8px;
  color: #fdf6e3;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-button:hover {
  background: rgba(253, 246, 227, 0.2);
  border-color: rgba(253, 246, 227, 0.4);
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  min-height: 300px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(20, 83, 45, 0.1);
  border-left: 4px solid #14532d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 1.1rem;
  color: #6b7280;
  margin: 0;
}

/* Content Card */
.content-card {
  background: #ffffff;
  border-radius: 0 0 20px 20px;
  box-shadow: 0 4px 20px rgba(74, 54, 33, 0.08);
  border: 1px solid rgba(20, 83, 45, 0.1);
  border-top: none;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-header {
  background: rgba(20, 83, 45, 0.05);
  padding: 1.5rem 2rem;
  border-bottom: 2px solid rgba(20, 83, 45, 0.1);
}

.card-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #14532d;
}

.card-header p {
  margin: 0.5rem 0 0 0;
  color: #6b7280;
  font-size: 0.95rem;
}

.card-content {
  padding: 2rem;
  flex: 1;
}

/* Quiz Grid */
.quiz-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.quiz-card {
  background: #fdf6e3;
  border: 2px solid rgba(20, 83, 45, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.quiz-card:hover {
  border-color: rgba(20, 83, 45, 0.3);
  background: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(74, 54, 33, 0.1);
}

.quiz-info h4 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #14532d;
}

.quiz-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.9rem;
}

.detail-item .material-icons {
  font-size: 1rem;
  color: #14532d;
}

.quiz-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Sections */
.reservations-section, .add-team-section {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(20, 83, 45, 0.1);
}

.section-header h4 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #14532d;
}

.team-count {
  background: #14532d;
  color: #fdf6e3;
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.875rem;
}

/* Tables */
.reservations-table {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(20, 83, 45, 0.1);
}

.table-header {
  background: rgba(20, 83, 45, 0.05);
  display: grid;
  grid-template-columns: 1fr auto auto;
  font-weight: 600;
  color: #14532d;
  border-bottom: 1px solid rgba(20, 83, 45, 0.1);
}

.table-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  border-bottom: 1px solid rgba(20, 83, 45, 0.05);
  transition: background-color 0.2s ease;
}

.table-row:hover {
  background: rgba(20, 83, 45, 0.02);
}

.table-row:last-child {
  border-bottom: none;
}

.table-header > div, .table-row > div {
  padding: 1rem;
  display: flex;
  align-items: center;
}

.col-team {
  justify-content: flex-start;
}

.col-players, .col-actions {
  justify-content: center;
}

.team-info {
  display: flex;
  flex-direction: column;
}

.team-name {
  font-weight: 600;
  color: #14532d;
  font-size: 1rem;
}

.player-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
}

.player-count .material-icons {
  font-size: 1rem;
}

/* Form */
.add-team-form {
  background: rgba(20, 83, 45, 0.02);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(20, 83, 45, 0.1);
}

.form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr auto;
  gap: 1.5rem;
  align-items: end;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #14532d;
  font-size: 0.95rem;
}

.text-input {
  padding: 0.875rem 1rem;
  border: 2px solid rgba(107, 114, 128, 0.2);
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.2s ease;
  background-color: #fdf6e3;
  color: #4a3621;
}

.text-input:focus {
  outline: none;
  border-color: #14532d;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(20, 83, 45, 0.1);
}

.text-input::placeholder {
  color: #9ca3af;
}

.number-input {
  max-width: 100px;
}

/* Buttons */
.button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  white-space: nowrap;
}

.button.primary {
  background: linear-gradient(135deg, #14532d 0%, #2f855a 100%);
  color: #fdf6e3;
  box-shadow: 0 4px 16px rgba(20, 83, 45, 0.3);
}

.button.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(20, 83, 45, 0.4);
}

.button.danger {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: #fdf6e3;
  box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3);
}

.button.danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(220, 38, 38, 0.4);
}

.button.small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.empty-state .material-icons {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
  color: #9ca3af;
}

.empty-state p {
  margin: 0;
  font-size: 1.1rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-header {
    padding: 1rem;
  }
  
  .header-content {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .header-info {
    justify-content: center;
    text-align: center;
  }
  
  .card-content {
    padding: 1rem;
  }
  
  .quiz-grid {
    grid-template-columns: 1fr;
  }
  
  .quiz-card {
    flex-direction: column;
    gap: 1rem;
  }
  
  .quiz-actions {
    flex-direction: row;
    justify-content: flex-end;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .table-header, .table-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .table-header > div, .table-row > div {
    padding: 0.75rem;
    border-bottom: 1px solid rgba(20, 83, 45, 0.05);
  }
  
  .table-header > div:last-child, .table-row > div:last-child {
    border-bottom: none;
  }
}

@media (max-width: 480px) {
  .header-info {
    flex-direction: column;
    gap: 1rem;
  }
  
  .admin-header h2 {
    font-size: 1.25rem;
  }
  
  .close-button span:last-child {
    display: none;
  }
}
</style>