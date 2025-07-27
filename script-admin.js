// Získání odkazů na HTML elementy
const teamInput = document.getElementById('team-name');
const addTeamBtn = document.getElementById('add-team');
const roundNumber = document.getElementById('round-number');
const nextRoundBtn = document.getElementById('next-round');
const saveAndShowBtn = document.getElementById('save-and-show');
const nextDisplayTeamBtn = document.getElementById('next-display-team');
const resetDisplayBtn = document.getElementById('reset-display');
const resetQuizBtn = document.getElementById('reset-quiz');
const adminTableHead = document.getElementById('admin-table-head');
const adminTableBody = document.getElementById('admin-table-body');
const controlSection = document.getElementById('control');

// Načtení dat z localStorage nebo inicializace prázdných dat
let teams = JSON.parse(localStorage.getItem('teams')) || [];
let currentRound = parseInt(localStorage.getItem('currentRound')) || 1;
let revealedIndex = parseInt(localStorage.getItem('revealedIndex')) || 0;

const MAX_ROUNDS_LIMIT = 5; // Konstantní maximální povolený počet kol

// Inicializace stránky po načtení DOM
initializeAdminPage();

/**
 * Inicializuje admin stránku: vykresluje admin tabulku,
 * a nastavuje viditelnost sekcí pro ovládání.
 */
function initializeAdminPage() {
  renderAdminTable(); // Vykreslí tabulku se vstupními poli pro skóre
  controlSection.style.display = 'block'; // Sekce ovládání je vždy viditelná
  roundNumber.textContent = currentRound;
  // Zakázat tlačítko "Další kolo", pokud jsme dosáhli limitu kol
  if (currentRound > MAX_ROUNDS_LIMIT) {
    nextRoundBtn.disabled = true;
    nextRoundBtn.textContent = 'Konec kvízu';
  } else {
    nextRoundBtn.disabled = false;
    nextRoundBtn.textContent = 'Další kolo';
  }
}

// Event listener pro přidání týmu
addTeamBtn.addEventListener('click', () => {
  const name = teamInput.value.trim();
  if (name && teams.length < 10) { // Omezení na maximálně 10 týmů
    teams.push({ name, scores: [] }); // Nový tým s prázdným polem pro skóre
    teamInput.value = ''; // Vyčistí vstupní pole
    saveData(); // Uloží data
    initializeAdminPage(); // Znovu inicializuje pro aktualizaci UI
    dispatchStorageEvent('teams', JSON.stringify(teams)); // Informujeme display.js o změně týmů
  }
});

// Event listener pro přechod na další kolo
nextRoundBtn.addEventListener('click', () => {
  if (currentRound <= MAX_ROUNDS_LIMIT) { // KONTROLA: Zabrání přidání více než 5 kol
    currentRound++; // Inkrementuje aktuální kolo
    saveData(); // Uloží data
    initializeAdminPage(); // Znovu inicializuje pro aktualizaci UI
    dispatchStorageEvent('teams', JSON.stringify(teams)); // Informujeme display.js o změně týmů
    dispatchStorageEvent('currentRound', currentRound.toString()); // Informujeme display.js o změně kola
    // Resetujeme zobrazení na displayi, aby se začalo odznova odhalovat pro nové kolo
    revealedIndex = 0;
    localStorage.setItem('revealedIndex', revealedIndex.toString());
    dispatchStorageEvent('revealedIndex', revealedIndex.toString());
  }
});

// Event listener pro uložení skóre a otevření display stránky
saveAndShowBtn.addEventListener('click', () => {
  // Skóre se již ukládá průběžně při zadávání do tabulky, takže stačí jen uložit a otevřít
  saveData();
  window.open('display.html', '_blank'); // Otevře display.html v nové záložce
});

// Event listener pro postupné zobrazování týmů na display stránce
nextDisplayTeamBtn.addEventListener('click', () => {
  console.log('Admin: nextDisplayTeamBtn clicked. Current revealedIndex:', revealedIndex);
  // Znovu načteme týmy pro případ, že se změnily skóre od posledního načtení
  teams = JSON.parse(localStorage.getItem('teams')) || [];
  const sortedTeams = [...teams].map(team => ({
    name: team.name,
    scores: team.scores,
    total: team.scores.reduce((sum, scoreObj) => {
        // Handle both new object format and old number format for scores
        if (scoreObj && typeof scoreObj === 'object') {
          return sum + (scoreObj.regular || 0) + (scoreObj.bonus || 0);
        } else if (typeof scoreObj === 'number') {
          return sum + scoreObj; // For legacy numbers
        }
        return sum;
      }, 0)
  })).sort((a, b) => b.total - a.total); // Seřadí týmy od nejlepšího po nejhorší (nejvyšší celkové skóre první)

  if (revealedIndex < sortedTeams.length) {
    revealedIndex++; // Inkrementuje index zobrazeného týmu
    localStorage.setItem('revealedIndex', revealedIndex.toString()); // Uloží do localStorage
    dispatchStorageEvent('revealedIndex', revealedIndex.toString()); // Informuje display.js
    console.log('Admin: New revealedIndex:', revealedIndex);
  } else {
    console.log('Admin: All teams already revealed.');
  }
});

