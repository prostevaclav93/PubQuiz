<template>
  <div class="history-container">
    <header class="header">
      <a href="/index.html" class="back-to-admin-button">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left-circle-fill" viewBox="0 0 16 16">
          <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 7.5a.5.5 0 0 1 0 1H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5z"/>
        </svg>
        Zpět do adminu
      </a>
      <h1>Historie dokončených kvízů</h1>
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
          <span>{{ formattedQuizDate(quiz.quiz_date) }} v {{ quiz.places.name }}</span>
          <div class="actions">
            <button @click="showDetails(quiz.id)" class="button blue-button">Zobrazit detaily</button>
            <button @click="deleteQuiz(quiz.id)" class="button delete-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash-fill" viewBox="0 0 16 16">
                <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7.5a1 1 0 0 0-1 1h-1zM4 5h8v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zm.5 2a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 7a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 7zm3.5 0a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5z"/>
              </svg>
            </button>
          </div>
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
      <button @click="selectedQuiz = null" class="button red-button mt-4">Zavřít detaily</button>
    </section>
  </div>
  <MessageBox ref="messageBoxRef" />
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '../supabase/supabaseClient';
import MessageBox from './MessageBox.vue';

const completedQuizzes = ref([]);
const places = ref([]);
const selectedQuiz = ref(null);
const selectedDate = ref('');
const selectedPlaceId = ref('');
const MAX_ROUNDS_LIMIT = 5;

const messageBoxRef = ref(null);

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

const deleteQuiz = async (quizId) => {
  const confirmation = await messageBoxRef.value.showConfirm('Opravdu chcete smazat tento kvíz z historie? Tato akce je nevratná!');
  if (!confirmation) {
    return;
  }

  // Předpokládáme, že databázové schéma má kaskádní mazání, takže smazání instance smaže i týmy a skóre.
  const { error } = await supabase
    .from('quiz_instances')
    .delete()
    .eq('id', quizId);

  if (error) {
    console.error('Chyba při mazání kvízu:', error);
    if (messageBoxRef.value) messageBoxRef.value.showMessage('Chyba při mazání kvízu.');
  } else {
    // Okamžitá aktualizace seznamu
    completedQuizzes.value = completedQuizzes.value.filter(quiz => quiz.id !== quizId);
    selectedQuiz.value = null; // Pokud byl zobrazen, zavřeme detaily
    if (messageBoxRef.value) messageBoxRef.value.showMessage('Kvíz byl úspěšně smazán.');
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
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f0f4f8;
  color: #334155;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
  position: relative;
}

.header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #14532d;
  margin-bottom: 0.5rem;
}

.back-to-admin-button {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  text-decoration: none;
  border-radius: 9999px; /* Pill shape */
  font-weight: 600;
  transition: background-color 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.back-to-admin-button:hover {
  background-color: #2563eb;
}

.admin-section {
  background-color: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
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
  flex-shrink: 0;
}

.filter-section .form-row input,
.filter-section .form-row select {
  flex-grow: 1;
  padding: 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  max-width: 300px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
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
  transition: background-color 0.2s;
}

.quiz-list li:hover {
  background-color: #f8fafc;
}

.quiz-list li:last-child {
  border-bottom: none;
}

.quiz-list li span {
  font-weight: 500;
  color: #1e293b;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.button {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  border: none;
}

.button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.blue-button {
  background-color: #3b82f6;
}

.blue-button:hover {
  background-color: #2563eb;
}

.red-button {
  background-color: #ef4444;
}

.red-button:hover {
  background-color: #dc2626;
}

.delete-button {
  padding: 0.75rem;
  background-color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-button:hover {
  background-color: #dc2626;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  background-color: #f8fafc;
  border-radius: 8px;
  overflow: hidden;
}

th, td {
  text-align: center;
  padding: 1rem 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}

thead th {
  background-color: #e2e8f0;
  color: #1e293b;
  font-weight: 600;
  white-space: nowrap;
}

tbody tr:nth-child(even) {
  background-color: #f1f5f9;
}

.mt-4 { margin-top: 1rem; }
</style>