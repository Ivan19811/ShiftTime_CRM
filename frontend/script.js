const CURRENT_VERSION = "1.0.0"; // для тесту зроби "нижчу" версію
const VERSION_URL = "./version.json";


const versionValue = document.getElementById("versionValue");
const refreshBtn = document.getElementById("refreshBtn");

async function checkVersionUpdate() {
  try {
    const res = await fetch(VERSION_URL);
    const data = await res.json();
    console.log("🔍 Дані з version.json:", data);

    const latestVersion = data["version"]; // ВАЖЛИВО — кирилицею
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

refreshBtn.addEventListener("click", () => {
  location.reload();
});

window.addEventListener("DOMContentLoaded", () => {
  checkVersionUpdate();
});
