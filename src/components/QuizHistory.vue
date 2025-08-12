<template>
  <div class="container quiz-history-container">
    <MessageBox ref="messageBox" />
    <header class="header flex-between">
      <div class="flex-gap-2">
        <button class="button secondary-button" @click="goToAdminPanel">
          <span class="material-icons">arrow_back</span>Zpět na admin
        </button>
      </div>
      <div class="title-container">
        <h1>Historie kvízů</h1>
        <p class="text-muted">Přehled a výsledky minulých kvízů.</p>
      </div>
    </header>

    <div v-if="quizHistory.length > 0" class="card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Místo</th>
            <th>Akce</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="quiz in quizHistory" :key="quiz.id">
            <td>{{ formattedDate(quiz.quiz_date) }}</td>
            <td>{{ quiz.place_name }}</td>
            <td>
              <button class="button small-button info-button" @click="toggleResults(quiz)">
                <span class="material-icons">visibility</span>{{ quiz.showResults ? 'Skrýt výsledky' : 'Zobrazit výsledky' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-for="quiz in quizHistory" :key="`results-${quiz.id}`" v-if="quiz.showResults">
        <h4 class="mt-4">Výsledky kvízu v {{ quiz.place_name }} ({{ formattedDate(quiz.quiz_date) }})</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>Pořadí</th>
              <th>Tým</th>
              <th>Počet hráčů</th>
              <th>Celkem bodů</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(team, index) in quiz.sortedTeams" :key="team.id">
              <td>{{ index + 1 }}</td>
              <td>{{ team.team_name }}</td>
              <td>{{ team.number_of_players }}</td>
              <td>{{ team.total_score }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-else class="card text-center text-muted">
      <p>Historie kvízů je prázdná.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../supabase/supabaseClient';
import MessageBox from './MessageBox.vue';

const messageBox = ref(null);
const quizHistory = ref([]);

onMounted(async () => {
  await fetchQuizHistory();
});

const fetchQuizHistory = async () => {
  const { data: instancesData, error: instancesError } = await supabase
    .from('quiz_instances')
    .select('id, quiz_date, places(name)')
    .eq('is_completed', true)
    .order('quiz_date', { ascending: false });
  
  if (instancesError) {
    messageBox.value.error('Chyba', 'Nepodařilo se načíst historii kvízů.');
    return;
  }
  
  const fetchedHistory = instancesData.map(instance => ({
    ...instance,
    place_name: instance.places.name,
    showResults: false,
    sortedTeams: []
  }));

  quizHistory.value = fetchedHistory;
};

const toggleResults = async (quiz) => {
  if (quiz.showResults) {
    quiz.showResults = false;
    return;
  }

  const { data: quizTeamsData, error: quizTeamsError } = await supabase
    .from('quiz_teams')
    .select('*, teams(name), scores(*)')
    .eq('quiz_instance_id', quiz.id);

  if (quizTeamsError) {
    messageBox.value.error('Chyba', 'Nepodařilo se načíst výsledky kvízu.');
    return;
  }

  const sortedTeams = quizTeamsData.map(team => {
    const totalScore = team.scores.reduce((sum, score) => sum + (score.regular_score || 0) + (score.bonus_score || 0), 0);
    return {
      id: team.id,
      team_name: team.teams.name,
      number_of_players: team.number_of_players,
      total_score: totalScore
    };
  }).sort((a, b) => b.total_score - a.total_score);

  quiz.sortedTeams = sortedTeams;
  quiz.showResults = true;
};

const formattedDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('cs-CZ', { dateStyle: 'long', timeStyle: 'short' });
};

const goToAdminPanel = () => {
  window.location.href = '/index.html';
};
</script>