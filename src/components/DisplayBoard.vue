<template>
  <div class="display-board-container">
    <header class="header">
      <h1>Výsledky Pubkvízu</h1>
      <h2 v-if="currentQuizInstance">{{ formattedQuizDateAndPlace }}</h2>
      <h2 v-else>Čekám na aktivní kvíz...</h2>
    </header>
    
    <div v-if="currentQuizInstance && currentQuizInstance.revealed_index === 0" class="waiting-animation">
      <div class="waiting-animation-question">?</div>
      <p>Výsledky se brzy zobrazí...</p>
    </div>

    <section class="results-section" v-if="currentQuizInstance && currentQuizInstance.revealed_index > 0">
      <div class="table-container">
        <table id="results-table">
          <thead>
            <tr>
              <th>Pořadí</th>
              <th>Tým</th>
              <th v-for="n in maxRounds" :key="n" :class="{ 'current-round-header': n === currentQuizInstance?.current_round }">
                Kolo {{ n }}
              </th>
              <th :class="{ 'final-total-highlight': isQuizFinished }">Celkem</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(team, index) in displayedTeams" :key="team.id">
              <td>{{ getRankEmoji(index + teamsToHideCount) }}</td>
              <td>{{ team.team_name }}</td>
              <td v-for="roundNum in maxRounds" :key="roundNum"
                  :class="{ 'current-round-cell': roundNum === currentQuizInstance?.current_round }">
                  {{ getScoreValue(team.id, roundNum, 'regular_score') }}
                  <span v-if="getScoreValue(team.id, roundNum, 'bonus_score')" class="plus-one"> +1</span>
              </td>
              <td class="total-score" :class="{ 'final-total-highlight-cell': isQuizFinished }">{{ team.total }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { supabase } from '../supabase/supabaseClient';

// Data
const currentQuizInstance = ref(null);
const quizTeams = ref([]);
const scores = ref([]);
const maxRounds = ref(5);
const quizInstanceId = ref(null);
const supabaseChannels = ref([]);

// Computed
const sortedTeams = computed(() => {
  if (!quizTeams.value) return [];
  return [...quizTeams.value]
    .map(quizTeam => ({
      ...quizTeam,
      total: calculateTotal(quizTeam.id)
    }))
    .sort((a, b) => b.total - a.total);
});

const teamsToHideCount = computed(() => {
  if (!currentQuizInstance.value) return 0;
  return sortedTeams.value.length - currentQuizInstance.value.revealed_index;
});

const displayedTeams = computed(() => {
  if (!sortedTeams.value) return [];
  return sortedTeams.value.slice(teamsToHideCount.value);
});

const formattedQuizDateAndPlace = computed(() => {
  if (!currentQuizInstance.value) return '';
  const quizDate = new Date(currentQuizInstance.value.quiz_date);
  const formatter = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
  const formattedDate = formatter.format(quizDate);
  return `${formattedDate} v ${currentQuizInstance.value.place_name}`;
});

const isQuizFinished = computed(() => {
  return currentQuizInstance.value?.current_round >= maxRounds.value;
});

// Lifecycle
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  quizInstanceId.value = urlParams.get('quizInstanceId');
  
  if (quizInstanceId.value) {
    fetchData(quizInstanceId.value);
    setupSupabaseSubscription(quizInstanceId.value);
  } else {
    console.warn('No quiz instance ID provided in the URL. Display board will be empty.');
  }
});

onUnmounted(() => {
  supabaseChannels.value.forEach(channel => supabase.removeChannel(channel));
});

