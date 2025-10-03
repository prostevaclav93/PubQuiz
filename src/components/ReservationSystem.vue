<template>
  <div class="reservations-page">
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <span class="material-icons">quiz</span>
        </div>
        <div class="header-text">
          <h1 class="page-title">Rezervace na Pubkvíz</h1>
          <p class="page-subtitle">Vyberte si podnik a ulovte si místo pro svůj tým na dalším kvízu!</p>
        </div>
      </div>
      <div class="header-decoration"></div>
    </div>
    
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Načítám dostupné kvízy...</p>
    </div>
    
    <div v-if="!loading && !selectedQuizInstance" class="content-container">
      <div v-if="filteredQuizInstances.length === 0" class="no-quizzes">
        <span class="material-icons">event_busy</span>
        <h3>Momentálně nejsou dostupné žádné kvízy</h3>
        <p>Zkuste to později nebo se přihlaste k odběru novinek</p>
      </div>
      
      <div v-else>
        <div class="section-header">
          <h2>Dostupné kvízy</h2>
          <div class="quiz-count">{{ filteredQuizInstances.length }} {{ filteredQuizInstances.length === 1 ? 'kvíz' : filteredQuizInstances.length <= 4 ? 'kvízy' : 'kvízů' }}</div>
        </div>
        <div class="reservation-grid">
          <ReservationCard
            v-for="instance in filteredQuizInstances"
            :key="instance.id"
            :quiz-instance="instance"
            :user-reservations="[]"
            @reserve="selectQuizInstance"
            @card-click="selectQuizInstance"
          />
        </div>
      </div>
    </div>
    
    <div v-if="selectedQuizInstance" class="reservation-form-container">
      <div class="form-navigation">
        <button @click="resetSelection" class="back-button">
          <span class="material-icons">arrow_back</span>
          <span>Zpět na výběr kvízů</span>
        </button>
        <div class="breadcrumb">
          <span>Výběr kvízu</span>
          <span class="material-icons">chevron_right</span>
          <span class="current">Rezervace</span>
        </div>
      </div>
      <ReservationForm
        :quiz-instance-id="selectedQuizInstance.id"
        :existing-reservations="selectedQuizReservations"
        :quiz-title="selectedQuizInstance.places.name"
        :quiz-date="formattedDate"
        :quiz-time="formattedTime"
        :quiz-location="selectedQuizInstance.places.address"
        @reservation-submitted="handleReservationSubmitted"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '../supabase/supabaseClient';
import ReservationCard from '../components/ReservationCard.vue';
import ReservationForm from '../components/ReservationForm.vue';

const activeQuizInstances = ref([]);
const selectedQuizInstance = ref(null);
const selectedQuizReservations = ref([]);
const loading = ref(true);

// Computed property to filter out past quizzes
const filteredQuizInstances = computed(() => {
  const now = new Date();
  
  return activeQuizInstances.value.filter(instance => {
    if (!instance.quiz_date || !instance.quiz_time) return false;
    
    // Create a datetime object from quiz_date and quiz_time
    const quizDateTime = new Date(`${instance.quiz_date}T${instance.quiz_time}`);
    
    // Only show quizzes that are in the future
    return quizDateTime > now;
  });
});

const fetchActiveQuizInstances = async () => {
  const { data, error } = await supabase
    .from('quiz_instances')
    // Oprava: Nyní načítáme 'number_of_players' z tabulky rezervací
    .select('*, places(*), reservations(number_of_players, teams(*))')
    .eq('is_completed', false)
    .order('quiz_date', { ascending: true });

  if (error) {
    console.error('Chyba při načítání kvízových instancí:', error);
  } else {
    activeQuizInstances.value = data || [];
  }
  loading.value = false;
};

const selectQuizInstance = async (quizInstanceId) => {
  const instance = activeQuizInstances.value.find(q => q.id === quizInstanceId);
  if (instance) {
    selectedQuizInstance.value = instance;
    selectedQuizReservations.value = instance.reservations || [];
  }
};

