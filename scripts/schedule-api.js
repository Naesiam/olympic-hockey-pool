// ------------------------------------------------------------
//  CONFIG
// ------------------------------------------------------------
const API_URL = "https://yellow-grass-54c8.srhansen428.workers.dev";

const flagMap = {
  CAN: "artwork/can.png", FIN: "artwork/fin.png", USA: "artwork/usa.png",
  GER: "artwork/ger.png", SWE: "artwork/swe.png", SUI: "artwork/sui.png",
  CZE: "artwork/cze.png", SVK: "artwork/svk.png", LAT: "artwork/lat.png",
  DEN: "artwork/den.png", ITA: "artwork/ita.png", FRA: "artwork/fra.png"
};

const teamsByPlayer = {
  Sean: ["SWE", "CZE", "LAT", "DEN"],
  John: ["CAN", "SUI", "SVK", "FRA"],
  Roland: ["USA", "FIN", "GER", "ITA"]
};

const fantasyNames = {
  Sean: "Nut Grabber",
  John: "Innocent Bystandard",
  Roland: "Where’s My Mouse!!!"
};

const playerInitials = { Sean: "S", John: "J", Roland: "R" };

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
//  LAST UPDATED (DISPLAY ONLY)
// ------------------------------------------------------------
function updateLastUpdatedTimestamp() {
  const el = document.getElementById("last-updated");
  if (!el) return;

  const stored = localStorage.getItem("lastUpdated");
  el.textContent = stored
    ? `Last updated: ${stored}`
    : `Last updated: pending`;
}

// ------------------------------------------------------------
//  SCORE CHANGE DETECTOR
// ------------------------------------------------------------
function detectScoreChange(oldData, newData) {
  if (!oldData) return true;

  for (let i = 0; i < newData.length; i++) {
    const a = oldData[i], b = newData[i];
    if (!a || !b) continue;
    if (a.score1 !== b.score1 || a.score2 !== b.score2) return true;
  }
  return false;
}

