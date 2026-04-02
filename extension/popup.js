const baseUrlInput = document.getElementById("baseUrl");
const tokenInput = document.getElementById("token");
const statusEl = document.getElementById("status");
const savePageBtn = document.getElementById("savePage");
const saveOptionsBtn = document.getElementById("saveOptions");
const settingsPanel = document.getElementById("settingsPanel");
const toggleSettings = document.getElementById("toggleSettings");
const connectedHint = document.getElementById("connectedHint");

function setStatus(msg, cls) {
  statusEl.textContent = msg;
  statusEl.className = cls || "";
}

function hasConnection(baseUrl, token) {
  return Boolean(String(baseUrl || "").trim() && String(token || "").trim());
}

/** When configured and collapsed: hide URL/token. Otherwise show settings form. */
function applyLayout(configured, settingsOpen) {
  if (configured && !settingsOpen) {
    settingsPanel.classList.add("hidden");
    toggleSettings.classList.remove("hidden");
    toggleSettings.textContent = "Connection settings";
    connectedHint.classList.remove("hidden");
  } else {
    settingsPanel.classList.remove("hidden");
    if (configured) {
      toggleSettings.classList.remove("hidden");
      toggleSettings.textContent = "Hide connection settings";
      connectedHint.classList.add("hidden");
    } else {
      toggleSettings.classList.add("hidden");
      connectedHint.classList.add("hidden");
    }
  }
}

let settingsOpen = false;

chrome.storage.sync.get(["baseUrl", "token"], (data) => {
  if (data.baseUrl) baseUrlInput.value = data.baseUrl;
  if (data.token) tokenInput.value = data.token;
  const configured = hasConnection(data.baseUrl, data.token);
  settingsOpen = !configured;
  applyLayout(configured, settingsOpen);
});

toggleSettings.addEventListener("click", () => {
  chrome.storage.sync.get(["baseUrl", "token"], (data) => {
    const configured = hasConnection(data.baseUrl, data.token);
    if (!configured) return;
    settingsOpen = !settingsOpen;
    applyLayout(configured, settingsOpen);
  });
});

saveOptionsBtn.addEventListener("click", () => {
  const baseUrl = baseUrlInput.value.replace(/\/$/, "");
  const token = tokenInput.value.trim();
  chrome.storage.sync.set({ baseUrl, token }, () => {
    const configured = hasConnection(baseUrl, token);
    if (configured) {
      setStatus("Connection saved.", "ok");
      settingsOpen = false;
      applyLayout(true, false);
    } else {
      setStatus("Enter both URL and token.", "error");
      settingsOpen = true;
      applyLayout(false, true);
    }
  });
});

savePageBtn.addEventListener("click", async () => {
  const baseUrl = baseUrlInput.value.replace(/\/$/, "");
  const token = tokenInput.value.trim();
  if (!hasConnection(baseUrl, token)) {
    setStatus("Open Connection settings and save your URL and token.", "error");
    settingsOpen = true;
    applyLayout(false, true);
    return;
  }

  savePageBtn.disabled = true;
  setStatus("Saving…");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) {
      setStatus("No active tab URL.", "error");
      return;
    }

    const res = await fetch(`${baseUrl}/api/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url: tab.url }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || `Error ${res.status}`, "error");
      return;
    }

    setStatus(`Saved: ${data.title}`, "ok");
    if (data.url) {
      chrome.tabs.create({ url: `${baseUrl}${data.url}` });
    }
  } catch (e) {
    setStatus(e instanceof Error ? e.message : "Network error", "error");
  } finally {
    savePageBtn.disabled = false;
  }
});
