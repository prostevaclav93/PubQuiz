<template>
  <div class="container">
    <MessageBox ref="messageBox" />
    <header class="header">
      <button class="button secondary-button" @click="goToHistory">
        <span class="material-icons">history</span>Historie
      </button>
      <div class="title-container">
        <h1>Správa Pubkvízu</h1>
        <p v-if="currentQuizInstance && !showSettings && !showReservations" class="text-muted">{{ formattedQuizDateAndPlace }}</p>
        <p v-else-if="!currentQuizInstance && !showSettings && !showReservations" class="text-muted">Žádná instance kvízu není aktivní.</p>
      </div>
      <div class="header-buttons">
          <button :class="['button', showReservations ? 'primary-button' : 'secondary-button']" @click="toggleReservations">
              <span class="material-icons">group_add</span>Rezervace
          </button>
          <button :class="['button', showSettings ? 'primary-button' : 'secondary-button']" @click="toggleSettings">
              <span class="material-icons">settings</span>Nastavení
          </button>
      </div>
    </header>

    <div v-if="showSettings" class="modal-overlay" @click.self="toggleSettings">
      <div class="modal-content">
        <header class="modal-header">
          <h2>Nastavení administrace</h2>
          <button @click="toggleSettings" class="close-button">
            <span class="material-icons">close</span>
          </button>
        </header>
        <div class="modal-body">
          <p class="text-muted">Zde můžete spravovat místa a globální týmy.</p>
          
          <div class="form-field mt-4">
            <label>Správa míst</label>
            <div class="input-group">
              <input type="text" v-model="newPlaceName" placeholder="Název místa" @keyup.enter="addPlace" class="input" />
              <button class="button success-button" @click="addPlace">
                <span class="material-icons">add</span>Přidat
              </button>
            </div>
          </div>

          <div class="form-field">
            <label>Správa globálních týmů</label>
            <div class="input-group">
              <input type="text" v-model="newTeamName" placeholder="Název nového týmu" @keyup.enter="addGlobalTeam" class="input" />
              <button class="button success-button" @click="addGlobalTeam">
                <span class="material-icons">add</span>Přidat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="showReservations" class="modal-overlay">
        <div class="modal-content large-modal">
            <ReservationsAdmin @close="toggleReservations" />
        </div>
    </div>

    <div v-if="!showSettings && !showReservations" class="main-panel">
      <div v-if="!currentQuizInstance" class="card">
        <h3 class="text-center">Vytvořit / Vybrat kvíz</h3>
        <p class="text-muted text-center">Vyberte existující instanci nebo vytvořte novou, na kterou se budou vázat rezervace.</p>
        
        <div v-if="activeQuizInstances.length > 0" class="form-field mt-4">
          <div class="input-group">
            <select v-model="selectedExistingQuizInstanceId" class="select">
              <option value="" disabled>Vybrat existující kvíz</option>
              <option v-for="instance in activeQuizInstances" :key="instance.id" :value="instance.id">
                {{ formatQuizInstanceDate(instance) }}
              </option>
            </select>
            <button @click="loadExistingQuizInstance" :disabled="!selectedExistingQuizInstanceId" class="button info-button">
              <span class="material-icons">search</span>Vybrat
            </button>
          </div>
        </div>
        
        <div class="form-field">
          <label>Vytvořit novou instanci kvízu</label>
          <div class="input-group">
            <select v-model="selectedPlaceId" class="select">
              <option value="" disabled>Vybrat místo</option>
              <option v-for="place in places" :key="place.id" :value="place.id">
                {{ place.name }}
              </option>
            </select>
            <input type="date" v-model="quizDate" required class="input" />
            <input type="time" v-model="quizTime" required class="input" />
            <button @click="createNewQuizInstance" :disabled="!selectedPlaceId || !quizDate || !quizTime" class="button primary-button">
              <span class="material-icons">create_new_folder</span>Vytvořit
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="currentQuizInstance && !isQuizStarted" class="card">
        <h3 class="text-center">Příprava kvízu v <strong>{{ currentQuizInstance.place_name }}</strong></h3>
        <p class="text-muted text-center">Přidejte týmy, které se zúčastní.</p>
        
        <div class="form-field mt-4">
            <label>Přidat globální tým</label>
            <div class="input-group">
                <select v-model="selectedGlobalTeamId" class="select">
                    <option value="" disabled>Vybrat tým</option>
                    <option v-for="team in availableGlobalTeams" :key="team.id" :value="team.id">
                        {{ team.name }}
                    </option>
                </select>
                <input type="number" placeholder="Počet hráčů" v-model="globalTeamPlayers" min="1" class="input" />
                <button @click="addTeamToQuiz" :disabled="!selectedGlobalTeamId || !globalTeamPlayers" class="button secondary-button">
                  <span class="material-icons">group_add</span>Přidat
                </button>
            </div>
        </div>
        
        <h4 class="mt-4">Týmy v kvízu</h4>
        <p v-if="quizTeams.length > 0" class="text-small text-muted">Připravené týmy pro kvíz:</p>
        <p v-else class="text-small text-italic text-center text-muted">Do kvízu zatím nebyly přidány žádné týmy.</p>
        
        <table v-if="quizTeams.length > 0" class="data-table mt-3">
          <thead>
            <tr>
              <th>Tým</th>
              <th>Počet hráčů</th>
              <th>Akce</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="team in quizTeams" :key="team.id">
              <td>{{ team.team_name }}</td>
              <td>{{ team.number_of_players }}</td>
              <td>
                <button class="button small-button danger-button" @click="confirmRemoveTeamFromQuiz(team.id)">
                  <span class="material-icons">person_remove</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="flex-center flex-gap-3 mt-4">
          <button @click="startQuiz" :disabled="quizTeams.length === 0" class="button large-button success-button">
            <span class="material-icons">play_arrow</span>Začít kvíz!
          </button>
          <button @click="backToQuizSelection" class="button large-button secondary-button">
            <span class="material-icons">arrow_back</span>Zpět na výběr
          </button>
          <button @click="confirmCancelQuizPreparation" class="button large-button danger-button">
            <span class="material-icons">delete</span>Zrušit přípravu
          </button>
        </div>
      </div>
      
      <div v-else-if="currentQuizInstance && isQuizStarted" class="card">
        <h3 class="text-center">Ovládání kvízu (Kolo {{ currentQuizInstance.current_round }})</h3>
        <div class="flex-center flex-gap-2 mt-4">
          <button class="button info-button" @click="openDisplayBoard">
            <span class="material-icons">tv</span>Zobrazení
          </button>
          <button v-if="isRoundInProgress" class="button warning-button" @click="confirmEndRound">
            <span class="material-icons">stop</span>Ukončit kolo
          </button>
          <button v-else-if="isRevealingScores" class="button secondary-button" @click="nextDisplayTeam">
            <span class="material-icons">arrow_forward</span>Zobrazit další tým ({{ currentQuizInstance.revealed_index }}/{{ quizTeams.length }})
          </button>
          <div v-else-if="isReadyForNextRound" class="flex-center flex-gap-2">
            <button @click="goToNextRound" :disabled="isQuizFinished" :class="['button', isQuizFinished ? 'secondary-button' : 'success-button']">
              <span class="material-icons">skip_next</span>{{ isQuizFinished ? 'Kvíz u konce' : `Další kolo (${(currentQuizInstance.current_round || 0) + 1})` }}
            </button>
            <button @click="resetDisplay" class="button secondary-button">
              <span class="material-icons">replay</span>Resetovat zobrazení
            </button>
          </div>
          <button @click="confirmFinishQuiz" class="button danger-button">
            <span class="material-icons">archive</span>Ukončit kvíz
          </button>
        </div>

        <h3 class="mt-5 text-center">Přehled skóre</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Tým</th>
              <th v-for="n in MAX_ROUNDS_LIMIT" :key="n" :class="{ 'highlight-column': currentQuizInstance && n === currentQuizInstance.current_round }">Kolo {{ n }}</th>
              <th>Celkem</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="team in quizTeams" :key="team.id">
              <td>
                <div class="flex-between">
                  <span>{{ team.team_name }} ({{ team.number_of_players }})</span>
                  <button class="button small-button danger-button" @click="confirmRemoveTeamFromQuiz(team.id)">
                    <span class="material-icons">person_remove</span>
                  </button>
                </div>
              </td>
              <td v-for="n in MAX_ROUNDS_LIMIT" :key="n">
                <div class="flex-center flex-gap-1">
                  <input type="number" :value="getScoreValue(team.id, n, 'regular_score')" @input="e => updateScore(team.id, n, 'regular_score', e.target.value)" :disabled="isRoundLocked(n)" class="input score-input" />
                  <button @click="toggleBonus(team.id, n)" :class="['bonus-button', { 'active': getScoreValue(team.id, n, 'bonus_score') }]">
                    <span class="material-icons">star</span>
                  </button>
                </div>
              </td>
              <td>{{ calculateTotal(team) }}</td>
            </tr>
          </tbody>
        </table>
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

