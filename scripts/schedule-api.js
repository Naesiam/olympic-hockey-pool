// ------------------------------------------------------------
//  CONFIG
// ------------------------------------------------------------
const API_URL = "https://yellow-grass-54c8.srhansen428.workers.dev";

// Flag assets
const flagMap = {
  CAN: "artwork/can.png",
  FIN: "artwork/fin.png",
  USA: "artwork/usa.png",
  GER: "artwork/ger.png",
  SWE: "artwork/swe.png",
  SUI: "artwork/sui.png",
  CZE: "artwork/cze.png",
  SVK: "artwork/svk.png",
  LAT: "artwork/lat.png",
  DEN: "artwork/den.png",
  ITA: "artwork/ita.png",
  FRA: "artwork/fra.png"
};

// Drafted teams
const teamsByPlayer = {
  Sean: ["SWE", "CZE", "LAT", "DEN"],
  John: ["CAN", "SUI", "SVK", "FRA"],
  Roland: ["USA", "FIN", "GER", "ITA"]
};

// Fantasy team names (for mini-tables)
const fantasyNames = {
  Sean: "Nut Grabber",
  John: "Innocent Bystandard",
  Roland: "Where’s My Mouse!!!"
};

// Player initials for schedule rows
const playerInitials = {
  Sean: "S",
  John: "J",
  Roland: "R"
};

// Internal schedule array
let schedule = [];

// ------------------------------------------------------------
//  UTILITIES
// ------------------------------------------------------------
function showLoading(id) {
  const el = document.getElementById(id);
  if (el) el.style.opacity = 1;
}

function hideLoading(id) {
  const el = document.getElementById(id);
  if (el) el.style.opacity = 0;
}

// ------------------------------------------------------------
//  LAST UPDATED TIMESTAMP
// ------------------------------------------------------------
function updateLastUpdatedTimestamp() {
  const now = new Date();
  const formatted = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });

  const el = document.getElementById("last-updated");
  if (el) {
    el.textContent = `Last updated: ${formatted}`;
  }
}

// ------------------------------------------------------------
//  MAP API GAME → INTERNAL FORMAT
// ------------------------------------------------------------
function mapApiGameToInternal(g) {
  const team1 = g.team1short || "TBD";
  const team2 = g.team2short || "TBD";

  const score1 =
    g.goals1 !== undefined ? Number(g.goals1) :
    g.score?.goals1 !== undefined ? Number(g.score.goals1) :
    null;

  const score2 =
    g.goals2 !== undefined ? Number(g.goals2) :
    g.score?.goals2 !== undefined ? Number(g.score.goals2) :
    null;

  const rawStatus = (g.status || g.score?.status || "scheduled").toLowerCase();

  let status = "scheduled";
  if (rawStatus.includes("final")) {
    status = "finished";
  } else if (rawStatus.includes("live") || rawStatus.includes("progress")) {
    status = "inprogress";
  }

  // Convert CET → Local Time (EST)
  let dateLabel = "TBD";
  let timeLabel = "";

  if (g.date) {
    const cetString = g.date.replace(" ", "T") + "+01:00";
    const d = new Date(cetString);

    if (!isNaN(d.getTime())) {
      const monthShort = d.toLocaleString("en-US", { month: "short" });
      dateLabel = `${monthShort} ${d.getDate()}`;

      timeLabel = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
      });
    }
  }

  return {
    date: dateLabel,
    time: timeLabel,
    team1,
    team2,
    score1,
    score2,
    status,
    rawDate: g.date
  };
}

// ------------------------------------------------------------
//  OWNER / INITIAL HELPERS
// ------------------------------------------------------------
function ownerOf(teamCode) {
  for (const [player, teams] of Object.entries(teamsByPlayer)) {
    if (teams.includes(teamCode)) return player;
  }
  return null;
}

function getPlayerInitialForTeam(teamCode) {
  const owner = ownerOf(teamCode);
  if (!owner) return "";
  return playerInitials[owner] || "";
}

