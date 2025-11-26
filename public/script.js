const TARGET_YEAR = 2025;
const EARLY_LINK = "https://OtherStuff.ai";
const EARLY_MESSAGE =
  "Opening your advent calendar too early? Be careful or the big red guy will pop you on the naughty list...";

const hotspotsEl = document.getElementById("hotspots");
const overlayEl = document.getElementById("overlay");
const overlayMessageEl = document.getElementById("overlay-message");
const overlayLinkEl = document.getElementById("overlay-link");
const overlayTimerEl = document.getElementById("overlay-timer");

let redirectTimer;
let days = [];

fetch("./days.json")
  .then((res) => res.json())
  .then((data) => {
    days = data;
    renderHotspots();
  })
  .catch((err) => {
    console.error("Failed to load days.json", err);
  });

function renderHotspots() {
  hotspotsEl.innerHTML = "";
  days.forEach((entry) => {
    const btn = document.createElement("button");
    btn.className = "day-btn";
    btn.textContent = entry.day;
    btn.style.left = `${entry.x}%`;
    btn.style.top = `${entry.y}%`;
    btn.style.width = `${entry.w}%`;
    btn.style.height = `${entry.h}%`;
    btn.dataset.day = entry.day;
    btn.addEventListener("click", () => handleDayClick(entry));
    hotspotsEl.appendChild(btn);
  });
}

function handleDayClick(entry) {
  const now = new Date();
  const unlockDate = new Date(TARGET_YEAR, 11, entry.day); // December is month 11
  if (now >= unlockDate) {
    showOverlay(
      entry.message || entry.title || `Day ${entry.day}`,
      entry.url,
      entry.url
    );
  } else {
    showOverlay(EARLY_MESSAGE, EARLY_LINK, EARLY_LINK);
  }
}

function showOverlay(message, link, redirectUrl) {
  clearTimeout(redirectTimer);
  overlayMessageEl.textContent = message;
  overlayLinkEl.textContent = link;
  overlayLinkEl.href = link;
  overlayTimerEl.textContent = "Redirecting in 2 seconds...";
  overlayEl.classList.remove("hidden");

  redirectTimer = setTimeout(() => {
    window.location.href = redirectUrl;
  }, 2000);
}

overlayEl.addEventListener("click", () => {
  overlayEl.classList.add("hidden");
  clearTimeout(redirectTimer);
});