// Event listener pro resetování zobrazení na display stránce
resetDisplayBtn.addEventListener('click', () => {
  console.log('Admin: resetDisplayBtn clicked.');
  revealedIndex = 0; // Resetuje index zobrazeného týmu
  localStorage.setItem('revealedIndex', revealedIndex.toString()); // Uloží do localStorage
  dispatchStorageEvent('revealedIndex', revealedIndex.toString()); // Informuje display.js
});

// Event listener pro reset celého kvízu
resetQuizBtn.addEventListener('click', () => {
  // Používáme confirm pro potvrzení akce, protože je destruktivní
  if (confirm('Opravdu chcete resetovat celý kvíz? Všechna data budou smazána!')) {
    localStorage.removeItem('teams'); // Smaže týmy
    localStorage.removeItem('currentRound'); // Smaže aktuální kolo
    localStorage.removeItem('revealedIndex'); // Smaže index zobrazení
    teams = []; // Resetuje lokální proměnné
    currentRound = 1;
    revealedIndex = 0;
    saveData(); // Uloží prázdná data do localStorage
    initializeAdminPage(); // Znovu inicializuje pro čisté UI
    dispatchStorageEvent('teams', '[]'); // Informujeme display.js o resetu týmů
    dispatchStorageEvent('currentRound', '1'); // Informujeme display.js o resetu kola
    dispatchStorageEvent('revealedIndex', '0'); // Informujeme display.js o resetu zobrazení
  }
});

/**
 * Ukládá aktuální stav týmů, kola a zobrazeného indexu do localStorage.
 */
function saveData() {
  localStorage.setItem('teams', JSON.stringify(teams));
  localStorage.setItem('currentRound', currentRound.toString());
  localStorage.setItem('revealedIndex', revealedIndex.toString());
}

/**
 * Vykresluje tabulku s přehledem skóre všech týmů a kol v admin rozhraní.
 * Zobrazuje pouze 5 kol.
 * Umožňuje přímé zadávání skóre do tabulky pomocí input polí a přidání bonusových bodů.
 */
