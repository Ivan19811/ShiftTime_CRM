const versionElement = document.getElementById('version');
const updateButton = document.getElementById('updateBtn');

// Отримуємо збережену локальну версію або встановлюємо початкову
let currentVersion = localStorage.getItem('version') || "1.0.0";

async function checkVersion() {
  try {
    console.log("🔍 Починаємо перевірку версії...");

    const res = await fetch('https://shifttimecrm-version-check.onrender.com/version');
    if (!res.ok) throw new Error(`Помилка HTTP: ${res.status}`);

    const data = await res.json();
    const latestVersion = data["version"];

    versionElement.textContent = latestVersion;

    if (latestVersion !== currentVersion) {
      versionElement.classList.add('new');
      updateButton.disabled = false;
      updateButton.style.display = 'inline';
    } else {
      versionElement.classList.remove('new');
      updateButton.disabled = true;
      updateButton.style.display = 'none';
    }

  } catch (err) {
    console.error("❌ ПОМИЛКА при перевірці версії:", err);
    versionElement.textContent = '❌ Помилка завантаження';
  }
}

updateButton.addEventListener('click', () => {
  // Зберігаємо нову версію у localStorage
  localStorage.setItem('version', versionElement.textContent);
  location.reload(); // імітуємо оновлення (перезавантаження сторінки)
});

checkVersion();
