<template>
  <div class="display-board-container">
    <header class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <span class="material-icons">emoji_events</span>
        </div>
        <div class="header-text">
          <h1 class="page-title">Výsledky Pubkvízu</h1>
          <h2 v-if="currentQuizInstance" class="page-subtitle">{{ formattedQuizDateAndPlace }}</h2>
          <h2 v-else class="page-subtitle">Čekám na aktivní kvíz...</h2>
        </div>
      </div>
      <div class="header-decoration"></div>
    </header>
    
    <div class="content-container">
      <div v-if="currentQuizInstance && currentQuizInstance.revealed_index === 0" class="waiting-container">
        <div class="waiting-animation">
          <div class="waiting-animation-question">?</div>
        </div>
        <p class="waiting-text">Výsledky se brzy zobrazí...</p>
      </div>

      <div v-if="currentQuizInstance && currentQuizInstance.revealed_index > 0" class="results-section">
        <div class="section-header">
          <h3>Pořadí týmů</h3>
          <div class="round-indicator" v-if="!isQuizFinished">
            Kolo {{ currentQuizInstance?.current_round }}
          </div>
          <div class="final-indicator" v-else>
            Konečné výsledky
          </div>
        </div>
        
        <div class="table-container">
          <table class="results-table">
            <thead>
              <tr>
                <th class="rank-column">Pořadí</th>
                <th class="team-column">Tým</th>
                <th v-for="n in maxRounds" :key="n" 
                    :class="{ 'current-round-header': n === currentQuizInstance?.current_round && !isQuizFinished }">
                  Kolo {{ n }}
                </th>
                <th :class="{ 'final-total-highlight': isQuizFinished }" class="total-column">Celkem</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(team, index) in displayedTeams" :key="team.id" 
                  :class="{ 'podium-position': team.rank <= 3 && isQuizFinished }">
                <td class="rank-cell">
                  <span class="rank-badge" :class="getRankClass(team.rank)">
                    {{ getRankEmoji(team.rank) }}
                  </span>
                </td>
                <td class="team-cell">
                  <div class="team-info">
                    <div class="team-name-container">
                      <span class="team-name">{{ team.team_name }}</span>
                      <div v-if="getRankChange(team.id, team.rank)" class="rank-change-indicator"
                           :class="getRankChange(team.id, team.rank).direction">
                        <span class="material-icons">
                          {{ getRankChange(team.id, team.rank).direction === 'up' ? 'trending_up' : 'trending_down' }}
                        </span>
                        <span class="change-amount">{{ getRankChange(team.id, team.rank).change }}</span>
                      </div>
                    </div>
                    <span class="player-count">{{ team.number_of_players }} {{ getPlayerWord(team.number_of_players) }}</span>
                  </div>
                </td>
                <td v-for="roundNum in maxRounds" :key="roundNum"
                    :class="{ 'current-round-cell': roundNum === currentQuizInstance?.current_round && !isQuizFinished }"
                    class="score-cell">
                  <div class="score-content">
                    <span class="regular-score">{{ getScoreValue(team.id, roundNum, 'regular_score') }}</span>
                    <span v-if="getScoreValue(team.id, roundNum, 'bonus_score')" class="bonus-score">
                      +1B
                    </span>
                  </div>
                </td>
                <td class="total-cell" :class="{ 'final-total-highlight-cell': isQuizFinished }">
                  <span class="total-score">{{ team.total }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
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
const previousRoundRankings = computed(() => {
  if (!quizTeams.value || !currentQuizInstance.value || currentQuizInstance.value.current_round <= 1) {
    return new Map();
  }
  
  const previousRound = currentQuizInstance.value.current_round - 1;
  
  const teams = [...quizTeams.value]
    .map(quizTeam => ({
      ...quizTeam,
      total: calculateTotalUpToRound(quizTeam.id, previousRound),
      totalRegularScore: calculateTotalRegularScoreUpToRound(quizTeam.id, previousRound)
    }))
    .sort((a, b) => {
      if (b.total !== a.total) {
        return b.total - a.total;
      }
      return b.totalRegularScore - a.totalRegularScore;
    });
  
  const rankMap = new Map();
  for (let i = 0; i < teams.length; i++) {
    if (i === 0) {
      teams[i].rank = 1;
    } else if (teams[i].total === teams[i - 1].total && teams[i].totalRegularScore === teams[i - 1].totalRegularScore) {
      teams[i].rank = teams[i - 1].rank;
    } else {
      teams[i].rank = i + 1;
    }
    rankMap.set(teams[i].id, teams[i].rank);
  }
  
  return rankMap;
});

const sortedTeams = computed(() => {
  if (!quizTeams.value) return [];
  
  const teams = [...quizTeams.value]
    .map(quizTeam => ({
      ...quizTeam,
      total: calculateTotal(quizTeam.id),
      totalRegularScore: calculateTotalRegularScore(quizTeam.id)
    }))
    .sort((a, b) => {
      // First sort by total score
      if (b.total !== a.total) {
        return b.total - a.total;
      }
      // If total scores are equal, sort by regular score (higher regular score ranks better)
      return b.totalRegularScore - a.totalRegularScore;
    });
  
  // Calculate ranks considering ties (same total AND same regular score)
  for (let i = 0; i < teams.length; i++) {
    if (i === 0) {
      teams[i].rank = 1;
    } else if (teams[i].total === teams[i - 1].total && teams[i].totalRegularScore === teams[i - 1].totalRegularScore) {
      // Same total score AND same regular score, same rank
      teams[i].rank = teams[i - 1].rank;
    } else {
      // Different total score OR different regular score, different rank
      teams[i].rank = i + 1;
    }
  }
  
  return teams;
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

const calculateTotalUpToRound = (quizTeamId, maxRound) => {
  return scores.value
    .filter(s => s.quiz_team_id === quizTeamId && s.round_number <= maxRound)
    .reduce((sum, score) => sum + (score.regular_score || 0) + (score.bonus_score || 0), 0);
};

const calculateTotalRegularScoreUpToRound = (quizTeamId, maxRound) => {
  return scores.value
    .filter(s => s.quiz_team_id === quizTeamId && s.round_number <= maxRound)
    .reduce((sum, score) => sum + (score.regular_score || 0), 0);
};

const calculateTotal = (quizTeamId) => {
  return scores.value
    .filter(s => s.quiz_team_id === quizTeamId)
    .reduce((sum, score) => sum + (score.regular_score || 0) + (score.bonus_score || 0), 0);
};

const calculateTotalRegularScore = (quizTeamId) => {
  return scores.value
    .filter(s => s.quiz_team_id === quizTeamId)
    .reduce((sum, score) => sum + (score.regular_score || 0), 0);
};

const getRankEmoji = (rank) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return String(rank);
};

const getRankClass = (rank) => {
  if (rank === 1) return 'rank-gold';
  if (rank === 2) return 'rank-silver';
  if (rank === 3) return 'rank-bronze';
  return 'rank-regular';
};

const getRankChange = (teamId, currentRank) => {
  if (!previousRoundRankings.value.has(teamId) || !currentQuizInstance.value || currentQuizInstance.value.current_round <= 1) {
    return null;
  }
  
  const previousRank = previousRoundRankings.value.get(teamId);
  const change = previousRank - currentRank; // Positive means moved up, negative means moved down
  
  if (change > 0) {
    return { direction: 'up', change };
  } else if (change < 0) {
    return { direction: 'down', change: Math.abs(change) };
  }
  
  return null; // No change
};

const getPlayerWord = (numberOfPlayers) => {
  if (numberOfPlayers === 1) {
    return 'hráč';
  } else if (numberOfPlayers >= 2 && numberOfPlayers <= 4) {
    return 'hráči';
  } else {
    return 'hráčů';
  }
};
</script>

<style scoped>
.display-board-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #fdf6e3 0%, #f7f3e9 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #4a3621;
}

.page-header {
  background: linear-gradient(135deg, #4a3621 0%, #14532d 100%);
  color: #fdf6e3;
  padding: 3rem 2rem 4rem;
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
  text-align: center;
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
  font-size: 1.5rem;
  margin: 0;
  opacity: 0.9;
  line-height: 1.5;
  font-weight: 500;
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

.waiting-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  min-height: 400px;
}

.waiting-animation {
  margin-bottom: 2rem;
}

.waiting-animation-question {
  display: inline-block;
  font-size: 8rem;
  font-weight: bold;
  color: #14532d;
  text-shadow: 0 0 20px rgba(20, 83, 45, 0.3);
  animation: spinAndPulse 4s infinite ease-in-out;
}

@keyframes spinAndPulse {
  0% {
    transform: rotateY(0deg) scale(1);
    text-shadow: 0 0 20px rgba(20, 83, 45, 0.3);
  }
  50% {
    transform: rotateY(180deg) scale(1.1);
    text-shadow: 0 0 40px rgba(20, 83, 45, 0.5);
  }
  100% {
    transform: rotateY(360deg) scale(1);
    text-shadow: 0 0 20px rgba(20, 83, 45, 0.3);
  }
}

.waiting-text {
  font-size: 1.5rem;
  color: #6b7280;
  margin: 0;
  font-weight: 500;
}

.results-section {
  background: #ffffff;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(74, 54, 33, 0.08);
  border: 1px solid rgba(20, 83, 45, 0.1);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(20, 83, 45, 0.1);
}

.section-header h3 {
  color: #14532d;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
}

.round-indicator {
  background: linear-gradient(135deg, #fcbf49 0%, #f59e0b 100%);
  color: #4a3621;
  padding: 0.75rem 1.25rem;
  border-radius: 25px;
  font-weight: 700;
  font-size: 1rem;
  box-shadow: 0 4px 16px rgba(252, 191, 73, 0.3);
}

.final-indicator {
  background: linear-gradient(135deg, #2f855a 0%, #38a169 100%);
  color: #fdf6e3;
  padding: 0.75rem 1.25rem;
  border-radius: 25px;
  font-weight: 700;
  font-size: 1rem;
  box-shadow: 0 4px 16px rgba(47, 133, 90, 0.3);
}

.table-container {
  overflow-x: auto;
  border-radius: 16px;
  border: 1px solid rgba(20, 83, 45, 0.1);
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  background: #ffffff;
}

.results-table th {
  background: linear-gradient(135deg, #14532d 0%, #2f855a 100%);
  color: #fdf6e3;
  font-weight: 700;
  font-size: 1rem;
  padding: 1.25rem 1rem;
  text-align: center;
  border: none;
  white-space: nowrap;
}

.results-table td {
  padding: 1rem;
  text-align: center;
  border-bottom: 1px solid rgba(20, 83, 45, 0.1);
  vertical-align: middle;
}

.results-table tbody tr:last-child td {
  border-bottom: none;
}

.results-table tbody tr:nth-child(even) {
  background: rgba(253, 246, 227, 0.3);
}

.current-round-header {
  background: linear-gradient(135deg, #fcbf49 0%, #f59e0b 100%) !important;
  color: #4a3621 !important;
  position: relative;
}

.current-round-cell {
  background: rgba(252, 191, 73, 0.1);
  position: relative;
}

.rank-column { width: 80px; }
.team-column { width: 200px; text-align: left !important; }
.total-column { width: 100px; }

.rank-cell {
  text-align: center;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  font-size: 1.5rem;
  font-weight: bold;
}

.rank-gold {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #4a3621;
  box-shadow: 0 4px 16px rgba(255, 215, 0, 0.4);
}

.rank-silver {
  background: linear-gradient(135deg, #c0c0c0 0%, #e5e7eb 100%);
  color: #4a3621;
  box-shadow: 0 4px 16px rgba(192, 192, 192, 0.4);
}

.rank-bronze {
  background: linear-gradient(135deg, #cd7f32 0%, #d97706 100%);
  color: #fdf6e3;
  box-shadow: 0 4px 16px rgba(205, 127, 50, 0.4);
}

.rank-regular {
  background: #ecf0f1;
  color: #4a3621;
}

.team-cell {
  text-align: left !important;
}

.team-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.team-name-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.team-name {
  font-weight: 700;
  font-size: 1.1rem;
  color: #14532d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-change-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.8;
  transition: all 0.3s ease;
}

.rank-change-indicator.up {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.rank-change-indicator.down {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.rank-change-indicator .material-icons {
  font-size: 0.875rem;
}

.change-amount {
  font-size: 0.75rem;
  font-weight: 700;
}

.player-count {
  font-size: 0.8rem;
  color: #9ca3af;
  font-weight: 400;
}

.score-cell {
  font-size: 1.1rem;
  font-weight: 600;
}

.score-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.regular-score {
  font-size: 1.25rem;
  font-weight: 700;
  color: #14532d;
}

.bonus-score {
  color: #2f855a;
  font-weight: 700;
  font-size: 0.875rem;
  background: rgba(47, 133, 90, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  letter-spacing: 0.5px;
  border: 1px solid rgba(47, 133, 90, 0.2);
}

.total-cell {
  font-weight: 700;
  font-size: 1.25rem;
  color: #14532d;
  background: rgba(20, 83, 45, 0.05);
}

.total-score {
  font-size: 1.5rem;
  font-weight: 800;
}

.final-total-highlight {
  background: linear-gradient(135deg, #2f855a 0%, #38a169 100%) !important;
  color: #fdf6e3 !important;
  font-size: 1.25rem !important;
}

.final-total-highlight-cell {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  font-size: 1.5rem;
  color: #14532d;
  font-weight: 800;
  box-shadow: inset 0 0 20px rgba(47, 133, 90, 0.1);
}

.podium-position {
  background: linear-gradient(135deg, rgba(252, 191, 73, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%);
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
    font-size: 1.25rem;
  }
  
  .content-container {
    padding: 1rem;
  }
  
  .results-section {
    padding: 1.5rem;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .results-table th,
  .results-table td {
    padding: 0.75rem 0.5rem;
    font-size: 0.875rem;
  }
  
  .team-name {
    font-size: 1rem;
  }
  
  .team-name-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .rank-change-indicator {
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
  }
  
  .rank-change-indicator .material-icons {
    font-size: 0.75rem;
  }
  
  .waiting-animation-question {
    font-size: 6rem;
  }
  
  .waiting-text {
    font-size: 1.25rem;
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
  
  .rank-badge {
    width: 40px;
    height: 40px;
    font-size: 1.25rem;
  }
  
  .team-column {
    width: 150px;
  }
  
  .rank-change-indicator {
    font-size: 0.65rem;
    padding: 0.15rem 0.3rem;
  }
  
  .rank-change-indicator .material-icons {
    font-size: 0.7rem;
  }
  
  .change-amount {
    font-size: 0.65rem;
  }
}
</style>