// ------------------------------------------------------------
//  RENDER SCHEDULE (with initials)
// ------------------------------------------------------------
function renderSchedule() {
  const container = document.getElementById("schedule-container");
  if (!container) return;

  container.innerHTML = "";
  let currentDate = "";

  schedule.forEach((game) => {
    if (game.date !== currentDate) {
      currentDate = game.date;

      const dateDiv = document.createElement("div");
      dateDiv.style.margin = "20px 0 10px";
      dateDiv.style.fontSize = "20px";
      dateDiv.style.fontWeight = "bold";
      dateDiv.style.color = "#ccc";
      dateDiv.textContent = currentDate;
      container.appendChild(dateDiv);
    }

    const row = document.createElement("div");
    row.className = "game-row";

    const winner1 =
      game.status === "finished" &&
      game.score1 != null &&
      game.score2 != null &&
      game.score1 > game.score2;

    const winner2 =
      game.status === "finished" &&
      game.score1 != null &&
      game.score2 != null &&
      game.score2 > game.score1;

    const leftInitial = getPlayerInitialForTeam(game.team1);
    const rightInitial = getPlayerInitialForTeam(game.team2);

    const teamLeft = document.createElement("div");
    teamLeft.className = "team left " + (winner1 ? "winner" : "loser");

    if (leftInitial) {
      const initSpan = document.createElement("span");
      initSpan.textContent = leftInitial + " ·";
      initSpan.style.fontSize = "12px";
      initSpan.style.color = "#aaa";
      teamLeft.appendChild(initSpan);
    }

    const img1 = document.createElement("img");
    img1.src = flagMap[game.team1] || "";
    img1.alt = game.team1;
    teamLeft.appendChild(img1);
    teamLeft.appendChild(document.createTextNode(game.team1));

    const score1 = document.createElement("div");
    score1.className = "score";
    score1.textContent = game.status !== "finished" ? "-" : game.score1;

    const timeDiv = document.createElement("div");
    timeDiv.className = "game-time";
    timeDiv.textContent = game.time;

    const score2 = document.createElement("div");
    score2.className = "score";
    score2.textContent = game.status !== "finished" ? "-" : game.score2;

    const teamRight = document.createElement("div");
    teamRight.className = "team right " + (winner2 ? "winner" : "loser");

    const img2 = document.createElement("img");
    img2.src = flagMap[game.team2] || "";
    img2.alt = game.team2;
    teamRight.appendChild(img2);
    teamRight.appendChild(document.createTextNode(game.team2));

    if (rightInitial) {
      const initSpanR = document.createElement("span");
      initSpanR.textContent = "· " + rightInitial;
      initSpanR.style.fontSize = "12px";
      initSpanR.style.color = "#aaa";
      teamRight.appendChild(initSpanR);
    }

    // ⭐ Correct orientation: TEAM2 – TIME – TEAM1
    row.appendChild(teamRight);
    row.appendChild(score2);
    row.appendChild(timeDiv);
    row.appendChild(score1);
    row.appendChild(teamLeft);

    if (game.status === "inprogress" || game.status === "live") {
      const liveTag = document.createElement("div");
      liveTag.textContent = "IN PROGRESS";
      liveTag.style.color = "#ffcc00";
      liveTag.style.fontSize = "12px";
      liveTag.style.marginLeft = "10px";
      row.appendChild(liveTag);
    }

    container.appendChild(row);
  });
}

// ------------------------------------------------------------
//  STANDINGS (GOALS ONLY)
// ------------------------------------------------------------
function computeStandings() {
  const standingsMap = {
    Sean: { name: "Sean", goals: 0 },
    John: { name: "John", goals: 0 },
    Roland: { name: "Roland", goals: 0 }
  };

  schedule.forEach((g) => {
    if (g.status !== "finished") return;

    const t1Owner = ownerOf(g.team1);
    const t2Owner = ownerOf(g.team2);

    if (t1Owner && g.score1 != null) standingsMap[t1Owner].goals += g.score1;
    if (t2Owner && g.score2 != null) standingsMap[t2Owner].goals += g.score2;
  });

  return Object.values(standingsMap).sort((a, b) => b.goals - a.goals);
}

// ------------------------------------------------------------
//  TEAM GOAL MAP (for fantasy tables & popups)
// ------------------------------------------------------------
function computeTeamGoals() {
  const teamGoals = {};

  schedule.forEach((g) => {
    if (g.status !== "finished") return;

    if (g.team1 && g.score1 != null) {
      teamGoals[g.team1] = (teamGoals[g.team1] || 0) + g.score1;
    }
    if (g.team2 && g.score2 != null) {
      teamGoals[g.team2] = (teamGoals[g.team2] || 0) + g.score2;
    }
  });

  return teamGoals;
}

// ------------------------------------------------------------
//  RENDER STANDINGS (main table)
// ------------------------------------------------------------
function renderStandings() {
  const container = document.getElementById("standings-container");
  if (!container) return;

  const standings = computeStandings();

  let html = `
    <table>
      <tr>
        <th>Player</th>
        <th>Goals</th>
      </tr>
  `;

  standings.forEach((row) => {
    html += `
      <tr>
        <td>${row.name}</td>
        <td>${row.goals}</td>
      </tr>
    `;
  });

  html += `</table>`;
  container.innerHTML = html;

  // After main standings, render fantasy tables
  renderFantasyTeamTables();
}

