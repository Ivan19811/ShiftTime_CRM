document.getElementById("sendBtn").addEventListener("click", async () => {
  const value = document.getElementById("inputValue").value;
  const status = document.getElementById("status");

onst CURRENT_VERSION = "1.0.1"; // ⚠️ Це має відповідати тому, що у тебе в коді
const VERSION_URL = "https://shiftime.com.ua/version.json"; // ⚠️ Посилання на робочий сайт

const versionValue = document.getElementById("versionValue");
const refreshBtn = document.getElementById("refreshBtn");

async function checkVersionUpdate() {
  try {
    const res = await fetch(VERSION_URL);
    const data = await res.json();
    const latestVersion = data.version || data["версія"];

    versionValue.textContent = CURRENT_VERSION;

    if (latestVersion !== CURRENT_VERSION) {
      versionValue.style.color = "red";
      refreshBtn.disabled = false;
      refreshBtn.textContent = `🔁 Оновити до ${latestVersion}`;
    }
  } catch (err) {
    console.error("Помилка перевірки версії:", err);
  }
}

checkVersionUpdate();

refreshBtn.addEventListener("click", () => {
  alert("🛠 Оновлення буде виконано вручну або через Git merge dev → main");
});

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

document.getElementById("refreshBtn").addEventListener("click", () => {
  location.reload();
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

window.addEventListener("DOMContentLoaded", getLastValue);
