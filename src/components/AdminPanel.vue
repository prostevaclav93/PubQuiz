<template>
  <div class="admin-panel">
    <MessageBox ref="messageBox" />
    
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <button class="nav-button" @click="goToHistory">
            <span class="material-icons">history</span>
            <span>Historie</span>
          </button>
        </div>
        
        <div class="header-center">
          <div class="header-icon">
            <span class="material-icons">settings</span>
          </div>
          <div class="header-text">
            <h1 class="page-title">Správa Pubkvízu</h1>
            <p class="page-subtitle" v-if="currentQuizInstance && !showSettings && !showReservations">
              {{ formattedQuizDateAndPlace }}
            </p>
            <p class="page-subtitle" v-else-if="!currentQuizInstance && !showSettings && !showReservations">
              Žádná instance kvízu není aktivní
            </p>
          </div>
        </div>
        
        <div class="header-right">
          <button :class="['action-button', { 'active': showReservations }]" @click="toggleReservations">
            <span class="material-icons">group_add</span>
            <span>Rezervace</span>
          </button>
          <button :class="['action-button', { 'active': showSettings }]" @click="toggleSettings">
            <span class="material-icons">tune</span>
            <span>Nastavení</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettings" class="modal-overlay" @click.self="toggleSettings">
      <div class="settings-modal">
        <div class="modal-header">
          <h2>Nastavení administrace</h2>
          <button @click="toggleSettings" class="close-button">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="settings-section">
            <h3>Správa míst</h3>
            <div class="input-row">
              <input 
                type="text" 
                v-model="newPlaceName" 
                placeholder="Název místa" 
                @keyup.enter="addPlace" 
                class="text-input" 
              />
              <button class="button primary" @click="addPlace">
                <span class="material-icons">add</span>
                Přidat
              </button>
            </div>
          </div>

          <div class="settings-section">
            <h3>Správa globálních týmů</h3>
            <div class="input-row">
              <input 
                type="text" 
                v-model="newTeamName" 
                placeholder="Název nového týmu" 
                @keyup.enter="addGlobalTeam" 
                class="text-input" 
              />
              <button class="button primary" @click="addGlobalTeam">
                <span class="material-icons">add</span>
                Přidat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Reservations Modal -->
    <div v-if="showReservations" class="modal-overlay">
      <div class="reservations-modal">
        <ReservationsAdmin @close="toggleReservations" />
      </div>
    </div>

    <!-- Main Content -->
    <div class="content-container">
      <!-- Quiz Selection/Creation -->
      <div v-if="!currentQuizInstance" class="content-card">
        <div class="card-header">
          <div class="header-icon">
            <span class="material-icons">quiz</span>
          </div>
          <div>
            <h2>Vytvořit / Vybrat kvíz</h2>
            <p>Vyberte existující instanci nebo vytvořte novou pro správu rezervací</p>
          </div>
        </div>
        
        <div class="card-content">
          <!-- Existing Quiz Selection -->
          <div v-if="activeQuizInstances.length > 0" class="form-section">
            <label class="form-label">Vybrat existující kvíz</label>
            <div class="input-row">
              <select v-model="selectedExistingQuizInstanceId" class="select-input">
                <option value="" disabled>Vyberte kvíz...</option>
                <option v-for="instance in activeQuizInstances" :key="instance.id" :value="instance.id">
                  {{ formatQuizInstanceDate(instance) }}
                </option>
              </select>
              <button 
                @click="loadExistingQuizInstance" 
                :disabled="!selectedExistingQuizInstanceId" 
                class="button secondary"
              >
                <span class="material-icons">search</span>
                Vybrat
              </button>
            </div>
          </div>
          
          <!-- New Quiz Creation -->
          <div class="form-section">
            <label class="form-label">Vytvořit novou instanci kvízu</label>
            <div class="form-grid">
              <select v-model="selectedPlaceId" class="select-input">
                <option value="" disabled>Vyberte místo...</option>
                <option v-for="place in places" :key="place.id" :value="place.id">
                  {{ place.name }}
                </option>
              </select>
              <input type="date" v-model="quizDate" class="text-input" />
              <input type="time" v-model="quizTime" class="text-input" />
              <button 
                @click="createNewQuizInstance" 
                :disabled="!selectedPlaceId || !quizDate || !quizTime" 
                class="button primary"
              >
                <span class="material-icons">create_new_folder</span>
                Vytvořit
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Quiz Preparation -->
      <div v-else-if="currentQuizInstance && !isQuizStarted" class="content-card">
        <div class="card-header">
          <div class="header-icon">
            <span class="material-icons">group_work</span>
          </div>
          <div>
            <h2>Příprava kvízu</h2>
            <p><strong>{{ currentQuizInstance.place_name }}</strong> - {{ formattedQuizDate }}</p>
          </div>
        </div>
        
        <div class="card-content">
          <!-- Add Team Section -->
          <div class="form-section">
            <label class="form-label">Přidat globální tým</label>
            <div class="input-row">
              <select v-model="selectedGlobalTeamId" class="select-input">
                <option value="" disabled>Vyberte tým...</option>
                <option v-for="team in availableGlobalTeams" :key="team.id" :value="team.id">
                  {{ team.name }}
                </option>
              </select>
              <input 
                type="number" 
                placeholder="Počet hráčů" 
                v-model="globalTeamPlayers" 
                min="1" 
                class="text-input number-input" 
              />
              <button 
                @click="addTeamToQuiz" 
                :disabled="!selectedGlobalTeamId || !globalTeamPlayers" 
                class="button secondary"
              >
                <span class="material-icons">group_add</span>
                Přidat
              </button>
            </div>
          </div>
          
          <!-- Teams List -->
          <div class="teams-section">
            <div class="section-header">
              <h3>Týmy v kvízu</h3>
              <div class="team-count">{{ quizTeams.length }}</div>
            </div>
            
            <div v-if="quizTeams.length > 0" class="teams-table">
              <div class="table-header">
                <div class="col-team">Tým</div>
                <div class="col-players">Hráči</div>
                <div class="col-actions">Akce</div>
              </div>
              <div v-for="team in quizTeams" :key="team.id" class="table-row">
                <div class="col-team">{{ team.team_name }}</div>
                <div class="col-players">{{ team.number_of_players }}</div>
                <div class="col-actions">
                  <button 
                    class="button danger small" 
                    @click="confirmRemoveTeamFromQuiz(team.id)"
                  >
                    <span class="material-icons">person_remove</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div v-else class="empty-state">
              <span class="material-icons">group_off</span>
              <p>Do kvízu zatím nebyly přidány žádné týmy</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="actions-section">
            <button 
              @click="startQuiz" 
              :disabled="quizTeams.length === 0" 
              class="button success large"
            >
              <span class="material-icons">play_arrow</span>
              Začít kvíz!
            </button>
            <button @click="backToQuizSelection" class="button secondary large">
              <span class="material-icons">arrow_back</span>
              Zpět na výběr
            </button>
            <button @click="confirmCancelQuizPreparation" class="button danger large">
              <span class="material-icons">delete</span>
              Zrušit přípravu
            </button>
          </div>
        </div>
      </div>
      
      <!-- Quiz Control -->
      <div v-else-if="currentQuizInstance && isQuizStarted" class="content-card">
        <div class="card-header">
          <div class="header-icon">
            <span class="material-icons">sports_esports</span>
          </div>
          <div>
            <h2>Ovládání kvízu</h2>
            <p>Kolo {{ currentQuizInstance.current_round }} z {{ MAX_ROUNDS_LIMIT }}</p>
          </div>
        </div>
        
        <div class="card-content">
          <!-- Control Buttons -->
          <div class="control-panel">
            <button class="button info" @click="openDisplayBoard">
              <span class="material-icons">tv</span>
              Zobrazení
            </button>
            
            <button 
              v-if="isRoundInProgress" 
              :disabled="!canEndCurrentRound" 
              class="button warning" 
              @click="confirmEndRound"
              :title="!canEndCurrentRound ? 'Nejprve zadejte skóre pro všechny týmy v aktuálním kole' : ''"
            >
              <span class="material-icons">stop</span>
              Ukončit kolo
            </button>
            
            <button 
              v-else-if="isRevealingScores" 
              class="button secondary" 
              @click="nextDisplayTeam"
            >
              <span class="material-icons">arrow_forward</span>
              Další tým ({{ currentQuizInstance.revealed_index }}/{{ quizTeams.length }})
            </button>
            
            <div v-else-if="isReadyForNextRound" class="button-group">
              <button 
                @click="goToNextRound" 
                :disabled="isQuizFinished" 
                :class="['button', isQuizFinished ? 'secondary' : 'success']"
              >
                <span class="material-icons">skip_next</span>
                {{ isQuizFinished ? 'Kvíz u konce' : `Další kolo (${(currentQuizInstance.current_round || 0) + 1})` }}
              </button>
              <button @click="resetDisplay" class="button secondary">
                <span class="material-icons">replay</span>
                Reset zobrazení
              </button>
            </div>
            
            <button @click="confirmFinishQuiz" class="button danger">
              <span class="material-icons">archive</span>
              Ukončit kvíz
            </button>
          </div>

          <!-- Scores Table -->
          <div class="scores-section">
            <div class="section-header">
              <h3>Přehled skóre</h3>
            </div>
            
            <div class="scores-table">
              <div class="table-header">
                <div class="col-team">Tým</div>
                <div v-for="n in MAX_ROUNDS_LIMIT" :key="n" 
                     :class="['col-round', { 'current': n === currentQuizInstance?.current_round }]">
                  Kolo {{ n }}
                </div>
                <div class="col-total">Celkem</div>
              </div>
              
              <div v-for="team in quizTeams" :key="team.id" class="table-row">
                <div class="col-team">
                  <div class="team-info">
                    <span class="team-name">{{ team.team_name }}</span>
                    <span class="team-players">({{ team.number_of_players }})</span>
                  </div>
                  <button 
                    class="remove-team-btn" 
                    @click="confirmRemoveTeamFromQuiz(team.id)"
                    v-if="!isQuizStarted"
                  >
                    <span class="material-icons">person_remove</span>
                  </button>
                </div>
                
                <div v-for="n in MAX_ROUNDS_LIMIT" :key="n" 
                     :class="['col-round', { 'current': n === currentQuizInstance?.current_round }]">
                  <div class="score-controls">
                    <input 
                      type="number" 
                      :value="getScoreValue(team.id, n, 'regular_score')" 
                      @input="e => updateScore(team.id, n, 'regular_score', e.target.value)" 
                      :disabled="isRoundLocked(n)" 
                      class="score-input" 
                      min="0"
                      step="1"
                    />
                    <button 
                      @click="toggleBonus(team.id, n)" 
                      :class="['bonus-btn', { 'active': getScoreValue(team.id, n, 'bonus_score') }]"
                      :disabled="isRoundLocked(n)"
                    >
                      <span class="material-icons">star</span>
                    </button>
                  </div>
                </div>
                
                <div class="col-total">
                  <span class="total-score">{{ calculateTotal(team) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { supabase } from '../supabase/supabaseClient';
import MessageBox from './MessageBox.vue';
import ReservationsAdmin from './ReservationsAdmin.vue';

const messageBox = ref(null);

const MAX_ROUNDS_LIMIT = 5;

// === State management ===
const places = ref([]);
const newPlaceName = ref('');
const newTeamName = ref('');
const activeQuizInstances = ref([]);
const currentQuizInstance = ref(null);
const selectedPlaceId = ref('');
const quizDate = ref('');
const quizTime = ref('');
const isQuizStarted = ref(false);
const quizTeams = ref([]);
const allTeams = ref([]);
const selectedGlobalTeamId = ref('');
const globalTeamPlayers = ref(4);
const selectedExistingQuizInstanceId = ref('');

const showSettings = ref(false);
const showReservations = ref(false);

// === Computed properties ===
const formattedQuizDateAndPlace = computed(() => {
  if (!currentQuizInstance.value) return '';
  const date = new Date(currentQuizInstance.value.quiz_date);
  const formattedDate = date.toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const formattedTime = currentQuizInstance.value.quiz_time.slice(0, 5);
  return `${currentQuizInstance.value.place_name}, ${formattedDate}, ${formattedTime}`;
});

const formattedQuizDate = computed(() => {
  if (!currentQuizInstance.value) return '';
  const date = new Date(currentQuizInstance.value.quiz_date);
  const formattedDate = date.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
  });
  const formattedTime = currentQuizInstance.value.quiz_time.slice(0, 5);
  return `${formattedDate} v ${formattedTime}`;
});

