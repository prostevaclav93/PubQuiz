<template>
  <div class="admin-panel-container">
    <header class="header">
      <h1>Správa Pubkvízu</h1>
      <p v-if="currentQuizInstance">{{ formattedQuizDateAndPlace }}</p>
      <p v-else>Žádná instance kvízu není aktivní. Vyberte místo a vytvořte novou.</p>
    </header>

    <div class="navigation-link">
      <a href="/quiz-history.html">Zobrazit historii kvízů</a>
    </div>

    <section class="admin-section" v-if="!isQuizStarted">
      <h3>Správa míst a kvízů</h3>
      <div class="form-row">
        <input type="text" v-model="newPlaceName" placeholder="Název místa" @keyup.enter="addPlace" />
        <button @click="addPlace">Přidat místo</button>
      </div>
      <div class="form-row">
        <select v-model="selectedPlaceId" class="compact-select">
          <option value="">Vyberte místo pro kvíz</option>
          <option v-for="place in places" :key="place.id" :value="place.id">{{ place.name }}</option>
        </select>
        <button @click="createNewQuizInstance" :disabled="!selectedPlaceId" class="green-button">
          Vytvořit novou instanci kvízu
        </button>
      </div>
    </section>

    <section class="admin-section" v-if="!isQuizStarted">
      <h3>Správa globálních týmů</h3>
      <div class="form-row">
        <input type="text" v-model="newTeamName" placeholder="Název nového týmu" @keyup.enter="addGlobalTeam" />
        <button @click="addGlobalTeam">Přidat globální tým</button>
      </div>
      <div class="form-row">
        <select v-model="selectedGlobalTeamId" :disabled="!currentQuizInstance" class="compact-select">
          <option value="">Vyberte globální tým</option>
          <option v-for="team in availableGlobalTeams" :key="team.id" :value="team.id">{{ team.name }}</option>
        </select>
        <button @click="addTeamToQuiz" :disabled="!selectedGlobalTeamId || !currentQuizInstance" class="green-button">
          Přidat tým do kvízu
        </button>
      </div>
    </section>

    <section v-if="currentQuizInstance && !isQuizStarted" class="admin-section">
      <h3>Příprava kvízu</h3>
      <p v-if="quizTeams.length > 0" class="mb-4">Týmy připravené pro kvíz v <strong>{{ currentQuizInstance.place_name }}</strong>:</p>
      <p v-else class="mb-4">Do kvízu zatím nebyly přidány žádné týmy. Přidejte tým z panelu výše.</p>
      
      <div class="table-container mb-4" v-if="quizTeams.length > 0">
        <table id="setup-table">
          <thead>
            <tr>
              <th>Tým</th>
              <th>Akce</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="quizTeam in quizTeams" :key="quizTeam.id">
              <td>{{ quizTeam.team_name }}</td>
              <td>
                <button @click="removeTeamFromQuiz(quizTeam.id)" class="remove-team-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <button @click="startQuiz" :disabled="quizTeams.length === 0" class="green-button large-button">
        Začít kvíz!
      </button>
    </section>
    
    <section id="control" v-else-if="isQuizStarted" class="admin-section">
      <h3>Ovládání kvízu</h3>
      <div class="main-control-buttons">
        <div class="left-buttons">
          <button @click="openDisplayBoard" class="blue-button control-button">Otevřít zobrazení</button>
          <button v-if="isRoundInProgress" @click="endRound" class="green-button control-button">
            Ukončit kolo
          </button>
          <button v-else-if="isRevealingScores" @click="nextDisplayTeam" class="yellow-button control-button">
            Zobrazit další tým ({{ currentQuizInstance.revealed_index }}/{{ quizTeams.length }})
          </button>
          <div v-else-if="isReadyForNextRound" class="button-group">
            <button @click="goToNextRound" :disabled="isQuizFinished" class="green-button control-button">
              {{ isQuizFinished ? 'Kvíz je u konce' : `Další kolo (${currentQuizInstance.current_round + 1}/${MAX_ROUNDS_LIMIT})` }}
            </button>
            <button @click="resetDisplay" class="orange-button control-button">Resetovat zobrazení</button>
          </div>
        </div>
        <div class="right-buttons">
          <button @click="finishQuiz" class="red-button control-button">Ukončit kvíz</button>
        </div>
      </div>

      <h3 class="mt-4">Přehled skóre (Kolo {{ currentQuizInstance.current_round }})</h3>
      <div class="table-container">
        <table id="admin-table">
          <thead>
            <tr>
              <th>Tým</th>
              <th v-for="n in MAX_ROUNDS_LIMIT" :key="n" :class="{ 'current-round-header': n === currentQuizInstance.current_round }">
                Kolo {{ n }}
              </th>
              <th>Celkem</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="quizTeam in quizTeams" :key="quizTeam.id">
              <td>
                <div class="team-name-wrapper">
                  <span class="team-name">{{ quizTeam.team_name }}</span>
                  <button @click="removeTeamFromQuiz(quizTeam.id)" class="remove-team-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                  </button>
                </div>
              </td>
              <td v-for="roundNum in MAX_ROUNDS_LIMIT" :key="roundNum"
                  :class="{ 'current-round-cell': roundNum === currentQuizInstance.current_round }">
                <div class="score-container">
                  <input type="number"
                         :value="getScoreValue(quizTeam.id, roundNum, 'regular_score')"
                         min="0" step="0.5"
                         :readonly="isRoundLocked(roundNum)"
                         :class="{ 'readonly-input': isRoundLocked(roundNum) }"
                         @change="e => updateScore(quizTeam.id, roundNum, 'regular_score', e.target.value)" />
                  <button class="bonus-btn"
                          @click="toggleBonus(quizTeam.id, roundNum)"
                          :disabled="isRoundLocked(roundNum)"
                          :class="{ 'bonus-active': getScoreValue(quizTeam.id, roundNum, 'bonus_score') }">
                    {{ getScoreValue(quizTeam.id, roundNum, 'bonus_score') ? '+1 B' : '+B' }}
                  </button>
                </div>
              </td>
              <td>{{ calculateTotal(quizTeam) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    
    <div v-else-if="currentQuizInstance" class="info-box info">
      <p>Do kvízu zatím nebyly přidány žádné týmy. Přidejte tým z panelu výše.</p>
    </div>
    <div v-else class="info-box info">
      <p>Vyberte místo a vytvořte novou instanci kvízu pro zobrazení ovládacího panelu.</p>
    </div>
  </div>

  <MessageBox ref="messageBoxRef" />
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { supabase } from '../supabase/supabaseClient';
import MessageBox from './MessageBox.vue';

// Data
const places = ref([]);
const globalTeams = ref([]);
const quizTeams = ref([]);
const scores = ref([]);
const currentQuizInstance = ref(null);
const selectedPlaceId = ref('');
const newPlaceName = ref('');
const newTeamName = ref('');
const selectedGlobalTeamId = ref('');
const MAX_ROUNDS_LIMIT = 5;
const localScores = ref({});

// Reference na MessageBox komponentu
const messageBoxRef = ref(null);

// Realtime kanály
const supabaseChannels = ref([]);

// Computed
const availableGlobalTeams = computed(() => {
  const currentQuizTeamIds = new Set(quizTeams.value.map(qt => qt.team_id));
  return globalTeams.value.filter(team => !currentQuizTeamIds.has(team.id));
});

const formattedQuizDateAndPlace = computed(() => {
  if (!currentQuizInstance.value) return '';
  const quizDate = new Date(currentQuizInstance.value.quiz_date);
  const formatter = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
  const formattedDate = formatter.format(quizDate);
  return `${formattedDate} v ${currentQuizInstance.value.place_name}`;
});

const isQuizStarted = computed(() => {
  return currentQuizInstance.value?.current_round > 0;
});

const isQuizFinished = computed(() => {
  return currentQuizInstance.value?.current_round >= MAX_ROUNDS_LIMIT;
});

const isRoundInProgress = computed(() => {
  return currentQuizInstance.value?.current_round > 0 && currentQuizInstance.value?.revealed_index === 0;
});

const isRevealingScores = computed(() => {
  return currentQuizInstance.value?.current_round > 0 && currentQuizInstance.value?.revealed_index > 0 && currentQuizInstance.value?.revealed_index < quizTeams.value.length;
});

const isReadyForNextRound = computed(() => {
  return currentQuizInstance.value?.current_round > 0 && currentQuizInstance.value?.revealed_index >= quizTeams.value.length;
});

const isRoundLocked = (roundNum) => {
  return roundNum > currentQuizInstance.value?.current_round;
};

// Lifecycle
onMounted(async () => {
  await fetchInitialData();
  if (currentQuizInstance.value) {
    setupSupabaseSubscription(currentQuizInstance.value.id);
  }
});

onUnmounted(() => {
  supabaseChannels.value.forEach(channel => supabase.removeChannel(channel));
});

// Methods
const fetchInitialData = async () => {
  console.log('Fetching initial data...');
  const { data: placesData, error: placesError } = await supabase.from('places').select('*');
  if (placesError) {
    console.error('Error fetching places:', placesError);
  } else {
    places.value = placesData || [];
    console.log('Places fetched:', places.value);
  }

  const { data: globalTeamsData, error: globalTeamsError } = await supabase.from('teams').select('*');
  if (globalTeamsError) {
    console.error('Error fetching global teams:', globalTeamsError);
  } else {
    globalTeams.value = globalTeamsData || [];
    console.log('Global teams fetched:', globalTeams.value);
  }

  const { data: latestQuizInstance, error: quizError } = await supabase
    .from('quiz_instances')
    .select('*, places(name)')
    .eq('is_completed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (quizError && quizError.code !== 'PGRST116') {
    console.error('Error fetching latest quiz instance:', quizError);
  }

  if (latestQuizInstance) {
    console.log('Active quiz instance found:', latestQuizInstance);
    const isNewInstance = !currentQuizInstance.value || currentQuizInstance.value.id !== latestQuizInstance.id;
    currentQuizInstance.value = {
      ...latestQuizInstance,
      place_name: latestQuizInstance.places.name
    };
    await fetchQuizSpecificData(currentQuizInstance.value.id);
    if (isNewInstance) {
      setupSupabaseSubscription(currentQuizInstance.value.id);
    }
  } else {
    console.log('No active quiz instance found.');
    currentQuizInstance.value = null;
    supabaseChannels.value.forEach(channel => supabase.removeChannel(channel));
    supabaseChannels.value = [];
  }
};

const setupSupabaseSubscription = (instanceId) => {
  supabaseChannels.value.forEach(channel => supabase.removeChannel(channel));

  const instanceChannel = supabase.channel(`quiz_instance:${instanceId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_instances', filter: `id=eq.${instanceId}` }, () => fetchInitialData());
  const teamsChannel = supabase.channel(`quiz_teams:${instanceId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_teams', filter: `quiz_instance_id=eq.${instanceId}` }, () => fetchInitialData());
  const scoresChannel = supabase.channel(`scores:${instanceId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, payload => {
    // Aktualizujeme pouze lokální stav, aby nedocházelo k problikávání
    if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
      const { new: newRecord } = payload;
      setScoreValue(newRecord.quiz_team_id, newRecord.round_number, 'regular_score', newRecord.regular_score);
      setScoreValue(newRecord.quiz_team_id, newRecord.round_number, 'bonus_score', newRecord.bonus_score);
    }
    setTimeout(() => {
        fetchInitialData();
    }, 500);
  });

  supabaseChannels.value = [instanceChannel, teamsChannel, scoresChannel];
  supabaseChannels.value.forEach(channel => channel.subscribe());
};

const fetchQuizSpecificData = async (quizInstanceId) => {
  const { data: quizTeamsData, error: quizTeamsError } = await supabase
    .from('quiz_teams')
    .select('*, teams(name)')
    .eq('quiz_instance_id', quizInstanceId)
    .order('created_at', { ascending: true });

  if (quizTeamsError) console.error('Error fetching quiz teams:', quizTeamsError);
  quizTeams.value = quizTeamsData ? quizTeamsData.map(qt => ({ ...qt, team_name: qt.teams.name })) : [];

  const quizTeamIds = quizTeams.value.map(qt => qt.id);
  const { data: scoresData, error: scoresError } = await supabase
    .from('scores')
    .select('*')
    .in('quiz_team_id', quizTeamIds);

  if (scoresError) console.error('Error fetching scores:', scoresError);
  scores.value = scoresData || [];
};

const addPlace = async () => {
  if (newPlaceName.value.trim()) {
    const { error } = await supabase.from('places').insert({ name: newPlaceName.value.trim() });
    if (error) console.error('Error adding place:', error);
    else {
      newPlaceName.value = '';
    }
  }
};

const createNewQuizInstance = async () => {
  console.log('createNewQuizInstance triggered.');
  console.log('selectedPlaceId:', selectedPlaceId.value);

  if (!selectedPlaceId.value) {
    if (messageBoxRef.value) messageBoxRef.value.showMessage('Prosím, vyberte místo pro nový kvíz.');
    console.error('createNewQuizInstance failed: No place selected.');
    return;
  }
  
  if (currentQuizInstance.value) {
    const confirmation = await messageBoxRef.value.showConfirm('Opravdu chcete vytvořit novou instanci kvízu? Tato akce smaže aktuální data!');
    if (!confirmation) {
      console.log('Quiz creation cancelled by user.');
      return;
    }
  }
  
  console.log('Attempting to create new quiz instance...');
  const { data, error } = await supabase
    .from('quiz_instances')
    .insert({ quiz_date: new Date().toISOString().split('T')[0], place_id: selectedPlaceId.value, is_completed: false, current_round: 0 })
    .select('*, places(name)')
    .single();

  if (error) {
    console.error('Error creating quiz instance:', error);
    if (messageBoxRef.value) messageBoxRef.value.showMessage(`Chyba při vytváření kvízu: ${error.message}`);
  } else {
    console.log('Successfully created new quiz instance:', data);
    currentQuizInstance.value = {
      ...data,
      place_name: data.places.name
    };
    await fetchQuizSpecificData(currentQuizInstance.value.id);
    setupSupabaseSubscription(currentQuizInstance.value.id);
    if (messageBoxRef.value) messageBoxRef.value.showMessage('Nová instance kvízu byla úspěšně vytvořena.');
  }
};

const addGlobalTeam = async () => {
  if (newTeamName.value.trim()) {
    const { error } = await supabase.from('teams').insert({ name: newTeamName.value.trim() });
    if (error) console.error('Error adding global team:', error);
    else {
      newTeamName.value = '';
    }
  }
};

const addTeamToQuiz = async () => {
  if (!currentQuizInstance.value || !selectedGlobalTeamId.value) return;

  const exists = quizTeams.value.some(qt => qt.team_id === selectedGlobalTeamId.value);
  if (exists) {
    if (messageBoxRef.value) messageBoxRef.value.showMessage('Tento tým je již v aktuálním kvízu.');
    return;
  }

  const { error } = await supabase.from('quiz_teams').insert({
    quiz_instance_id: currentQuizInstance.value.id,
    team_id: selectedGlobalTeamId.value,
  });
  if (error) console.error('Error adding team to quiz instance:', error);
  else {
    selectedGlobalTeamId.value = '';
  }
};

const removeTeamFromQuiz = async (quizTeamId) => {
  const confirmation = await messageBoxRef.value.showConfirm('Opravdu chcete odebrat tento tým z kvízu? Smaže to i jeho skóre!');
  if (!confirmation) return;

  const { error: deleteScoresError } = await supabase.from('scores').delete().eq('quiz_team_id', quizTeamId);
  const { error: deleteTeamError } = await supabase.from('quiz_teams').delete().eq('id', quizTeamId);

  if (deleteScoresError || deleteTeamError) console.error('Error removing team from quiz:', deleteScoresError || deleteTeamError);
};

const startQuiz = async () => {
  if (!currentQuizInstance.value) return;

  const confirmation = await messageBoxRef.value.showConfirm('Opravdu chcete zahájit kvíz?');
  if (!confirmation) return;

  const { error } = await supabase
    .from('quiz_instances')
    .update({ current_round: 1, revealed_index: 0 })
    .eq('id', currentQuizInstance.value.id);

  if (error) console.error('Error starting quiz:', error);
};

const endRound = async () => {
  if (!currentQuizInstance.value) return;
  
  const confirmation = await messageBoxRef.value.showConfirm('Opravdu chcete ukončit kolo a zobrazit výsledky?');
  if (!confirmation) return;

  const { error } = await supabase
    .from('quiz_instances')
    .update({ revealed_index: 1 })
    .eq('id', currentQuizInstance.value.id);

  if (error) console.error('Error ending round:', error);
}

const goToNextRound = async () => {
  if (!currentQuizInstance.value || isQuizFinished.value) return;
  
  const confirmation = await messageBoxRef.value.showConfirm(`Opravdu chcete posunout kvíz do kola ${currentQuizInstance.value.current_round + 1}?`);
  if (!confirmation) return;

  const newRound = currentQuizInstance.value.current_round + 1;
  const { error } = await supabase
    .from('quiz_instances')
    .update({ current_round: newRound, revealed_index: 0 })
    .eq('id', currentQuizInstance.value.id);

  if (error) console.error('Error updating round:', error);
};

const openDisplayBoard = () => {
  if (currentQuizInstance.value) {
    window.open(`/display.html?quizInstanceId=${currentQuizInstance.value.id}`, '_blank');
  } else {
    if (messageBoxRef.value) messageBoxRef.value.showMessage('Nejprve musíte vytvořit nebo vybrat instanci kvízu.');
  }
};

const nextDisplayTeam = async () => {
  if (!currentQuizInstance.value || currentQuizInstance.value.revealed_index >= quizTeams.value.length) return;

  const newRevealedIndex = currentQuizInstance.value.revealed_index + 1;
  const { error } = await supabase
    .from('quiz_instances')
    .update({ revealed_index: newRevealedIndex })
    .eq('id', currentQuizInstance.value.id);

  if (error) console.error('Error updating revealed index:', error);
};

const resetDisplay = async () => {
  if (!currentQuizInstance.value) return;
  
  const confirmation = await messageBoxRef.value.showConfirm('Opravdu chcete resetovat zobrazení? Výsledky se skryjí a budou se zobrazovat od začátku.');
  if (!confirmation) return;

  const { error } = await supabase
    .from('quiz_instances')
    .update({ revealed_index: 0 })
    .eq('id', currentQuizInstance.value.id);

  if (error) console.error('Error resetting display:', error);
};

const finishQuiz = async () => {
  if (!currentQuizInstance.value) return;

  if (await messageBoxRef.value.showConfirm('Opravdu chcete ukončit tento kvíz a uložit ho do historie? Tato akce ho skryje z aktivního panelu.')) {
    const { error: updateError } = await supabase
      .from('quiz_instances')
      .update({ is_completed: true })
      .eq('id', currentQuizInstance.value.id);

    if (updateError) {
      console.error('Error finishing quiz:', updateError);
    } else {
      currentQuizInstance.value = null;
    }
  }
};

const getScoreValue = (quizTeamId, roundNum, type) => {
  const localScore = localScores.value?.[quizTeamId]?.[roundNum]?.[type];
  if (localScore !== undefined) {
    return localScore;
  }
  const score = scores.value.find(s => s.quiz_team_id === quizTeamId && s.round_number === roundNum);
  return score ? score[type] : (type === 'regular_score' ? 0 : 0);
};

const setScoreValue = (quizTeamId, roundNum, type, value) => {
  if (!localScores.value[quizTeamId]) {
    localScores.value[quizTeamId] = {};
  }
  if (!localScores.value[quizTeamId][roundNum]) {
    localScores.value[quizTeamId][roundNum] = {};
  }
  localScores.value[quizTeamId][roundNum][type] = value;
};

const updateScore = async (quizTeamId, roundNum, type, value) => {
  const numericValue = parseFloat(value) || 0;
  
  if (roundNum > currentQuizInstance.value.current_round) {
    return;
  }

  if (roundNum < currentQuizInstance.value.current_round) {
    const confirmation = await messageBoxRef.value.showConfirm(`Opravdu chcete upravit skóre v již proběhlém kole ${roundNum}?`);
    if (!confirmation) {
      return;
    }
  }

  setScoreValue(quizTeamId, roundNum, type, numericValue);

  const existingScore = scores.value.find(s => s.quiz_team_id === quizTeamId && s.round_number === roundNum);

  if (existingScore) {
    const { data, error } = await supabase
      .from('scores')
      .update({ [type]: numericValue })
      .eq('id', existingScore.id)
      .select()
      .single();
    if (error) {
        console.error('Error updating score:', error);
    } else {
        const index = scores.value.findIndex(s => s.id === data.id);
        if (index !== -1) {
            scores.value[index] = data;
        }
    }
  } else {
    const { data, error } = await supabase
      .from('scores')
      .insert({ quiz_team_id: quizTeamId, round_number: roundNum, [type]: numericValue })
      .select()
      .single();
    if (error) {
        console.error('Error inserting new score:', error);
    } else {
        scores.value.push(data);
    }
  }
};

const toggleBonus = async (quizTeamId, roundNum) => {
  if (roundNum > currentQuizInstance.value.current_round) {
    return;
  }

  if (roundNum < currentQuizInstance.value.current_round) {
    const confirmation = await messageBoxRef.value.showConfirm(`Opravdu chcete upravit skóre v již proběhlém kole ${roundNum}?`);
    if (!confirmation) {
      return;
    }
  }

  const existingScore = scores.value.find(s => s.quiz_team_id === quizTeamId && s.round_number === roundNum);
  const newBonus = existingScore && existingScore.bonus_score === 1 ? 0 : 1;

  setScoreValue(quizTeamId, roundNum, 'bonus_score', newBonus);

  if (existingScore) {
    const { data, error } = await supabase
      .from('scores')
      .update({ bonus_score: newBonus })
      .eq('id', existingScore.id)
      .select()
      .single();
    if (error) {
        console.error('Error toggling bonus:', error);
    } else {
        const index = scores.value.findIndex(s => s.id === data.id);
        if (index !== -1) {
            scores.value[index] = data;
        }
    }
  } else {
    const { data, error } = await supabase
      .from('scores')
      .insert({ quiz_team_id: quizTeamId, round_number: roundNum, bonus_score: newBonus })
      .select()
      .single();
    if (error) {
        console.error('Error inserting new score with bonus:', error);
    } else {
        scores.value.push(data);
    }
  }
};

const calculateTotal = (quizTeam) => {
  return scores.value
    .filter(s => s.quiz_team_id === quizTeam.id)
    .reduce((sum, score) => sum + (score.regular_score || 0) + (score.bonus_score || 0), 0);
};
</script>

<style scoped>
.admin-panel-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: Arial, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: #14532d;
}

.header p {
  color: #64748b;
  font-size: 1rem;
}

.navigation-link {
  text-align: right;
  margin-bottom: 1.5rem;
}

.navigation-link a {
  padding: 0.5rem 1rem;
  background-color: #16a34a;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
  transition: background-color 0.2s;
}

.navigation-link a:hover {
  background-color: #15803d;
}

.admin-section {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.admin-section h3 {
  font-size: 1.5rem;
  color: #0f172a;
  margin-bottom: 1rem;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 0.5rem;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

input[type="text"],
select {
  flex-grow: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  min-width: 200px;
}

button {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s, box-shadow 0.2s;
  border: none;
}

button:hover {
  filter: brightness(1.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

button:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
  filter: none;
  box-shadow: none;
}

.green-button { background-color: #16a34a; }
.blue-button { background-color: #3b82f6; }
.yellow-button { background-color: #f59e0b; }
.orange-button { background-color: #f97316; }
.red-button { background-color: #ef4444; }

/* Menší a kompaktnější tlačítka v ovládacím panelu */
.control-button {
  min-width: 160px;
  height: 48px;
  font-size: 1rem;
  padding: 0.5rem 1rem;
}

/* Upravení "velkých" tlačítek, aby odpovídala nové kompaktnější velikosti */
.large-button {
  font-size: 1rem;
  padding: 0.75rem 1.5rem;
  margin-top: 0.5rem;
}

.main-control-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.left-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.right-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.button-group {
  display: flex;
  gap: 0.75rem;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

th, td {
  text-align: center;
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}

thead th {
  background-color: #f8fafc;
  color: #1e293b;
  font-weight: 600;
  white-space: nowrap;
}

tbody tr:nth-child(odd) {
  background-color: #f1f5f9;
}

tbody tr:hover {
  background-color: #e2e8f0;
}

.current-round-header {
  background-color: #bfdbfe;
  color: #1e40af;
}

.current-round-cell {
  background-color: #dbeafe;
}

.score-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.score-container input {
  width: 60px;
  padding: 0.3rem;
  text-align: center;
}

.bonus-btn {
  font-size: 0.8rem;
  padding: 0.3rem 0.6rem;
  background-color: #94a3b8;
}

.bonus-btn.bonus-active {
  background-color: #22c55e;
}

/* Styly pro úpravu vzhledu tlačítka odstranění týmu */
td .team-name-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.remove-team-btn {
  background: none;
  border: none;
  color: #ef4444;
  padding: 0;
  cursor: pointer;
  transition: opacity 0.2s;
  height: auto;
  width: auto;
  opacity: 0; /* Skryté ve výchozím stavu */
}

tr:hover .remove-team-btn {
  opacity: 1; /* Zobrazí se při najetí na řádek */
}

/* Styl pro tlačítko v sekci "Příprava kvízu" */
#setup-table .remove-team-btn {
  opacity: 1; /* V této tabulce je vždy viditelné */
}

#setup-table tr:hover .remove-team-btn {
  opacity: 1;
}

/* Nový styl pro zašedlé input pole */
.readonly-input {
  background-color: #e2e8f0;
  border-color: #94a3b8;
  cursor: not-allowed;
}
</style>