// ------------------------------------------------------------
//  RENDER FANTASY TEAM TABLES (Standings Step 1)
// ------------------------------------------------------------
function renderFantasyTeamTables() {
  const container = document.getElementById("teamTablesContainer");
  if (!container) return;

  const teamGoals = computeTeamGoals();

  container.innerHTML = "";

  Object.entries(teamsByPlayer).forEach(([player, teams]) => {
    const fantasyName = fantasyNames[player] || player;

    const wrapper = document.createElement("div");
    wrapper.className = "fantasy-table";

    let html = `
      <div class="fantasy-table-title">${fantasyName}</div>
      <table>
        <tr>
          <th>Team</th>
          <th>Goals</th>
        </tr>
    `;

    let total = 0;

    teams.forEach((teamCode) => {
      const goals = teamGoals[teamCode] || 0;
      total += goals;

      html += `
        <tr>
          <td>${teamCode}</td>
          <td class="team-goals-cell" data-team="${teamCode}">${goals}</td>
        </tr>
      `;
    });

    html += `
        <tr>
          <th>Total</th>
          <th>${total}</th>
        </tr>
      </table>
    `;

    wrapper.innerHTML = html;
    container.appendChild(wrapper);
  });

  attachTeamGoalHover();
}

// ------------------------------------------------------------
//  TEAM GOAL POPUP (Standings Step 2)
// ------------------------------------------------------------
function getGamesForTeam(teamCode) {
  return schedule.filter((g) => {
    if (g.status !== "finished") return false;
    const scoredAsHome = g.team1 === teamCode && g.score1 != null && g.score1 > 0;
    const scoredAsAway = g.team2 === teamCode && g.score2 != null && g.score2 > 0;
    return scoredAsHome || scoredAsAway;
  });
}

function showTeamGoalPopup(teamCode, anchorRect) {
  const popup = document.getElementById("teamGoalPopup");
  if (!popup) return;

  const games = getGamesForTeam(teamCode);

  if (!games.length) {
    popup.style.display = "none";
    return;
  }

  let html = "";

  games.forEach((g) => {
    const isHome = g.team1 === teamCode;
    const homeCode = g.team1;
    const awayCode = g.team2;

    html += `
      <div class="game-row">
        <img src="${flagMap[homeCode] || ""}" class="flag" alt="${homeCode}">
        <span class="team-name">${homeCode}</span>
        <span class="score-text">${g.score1}</span>
        <span class="score-text">-</span>
        <span class="score-text">${g.score2}</span>
        <span class="team-name">${awayCode}</span>
        <img src="${flagMap[awayCode] || ""}" class="flag" alt="${awayCode}">
      </div>
    `;
  });

  popup.innerHTML = html;

  const top = window.scrollY + anchorRect.bottom + 6;
  const left = window.scrollX + anchorRect.left;

  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
  popup.style.display = "block";
}

function hideTeamGoalPopup() {
  const popup = document.getElementById("teamGoalPopup");
  if (!popup) return;
  popup.style.display = "none";
}

function attachTeamGoalHover() {
  const cells = document.querySelectorAll(".team-goals-cell");
  if (!cells.length) return;

  cells.forEach((cell) => {
    cell.addEventListener("mouseenter", () => {
      const teamCode = cell.getAttribute("data-team");
      const rect = cell.getBoundingClientRect();
      showTeamGoalPopup(teamCode, rect);
    });

    cell.addEventListener("mouseleave", () => {
      hideTeamGoalPopup();
    });
  });

  document.addEventListener("scroll", hideTeamGoalPopup, true);
}

// ------------------------------------------------------------
//  FETCH + BOOTSTRAP
// ------------------------------------------------------------
async function loadScheduleFromApi() {
  try {
    showLoading("schedule-loading");
    showLoading("standings-loading");

    const res = await fetch(API_URL);
    const data = await res.json();

    const games = Array.isArray(data) ? data : (data.games || data);

    schedule = games.map(mapApiGameToInternal);

    renderSchedule();
    renderStandings();

    // ⭐ Update timestamp ONLY when API call finishes
    updateLastUpdatedTimestamp();
  } catch (err) {
    console.error("Error loading schedule:", err);
  } finally {
    hideLoading("schedule-loading");
    hideLoading("standings-loading");
  }
}

// ------------------------------------------------------------
//  SMART AUTO REFRESH (unchanged)
// ------------------------------------------------------------
let refreshTimer = null;

function gamesRemainingToday() {
  const today = new Date().toLocaleDateString("en-CA");

  return schedule.some((g) => {
    if (!g.rawDate) return false;

    const gameDate = g.rawDate.split(" ")[0];
    const isToday = (gameDate === today);

    if (!isToday) return false;

    return g.status !== "finished";
  });
}

function getRefreshInterval() {
  const now = new Date();
  const hour = now.getHours();

  const isGameWindow =
    (hour >= 5 && hour <= 8) ||
    (hour >= 9 && hour <= 12) ||
    (hour >= 13 && hour <= 16);

  return isGameWindow
    ? 10 * 60 * 1000
    : 2 * 60 * 60 * 1000;
}

function scheduleNextRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);

  if (!gamesRemainingToday()) {
    console.log("All games finished for today — auto-refresh paused.");
    return;
  }

  const interval = getRefreshInterval();

  refreshTimer = setTimeout(async () => {
    await loadScheduleFromApi();

    // ⭐ Timestamp updates here too, but ONLY after API call
    updateLastUpdatedTimestamp();

    scheduleNextRefresh();
  }, interval);
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadScheduleFromApi();
  scheduleNextRefresh();
});