const isRoundInProgress = computed(() => {
  return (
    currentQuizInstance.value &&
    currentQuizInstance.value.current_round > 0 &&
    !currentQuizInstance.value.is_revealing
  );
});

const canEndCurrentRound = computed(() => {
  if (!currentQuizInstance.value || !isRoundInProgress.value) return false;
  
  const currentRound = currentQuizInstance.value.current_round;
  
  // Check if all teams have at least some score entered for the current round
  return quizTeams.value.every(team => {
    const roundScore = team.scores.find(s => s.round_number === currentRound);
    // Consider round ready if regular_score exists (even if 0) or bonus_score exists
    return roundScore && (roundScore.regular_score !== null && roundScore.regular_score !== undefined);
  });
});

const isRevealingScores = computed(() => {
  return (
    currentQuizInstance.value &&
    currentQuizInstance.value.is_revealing &&
    currentQuizInstance.value.revealed_index < quizTeams.value.length
  );
});

const isReadyForNextRound = computed(() => {
  return (
    currentQuizInstance.value &&
    currentQuizInstance.value.is_revealing &&
    currentQuizInstance.value.revealed_index >= quizTeams.value.length
  );
});

const isQuizFinished = computed(() => {
  return (
    currentQuizInstance.value &&
    currentQuizInstance.value.current_round >= MAX_ROUNDS_LIMIT
  );
});