const formattedDate = computed(() => {
  if (!selectedQuizInstance.value?.quiz_date) return '';
  const quizDateTime = new Date(selectedQuizInstance.value.quiz_date);
  const formatter = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
  return formatter.format(quizDateTime);
});

const formattedTime = computed(() => {
  if (!selectedQuizInstance.value?.quiz_time) return '';
  return selectedQuizInstance.value.quiz_time.slice(0, 5);
});

const handleReservationSubmitted = () => {
  selectedQuizInstance.value = null;
  fetchActiveQuizInstances();
};

const resetSelection = () => {
  selectedQuizInstance.value = null;
};

onMounted(() => {
  fetchActiveQuizInstances();
});
</script>

<style scoped>
.reservations-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #fdf6e3 0%, #f7f3e9 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.page-header {
  background: linear-gradient(135deg, #4a3621 0%, #14532d 100%);
  color: #fdf6e3;
  padding: 3rem 2rem 4rem;
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
  display: flex;
  align-items: center;
  gap: 2rem;
  position: relative;
  z-index: 2;
}

.header-icon {
  background: rgba(252, 191, 73, 0.2);
  padding: 1.5rem;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(252, 191, 73, 0.3);
}

.header-icon .material-icons {
  font-size: 3rem;
  color: #fcbf49;
}

.header-text {
  flex-grow: 1;
}

.page-title {
  font-size: 3rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, #fdf6e3 0%, #fcbf49 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 1.25rem;
  margin: 0;
  opacity: 0.9;
  line-height: 1.5;
  max-width: 600px;
}

.header-decoration {
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2rem;
  background: linear-gradient(135deg, #fdf6e3 0%, #f7f3e9 100%);
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  min-height: 400px;
}

.loading-spinner {
  width: 60px;
  height: 60px;
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

.no-quizzes {
  text-align: center;
  padding: 4rem 2rem;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(74, 54, 33, 0.08);
}

.no-quizzes .material-icons {
  font-size: 4rem;
  color: #6b7280;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.no-quizzes h3 {
  color: #4a3621;
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
}

.no-quizzes p {
  color: #6b7280;
  margin: 0;
  font-size: 1.1rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(20, 83, 45, 0.1);
}

.section-header h2 {
  color: #14532d;
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

.quiz-count {
  background: linear-gradient(135deg, #14532d 0%, #2f855a 100%);
  color: #fdf6e3;
  padding: 0.75rem 1.25rem;
  border-radius: 25px;
  font-weight: 600;
  font-size: 1rem;
  box-shadow: 0 4px 16px rgba(20, 83, 45, 0.2);
}

.reservation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.reservation-form-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.form-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #ffffff;
  border: 2px solid rgba(20, 83, 45, 0.2);
  border-radius: 12px;
  padding: 0.75rem 1.25rem;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #14532d;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(74, 54, 33, 0.08);
}

.back-button:hover {
  background: #14532d;
  color: #fdf6e3;
  border-color: #14532d;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(20, 83, 45, 0.2);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.95rem;
  font-weight: 500;
}

.breadcrumb .material-icons {
  font-size: 1.25rem;
}

.breadcrumb .current {
  color: #14532d;
  font-weight: 600;
}

@media (max-width: 768px) {
  .page-header {
    padding: 2rem 1rem 3rem;
  }
  
  .header-content {
    flex-direction: column;
    text-align: center;
    gap: 1.5rem;
  }
  
  .page-title {
    font-size: 2.25rem;
  }
  
  .page-subtitle {
    font-size: 1.1rem;
  }
  
  .content-container {
    padding: 1rem;
  }
  
  .reservation-form-container {
    padding: 1rem;
  }
  
  .reservation-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .form-navigation {
    flex-direction: column;
    align-items: stretch;
  }
  
  .breadcrumb {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .header-icon {
    padding: 1rem;
  }
  
  .header-icon .material-icons {
    font-size: 2.5rem;
  }
  
  .page-title {
    font-size: 2rem;
  }
}
</style>