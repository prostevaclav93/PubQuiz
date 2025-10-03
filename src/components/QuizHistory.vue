<template>
  <div class="quiz-history">
    <MessageBox ref="messageBox" />
    
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <button class="nav-button" @click="goToAdminPanel">
            <span class="material-icons">arrow_back</span>
            <span>Zpět na admin</span>
          </button>
        </div>
        
        <div class="header-center">
          <div class="header-icon">
            <span class="material-icons">history</span>
          </div>
          <div class="header-text">
            <h1 class="page-title">Historie Pubkvízů</h1>
            <p class="page-subtitle">Přehled a výsledky minulých kvízů</p>
          </div>
        </div>
        
        <div class="header-right">
          <div class="stats-badge">
            <span class="material-icons">event_available</span>
            <span>{{ totalQuizzes }} {{ totalQuizzes === 1 ? 'kvíz' : totalQuizzes <= 4 ? 'kvízy' : 'kvízů' }}</span>
          </div>
        </div>
      </div>
      <div class="header-decoration"></div>
    </div>

    <!-- Content Container -->
    <div class="content-container">
      <!-- Search and Filters -->
      <div class="search-section">
        <!-- View Mode Toggle -->
        <div class="view-toggle">
          <button 
            @click="viewMode = 'quizzes'" 
            :class="['toggle-view-btn', { 'active': viewMode === 'quizzes' }]"
          >
            <span class="material-icons">event</span>
            <span>Zobrazit kvízy</span>
          </button>
          <button 
            @click="viewMode = 'teams'" 
            :class="['toggle-view-btn', { 'active': viewMode === 'teams' }]"
          >
            <span class="material-icons">groups</span>
            <span>Zobrazit týmy</span>
          </button>
        </div>

        <div class="search-bar">
          <div class="search-input-group">
            <span class="material-icons">search</span>
            <input 
              type="text" 
              v-model="searchQuery" 
              :placeholder="viewMode === 'quizzes' ? 'Hledat podle místa, data nebo týmu...' : 'Hledat podle názvu týmu nebo místa...'"
              class="search-input"
            />
            <button v-if="searchQuery" @click="clearSearch" class="clear-search">
              <span class="material-icons">close</span>
            </button>
          </div>
        </div>
        
        <div class="filters">
          <select v-model="selectedYear" class="filter-select">
            <option value="">Všechny roky</option>
            <option v-for="year in availableYears" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
          
          <select v-model="selectedPlace" class="filter-select">
            <option value="">Všechna místa</option>
            <option v-for="place in availablePlaces" :key="place" :value="place">
              {{ place }}
            </option>
          </select>

          <select v-if="viewMode === 'quizzes'" v-model="selectedTeam" class="filter-select">
            <option value="">Všechny týmy</option>
            <option v-for="team in availableTeams" :key="team" :value="team">
              {{ team }}
            </option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p class="loading-text">Načítám historii kvízů...</p>
      </div>

      <!-- Quiz History Content -->
      <div v-else-if="viewMode === 'quizzes' && filteredQuizHistory.length > 0" class="history-content">
        <div class="results-summary">
          <div class="summary-item">
            <span class="material-icons">event_note</span>
            <div>
              <span class="summary-label">Zobrazeno</span>
              <span class="summary-value">{{ filteredQuizHistory.length }} z {{ totalQuizzes }} kvízů</span>
            </div>
          </div>
        </div>

        <div class="quiz-history-grid">
          <div v-for="quiz in filteredQuizHistory" :key="quiz.id" 
               :class="['quiz-card', { 'deleting': quiz.deleting }]">
            <div class="quiz-card-header">
              <div class="quiz-info">
                <h3 class="quiz-title">{{ quiz.place_name }}</h3>
                <div class="quiz-meta">
                  <div class="meta-item">
                    <span class="material-icons">event</span>
                    <span>{{ formatQuizDate(quiz.quiz_date) }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="material-icons">schedule</span>
                    <span>{{ formatQuizTime(quiz.quiz_time) }}</span>
                  </div>
                </div>
              </div>
              <div class="quiz-actions">
                <button 
                  @click="toggleResults(quiz)" 
                  :class="['toggle-button', { 'active': quiz.showResults }]"
                  :disabled="quiz.deleting"
                >
                  <span class="material-icons">
                    {{ quiz.showResults ? 'visibility_off' : 'visibility' }}
                  </span>
                  {{ quiz.showResults ? 'Skrýt' : 'Zobrazit' }}
                </button>
                <button 
                  @click="confirmDeleteQuiz(quiz)" 
                  class="delete-button"
                  :title="`Smazat kvíz z ${quiz.place_name}`"
                  :disabled="quiz.deleting"
                >
                  <div v-if="quiz.deleting" class="delete-loading">
                    <div class="small-spinner"></div>
                    <span>Mazání...</span>
                  </div>
                  <div v-else class="delete-content">
                    <span class="material-icons">delete</span>
                    <span>Smazat</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Quiz Results -->
            <div v-if="quiz.showResults" class="quiz-results">
              <div v-if="quiz.loadingResults" class="results-loading">
                <div class="small-spinner"></div>
                <span>Načítám výsledky...</span>
              </div>
              
              <div v-else-if="quiz.sortedTeams && quiz.sortedTeams.length > 0" class="results-content">
                <div class="results-header">
                  <h4>Výsledky kvízu</h4>
                  <div class="teams-count">
                    <span class="material-icons">groups</span>
                    <span>{{ quiz.sortedTeams.length }} {{ quiz.sortedTeams.length === 1 ? 'tým' : quiz.sortedTeams.length <= 4 ? 'týmy' : 'týmů' }}</span>
                  </div>
                </div>
                
                <div class="results-table">
                  <div class="table-header">
                    <div class="col-rank">Pořadí</div>
                    <div class="col-team">Tým</div>
                    <div class="col-players">Hráči</div>
                    <div class="col-score">Body</div>
                  </div>
                  
                  <div v-for="(team, index) in quiz.sortedTeams" :key="team.id" 
                       :class="['table-row', { 'podium': index < 3 }]">
                    <div class="col-rank">
                      <div class="rank-badge" :class="getRankClass(index)">
                        {{ getRankDisplay(index) }}
                      </div>
                    </div>
                    <div class="col-team">
                      <span class="team-name">{{ team.team_name }}</span>
                    </div>
                    <div class="col-players">
                      <div class="player-info">
                        <span class="material-icons">person</span>
                        <span>{{ team.number_of_players }}</span>
                      </div>
                    </div>
                    <div class="col-score">
                      <span class="score-value">{{ team.total_score }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div v-else class="no-results">
                <span class="material-icons">sports_score</span>
                <p>Pro tento kvíz nejsou dostupné žádné výsledky</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Team History Content -->
      <div v-else-if="viewMode === 'teams' && filteredTeamHistory.length > 0" class="history-content">
        <div class="results-summary">
          <div class="summary-item">
            <span class="material-icons">groups</span>
            <div>
              <span class="summary-label">Zobrazeno</span>
              <span class="summary-value">{{ filteredTeamHistory.length }} {{ filteredTeamHistory.length === 1 ? 'tým' : filteredTeamHistory.length <= 4 ? 'týmy' : 'týmů' }}</span>
            </div>
          </div>
        </div>

        <div class="team-history-grid">
          <div v-for="team in filteredTeamHistory" :key="team.team_id" class="team-card">
            <div class="team-card-header">
              <div class="team-info">
                <h3 class="team-title">{{ team.team_name }}</h3>
                <div class="team-stats">
                  <div class="stat-item">
                    <span class="material-icons">event</span>
                    <span>{{ team.total_quizzes }} {{ team.total_quizzes === 1 ? 'kvíz' : team.total_quizzes <= 4 ? 'kvízy' : 'kvízů' }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="material-icons">trending_up</span>
                    <span>Ø {{ team.average_score }} bodů</span>
                  </div>
                  <div class="stat-item">
                    <span class="material-icons">stars</span>
                    <span>{{ team.total_score }} bodů celkem</span>
                  </div>
                </div>
              </div>
              <div class="team-actions">
                <button 
                  @click="toggleTeamResults(team)" 
                  :class="['toggle-button', { 'active': team.showResults }]"
                >
                  <span class="material-icons">
                    {{ team.showResults ? 'visibility_off' : 'visibility' }}
                  </span>
                  {{ team.showResults ? 'Skrýt' : 'Historie' }}
                </button>
              </div>
            </div>

            <!-- Team Quiz History -->
            <div v-if="team.showResults" class="team-results">
              <div class="results-header">
                <h4>Historie účasti</h4>
                <div class="quizzes-count">
                  <span class="material-icons">event_available</span>
                  <span>{{ team.quizzes.length }} účastí</span>
                </div>
              </div>
              
              <div class="team-history-table">
                <div class="table-header">
                  <div class="col-date">Datum</div>
                  <div class="col-place">Místo</div>
                  <div class="col-players">Hráči</div>
                  <div class="col-score">Body</div>
                </div>
                
                <div v-for="quiz in team.quizzes" :key="quiz.quiz_id" class="table-row">
                  <div class="col-date">
                    <span class="quiz-date">{{ formatQuizDate(quiz.quiz_date) }}</span>
                  </div>
                  <div class="col-place">
                    <span class="place-name">{{ quiz.place_name }}</span>
                  </div>
                  <div class="col-players">
                    <div class="player-info">
                      <span class="material-icons">person</span>
                      <span>{{ quiz.number_of_players }}</span>
                    </div>
                  </div>
                  <div class="col-score">
                    <span class="score-value">{{ quiz.total_score }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <div class="empty-icon">
          <span class="material-icons">{{ viewMode === 'quizzes' ? 'history_edu' : 'groups_off' }}</span>
        </div>
        <h3>
          {{ 
            searchQuery || selectedYear || selectedPlace || selectedTeam 
              ? 'Žádné výsledky' 
              : viewMode === 'quizzes' 
                ? 'Historie kvízů je prázdná' 
                : 'Žádné týmy v historii'
          }}
        </h3>
        <p v-if="searchQuery || selectedYear || selectedPlace || selectedTeam">
          Zkuste upravit filtry nebo vyhledávací kritéria
        </p>
        <p v-else-if="viewMode === 'quizzes'">
          Zatím nebyl dokončen žádný kvíz
        </p>
        <p v-else>
          Zatím se žádný tým neúčastnil dokončeného kvízu
        </p>
        <div class="empty-actions">
          <button v-if="searchQuery || selectedYear || selectedPlace || selectedTeam" @click="clearAllFilters" class="button secondary">
            <span class="material-icons">clear_all</span>
            Vymazat filtry
          </button>
          <button @click="goToAdminPanel" class="button primary">
            <span class="material-icons">add</span>
            Vytvořit nový kvíz
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '../supabase/supabaseClient';
import MessageBox from './MessageBox.vue';

const messageBox = ref(null);
const quizHistory = ref([]);
const teamHistory = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const selectedYear = ref('');
const selectedPlace = ref('');
const selectedTeam = ref('');
const viewMode = ref('quizzes'); // 'quizzes' or 'teams'

// Computed properties
const totalQuizzes = computed(() => quizHistory.value.length);

const availableYears = computed(() => {
  const years = quizHistory.value.map(quiz => new Date(quiz.quiz_date).getFullYear());
  return [...new Set(years)].sort((a, b) => b - a);
});

const availablePlaces = computed(() => {
  const places = quizHistory.value.map(quiz => quiz.place_name);
  return [...new Set(places)].sort();
});

const availableTeams = computed(() => {
  const teams = new Set();
  quizHistory.value.forEach(quiz => {
    if (quiz.sortedTeams && quiz.sortedTeams.length > 0) {
      quiz.sortedTeams.forEach(team => teams.add(team.team_name));
    }
  });
  return [...teams].sort();
});

const filteredQuizHistory = computed(() => {
  let filtered = quizHistory.value;

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(quiz => 
      quiz.place_name.toLowerCase().includes(query) ||
      formatQuizDate(quiz.quiz_date).toLowerCase().includes(query) ||
      (quiz.sortedTeams && quiz.sortedTeams.some(team => 
        team.team_name.toLowerCase().includes(query)
      ))
    );
  }

  // Year filter
  if (selectedYear.value) {
    filtered = filtered.filter(quiz => 
      new Date(quiz.quiz_date).getFullYear() === parseInt(selectedYear.value)
    );
  }

  // Place filter
  if (selectedPlace.value) {
    filtered = filtered.filter(quiz => quiz.place_name === selectedPlace.value);
  }

  // Team filter
  if (selectedTeam.value) {
    filtered = filtered.filter(quiz => 
      quiz.sortedTeams && quiz.sortedTeams.some(team => 
        team.team_name === selectedTeam.value
      )
    );
  }

  return filtered;
});

const filteredTeamHistory = computed(() => {
  let filtered = teamHistory.value;

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(team => 
      team.team_name.toLowerCase().includes(query) ||
      team.quizzes.some(quiz => 
        quiz.place_name.toLowerCase().includes(query) ||
        formatQuizDate(quiz.quiz_date).toLowerCase().includes(query)
      )
    );
  }

  // Year filter
  if (selectedYear.value) {
    filtered = filtered.map(team => ({
      ...team,
      quizzes: team.quizzes.filter(quiz => 
        new Date(quiz.quiz_date).getFullYear() === parseInt(selectedYear.value)
      )
    })).filter(team => team.quizzes.length > 0);
  }

  // Place filter
  if (selectedPlace.value) {
    filtered = filtered.map(team => ({
      ...team,
      quizzes: team.quizzes.filter(quiz => quiz.place_name === selectedPlace.value)
    })).filter(team => team.quizzes.length > 0);
  }

  return filtered;
});

// Methods
const fetchTeamHistory = async () => {
  try {
    // Get all quiz teams for completed quiz instances with nested data
    const { data: quizTeamsData, error: teamsError } = await supabase
      .from('quiz_teams')
      .select(`
        id,
        number_of_players,
        teams!quiz_teams_team_id_fkey(id, name),
        quiz_instances!quiz_teams_quiz_instance_id_fkey(
          id, 
          quiz_date, 
          quiz_time, 
          is_completed,
          places!quiz_instances_place_id_fkey(name)
        ),
        scores(regular_score, bonus_score)
      `);

    if (teamsError) {
      console.error('Error fetching quiz teams:', teamsError);
      throw teamsError;
    }

    if (!quizTeamsData || quizTeamsData.length === 0) {
      console.log('No quiz teams found');
      teamHistory.value = [];
      return;
    }

    // Filter for completed quizzes only
    const completedQuizTeams = quizTeamsData.filter(quizTeam => 
      quizTeam.quiz_instances?.is_completed === true
    );

    if (completedQuizTeams.length === 0) {
      console.log('No completed quiz teams found');
      teamHistory.value = [];
      return;
    }

    // Group by team and calculate statistics
    const teamMap = new Map();
    
    completedQuizTeams.forEach(quizTeam => {
      // Validate required data
      if (!quizTeam.teams?.name || !quizTeam.quiz_instances) {
        console.warn('Invalid quiz team data:', quizTeam);
        return;
      }

      const teamName = quizTeam.teams.name;
      const teamId = quizTeam.teams.id;
      const quizInstance = quizTeam.quiz_instances;
      
      if (!teamMap.has(teamName)) {
        teamMap.set(teamName, {
          team_id: teamId,
          team_name: teamName,
          quizzes: [],
          total_quizzes: 0,
          total_score: 0,
          average_score: 0,
          showResults: false
        });
      }
      
      const team = teamMap.get(teamName);
      
      // Calculate total score for this quiz
      const totalScore = (quizTeam.scores || []).reduce((sum, score) => 
        sum + (Number(score.regular_score) || 0) + (Number(score.bonus_score) || 0), 0
      );
      
      team.quizzes.push({
        quiz_id: quizInstance.id,
        quiz_date: quizInstance.quiz_date,
        quiz_time: quizInstance.quiz_time,
        place_name: quizInstance.places?.name || 'Neznámé místo',
        number_of_players: Number(quizTeam.number_of_players) || 0,
        total_score: totalScore
      });
      
      team.total_score += totalScore;
    });

    // Calculate final statistics for each team
    const teams = Array.from(teamMap.values()).map(team => {
      team.total_quizzes = team.quizzes.length;
      team.average_score = team.total_quizzes > 0 ? Math.round(team.total_score / team.total_quizzes) : 0;
      
      // Sort quizzes by date (newest first)
      team.quizzes.sort((a, b) => new Date(b.quiz_date) - new Date(a.quiz_date));
      
      return team;
    });

    // Sort teams by total quizzes participated, then by average score
    teams.sort((a, b) => {
      if (b.total_quizzes !== a.total_quizzes) {
        return b.total_quizzes - a.total_quizzes;
      }
      return b.average_score - a.average_score;
    });

    teamHistory.value = teams;
    console.log('Team history loaded successfully:', teams.length, 'teams');

  } catch (error) {
    console.error('Chyba při načítání historie týmů:', error);
    messageBox.value.error('Chyba', 'Nepodařilo se načíst historii týmů.');
    teamHistory.value = [];
  }
};

const fetchQuizHistory = async () => {
  loading.value = true;
  
  try {
    const { data: instancesData, error: instancesError } = await supabase
      .from('quiz_instances')
      .select(`
        id,
        quiz_date,
        quiz_time,
        places(name)
      `)
      .eq('is_completed', true)
      .order('quiz_date', { ascending: false });
    
    if (instancesError) {
      throw instancesError;
    }
    
    quizHistory.value = instancesData.map(instance => ({
      ...instance,
      place_name: instance.places.name,
      showResults: false,
      loadingResults: false,
      deleting: false,
      sortedTeams: []
    }));

    // Fetch team history after quiz history
    await fetchTeamHistory();

  } catch (error) {
    console.error('Chyba při načítání historie kvízů:', error);
    messageBox.value.error('Chyba', 'Nepodařilo se načíst historii kvízů.');
  } finally {
    loading.value = false;
  }
};

const toggleResults = async (quiz) => {
  if (quiz.showResults) {
    quiz.showResults = false;
    return;
  }

  if (quiz.sortedTeams.length > 0) {
    quiz.showResults = true;
    return;
  }

  quiz.loadingResults = true;
  quiz.showResults = true;

  try {
    const { data: quizTeamsData, error: quizTeamsError } = await supabase
      .from('quiz_teams')
      .select(`
        id,
        number_of_players,
        teams(name),
        scores(regular_score, bonus_score)
      `)
      .eq('quiz_instance_id', quiz.id);

    if (quizTeamsError) {
      throw quizTeamsError;
    }

    const sortedTeams = quizTeamsData
      .map(team => {
        const totalScore = team.scores.reduce((sum, score) => 
          sum + (score.regular_score || 0) + (score.bonus_score || 0), 0
        );
        
        return {
          id: team.id,
          team_name: team.teams.name,
          number_of_players: team.number_of_players,
          total_score: totalScore
        };
      })
      .sort((a, b) => b.total_score - a.total_score);

    quiz.sortedTeams = sortedTeams;

  } catch (error) {
    console.error('Chyba při načítání výsledků kvízu:', error);
    messageBox.value.error('Chyba', 'Nepodařilo se načíst výsledky kvízu.');
    quiz.showResults = false;
  } finally {
    quiz.loadingResults = false;
  }
};

const formatQuizDate = (dateString) => {
  if (!dateString) return 'Neznámé datum';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  } catch (error) {
    return 'Neplatné datum';
  }
};

const formatQuizTime = (timeString) => {
  if (!timeString) return '';
  return timeString.slice(0, 5);
};

const getRankDisplay = (index) => {
  const rank = index + 1;
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank.toString();
};

const getRankClass = (index) => {
  const rank = index + 1;
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return 'regular';
};

const toggleTeamResults = (team) => {
  team.showResults = !team.showResults;
};

const clearSearch = () => {
  searchQuery.value = '';
};

const clearAllFilters = () => {
  searchQuery.value = '';
  selectedYear.value = '';
  selectedPlace.value = '';
  selectedTeam.value = '';
};

const confirmDeleteQuiz = async (quiz) => {
  const confirmed = await messageBox.value.prompt(
    'Potvrdit smazání', 
    `Opravdu chcete smazat kvíz "${quiz.place_name}" z ${formatQuizDate(quiz.quiz_date)}?\n\nTato akce je nevratná a smaže všechna data včetně výsledků a týmů.`
  );
  
  if (confirmed) {
    await deleteQuizInstance(quiz);
  }
};

const deleteQuizInstance = async (quiz) => {
  try {
    // Show loading state
    quiz.deleting = true;
    
    // First, delete all scores for this quiz instance
    const { data: quizTeamsData, error: teamsError } = await supabase
      .from('quiz_teams')
      .select('id')
      .eq('quiz_instance_id', quiz.id);
    
    if (teamsError) {
      throw new Error(`Chyba při načítání týmů: ${teamsError.message}`);
    }
    
    if (quizTeamsData && quizTeamsData.length > 0) {
      const teamIds = quizTeamsData.map(team => team.id);
      
      // Delete all scores
      const { error: scoresError } = await supabase
        .from('scores')
        .delete()
        .in('quiz_team_id', teamIds);
      
      if (scoresError) {
        throw new Error(`Chyba při mazání skóre: ${scoresError.message}`);
      }
      
      // Delete all quiz teams
      const { error: quizTeamsError } = await supabase
        .from('quiz_teams')
        .delete()
        .eq('quiz_instance_id', quiz.id);
      
      if (quizTeamsError) {
        throw new Error(`Chyba při mazání týmů: ${quizTeamsError.message}`);
      }
    }
    
    // Delete any remaining reservations
    const { error: reservationsError } = await supabase
      .from('reservations')
      .delete()
      .eq('quiz_instance_id', quiz.id);
    
    if (reservationsError) {
      console.warn('Chyba při mazání rezervací:', reservationsError.message);
      // Don't throw here as reservations might not exist
    }
    
    // Finally, delete the quiz instance itself
    const { error: instanceError } = await supabase
      .from('quiz_instances')
      .delete()
      .eq('id', quiz.id);
    
    if (instanceError) {
      throw new Error(`Chyba při mazání kvízu: ${instanceError.message}`);
    }
    
    // Remove from local state
    const index = quizHistory.value.findIndex(q => q.id === quiz.id);
    if (index > -1) {
      quizHistory.value.splice(index, 1);
    }
    
    messageBox.value.success(
      'Kvíz smazán', 
      `Kvíz "${quiz.place_name}" byl úspěšně smazán včetně všech souvisejících dat.`
    );
    
  } catch (error) {
    console.error('Chyba při mazání kvízu:', error);
    messageBox.value.error(
      'Chyba při mazání', 
      error.message || 'Nepodařilo se smazat kvíz. Zkuste to znovu.'
    );
  } finally {
    // Hide loading state
    quiz.deleting = false;
  }
};

const goToAdminPanel = () => {
  window.location.href = '/index.html';
};

// Lifecycle
onMounted(() => {
  fetchQuizHistory();
});
</script>

<style scoped>
/* ===== PubQ Quiz History Design System ===== */
.quiz-history {
  min-height: 100vh;
  background: linear-gradient(135deg, #fdf6e3 0%, #f7f3e9 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Page Header */
.page-header {
  background: linear-gradient(135deg, #4a3621 0%, #14532d 100%);
  color: #fdf6e3;
  padding: 2rem;
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

.nav-button {
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

.nav-button:hover {
  background: rgba(253, 246, 227, 0.4);
  border-color: rgba(253, 246, 227, 0.8);
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 8px 25px rgba(253, 246, 227, 0.6);
}

.stats-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(252, 191, 73, 0.2);
  padding: 0.75rem 1rem;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(252, 191, 73, 0.3);
  font-weight: 600;
  transition: all 0.3s ease;
  cursor: default;
}

.stats-badge:hover {
  background: rgba(252, 191, 73, 0.3);
  border-color: rgba(252, 191, 73, 0.5);
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(252, 191, 73, 0.4);
}

.stats-badge .material-icons {
  color: #fcbf49;
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

/* Content Container */
.content-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Search Section */
.search-section {
  background: #ffffff;
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 20px rgba(74, 54, 33, 0.08);
  border: 1px solid rgba(20, 83, 45, 0.1);
  transition: all 0.3s ease;
}

.search-section:hover {
  box-shadow: 0 8px 30px rgba(74, 54, 33, 0.12);
  border-color: rgba(20, 83, 45, 0.2);
  transform: translateY(-2px);
}

/* View Toggle */
.view-toggle {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  background: rgba(20, 83, 45, 0.05);
  padding: 0.5rem;
  border-radius: 12px;
  border: 1px solid rgba(20, 83, 45, 0.1);
}

.toggle-view-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: transparent;
  color: #6b7280;
}

.toggle-view-btn:hover {
  background: rgba(20, 83, 45, 0.15);
  color: #14532d;
  transform: translateY(-2px);
}

.toggle-view-btn.active {
  background: linear-gradient(135deg, #14532d 0%, #2f855a 100%);
  color: #fdf6e3;
  box-shadow: 0 4px 16px rgba(20, 83, 45, 0.3);
}

.toggle-view-btn.active:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 25px rgba(20, 83, 45, 0.5);
  background: linear-gradient(135deg, #0c2818 0%, #1e5a32 100%);
}

.search-bar {
  margin-bottom: 1.5rem;
}

.search-input-group {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 500px;
}

.search-input-group .material-icons {
  position: absolute;
  left: 1rem;
  color: #6b7280;
  z-index: 2;
}

.search-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border: 2px solid rgba(107, 114, 128, 0.2);
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background-color: #fdf6e3;
  color: #4a3621;
}

.search-input:hover {
  border-color: rgba(20, 83, 45, 0.5);
  box-shadow: 0 4px 15px rgba(20, 83, 45, 0.15);
  transform: translateY(-2px);
}

.search-input:focus {
  outline: none;
  border-color: #14532d;
  background-color: #ffffff;
  box-shadow: 0 0 0 4px rgba(20, 83, 45, 0.2), 0 8px 25px rgba(20, 83, 45, 0.15);
  transform: translateY(-2px);
}

.search-input::placeholder {
  color: #9ca3af;
}

.clear-search {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.clear-search:hover {
  background: rgba(107, 114, 128, 0.2);
  color: #374151;
  transform: scale(1.15);
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
}

.filters {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 2px solid rgba(107, 114, 128, 0.2);
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background-color: #fdf6e3;
  color: #4a3621;
  min-width: 150px;
  cursor: pointer;
}

.filter-select:hover {
  border-color: rgba(20, 83, 45, 0.5);
  box-shadow: 0 4px 15px rgba(20, 83, 45, 0.15);
  transform: translateY(-2px);
}

.filter-select:focus {
  outline: none;
  border-color: #14532d;
  background-color: #ffffff;
  box-shadow: 0 0 0 4px rgba(20, 83, 45, 0.2), 0 8px 25px rgba(20, 83, 45, 0.15);
  transform: translateY(-2px);
}

/* Loading State */
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

/* Results Summary */
.results-summary {
  background: rgba(20, 83, 45, 0.05);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(20, 83, 45, 0.1);
  transition: all 0.3s ease;
}

.results-summary:hover {
  background: rgba(20, 83, 45, 0.08);
  border-color: rgba(20, 83, 45, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(20, 83, 45, 0.1);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #14532d;
}

.summary-item .material-icons {
  color: #2f855a;
}

.summary-label {
  font-weight: 500;
  margin-right: 0.5rem;
}

.summary-value {
  font-weight: 700;
  font-size: 1.1rem;
}

/* Quiz History Grid */
.quiz-history-grid, .team-history-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Team Cards */
.team-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(74, 54, 33, 0.08);
  border: 1px solid rgba(20, 83, 45, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.team-card:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 20px 60px rgba(74, 54, 33, 0.2);
  border-color: rgba(20, 83, 45, 0.3);
}

.team-card-header {
  background: linear-gradient(135deg, #14532d 0%, #2f855a 100%);
  color: #fdf6e3;
  padding: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.team-info {
  flex: 1;
}

.team-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  color: #fdf6e3;
}

.team-stats {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.9;
  font-weight: 500;
}

.stat-item .material-icons {
  color: #fcbf49;
  font-size: 1.25rem;
}

.team-actions {
  display: flex;
  gap: 1rem;
}

/* Team Results */
.team-results {
  padding: 2rem;
  background: #fdf6e3;
}

.quizzes-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #2f855a;
  color: #fdf6e3;
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.875rem;
}

/* Team History Table */
.team-history-table {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(20, 83, 45, 0.1);
}

.team-history-table .table-header {
  background: rgba(47, 133, 90, 0.05);
  display: grid;
  grid-template-columns: 200px 1fr auto auto;
  font-weight: 600;
  color: #2f855a;
  border-bottom: 1px solid rgba(47, 133, 90, 0.1);
}

.team-history-table .table-row {
  display: grid;
  grid-template-columns: 200px 1fr auto auto;
  border-bottom: 1px solid rgba(47, 133, 90, 0.05);
  transition: all 0.3s ease;
}

.team-history-table .table-row:hover {
  background: rgba(47, 133, 90, 0.08);
  transform: translateX(8px);
  box-shadow: 0 4px 15px rgba(47, 133, 90, 0.1);
}

.team-history-table .table-row:last-child {
  border-bottom: none;
}

.col-date {
  justify-content: flex-start;
}

.col-place {
  justify-content: flex-start;
}

.quiz-date {
  font-weight: 600;
  color: #2f855a;
  font-size: 0.95rem;
}

.place-name {
  font-weight: 500;
  color: #14532d;
}

.quiz-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(74, 54, 33, 0.08);
  border: 1px solid rgba(20, 83, 45, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.quiz-card:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 20px 60px rgba(74, 54, 33, 0.2);
  border-color: rgba(20, 83, 45, 0.3);
}

.quiz-card.deleting {
  opacity: 0.6;
  pointer-events: none;
  position: relative;
}

.quiz-card.deleting::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(220, 38, 38, 0.1);
  z-index: 1;
}

.quiz-card-header {
  background: linear-gradient(135deg, #14532d 0%, #2f855a 100%);
  color: #fdf6e3;
  padding: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.quiz-info {
  flex: 1;
}

.quiz-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  color: #fdf6e3;
}

.quiz-meta {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.9;
}

.meta-item .material-icons {
  color: #fcbf49;
  font-size: 1.25rem;
}

.quiz-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.toggle-button, .delete-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(253, 246, 227, 0.1);
  border: 2px solid rgba(253, 246, 227, 0.2);
  border-radius: 12px;
  color: #fdf6e3;
  padding: 0.75rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  font-size: 0.9rem;
}

.toggle-button:hover:not(:disabled) {
  background: rgba(253, 246, 227, 0.4);
  border-color: rgba(253, 246, 227, 0.8);
  transform: translateY(-4px) scale(1.08);
  box-shadow: 0 12px 35px rgba(253, 246, 227, 0.8);
  backdrop-filter: blur(20px);
}

.toggle-button.active {
  background: #fcbf49;
  color: #4a3621;
  border-color: #fcbf49;
  box-shadow: 0 6px 20px rgba(252, 191, 73, 0.4);
}

.toggle-button.active:hover:not(:disabled) {
  background: #d97706;
  transform: translateY(-4px) scale(1.08);
  box-shadow: 0 12px 35px rgba(217, 119, 6, 0.8);
}

.delete-button {
  background: rgba(220, 38, 38, 0.15);
  border-color: rgba(220, 38, 38, 0.4);
  color: #fdf6e3;
  box-shadow: 0 4px 15px rgba(220, 38, 38, 0.2);
}

.delete-button:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.4);
  border-color: rgba(220, 38, 38, 0.8);
  transform: translateY(-4px) scale(1.08);
  box-shadow: 0 12px 35px rgba(220, 38, 38, 0.8);
  backdrop-filter: blur(20px);
}

.delete-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.delete-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.delete-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Quiz Results */
.quiz-results {
  padding: 2rem;
  background: #fdf6e3;
}

.results-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  color: #6b7280;
}

.small-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(20, 83, 45, 0.1);
  border-left: 2px solid #14532d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(20, 83, 45, 0.1);
}

.results-header h4 {
  margin: 0;
  color: #14532d;
  font-size: 1.25rem;
  font-weight: 600;
}

.teams-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #14532d;
  color: #fdf6e3;
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.875rem;
}

/* Results Table */
.results-table {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(20, 83, 45, 0.1);
}

.table-header {
  background: rgba(20, 83, 45, 0.05);
  display: grid;
  grid-template-columns: 80px 1fr auto auto;
  font-weight: 600;
  color: #14532d;
  border-bottom: 1px solid rgba(20, 83, 45, 0.1);
}

.table-row {
  display: grid;
  grid-template-columns: 80px 1fr auto auto;
  border-bottom: 1px solid rgba(20, 83, 45, 0.05);
  transition: background-color 0.2s ease;
}

.table-row:hover {
  background: rgba(20, 83, 45, 0.08);
  transform: translateX(8px);
  box-shadow: 0 4px 15px rgba(20, 83, 45, 0.1);
}

.table-row:last-child {
  border-bottom: none;
}

.table-row.podium {
  background: linear-gradient(135deg, rgba(252, 191, 73, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%);
}

.table-header > div, .table-row > div {
  padding: 1rem;
  display: flex;
  align-items: center;
}

.col-rank {
  justify-content: center;
}

.col-team {
  justify-content: flex-start;
}

.col-players, .col-score {
  justify-content: center;
}

.rank-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-weight: bold;
  font-size: 1.25rem;
  transition: all 0.3s ease;
  cursor: default;
}

.rank-badge:hover {
  transform: scale(1.2) rotate(5deg);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.rank-badge.gold {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #4a3621;
}

.rank-badge.gold:hover {
  box-shadow: 0 6px 20px rgba(255, 215, 0, 0.6);
}

.rank-badge.silver {
  background: linear-gradient(135deg, #c0c0c0 0%, #e5e7eb 100%);
  color: #4a3621;
}

.rank-badge.silver:hover {
  box-shadow: 0 6px 20px rgba(192, 192, 192, 0.6);
}

.rank-badge.bronze {
  background: linear-gradient(135deg, #cd7f32 0%, #d97706 100%);
  color: #fdf6e3;
}

.rank-badge.bronze:hover {
  box-shadow: 0 6px 20px rgba(205, 127, 50, 0.6);
}

.rank-badge.regular {
  background: rgba(20, 83, 45, 0.1);
  color: #14532d;
}

.rank-badge.regular:hover {
  background: rgba(20, 83, 45, 0.2);
  box-shadow: 0 4px 15px rgba(20, 83, 45, 0.3);
}

.team-name {
  font-weight: 600;
  color: #14532d;
  font-size: 1.1rem;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
}

.player-info .material-icons {
  font-size: 1rem;
}

.score-value {
  font-weight: 700;
  font-size: 1.25rem;
  color: #14532d;
}

/* No Results */
.no-results {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.no-results .material-icons {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.no-results p {
  margin: 0;
  font-size: 1.1rem;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(74, 54, 33, 0.08);
  border: 1px solid rgba(20, 83, 45, 0.1);
  transition: all 0.3s ease;
}

.empty-state:hover {
  box-shadow: 0 8px 30px rgba(74, 54, 33, 0.12);
  transform: translateY(-2px);
}

.empty-icon .material-icons {
  font-size: 4rem;
  color: #6b7280;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.empty-state h3 {
  color: #4a3621;
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.empty-state p {
  color: #6b7280;
  margin: 0 0 2rem 0;
  font-size: 1.1rem;
}

.empty-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
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

.button.secondary {
  background: rgba(20, 83, 45, 0.1);
  color: #14532d;
  border: 2px solid rgba(20, 83, 45, 0.2);
}

.button.secondary:hover {
  background: rgba(20, 83, 45, 0.15);
  border-color: rgba(20, 83, 45, 0.3);
  transform: translateY(-2px);
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
  
  .search-section {
    padding: 1.5rem;
  }
  
  .view-toggle {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .toggle-view-btn {
    padding: 1rem;
  }
  
  .filters {
    flex-direction: column;
  }
  
  .filter-select {
    min-width: auto;
  }
  
  .quiz-card-header, .team-card-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
    padding: 1.5rem;
  }
  
  .quiz-meta, .team-stats {
    gap: 1rem;
  }
  
  .quiz-actions, .team-actions {
    justify-content: center;
    gap: 0.5rem;
  }
  
  .toggle-button, .delete-button {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
  }
  
  .toggle-button span:last-child, 
  .delete-button span:last-child {
    display: none;
  }
  
  .quiz-results, .team-results {
    padding: 1.5rem;
  }
  
  .results-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .table-header, .table-row {
    grid-template-columns: 60px 1fr 80px 80px;
    gap: 0.5rem;
  }
  
  .table-header > div, .table-row > div {
    padding: 0.75rem 0.5rem;
    font-size: 0.9rem;
  }
  
  .team-history-table .table-header,
  .team-history-table .table-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .team-history-table .table-header > div,
  .team-history-table .table-row > div {
    padding: 0.75rem;
    justify-content: flex-start;
    border-bottom: 1px solid rgba(47, 133, 90, 0.05);
  }
  
  .team-history-table .table-header > div:last-child,
  .team-history-table .table-row > div:last-child {
    border-bottom: none;
  }
  
  .rank-badge {
    width: 35px;
    height: 35px;
    font-size: 1rem;
  }
  
  .team-name {
    font-size: 1rem;
  }
  
  .score-value {
    font-size: 1.1rem;
  }
  
  .empty-actions {
    flex-direction: column;
    align-items: center;
  }
}

@media (max-width: 480px) {
  .header-center {
    flex-direction: column;
    gap: 1rem;
  }
  
  .quiz-meta, .team-stats {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .search-input-group {
    max-width: none;
  }
  
  .table-header, .table-row {
    grid-template-columns: 50px 1fr 60px 60px;
  }
  
  .table-header > div, .table-row > div {
    padding: 0.5rem 0.25rem;
    font-size: 0.8rem;
  }
  
  .rank-badge {
    width: 30px;
    height: 30px;
    font-size: 0.9rem;
  }
  
  .team-title {
    font-size: 1.5rem;
  }
  
  .team-stats .stat-item {
    font-size: 0.9rem;
  }
}
</style>