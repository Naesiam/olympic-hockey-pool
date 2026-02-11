// ------------------------------------------------------------
//  CONFIG
// ------------------------------------------------------------
const API_URL =
  "https://www.hockey-live.sk/api/games/OG/2026?key=8da799b0ddab8888f1e556f0e63415ce";

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
    g.score?.goals1 !== undefined ? Number(g.score.goals1) : null;
  const score2 =
    g.score?.goals2 !== undefined ? Number(g.score.goals2) : null;

  const status = g.score?.status || "scheduled";

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
//  RENDER SCHEDULE
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

    const teamLeft = document.createElement("div");
    teamLeft.className = "team left " + (winner1 ? "winner" : "loser");

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

  function ownerOf(teamCode) {
    for (const [player, teams] of Object.entries(teamsByPlayer)) {
      if (teams.includes(teamCode)) return player;
    }
    return null;
  }

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
//  RENDER STANDINGS
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
        <td class="hover-target" data-player="${row.name}">${row.goals}</td>
      </tr>
    `;
  });

  html += `</table>`;
  container.innerHTML = html;

  attachHoverPopup();
}


// ------------------------------------------------------------
//  HOVER POPUP
// ------------------------------------------------------------
function attachHoverPopup() {
  const popup = document.getElementById("hover-popup");
  const targets = document.querySelectorAll(".hover-target");
  if (!popup || !targets.length) return;

  const computeGoalsForTeam = (team) => {
    return schedule.reduce((sum, g) => {
      if (g.status !== "finished") return sum;
      if (g.team1 === team && g.score1 != null) return sum + g.score1;
      if (g.team2 === team && g.score2 != null) return sum + g.score2;
      return sum;
    }, 0);
  };

  const showPopup = (target) => {
    const player = target.dataset.player;
    const teams = teamsByPlayer[player] || [];
    const rect = target.getBoundingClientRect();

    popup.style.left = rect.left + "px";
    popup.style.top = rect.bottom + 5 + "px";

    let total = 0;
    let content = `<div class="popup-title">${player}</div>`;

    teams.forEach((team) => {
      const goals = computeGoalsForTeam(team);
      total += goals;
      content += `
        <div class="popup-row">
          <span>${team}</span>
          <span>${goals}</span>
        </div>
      `;
    });

    content += `
      <div style="border-top:1px solid #333; margin-top:6px; padding-top:6px;" class="popup-row">
        <strong>Total</strong>
        <strong>${total}</strong>
      </div>
    `;

    popup.innerHTML = content;
    popup.style.display = "block";
  };

  const hidePopup = () => {
    popup.style.display = "none";
  };

  targets.forEach((target) => {
    target.addEventListener("mouseenter", () => showPopup(target));
    target.addEventListener("mouseleave", hidePopup);
  });

  document.addEventListener("scroll", hidePopup, true);
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
