// Získání odkazů na HTML elementy
const tableHead = document.getElementById('table-head');
const tableBody = document.getElementById('table-body');

// Inicializace proměnných
let teams = JSON.parse(localStorage.getItem('teams')) || [];
let revealedIndex = parseInt(localStorage.getItem('revealedIndex')) || 0;
let currentRound = parseInt(localStorage.getItem('currentRound')) || 1; // Načtení aktuálního kola
let sortedTeams = [];
const maxRounds = 5; // Statický počet kol pro zobrazení na display stránce

console.log('Display: Initial load - teams:', teams, 'revealedIndex:', revealedIndex, 'currentRound:', currentRound);

// Inicializace zobrazení při načtení stránky
try {
  initializeDisplayPage();
} catch (initError) {
  console.error('Display: Error during initial call to initializeDisplayPage:', initError, 'Stack:', initError.stack);
}


/**
 * Inicializuje display stránku: načítá data, řadí týmy,
 * vykresluje hlavičku tabulky a zobrazuje již odhalené týmy.
 */
function initializeDisplayPage() {
  try { // Wrap the entire function body to catch any errors within
    teams = JSON.parse(localStorage.getItem('teams')) || [];
    revealedIndex = parseInt(localStorage.getItem('revealedIndex')) || 0;
    currentRound = parseInt(localStorage.getItem('currentRound')) || 1; // Aktualizace aktuálního kola

    console.log('Display: initializeDisplayPage - teams after load:', teams, 'revealedIndex:', revealedIndex, 'currentRound:', currentRound);

    // Seřadí týmy od nejvyššího skóre po nejnižší
sortedTeams = [...teams].map(team => ({
  name: team.name,
  scores: team.scores,
  total: team.scores.reduce((sum, scoreObj) => {
    if (scoreObj && typeof scoreObj === 'object') {
      return sum + (scoreObj.regular || 0) + (scoreObj.bonus || 0);
    } else if (typeof scoreObj === 'number') {
      return sum + scoreObj;
    }
    return sum;
  }, 0)
})).sort((a, b) => b.total - a.total); // TOTO JE DŮLEŽITÉ: b.total - a.tota

    console.log('Display: initializeDisplayPage - sortedTeams AFTER SORT:', sortedTeams); // Zkontrolujte toto v konzoli!

    renderHeader();

    if (tableBody) {
      tableBody.innerHTML = ''; // Always clear the table body
    } else {
      console.error('Display: initializeDisplayPage - tableBody element not found!');
      return;
    }
    lastShownIndex = -1;

    console.log('Display: Calling showUpTo with targetIndex (revealedIndex):', revealedIndex);
    renderRevealedTable();
  } catch (innerError) {
    console.error('Display: Error inside initializeDisplayPage:', innerError, 'Stack:', innerError.stack);
  }
}

/**
 * Vykresluje hlavičku tabulky s názvy týmů a statickým počtem kol.
 */
function renderHeader() {
  if (!tableHead) { // Kontrola existence elementu
    console.error('Display: renderHeader - tableHead element not found!');
    return;
  }
  tableHead.innerHTML = ''; // Vyčistíme hlavičku před novým vykreslením
  const tr = document.createElement('tr');

  // NOVÝ SLOUPEC: Pořadí
  const thOrder = document.createElement('th');
  thOrder.textContent = 'Pořadí';
  tr.appendChild(thOrder);

  const teamTh = document.createElement('th');
  teamTh.textContent = 'Tým';
  tr.appendChild(teamTh);

  for (let i = 0; i < maxRounds; i++) { // Statických 5 kol
    const th = document.createElement('th');
    th.textContent = `Kolo ${i + 1}`;
    if (i + 1 === currentRound) { // Zvýraznění aktuálního kola v hlavičce
      th.classList.add('current-round-header');
    }
    tr.appendChild(th);
  }

  const sumTh = document.createElement('th');
  sumTh.textContent = 'Celkem';
  tr.appendChild(sumTh);

  tableHead.appendChild(tr);
  console.log('Display: Header rendered.');
}

let lastShownIndex = -1; // Sleduje poslední zobrazený index pro postupné přidávání

/**
 * Vykreslí celou tabulku, ale odhalí pouze ty týmy, které mají být vidět.
 * Odhalování probíhá od posledního místa k prvnímu.
 */
function renderRevealedTable() {
  if (!tableBody) return;
  tableBody.innerHTML = ''; // Vždy vyčistit tělo tabulky

  const totalTeams = sortedTeams.length;
  if (totalTeams === 0) return;

  // Vypočítá, kolik týmů z vrcholu tabulky se má zatím skrýt
  const teamsToHideCount = totalTeams - revealedIndex;

  // Vykreslí řádek pro každý tým v seřazeném poli
  sortedTeams.forEach((team, index) => {
    const tr = document.createElement('tr');
    
    // Zjistí, zda má být tento řádek ještě skrytý
    const isHidden = index < teamsToHideCount;

    // Sloupec: Pořadí (vždy viditelné)
    const orderTd = document.createElement('td');
    const rank = index + 1;
    if (rank === 1) { orderTd.textContent = '🥇'; } 
    else if (rank === 2) { orderTd.textContent = '🥈'; } 
    else if (rank === 3) { orderTd.textContent = '🥉'; } 
    else { orderTd.textContent = String(rank); }
    tr.appendChild(orderTd);

    // Sloupec: Tým
    const nameTd = document.createElement('td');
    nameTd.textContent = isHidden ? '❓' : team.name;
    tr.appendChild(nameTd);

    // Sloupce: Jednotlivá kola
    for (let j = 0; j < maxRounds; j++) {
      const td = document.createElement('td');
      if (isHidden) {
        td.textContent = ''; // Skryté buňky jsou prázdné
      } else {
        const scoreValue = team.scores[j];
        let displayScoreText = '-';
        let bonusApplied = false;
        if (scoreValue && typeof scoreValue === 'object') {
          displayScoreText = String(scoreValue.regular);
          if (scoreValue.bonus === 1) bonusApplied = true;
        } else if (typeof scoreValue === 'number') {
          displayScoreText = String(scoreValue);
        }
        td.textContent = displayScoreText;
        if (bonusApplied) {
            const bonusSpan = document.createElement('span');
            bonusSpan.textContent = ' +1';
            bonusSpan.classList.add('plus-one'); // Add this line
            td.appendChild(bonusSpan);
        }
        if (j + 1 === currentRound) {
          td.classList.add('current-round-cell');
        }
      }
      tr.appendChild(td);
    }

    // Sloupec: Celkem
    const totalTd = document.createElement('td');
    totalTd.textContent = isHidden ? '' : String(team.total);
    tr.appendChild(totalTd);

    tableBody.appendChild(tr);
  });
}

// Sleduj změny v localStorage pro synchronizaci s admin stránkou
window.addEventListener('storage', (e) => {
  console.log('Display: Storage event received, key:', e.key, 'newValue:', e.newValue);
  // Reagujeme na změny revealedIndex, teams a currentRound
  if (e.key === 'revealedIndex' || e.key === 'teams' || e.key === 'currentRound') {
    initializeDisplayPage(); // Znovu inicializujeme celou stránku pro aktualizaci
  }
});

// script-display.js