// ------------------------------------------------------------
//  MAP API GAME → INTERNAL FORMAT
// ------------------------------------------------------------
function mapApiGameToInternal(g) {
  const team1 = g.team1short || "TBD";
  const team2 = g.team2short || "TBD";

  const score1 =
    g.goals1 != null ? Number(g.goals1) :
    g.score?.goals1 != null ? Number(g.score.goals1) : null;

  const score2 =
    g.goals2 != null ? Number(g.goals2) :
    g.score?.goals2 != null ? Number(g.score.goals2) : null;

  const rawStatus = (g.status || g.score?.status || "scheduled").toLowerCase();
  const status = rawStatus.includes("final") ? "finished" : "scheduled";

  let dateLabel = "TBD", timeLabel = "";
  if (g.date) {
    const d = new Date(g.date.replace(" ", "T") + "+01:00");
    if (!isNaN(d)) {
      dateLabel = `${d.toLocaleString("en-US", { month: "short" })} ${d.getDate()}`;
      timeLabel = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
  }

  return { date: dateLabel, time: timeLabel, team1, team2, score1, score2, status, rawDate: g.date };
}

// ------------------------------------------------------------
//  OWNER HELPERS
// ------------------------------------------------------------
function ownerOf(teamCode) {
  for (const [player, teams] of Object.entries(teamsByPlayer))
    if (teams.includes(teamCode)) return player;
  return null;
}

function getPlayerInitialForTeam(teamCode) {
  const owner = ownerOf(teamCode);
  return owner ? playerInitials[owner] : "";
}

// ------------------------------------------------------------
//  RENDER SCHEDULE
// ------------------------------------------------------------
function renderSchedule() {
  const container = document.getElementById("schedule-container");
  if (!container) return;

  container.innerHTML = "";
  let currentDate = "";

  schedule.forEach((g) => {
    if (g.date !== currentDate) {
      currentDate = g.date;
      const d = document.createElement("div");
      d.style.margin = "20px 0 10px";
      d.style.fontSize = "20px";
      d.style.fontWeight = "bold";
      d.style.color = "#ccc";
      d.textContent = currentDate;
      container.appendChild(d);
    }

    const row = document.createElement("div");
    row.className = "game-row";

    const winner1 = g.status === "finished" && g.score1 > g.score2;
    const winner2 = g.status === "finished" && g.score2 > g.score1;

    const leftInit = getPlayerInitialForTeam(g.team1);
    const rightInit = getPlayerInitialForTeam(g.team2);

    const teamLeft = document.createElement("div");
    teamLeft.className = "team left " + (winner1 ? "winner" : "loser");
    if (leftInit) {
      const s = document.createElement("span");
      s.textContent = leftInit + " ·";
      s.style.fontSize = "12px";
      s.style.color = "#aaa";
      teamLeft.appendChild(s);
    }
    const img1 = document.createElement("img");
    img1.src = flagMap[g.team1] || "";
    img1.alt = g.team1;
    teamLeft.appendChild(img1);
    teamLeft.appendChild(document.createTextNode(g.team1));

    const score1 = document.createElement("div");
    score1.className = "score";
    score1.textContent = g.status !== "finished" ? "-" : g.score1;

    const timeDiv = document.createElement("div");
    timeDiv.className = "game-time";
    timeDiv.textContent = g.time;

    const score2 = document.createElement("div");
    score2.className = "score";
    score2.textContent = g.status !== "finished" ? "-" : g.score2;

    const teamRight = document.createElement("div");
    teamRight.className = "team right " + (winner2 ? "winner" : "loser");
    const img2 = document.createElement("img");
    img2.src = flagMap[g.team2] || "";
    img2.alt = g.team2;
    teamRight.appendChild(img2);
    teamRight.appendChild(document.createTextNode(g.team2));
    if (rightInit) {
      const s = document.createElement("span");
      s.textContent = "· " + rightInit;
      s.style.fontSize = "12px";
      s.style.color = "#aaa";
      teamRight.appendChild(s);
    }

    row.appendChild(teamRight);
    row.appendChild(score2);
    row.appendChild(timeDiv);
    row.appendChild(score1);
    row.appendChild(teamLeft);

    container.appendChild(row);
  });
}

// ------------------------------------------------------------
//  STANDINGS
// ------------------------------------------------------------
function computeStandings() {
  const map = {
    Sean: { name: "Sean", goals: 0 },
    John: { name: "John", goals: 0 },
    Roland: { name: "Roland", goals: 0 }
  };

  schedule.forEach((g) => {
    if (g.status !== "finished") return;
    const o1 = ownerOf(g.team1), o2 = ownerOf(g.team2);
    if (o1 && g.score1 != null) map[o1].goals += g.score1;
    if (o2 && g.score2 != null) map[o2].goals += g.score2;
  });

  return Object.values(map).sort((a, b) => b.goals - a.goals);
}

function computeTeamGoals() {
  const map = {};
  schedule.forEach((g) => {
    if (g.status !== "finished") return;
    if (g.team1 && g.score1 != null) map[g.team1] = (map[g.team1] || 0) + g.score1;
    if (g.team2 && g.score2 != null) map[g.team2] = (map[g.team2] || 0) + g.score2;
  });
  return map;
}

// ------------------------------------------------------------
//  RENDER STANDINGS + FANTASY TABLES
// ------------------------------------------------------------
function renderStandings() {
  const container = document.getElementById("standings-container");
  if (!container) return;

  const standings = computeStandings();
  let html = `
    <table>
      <tr><th>Player</th><th>Goals</th></tr>
  `;

  standings.forEach((r) => {
    html += `<tr><td>${r.name}</td><td>${r.goals}</td></tr>`;
  });

  html += `</table>`;
  container.innerHTML = html;

  renderFantasyTeamTables();
}

function renderFantasyTeamTables() {
  const container = document.getElementById("teamTablesContainer");
  if (!container) return;

  const teamGoals = computeTeamGoals();
  container.innerHTML = "";

  Object.entries(teamsByPlayer).forEach(([player, teams]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "fantasy-table";

    let html = `
      <div class="fantasy-table-title">${fantasyNames[player]}</div>
      <table>
        <tr><th>Team</th><th>Goals</th></tr>
    `;

    let total = 0;
    teams.forEach((t) => {
      const g = teamGoals[t] || 0;
      total += g;
      html += `<tr><td>${t}</td><td class="team-goals-cell" data-team="${t}">${g}</td></tr>`;
    });

    html += `<tr><th>Total</th><th>${total}</th></tr></table>`;
    wrapper.innerHTML = html;
    container.appendChild(wrapper);
  });

  attachTeamGoalHover();
}

// ------------------------------------------------------------
//  TEAM GOAL POPUP
// ------------------------------------------------------------
function getGamesForTeam(teamCode) {
  return schedule.filter((g) => {
    if (g.status !== "finished") return false;
    return (g.team1 === teamCode && g.score1 > null) ||
           (g.team2 === teamCode && g.score2 > null);
  });
}

function showTeamGoalPopup(teamCode, rect) {
  const popup = document.getElementById("teamGoalPopup");
  if (!popup) return;

  const games = getGamesForTeam(teamCode);
  if (!games.length) return popup.style.display = "none";

  let html = "";
  games.forEach((g) => {
    const left = g.team2, right = g.team1;
    html += `
      <div class="game-row">
        <img src="${flagMap[left]}" class="flag"><span class="team-name">${left}</span>
        <span class="score-text">${g.score2}</span><span class="score-text">-</span>
        <span class="score-text">${g.score1}</span><span class="team-name">${right}</span>
        <img src="${flagMap[right]}" class="flag">
      </div>
    `;
  });

  popup.innerHTML = html;
  popup.style.top = `${window.scrollY + rect.bottom + 6}px`;
  popup.style.left = `${window.scrollX + rect.left}px`;
  popup.style.display = "block";
}

function hideTeamGoalPopup() {
  const popup = document.getElementById("teamGoalPopup");
  if (popup) popup.style.display = "none";
}

function attachTeamGoalHover() {
  document.querySelectorAll(".team-goals-cell").forEach((cell) => {
    cell.addEventListener("mouseenter", () => {
      showTeamGoalPopup(cell.dataset.team, cell.getBoundingClientRect());
    });
    cell.addEventListener("mouseleave", hideTeamGoalPopup);
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

    const oldData = JSON.parse(localStorage.getItem("lastScores") || "null");
    const scoreChanged = detectScoreChange(oldData, schedule);

    if (scoreChanged) {
      const now = new Date();
      localStorage.setItem(
        "lastUpdated",
        now.toLocaleString("en-US", {
          timeZone: "America/New_York",
          dateStyle: "medium",
          timeStyle: "short"
        })
      );
    }

    localStorage.setItem("lastScores", JSON.stringify(schedule));

    renderSchedule();
    renderStandings();

    if (scoreChanged) updateLastUpdatedTimestamp();

  } catch (err) {
    console.error("Error loading schedule:", err);
  } finally {
    hideLoading("schedule-loading");
    hideLoading("standings-loading");
  }
}

// ------------------------------------------------------------
//  SMART AUTO REFRESH
// ------------------------------------------------------------
let refreshTimer = null;

function gamesRemainingToday() {
  const today = new Date().toLocaleDateString("en-CA");
  return schedule.some((g) => {
    if (!g.rawDate) return false;
    const isToday = g.rawDate.split(" ")[0] === today;
    return isToday && g.status !== "finished";
  });
}

function getRefreshInterval() {
  const hour = new Date().getHours();
  const isGameWindow =
    (hour >= 5 && hour <= 8) ||
    (hour >= 9 && hour <= 12) ||
    (hour >= 13 && hour <= 16);

  return isGameWindow ? 10 * 60 * 1000 : 2 * 60 * 60 * 1000;
}

function scheduleNextRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  if (!gamesRemainingToday()) return;

  refreshTimer = setTimeout(async () => {
    await loadScheduleFromApi();
    scheduleNextRefresh();
  }, getRefreshInterval());
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadScheduleFromApi();
  updateLastUpdatedTimestamp(); // initial pending
  scheduleNextRefresh();
});