const availableGlobalTeams = computed(() => {
  if (!allTeams.value || !quizTeams.value) return [];
  const quizTeamIds = quizTeams.value.map((t) => t.team_id);
  return allTeams.value.filter((t) => !quizTeamIds.includes(t.id));
});

// === Watchers ===
watch(selectedPlaceId, () => {
  const place = places.value.find(p => p.id === selectedPlaceId.value);
  if (place && place.name) {
    newPlaceName.value = place.name;
  }
});

// === Lifecycle hooks ===
onMounted(() => {
  fetchPlaces();
  fetchActiveQuizInstances();
  fetchGlobalTeams();
});

// === Methods ===
const fetchPlaces = async () => {
  const { data, error } = await supabase.from('places').select('*');
  if (error) {
    messageBox.value.error('Chyba', 'Nepodařilo se načíst místa.');
  } else {
    places.value = data;
  }
};

const fetchGlobalTeams = async () => {
  const { data, error } = await supabase.from('teams').select('*');
  if (error) {
    messageBox.value.error('Chyba', 'Nepodařilo se načíst globální týmy.');
  } else {
    allTeams.value = data;
  }
};

const fetchActiveQuizInstances = async () => {
  const { data, error } = await supabase
    .from('quiz_instances')
    .select('*, places(name)')
    .eq('is_completed', false)
    .order('quiz_date', { ascending: true });

  if (error) {
    messageBox.value.error('Chyba', 'Nepodařilo se načíst aktivní kvízy.');
  } else {
    activeQuizInstances.value = data.map(instance => ({
      ...instance,
      place_name: instance.places.name,
    }));
  }
};

