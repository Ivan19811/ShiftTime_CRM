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
