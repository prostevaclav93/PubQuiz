<template>
  <div class="history-container">
    <header class="header">
      <h1>Historie dokončených kvízů</h1>
      <a href="/index.html" class="back-to-admin-button">Zpět do adminu</a>
    </header>

    <section class="admin-section filter-section">
      <h3>Filtry</h3>
      <div class="form-row">
        <label for="filter-date">Datum:</label>
        <input type="date" id="filter-date" v-model="selectedDate" @change="fetchCompletedQuizzes" />
      </div>
      <div class="form-row">
        <label for="filter-place">Místo:</label>
        <select id="filter-place" v-model="selectedPlaceId" @change="fetchCompletedQuizzes">
          <option value="">Všechna místa</option>
          <option v-for="place in places" :key="place.id" :value="place.id">{{ place.name }}</option>
        </select>
      </div>
    </section>

    <section class="admin-section" v-if="completedQuizzes.length > 0">
      <h3>Seznam kvízů ({{ completedQuizzes.length }})</h3>
      <ul class="quiz-list">
        <li v-for="quiz in completedQuizzes" :key="quiz.id">
          {{ formattedQuizDate(quiz.quiz_date) }} v {{ quiz.places.name }}
          <button @click="showDetails(quiz.id)" class="blue-button">Zobrazit detaily</button>
        </li>
      </ul>
    </section>
    <section class="admin-section" v-else>
      <p>Žádné dokončené kvízy nebyly nalezeny pro vybrané filtry.</p>
    </section>

    <section class="admin-section" v-if="selectedQuiz">
      <h3>
        Výsledky kvízu z {{ formattedQuizDate(selectedQuiz.quiz_date) }}
      </h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Tým</th>
              <th v-for="n in MAX_ROUNDS_LIMIT" :key="n">Kolo {{ n }}</th>
              <th>Celkem</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="quizTeam in sortedQuizTeams" :key="quizTeam.id">
              <td>{{ quizTeam.teams.name }}</td>
              <td v-for="roundNum in MAX_ROUNDS_LIMIT" :key="roundNum">
                {{ getScoreValue(quizTeam, roundNum, 'regular_score') + getScoreValue(quizTeam, roundNum, 'bonus_score') }}
              </td>
              <td>{{ calculateTotal(quizTeam) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button @click="selectedQuiz = null" class="red-button mt-4">Zavřít detaily</button>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '../supabase/supabaseClient';

const completedQuizzes = ref([]);
const places = ref([]);
const selectedQuiz = ref(null);
const selectedDate = ref('');
const selectedPlaceId = ref('');
const MAX_ROUNDS_LIMIT = 5;

onMounted(async () => {
  await fetchPlaces();
  await fetchCompletedQuizzes();
});

const fetchPlaces = async () => {
  const { data, error } = await supabase.from('places').select('*').order('name', { ascending: true });
  if (error) console.error('Error fetching places:', error);
  places.value = data || [];
};

const fetchCompletedQuizzes = async () => {
  let query = supabase
    .from('quiz_instances')
    .select('*, places(name)')
    .eq('is_completed', true)
    .order('created_at', { ascending: false });

  if (selectedDate.value) {
    query = query.eq('quiz_date', selectedDate.value);
  }
  if (selectedPlaceId.value) {
    query = query.eq('place_id', selectedPlaceId.value);
  }

  const { data, error } = await query;

  if (error) console.error('Error fetching completed quizzes:', error);
  completedQuizzes.value = data || [];
  selectedQuiz.value = null;
};

const showDetails = async (quizId) => {
  const { data, error } = await supabase
    .from('quiz_instances')
    .select('*, quiz_teams(*, teams(*), scores(*))')
    .eq('id', quizId)
    .single();

  if (error) {
    console.error('Error fetching quiz details:', error);
    selectedQuiz.value = null;
  } else {
    selectedQuiz.value = data;
  }
};

const getScoreValue = (quizTeam, roundNum, type) => {
  const score = quizTeam.scores.find(s => s.round_number === roundNum);
  return score ? score[type] : 0;
};

const calculateTotal = (quizTeam) => {
  return quizTeam.scores.reduce((sum, score) => sum + (score.regular_score || 0) + (score.bonus_score || 0), 0);
};

const sortedQuizTeams = computed(() => {
  if (!selectedQuiz.value) return [];
  return [...selectedQuiz.value.quiz_teams].sort((a, b) => calculateTotal(b) - calculateTotal(a));
});

const formattedQuizDate = (dateString) => {
  if (!dateString) return '';
  const quizDate = new Date(dateString);
  const formatter = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
  return formatter.format(quizDate);
};
</script>

<style scoped>
.history-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: Arial, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
  position: relative; /* Potřebné pro absolutní pozicování tlačítka */
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: #14532d;
}

.back-to-admin-button {
  position: absolute;
  top: 0;
  left: 0;
  padding: 0.5rem 1rem;
  background-color: #3b82f6; /* Modrá, aby se odlišila */
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
  transition: background-color 0.2s;
}

.back-to-admin-button:hover {
  background-color: #2563eb;
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

.filter-section .form-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.filter-section .form-row label {
  font-weight: 600;
  color: #1e293b;
  width: 80px;
}

.filter-section .form-row input,
.filter-section .form-row select {
  flex-grow: 1;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  max-width: 300px;
}

.quiz-list {
  list-style: none;
  padding: 0;
}

.quiz-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.quiz-list li:last-child {
  border-bottom: none;
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

button {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s, box-shadow 0.2s;
  border: none;
}

.blue-button { background-color: #3b82f6; }
.red-button { background-color: #ef4444; }
.mt-4 { margin-top: 1rem; }
</style>