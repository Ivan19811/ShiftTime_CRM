const CURRENT_VERSION = "1.0.0";
const VERSION_URL = "./version.json"; // Відносно index.html


const versionValue = document.getElementById("versionValue");
const refreshBtn = document.getElementById("refreshBtn");

async function checkVersionUpdate() {
  try {
    const res = await fetch(VERSION_URL);
    console.log("📡 fetch response object:", res);
    const data = await res.json();
    console.log("📦 JSON з версії:", data);

    const latestVersion = data.version || data["version"];
    versionValue.textContent = CURRENT_VERSION;

    if (latestVersion !== CURRENT_VERSION) {
      versionValue.style.color = "red";
      refreshBtn.disabled = false;
      refreshBtn.textContent = `🔁 Оновити до ${latestVersion}`;
    }
  } catch (err) {
    console.error("❌ Помилка перевірки версії:", err);
  }
}
checkVersionUpdate();

refreshBtn.addEventListener("click", () => {
  location.reload();
});

document.getElementById("sendBtn").addEventListener("click", async () => {
  const value = document.getElementById("inputValue").value;
  const status = document.getElementById("status");

  try {
    const response = await fetch("https://shifttimecrm-test-backend-v2.onrender.com/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: Number(value) })
    });

    const data = await response.json();

    if (data.value !== undefined && data.value !== null) {
      status.textContent = "✅ Записано: " + data.value;
    } else {
      status.textContent = "✅ Дані записано успішно";
    }

    getLastValue();

  } catch (err) {
    status.textContent = "❌ Помилка: " + err.message;
  }
});

async function getLastValue() {
  try {
    const res = await fetch("https://shifttimecrm-test-backend-v2.onrender.com/last");
    const data = await res.json();

    if (data.value !== undefined) {
      document.getElementById("lastValue").value = data.value;
    } else {
      document.getElementById("lastValue").value = "—";
    }
  } catch (err) {
    document.getElementById("lastValue").value = "помилка";
  }
}

window.addEventListener("DOMContentLoaded", () => {
   checkVersionUpdate();
  getLastValue();
 
});