const formatQuizInstanceDate = (instance) => {
  if (!instance) return '';
  const date = new Date(instance.quiz_date);
  const formattedDate = date.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${instance.place_name} | ${formattedDate}`;
};

const createNewQuizInstance = async () => {
  if (!selectedPlaceId.value || !quizDate.value || !quizTime.value) {
    messageBox.value.warning('Upozornění', 'Vyplňte prosím všechna pole.');
    return;
  }

  const { data, error } = await supabase
    .from('quiz_instances')
    .insert([{
      place_id: selectedPlaceId.value,
      quiz_date: quizDate.value,
      quiz_time: quizTime.value,
      is_completed: false,
      current_round: 0,
      is_revealing: false,
      revealed_index: 0
    }])
    .select('id, place_id, quiz_date, quiz_time, places(name)')
    .single();

  if (error) {
    messageBox.value.error('Chyba', 'Nepodařilo se vytvořit novou instanci kvízu.');
  } else {
    currentQuizInstance.value = { 
        ...data, 
        place_name: data.places.name,
        current_round: 0,
        is_revealing: false,
        revealed_index: 0
    };
    isQuizStarted.value = false;
    
    // Load teams from reservations
    await fetchReservationsAndAddToQuiz(currentQuizInstance.value.id);
    await fetchQuizTeams();
    
    messageBox.value.success('Úspěch', 'Nová instance kvízu byla úspěšně vytvořena.');
  }
};

const fetchReservationsAndAddToQuiz = async (quizInstanceId) => {
    // Load reservations that are already linked to this quiz instance
    const { data: reservations, error: fetchError } = await supabase
        .from('reservations')
        .select('team_id, number_of_players')
        .eq('quiz_instance_id', quizInstanceId);
        
    if (fetchError) {
        messageBox.value.error('Chyba', 'Nepodařilo se načíst rezervace pro přidání do kvízu.');
        return;
    }
    
    if (reservations.length === 0) {
        messageBox.value.info('Informace', 'Pro tento kvíz nebyly nalezeny žádné rezervace.');
        return;
    }

    // Convert reservations to quiz_teams
    const teamsToInsert = reservations.map(reservation => ({
        quiz_instance_id: quizInstanceId,
        team_id: reservation.team_id,
        number_of_players: reservation.number_of_players,
    }));

    const { error: insertError } = await supabase
        .from('quiz_teams')
        .insert(teamsToInsert);

    if (insertError) {
        console.error('Insert error:', insertError);
        messageBox.value.error('Chyba', 'Nepodařilo se přidat týmy z rezervací do kvízu.');
    } else {
        messageBox.value.info('Informace', `Bylo přidáno ${teamsToInsert.length} týmů z existujících rezervací.`);
    }
};

const loadExistingQuizInstance = async () => {
  if (!selectedExistingQuizInstanceId.value) return;

  const { data, error } = await supabase
    .from('quiz_instances')
    .select('*, places(name)')
    .eq('id', selectedExistingQuizInstanceId.value)
    .single();

  if (error) {
    messageBox.value.error('Chyba', 'Nepodařilo se načíst existující kvíz.');
  } else {
    currentQuizInstance.value = { ...data, place_name: data.places.name };
    isQuizStarted.value = data.current_round > 0;
    
    // Load teams from quiz_teams table (not reservations)
    await fetchQuizTeams();
    messageBox.value.success('Úspěch', 'Kvíz byl úspěšně načten.');
  }
};

const addTeamToQuiz = async () => {
  if (!selectedGlobalTeamId.value || !globalTeamPlayers.value || !currentQuizInstance.value) {
    return;
  }

  const teamId = selectedGlobalTeamId.value;
  const isTeamAlreadyAdded = quizTeams.value.some(team => team.team_id === teamId);

  if (isTeamAlreadyAdded) {
    messageBox.value.warning('Upozornění', 'Tento tým již byl do kvízu přidán.');
    return;
  }
  
  const { error } = await supabase
    .from('quiz_teams')
    .insert([
      {
        quiz_instance_id: currentQuizInstance.value.id,
        team_id: teamId,
        number_of_players: globalTeamPlayers.value,
      }
    ]);
  
  if (error) {
    messageBox.value.error('Chyba', 'Nepodařilo se přidat tým do kvízu.');
  } else {
    await fetchQuizTeams();
    messageBox.value.success('Úspěch', 'Tým byl úspěšně přidán.');
    selectedGlobalTeamId.value = '';
    globalTeamPlayers.value = 4;
  }
};

const fetchQuizTeams = async () => {
  if (!currentQuizInstance.value) return;

  const { data, error } = await supabase
    .from('quiz_teams')
    .select('*, teams(name), scores(*)')
    .eq('quiz_instance_id', currentQuizInstance.value.id)
    .order('created_at', { ascending: true });

  if (error) {
    messageBox.value.error('Chyba', 'Nepodařilo se načíst týmy v kvízu.');
  } else {
    quizTeams.value = data.map(qt => ({
      ...qt,
      team_name: qt.teams.name,
      scores: qt.scores || [],
    }));
  }
};

const confirmRemoveTeamFromQuiz = async (quizTeamId) => {
    const confirm = await messageBox.value.prompt('Potvrzení', 'Opravdu chcete odebrat tento tým z kvízu?');
    if (confirm) {
        removeTeamFromQuiz(quizTeamId);
    }
};

const removeTeamFromQuiz = async (quizTeamId) => {
  const { error } = await supabase
    .from('quiz_teams')
    .delete()
    .eq('id', quizTeamId);

  if (error) {
    messageBox.value.error('Chyba', 'Nepodařilo se odebrat tým z kvízu.');
  } else {
    quizTeams.value = quizTeams.value.filter(t => t.id !== quizTeamId);
    messageBox.value.success('Úspěch', 'Tým byl úspěšně odebrán.');
  }
};

const startQuiz = async () => {
  if (!currentQuizInstance.value) return;

  const { error } = await supabase
    .from('quiz_instances')
    .update({ current_round: 1 })
    .eq('id', currentQuizInstance.value.id);
  
  if (error) {
    messageBox.value.error('Chyba', 'Nepodařilo se spustit kvíz.');
  } else {
    currentQuizInstance.value.current_round = 1;
    isQuizStarted.value = true;
    messageBox.value.success('Úspěch', 'Kvíz byl úspěšně spuštěn na kolo 1.');
  }
};

const backToQuizSelection = async () => {
  const confirm = await messageBox.value.prompt('Potvrzení', 'Opravdu se chcete vrátit na výběr? Změny skóre budou uloženy.');
  if (confirm) {
    currentQuizInstance.value = null;
    isQuizStarted.value = false;
    fetchActiveQuizInstances();
  }
};

const confirmCancelQuizPreparation = async () => {
    const confirm = await messageBox.value.prompt('Potvrzení', 'Opravdu chcete zrušit přípravu tohoto kvízu? Akce je nevratná.');
    if (confirm) {
        cancelQuizPreparation();
    }
};

const cancelQuizPreparation = async () => {
    if (!currentQuizInstance.value) return;

    // Smazání týmů přidělených k této instanci kvízu
    const { error: teamsError } = await supabase
        .from('quiz_teams')
        .delete()
        .eq('quiz_instance_id', currentQuizInstance.value.id);

    if (teamsError) {
        console.error('Chyba při mazání týmů z kvízu:', teamsError);
        messageBox.value.error('Chyba', 'Nepodařilo se smazat týmy z kvízu.');
        return;
    }

    // Smazání samotné instance kvízu
    const { error: instanceError } = await supabase
        .from('quiz_instances')
        .delete()
        .eq('id', currentQuizInstance.value.id);
        
    if (instanceError) {
        console.error('Chyba při mazání instance kvízu:', instanceError);
        messageBox.value.error('Chyba', 'Nepodařilo se smazat kvízovou instanci.');
    } else {
        currentQuizInstance.value = null;
        isQuizStarted.value = false;
        fetchActiveQuizInstances();
        messageBox.value.success('Úspěch', 'Příprava kvízu byla úspěšně zrušena.');
    }
};

const updateScore = async (teamId, roundNumber, type, value) => {
    const numericValue = type === 'bonus_score' ? (parseFloat(value) || 0) : parseFloat(value) || 0;
    
    try {
        // Check if score already exists
        const { data: existingScore, error: fetchError } = await supabase
            .from('scores')
            .select('id, regular_score, bonus_score')
            .eq('quiz_team_id', teamId)
            .eq('round_number', roundNumber)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        if (existingScore) {
            // Update existing score
            const { error: updateError } = await supabase
                .from('scores')
                .update({ [type]: numericValue })
                .eq('id', existingScore.id);
                
            if (updateError) throw updateError;
        } else {
            // Create new score record with both fields initialized
            const newScoreData = {
                quiz_team_id: teamId,
                round_number: roundNumber,
                regular_score: type === 'regular_score' ? numericValue : 0,
                bonus_score: type === 'bonus_score' ? numericValue : 0
            };
            
            const { error: insertError } = await supabase
                .from('scores')
                .insert(newScoreData);
                
            if (insertError) throw insertError;
        }

        // Refresh the teams data to show updated scores
        await fetchQuizTeams();
        
    } catch (err) {
        console.error('Error updating score:', err);
        messageBox.value.error('Chyba', 'Nepodařilo se aktualizovat skóre.');
    }
};

const getScoreValue = (teamId, roundNumber, type) => {
    const team = quizTeams.value.find(t => t.id === teamId);
    if (!team || !team.scores) return 0;
    
    const score = team.scores.find(s => s.round_number === roundNumber);
    return score ? (score[type] || 0) : 0;
};

const toggleBonus = async (teamId, roundNumber) => {
    const currentBonus = getScoreValue(teamId, roundNumber, 'bonus_score');
    const newBonus = currentBonus === 1 ? 0 : 1;
    
    await updateScore(teamId, roundNumber, 'bonus_score', newBonus);
};

const calculateTotal = (team) => {
    if (!team.scores || team.scores.length === 0) return 0;
    
    return team.scores.reduce((total, score) => {
        return total + (score.regular_score || 0) + (score.bonus_score || 0);
    }, 0);
};

const isRoundLocked = (roundNumber) => {
  if (!currentQuizInstance.value) return true;
  // Allow editing current round and all previous rounds, but not future rounds
  return roundNumber > currentQuizInstance.value.current_round;
};

const goToNextRound = async () => {
    if (!currentQuizInstance.value) return;
    
    // Potvrzení před přesunem na další kolo
    const confirm = await messageBox.value.prompt('Potvrzení', `Opravdu chcete začít kolo ${currentQuizInstance.value.current_round + 1}?`);
    if (confirm) {
        const { error } = await supabase
            .from('quiz_instances')
            .update({ 
                current_round: currentQuizInstance.value.current_round + 1,
                is_revealing: false,
                revealed_index: 0,
            })
            .eq('id', currentQuizInstance.value.id);

        if (error) {
            messageBox.value.error('Chyba', 'Nepodařilo se přejít na další kolo.');
        } else {
            currentQuizInstance.value.current_round++;
            currentQuizInstance.value.is_revealing = false;
            currentQuizInstance.value.revealed_index = 0;
            messageBox.value.success('Úspěch', `Kvíz se přesunul na kolo ${currentQuizInstance.value.current_round}.`);
        }
    }
};

const confirmEndRound = async () => {
    if (!currentQuizInstance.value) return;
    const confirm = await messageBox.value.prompt('Potvrzení', 'Opravdu chcete ukončit kolo a odhalit skóre?');
    if (confirm) {
        const { error } = await supabase
            .from('quiz_instances')
            .update({ 
                is_revealing: true,
                revealed_index: 0  // Reset revealed index when starting to reveal
            })
            .eq('id', currentQuizInstance.value.id);

        if (error) {
            messageBox.value.error('Chyba', 'Nepodařilo se ukončit kolo.');
        } else {
            currentQuizInstance.value.is_revealing = true;
            currentQuizInstance.value.revealed_index = 0;
            messageBox.value.success('Úspěch', 'Kolo bylo ukončeno. Můžete odhalovat skóre.');
        }
    }
};

const nextDisplayTeam = async () => {
    if (!currentQuizInstance.value) return;

    const { error } = await supabase
        .from('quiz_instances')
        .update({ revealed_index: (currentQuizInstance.value.revealed_index || 0) + 1 })
        .eq('id', currentQuizInstance.value.id);

    if (error) {
        messageBox.value.error('Chyba', 'Nepodařilo se zobrazit další tým.');
    } else {
        currentQuizInstance.value.revealed_index++;
    }
};

const resetDisplay = async () => {
    if (!currentQuizInstance.value) return;

    const { error } = await supabase
        .from('quiz_instances')
        .update({ revealed_index: 0, is_revealing: false })
        .eq('id', currentQuizInstance.value.id);

    if (error) {
        messageBox.value.error('Chyba', 'Nepodařilo se resetovat zobrazení.');
    } else {
        currentQuizInstance.value.revealed_index = 0;
        currentQuizInstance.value.is_revealing = false;
        messageBox.value.success('Úspěch', 'Zobrazení bylo resetováno.');
    }
};

const confirmFinishQuiz = async () => {
    if (!currentQuizInstance.value) return;
    const confirm = await messageBox.value.prompt('Potvrzení', 'Opravdu chcete ukončit celý kvíz? Již nebude možné upravovat skóre a přesune se do historie.');
    if (confirm) {
        finishQuiz();
    }
};

const finishQuiz = async () => {
    if (!currentQuizInstance.value) return;
    const { error } = await supabase
      .from('quiz_instances')
      .update({ is_completed: true })
      .eq('id', currentQuizInstance.value.id);

    if (error) {
        messageBox.value.error('Chyba', 'Nepodařilo se ukončit kvíz.');
    } else {
        currentQuizInstance.value = null;
        isQuizStarted.value = false;
        fetchActiveQuizInstances();
        messageBox.value.success('Úspěch', 'Kvíz byl úspěšně ukončen a přesunut do historie.');
    }
};

const addPlace = async () => {
  if (!newPlaceName.value) return;

  const { error } = await supabase
    .from('places')
    .insert([{ name: newPlaceName.value }]);

  if (error) {
    messageBox.value.error('Chyba', 'Nepodařilo se přidat místo.');
  } else {
    newPlaceName.value = '';
    fetchPlaces();
    messageBox.value.success('Úspěch', 'Místo bylo úspěšně přidáno.');
  }
};

const addGlobalTeam = async () => {
  if (!newTeamName.value) return;

  const { error } = await supabase
    .from('teams')
    .insert([{ name: newTeamName.value }]);

  if (error) {
    messageBox.value.error('Chyba', 'Nepodařilo se přidat tým.');
  } else {
    newTeamName.value = '';
    fetchGlobalTeams();
    messageBox.value.success('Úspěch', 'Tým byl úspěšně přidán.');
  }
};

const openDisplayBoard = () => {
  if (currentQuizInstance.value) {
    const displayUrl = `/display.html?quizInstanceId=${currentQuizInstance.value.id}`;
    window.open(displayUrl, '_blank');
  }
};

const goToHistory = () => {
    messageBox.value.info('Informace', 'Funkce historie není zatím implementována.');
};

const toggleSettings = () => {
    showSettings.value = !showSettings.value;
};

const toggleReservations = () => {
    showReservations.value = !showReservations.value;
};
</script>

<style scoped>
/* ===== PubQ Admin Panel Design System ===== */
.admin-panel {
  min-height: 100vh;
  background: linear-gradient(135deg, #fdf6e3 0%, #f7f3e9 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Page Header */
.page-header {
  background: linear-gradient(135deg, #4a3621 0%, #14532d 100%);
  color: #fdf6e3;
  padding: 2rem;
  position: relative;
  overflow: hidden;
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="%23fcbf49" fill-opacity="0.05"><circle cx="30" cy="30" r="4"/></g></svg>');
  animation: float 20s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(180deg); }
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 2rem;
  position: relative;
  z-index: 2;
}

.header-left, .header-right {
  display: flex;
  gap: 1rem;
}

.header-center {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  justify-self: center;
}

.header-icon {
  background: rgba(252, 191, 73, 0.2);
  padding: 1rem;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(252, 191, 73, 0.3);
}

.header-icon .material-icons {
  font-size: 2rem;
  color: #fcbf49;
}

.page-title {
  font-size: 2rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, #fdf6e3 0%, #fcbf49 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.page-subtitle {
  margin: 0.5rem 0 0 0;
  opacity: 0.9;
  font-size: 1rem;
}

/* Navigation and Action Buttons */
.nav-button, .action-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: rgba(253, 246, 227, 0.1);
  border: 2px solid rgba(253, 246, 227, 0.2);
  border-radius: 12px;
  color: #fdf6e3;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.nav-button:hover, .action-button:hover {
  background: rgba(253, 246, 227, 0.2);
  border-color: rgba(253, 246, 227, 0.4);
  transform: translateY(-2px);
}

.action-button.active {
  background: #fcbf49;
  color: #4a3621;
  border-color: #fcbf49;
}

/* Content Container */
.content-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Content Cards */
.content-card {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(74, 54, 33, 0.08);
  border: 1px solid rgba(20, 83, 45, 0.1);
  overflow: hidden;
}

.card-header {
  background: linear-gradient(135deg, #14532d 0%, #2f855a 100%);
  color: #fdf6e3;
  padding: 2rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.card-header .header-icon {
  background: rgba(252, 191, 73, 0.2);
  padding: 1rem;
  border-radius: 12px;
}

.card-header .header-icon .material-icons {
  font-size: 1.5rem;
  color: #fcbf49;
}

.card-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.card-header p {
  margin: 0.5rem 0 0 0;
  opacity: 0.9;
}

.card-content {
  padding: 2rem;
}

/* Form Elements */
.form-section {
  margin-bottom: 2rem;
}

.form-label {
  display: block;
  font-weight: 600;
  color: #14532d;
  margin-bottom: 0.75rem;
  font-size: 1rem;
}

.input-row {
  display: flex;
  gap: 1rem;
  align-items: stretch;
}

.form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 1rem;
  align-items: end;
}

.text-input, .select-input {
  padding: 0.875rem 1rem;
  border: 2px solid rgba(107, 114, 128, 0.2);
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.2s ease;
  background-color: #fdf6e3;
  color: #4a3621;
  flex: 1;
}

.text-input:focus, .select-input:focus {
  outline: none;
  border-color: #14532d;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(20, 83, 45, 0.1);
}

.number-input {
  max-width: 120px;
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

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.button.primary {
  background: linear-gradient(135deg, #14532d 0%, #2f855a 100%);
  color: #fdf6e3;
  box-shadow: 0 4px 16px rgba(20, 83, 45, 0.3);
}

.button.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(20, 83, 45, 0.4);
}

.button.secondary {
  background: rgba(20, 83, 45, 0.1);
  color: #14532d;
  border: 2px solid rgba(20, 83, 45, 0.2);
}

.button.secondary:hover:not(:disabled) {
  background: rgba(20, 83, 45, 0.15);
  border-color: rgba(20, 83, 45, 0.3);
}

.button.success {
  background: linear-gradient(135deg, #2f855a 0%, #38a169 100%);
  color: #fdf6e3;
  box-shadow: 0 4px 16px rgba(47, 133, 90, 0.3);
}

.button.success:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(47, 133, 90, 0.4);
}

.button.danger {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: #fdf6e3;
  box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3);
}

.button.danger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(220, 38, 38, 0.4);
}

.button.warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fdf6e3;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
}

.button.warning:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(245, 158, 11, 0.4);
}

.button.info {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fdf6e3;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.button.info:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
}

.button.small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.button.large {
  padding: 1rem 2rem;
  font-size: 1.125rem;
}

/* Teams Section */
.teams-section, .scores-section {
  margin-top: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(20, 83, 45, 0.1);
}

.section-header h3 {
  color: #14532d;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.team-count {
  background: #14532d;
  color: #fdf6e3;
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.875rem;
}

/* Table Styles */
.teams-table, .scores-table {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(20, 83, 45, 0.1);
}

.table-header {
  background: rgba(20, 83, 45, 0.05);
  display: grid;
  font-weight: 600;
  color: #14532d;
  border-bottom: 1px solid rgba(20, 83, 45, 0.1);
}

.teams-table .table-header {
  grid-template-columns: 1fr auto auto;
}

.scores-table .table-header {
  grid-template-columns: 2fr repeat(5, 1fr) auto;
}

.table-row {
  display: grid;
  border-bottom: 1px solid rgba(20, 83, 45, 0.05);
  transition: background-color 0.2s ease;
}

.table-row:hover {
  background: rgba(20, 83, 45, 0.02);
}

.teams-table .table-row {
  grid-template-columns: 1fr auto auto;
}

.scores-table .table-row {
  grid-template-columns: 2fr repeat(5, 1fr) auto;
}

.table-header > div, .table-row > div {
  padding: 1rem;
  display: flex;
  align-items: center;
}

.col-team {
  justify-content: space-between;
}

.col-players, .col-actions, .col-round, .col-total {
  justify-content: center;
}

.col-round.current {
  background: rgba(252, 191, 73, 0.1);
  font-weight: 600;
}

.team-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.team-name {
  font-weight: 600;
  color: #14532d;
}

.team-players {
  font-size: 0.875rem;
  color: #6b7280;
}

.remove-team-btn {
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.remove-team-btn:hover {
  background: rgba(220, 38, 38, 0.1);
}

/* Score Controls */
.score-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.score-input {
  width: 60px;
  padding: 0.5rem;
  border: 1px solid rgba(20, 83, 45, 0.2);
  border-radius: 6px;
  text-align: center;
  font-size: 0.875rem;
  background: #fdf6e3;
}

.score-input:focus {
  outline: none;
  border-color: #14532d;
  background: #ffffff;
}

.score-input:disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

.bonus-btn {
  background: none;
  border: none;
  color: #d1d5db;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.bonus-btn:hover:not(:disabled) {
  background: rgba(252, 191, 73, 0.1);
}

.bonus-btn.active {
  color: #fcbf49;
}

.bonus-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.total-score {
  font-weight: 700;
  font-size: 1.125rem;
  color: #14532d;
}

/* Control Panel */
.control-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(20, 83, 45, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(20, 83, 45, 0.1);
}

.button-group {
  display: flex;
  gap: 0.5rem;
}

/* Actions Section */
.actions-section {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid rgba(20, 83, 45, 0.1);
  flex-wrap: wrap;
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
}

.empty-state p {
  margin: 0;
  font-size: 1.1rem;
}

/* Modal Styles */
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

.settings-modal {
  background: white;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.reservations-modal {
  background: white;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 95%;
  max-width: 1000px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  border-bottom: 2px solid rgba(20, 83, 45, 0.1);
}

.modal-header h2 {
  color: #14532d;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: rgba(107, 114, 128, 0.1);
  color: #374151;
}

.close-button .material-icons {
  font-size: 1.5rem;
}

.modal-body {
  padding: 2rem;
}

.settings-section {
  margin-bottom: 2rem;
}

.settings-section h3 {
  color: #14532d;
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .page-header {
    padding: 1.5rem 1rem;
  }
  
  .header-content {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 1.5rem;
  }
  
  .header-left, .header-right {
    justify-content: center;
  }
  
  .page-title {
    font-size: 1.75rem;
  }
  
  .content-container {
    padding: 1rem;
  }
  
  .card-content {
    padding: 1.5rem;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .input-row {
    flex-direction: column;
  }
  
  .actions-section {
    flex-direction: column;
    align-items: center;
  }
  
  .control-panel {
    flex-direction: column;
  }
  
  .scores-table .table-header,
  .scores-table .table-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .scores-table .table-header > div,
  .scores-table .table-row > div {
    padding: 0.75rem;
  }
}

@media (max-width: 480px) {
  .header-center {
    flex-direction: column;
    gap: 1rem;
  }
  
  }
  
  .modal-header {
    padding: 1.5rem;
  }
  
  .modal-body {
    padding: 1.5rem;
  }
  
  .settings-modal,
  .reservations-modal {
    width: 95%;
    margin: 1rem;
  }
</style>