function renderAdminTable() {
  adminTableHead.innerHTML = ''; // Vyčistí hlavičku tabulky
  adminTableBody.innerHTML = ''; // Vyčistí tělo tabulky

  const displayMaxRounds = MAX_ROUNDS_LIMIT;
  if (teams.length === 0 && currentRound === 1) {
    return;
  }

  // Header
  const trHead = document.createElement('tr');
  const thTeam = document.createElement('th');
  thTeam.textContent = 'Tým';
  trHead.appendChild(thTeam);

  for (let i = 0; i < displayMaxRounds; i++) {
    const th = document.createElement('th');
    th.textContent = `Kolo ${i + 1}`;
    if (i + 1 === currentRound) {
      th.classList.add('current-round-header');
    }
    trHead.appendChild(th);
  }

  const thTotal = document.createElement('th');
  thTotal.textContent = 'Celkem';
  trHead.appendChild(thTotal);
  adminTableHead.appendChild(trHead);

  // Table rows for teams
  teams.forEach((team, teamIndex) => {
    const trBody = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.textContent = team.name;
    trBody.appendChild(tdName);

    let totalScore = 0;
    for (let i = 0; i < displayMaxRounds; i++) {
      const tdScore = document.createElement('td');

      // Create a container for input and bonus button to apply flex
      const scoreContainer = document.createElement('div');
      scoreContainer.style.display = 'flex';
      scoreContainer.style.alignItems = 'center';
      scoreContainer.style.justifyContent = 'center';
      scoreContainer.style.gap = '5px'; // Space between input and button

      // Ensure the score object exists for the current round
      // If it's a number (legacy), convert it
      let scoreObj = getScoreObject(team, i);
      team.scores[i] = scoreObj; // Update the teams array with the ensured object structure

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.step = '0.5'; // Allow half points
      input.style.width = '60px';
      input.style.textAlign = 'center';

      input.value = scoreObj.regular; // Use 'regular' score

      if (i + 1 === currentRound) {
        tdScore.classList.add('current-round-cell'); // Apply highlight to the TD
      }

      // Bonus button
      const bonusBtn = document.createElement('button');
      bonusBtn.textContent = scoreObj.bonus ? '+1 B' : '+B'; // Display +1 B if bonus is active
      bonusBtn.classList.add('bonus-btn');
      bonusBtn.style.backgroundColor = scoreObj.bonus ? '#28a745' : '#6c757d'; // Green if active, grey if not
      bonusBtn.style.color = 'white';
      bonusBtn.style.border = 'none';
      bonusBtn.style.padding = '5px';
      bonusBtn.style.borderRadius = '3px';
      bonusBtn.style.cursor = 'pointer';
      bonusBtn.style.fontSize = '0.7em'; // Smaller text for bonus button
      bonusBtn.style.flexShrink = '0'; // Zabrání zmenšování tlačítka

      // Logic for current/past/future rounds
      if (i === currentRound - 1 && currentRound <= MAX_ROUNDS_LIMIT) {
        // Current round: editable score and bonus button active
        input.readOnly = false;
        bonusBtn.disabled = false;
        input.addEventListener('change', (event) => {
          scoreObj.regular = parseFloat(event.target.value) || 0; // Use parseFloat
          saveData();
          renderAdminTable(); // Rerender to update totals and bonus button state
          dispatchStorageEvent('teams', JSON.stringify(teams));
        });
        bonusBtn.addEventListener('click', () => {
          scoreObj.bonus = scoreObj.bonus ? 0 : 1; // Toggle bonus
          saveData();
          renderAdminTable(); // Rerender to update totals and bonus button state
          dispatchStorageEvent('teams', JSON.stringify(teams));
        });
      } else if (i < currentRound - 1) {
        // Past rounds: editable score and bonus button active
        input.readOnly = false;
        bonusBtn.disabled = false;
        input.style.backgroundColor = 'white';
         input.addEventListener('change', (event) => {
          scoreObj.regular = parseFloat(event.target.value) || 0; // Use parseFloat
          saveData();
          renderAdminTable(); // Rerender to update totals and bonus button state
          dispatchStorageEvent('teams', JSON.stringify(teams));
        });
        bonusBtn.addEventListener('click', () => {
          scoreObj.bonus = scoreObj.bonus ? 0 : 1; // Toggle bonus
          saveData();
          renderAdminTable(); // Rerender to update totals and bonus button state
          dispatchStorageEvent('teams', JSON.stringify(teams));
        });
      } else {
        // Future rounds: read-only score and disabled bonus button
        input.readOnly = true;
        bonusBtn.disabled = true;
        input.style.backgroundColor = '#f0f0f0';
        bonusBtn.style.backgroundColor = '#ccc'; // Greyed out for disabled
      }

      scoreContainer.appendChild(input);
      scoreContainer.appendChild(bonusBtn);
      tdScore.appendChild(scoreContainer); // Append the container to the TD
      trBody.appendChild(tdScore); // Append the TD to the row

      totalScore += (scoreObj.regular || 0) + (scoreObj.bonus || 0); // Sum regular and bonus
    }

    const tdTotal = document.createElement('td');
    tdTotal.textContent = totalScore;
    trBody.appendChild(tdTotal);
    adminTableBody.appendChild(trBody);
  });
}

/**
 * Helper function to ensure a score for a given round is an object {regular, bonus}.
 * Converts a number to this format if necessary.
 * @param {object} team - The team object.
 * @param {number} roundIndex - The index of the round.
 * @returns {object} The score object for the round.
 */
function getScoreObject(team, roundIndex) {
    // Ensure the scores array has enough elements up to roundIndex
    while (team.scores.length <= roundIndex) {
        team.scores.push(null); // Fill with nulls until the desired index
    }

    if (!team.scores[roundIndex]) {
        team.scores[roundIndex] = { regular: 0, bonus: 0 };
    } else if (typeof team.scores[roundIndex] === 'number') {
        // Convert old number format to new object format
        team.scores[roundIndex] = { regular: team.scores[roundIndex], bonus: 0 };
    }
    return team.scores[roundIndex];
}

/**
 * Pomocná funkce pro odesílání událostí 'storage' pro synchronizaci mezi okny.
 * @param {string} key - Klíč, který se změnil v localStorage.
 * @param {string} newValue - Nová hodnota klíče.
 */
function dispatchStorageEvent(key, newValue) {
  window.dispatchEvent(new StorageEvent('storage', {
    key: key,
    newValue: newValue,
    oldValue: localStorage.getItem(key), // Může být null
    url: window.location.href,
    storageArea: localStorage
  }));
}