// Methods
const fetchData = async (instanceId) => {
  if (!instanceId) return;

  const { data: instanceData, error: instanceError } = await supabase
    .from('quiz_instances')
    .select('*, places(name)')
    .eq('id', instanceId)
    .single();
  if (instanceError) console.error('Error fetching quiz instance details:', instanceError);
  currentQuizInstance.value = instanceData ? { ...instanceData, place_name: instanceData.places.name } : null;

  const { data: quizTeamsData, error: quizTeamsError } = await supabase
    .from('quiz_teams')
    .select('*, teams(name)')
    .eq('quiz_instance_id', instanceId);
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

const setupSupabaseSubscription = (instanceId) => {
  if (!instanceId) return;
  
  supabaseChannels.value.forEach(channel => supabase.removeChannel(channel));

  const instanceChannel = supabase.channel(`quiz_instance:${instanceId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_instances', filter: `id=eq.${instanceId}` }, () => fetchData(instanceId));
  const teamsChannel = supabase.channel(`quiz_teams:${instanceId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_teams', filter: `quiz_instance_id=eq.${instanceId}` }, () => fetchData(instanceId));
  const scoresChannel = supabase.channel(`scores:${instanceId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => fetchData(instanceId));

  supabaseChannels.value = [instanceChannel, teamsChannel, scoresChannel];
  supabaseChannels.value.forEach(channel => channel.subscribe());
};

const getScoreValue = (quizTeamId, roundNum, type) => {
  const score = scores.value.find(s => s.quiz_team_id === quizTeamId && s.round_number === roundNum);
  return score ? score[type] : (type === 'regular_score' ? 0 : 0);
};

const calculateTotal = (quizTeamId) => {
  return scores.value
    .filter(s => s.quiz_team_id === quizTeamId)
    .reduce((sum, score) => sum + (score.regular_score || 0) + (score.bonus_score || 0), 0);
};

const getRankEmoji = (index) => {
  const rank = index + 1;
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return String(rank);
};
</script>

<style scoped>
.display-board-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: Arial, sans-serif;
  color: #1e293b;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  color: #14532d;
}

.header h2 {
  font-size: 1.5rem;
  color: #64748b;
}

.waiting-animation {
  text-align: center;
  margin-top: 5rem;
}

.waiting-animation p {
  font-size: 2rem;
  color: #94a3b8;
  margin-top: 2rem;
}

.waiting-animation-question {
  display: inline-block;
  font-size: 10rem;
  font-weight: bold;
  color: #14532d; /* Změna barvy na tmavě zelenou */
  text-shadow: 0 0 10px rgba(20, 83, 45, 0.5), 0 0 20px rgba(20, 83, 45, 0.3); /* Změna barvy stínu na tmavě zelenou */
  animation: spinAndPulse 4s infinite ease-in-out;
}

@keyframes spinAndPulse {
  0% {
    transform: rotateY(0deg) scale(1);
    text-shadow: 0 0 10px rgba(20, 83, 45, 0.5), 0 0 20px rgba(20, 83, 45, 0.3);
  }
  50% {
    transform: rotateY(180deg) scale(1.1);
    text-shadow: 0 0 20px rgba(20, 83, 45, 0.7), 0 0 40px rgba(20, 83, 45, 0.5);
  }
  100% {
    transform: rotateY(360deg) scale(1);
    text-shadow: 0 0 10px rgba(20, 83, 45, 0.5), 0 0 20px rgba(20, 83, 45, 0.3);
  }
}

.results-section {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.table-container {
  overflow-x: auto;
}

#results-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

th, td {
  text-align: center;
  padding: 1rem 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}

thead th {
  background-color: #f8fafc;
  color: #1e293b;
  font-weight: 600;
  white-space: nowrap;
  font-size: 1.1rem;
}

tbody tr:last-child td {
  border-bottom: none;
}

.current-round-header {
  background-color: #bfdbfe;
  color: #1e40af;
}

.current-round-cell {
  background-color: #dbeafe;
}

.plus-one {
  color: #22c55e;
  font-weight: bold;
}

.total-score {
  font-weight: bold;
  font-size: 1.1rem;
  color: #14532d;
}

/* Nové styly pro zvýraznění na konci kvízu */
.final-total-highlight {
  background-color: #16a34a;
  color: white;
  font-size: 1.2rem;
  font-weight: bold;
}

.final-total-highlight-cell {
  background-color: #dcfce7;
  font-size: 1.2rem;
  color: #14532d;
  font-weight: bold;
}
</style>