const isRoundInProgress = computed(() => {
  return (
    currentQuizInstance.value &&
    currentQuizInstance.value.current_round > 0 &&
    !currentQuizInstance.value.is_revealing
  );
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
    const numericValue = parseFloat(value) || 0;
    
    try {
        // Check if score already exists
        const { data: existingScore, error: fetchError } = await supabase
            .from('scores')
            .select('id')
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
            // Create new score record
            const { error: insertError } = await supabase
                .from('scores')
                .insert({
                    quiz_team_id: teamId,
                    round_number: roundNumber,
                    [type]: numericValue
                });
                
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
  return roundNumber !== currentQuizInstance.value.current_round;
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
    // Implementace přesměrování na historii
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
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: Arial, sans-serif;
  color: #333;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  border-bottom: 2px solid #eee;
  padding-bottom: 1rem;
}

.title-container {
  text-align: center;
}

.header h1 {
  font-size: 2rem;
  margin-bottom: 0.25rem;
}

.header-buttons {
  display: flex;
  gap: 1rem;
}

.main-panel {
  display: grid;
  gap: 2rem;
}

.card {
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.form-field {
  margin-bottom: 1.5rem;
}

.form-field label {
  display: block;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.input-group {
  display: flex;
  gap: 0.5rem;
}

.input,
.select {
  flex-grow: 1;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 1rem;
}

.button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;
}

.small-button {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.large-button {
  padding: 1rem 2rem;
  font-size: 1.1rem;
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

.success-button {
  background-color: #2ecc71;
  color: white;
}

.success-button:hover {
  background-color: #27ae60;
}

.danger-button {
  background-color: #e74c3c;
  color: white;
}

.danger-button:hover {
  background-color: #c0392b;
}

.info-button {
  background-color: #3498db;
  color: white;
}

.info-button:hover {
  background-color: #2980b9;
}

.warning-button {
  background-color: #f39c12;
  color: white;
}

.warning-button:hover {
  background-color: #e67e22;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1.5rem;
}

.data-table th,
.data-table td {
  padding: 12px 15px;
  border: 1px solid #ddd;
  text-align: left;
}

.data-table th {
  background-color: #f4f7f9;
  font-weight: bold;
}

.highlight-column {
  background-color: #3498db;
  color: white;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.large-modal {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ddd;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #888;
}

.modal-body {
  padding-top: 1rem;
}

.text-center {
  text-align: center;
}

.text-muted {
  color: #7f8c8d;
}

.text-italic {
  font-style: italic;
}

.text-small {
  font-size: 0.9rem;
}

.mt-3 { margin-top: 1rem; }
.mt-4 { margin-top: 1.5rem; }
.mt-5 { margin-top: 2rem; }

.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flex-gap-1 { gap: 0.5rem; }
.flex-gap-2 { gap: 1rem; }
.flex-gap-3 { gap: 1.5rem; }

.score-input {
  width: 60px;
  text-align: center;
}

.bonus-button {
  background: none;
  border: none;
  cursor: pointer;
  color: #ccc;
  padding: 0.25rem;
  border-radius: 3px;
  transition: color 0.2s;
}

.bonus-button.active {
  color: gold;
}

.bonus-button:hover {
  background-color: #f0f0f0;
}
</style>
