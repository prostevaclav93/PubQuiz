<template>
  <div class="reservations-admin-container">
    <div class="admin-header">
      <h2>Správa rezervací</h2>
      <button @click="$emit('close')" class="button secondary-button">
        <span class="material-icons">close</span> Zavřít
      </button>
    </div>

    <div v-if="loading" class="loading-message">Načítám aktivní kvízy...</div>

    <div v-else-if="!selectedQuizInstanceId" class="quiz-instance-list">
      <h3>Vyberte kvíz k úpravě rezervací</h3>
      <ul>
        <li
          v-for="instance in activeQuizInstances"
          :key="instance.id"
          @click="selectQuizInstance(instance)"
        >
          <div class="instance-details">
            <strong>{{ instance.places.name }}</strong>
            <p>{{ formattedDate(instance.quiz_date) }} v {{ instance.quiz_time.slice(0, 5) }}</p>
          </div>
          <button @click.stop="deleteQuizInstance(instance.id)" class="button danger-button small-button">
            Smazat kvíz
          </button>
        </li>
      </ul>
    </div>

    <div v-else class="reservation-management">
      <div class="management-header">
        <button @click="selectedQuizInstanceId = null" class="button secondary-button small-button">
          <span class="material-icons">arrow_back</span> Zpět
        </button>
        <h3>Rezervace pro {{ selectedQuizInstance.places.name }}</h3>
      </div>
      
      <div class="reservations-list-container">
        <h4>Týmy ({{ selectedQuizReservations.length }})</h4>
        <ul class="reservations-list">
          <li v-for="reservation in selectedQuizReservations" :key="reservation.id">
            <span>{{ reservation.teams.name }} ({{ reservation.number_of_players }} hráčů)</span>
            <button @click="deleteReservation(reservation.id)" class="button danger-button small-button">
              <span class="material-icons">delete_forever</span> Odebrat
            </button>
          </li>
        </ul>
        <p v-if="selectedQuizReservations.length === 0" class="text-muted">Žádné rezervace pro tento kvíz.</p>
      </div>

      <div class="add-reservation-form">
        <h4>Přidat nový tým</h4>
        <form @submit.prevent="addReservation">
          <div class="input-group">
            <label for="new-team-name">Název týmu:</label>
            <input type="text" id="new-team-name" v-model="newTeamName" required />
          </div>
          <div class="input-group">
            <label for="new-team-players">Počet hráčů:</label>
            <input type="number" id="new-team-players" v-model="newTeamPlayers" min="1" max="10" required />
          </div>
          <button type="submit" class="button green-button">
            <span class="material-icons">add</span> Přidat tým
          </button>
        </form>
      </div>
    </div>

    <MessageBox ref="messageBox" />
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
  const confirm = await messageBox.value.prompt('Potvrzení', 'Opravdu chcete Smazat celou instanci kvízu včetně všech rezervací?');
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
.reservations-admin-container {
  padding: 2rem;
  background-color: #f4f7f9;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #e0e6eb;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}

.admin-header h2 {
  margin: 0;
  color: #34495e;
}

.button {
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.secondary-button {
  background-color: #ecf0f1;
  color: #34495e;
  border: 1px solid #bdc3c7;
}

.secondary-button:hover {
  background-color: #dcdde1;
}

.danger-button {
  background-color: #e74c3c;
  color: white;
  border: none;
}

.danger-button:hover {
  background-color: #c0392b;
}

.green-button {
  background-color: #2ecc71;
  color: white;
  border: none;
}

.green-button:hover {
  background-color: #27ae60;
}

.small-button {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

.quiz-instance-list h3 {
  color: #34495e;
  margin-bottom: 1rem;
}

.quiz-instance-list ul {
  list-style: none;
  padding: 0;
}

.quiz-instance-list li {
  background: #fff;
  border: 1px solid #e0e6eb;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: box-shadow 0.2s;
  cursor: pointer;
}

.quiz-instance-list li:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.instance-details strong {
  font-size: 1.2rem;
  color: #2c3e50;
}

.instance-details p {
  margin: 0;
  color: #7f8c8d;
}

.reservation-management {
  background: #fff;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.management-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid #e0e6eb;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.management-header h3 {
  margin: 0;
  color: #34495e;
}

.reservations-list-container {
  margin-bottom: 1.5rem;
}

.reservations-list {
  list-style: none;
  padding: 0;
}

.reservations-list li {
  padding: 0.75rem 0;
  border-bottom: 1px solid #e0e6eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reservations-list li:last-child {
  border-bottom: none;
}

.add-reservation-form h4 {
  margin-top: 0;
  color: #34495e;
}

.input-group {
  margin-bottom: 1rem;
}

.input-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.3rem;
  color: #34495e;
}

.input-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
}
</style>