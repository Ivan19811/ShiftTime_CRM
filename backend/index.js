import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

// ✅ Правильна CORS-конфігурація для Netlify-домену
const corsOptions = {
  origin: "https://crm.shifttime.com.ua/",

  
  methods: "GET,POST",
  allowedHeaders: ["Content-Type"]
};

app.use(cors(corsOptions));
app.use(express.json());

// 🔗 URL до Google Apps Script
const GAS_URL = "https://script.google.com/macros/s/AKfycbxx-dNE1v-q9AgRY3SrJMJXNGvuGANM8QCboXJPT2O5kh6YU1LAYLf9unQy-783isVD/exec";

// 📤 Обробка повної форми
app.post("/send", async (req, res) => {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });

    const text = await response.text();
    console.log("📦 Відповідь від GAS:", text);
    res.json(JSON.parse(text));
  } catch (err) {
    console.error("❌ ПОМИЛКА на сервері:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🟡 Альтернативний маршрут — лише для числа
app.post("/writeNumber", async (req, res) => {
  try {
    const payload = {
      surname: "",
      name: "",
      patronymic: "",
      number: req.body.value || 0
    };

    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    console.log("📦 Відповідь (writeNumber):", text);
    res.json(JSON.parse(text));
  } catch (err) {
    console.error("❌ ПОМИЛКА /writeNumber:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Proxy-сервер запущено на порту ${PORT}`);
});
