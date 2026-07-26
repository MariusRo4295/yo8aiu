/**
 * =============================================================================
 *  Cloud Function: cmcChat
 *  Rol: primeste mesajul utilizatorului de pe yo8aiu.ro, il trimite catre un
 *  API de AI (Gemini) folosind o cheie API tinuta in siguranta pe server,
 *  si returneaza raspunsul catre frontend.
 *
 *  De ce e nevoie de asta:
 *  Fisierul index.html este cod FRONTEND, vizibil integral oricui deschide
 *  "View Source" in browser. O cheie API pusa acolo ar fi furata in minute.
 *  Aceasta functie sta intre site si API-ul de AI: primeste doar textul
 *  mesajului, foloseste cheia din variabilele de mediu ale serverului
 *  (niciodata trimisa catre client), si intoarce raspunsul.
 * =============================================================================
 */

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

// Secretul e configurat separat (vezi instructiunile de deploy din README_CLOUD_FUNCTION.md),
// NU e scris niciodata direct in acest fisier si NU ajunge in Git daca .gitignore e corect.
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// System prompt: ii spune modelului AI cine este, ce stie si cum trebuie sa raspunda.
const SYSTEM_PROMPT = `Esti "cmc", asistentul virtual de pe site-ul stației de radioamator YO8AIU din România (yo8aiu.ro).

Reguli de comportament:
- Răspunde politicos, scurt și la obiect (2-4 propoziții, cu excepția cazului în care utilizatorul cere explicit mai multe detalii).
- Subiectele tale principale sunt: radiocomunicații amatoare, benzi de frecvențe (HF/VHF/UHF), moduri de emisie (SSB, CW, FT8, DMR), antene, proiectele tehnice de pe site, rețeaua Meshtastic și jurnalul de activitate (log-uri) al stației YO8AIU.
- Dacă nu știi un răspuns specific despre activitatea reală a lui YO8AIU (de exemplu date exacte din jurnalul de contacte, echipamente specifice pe care nu le cunoști), spune sincer că nu ai acea informație și recomandă vizitarea secțiunilor Proiecte, Meshtastic sau Galerie de pe site, ori contactarea directă la contact@yo8aiu.ro.
- Nu inventa fapte despre operatorul stației sau despre contacte radio specifice care nu ți-au fost furnizate.
- Poți răspunde și la întrebări generale despre radioamatorism (ce este DXCC, cum funcționează FT8, etc.) chiar dacă nu sunt legate strict de acest site.
- Dacă întrebarea este complet nelegată de radiocomunicații sau de acest site (de exemplu rețete de gătit, teme școlare la alte materii), redirecționează politicos conversația spre subiectele tale, fără să fii rigid sau repetitiv.
- Vorbește în limba română, cu excepția cazului în care utilizatorul scrie în altă limbă, caz în care răspunzi în acea limbă.
- Nu folosești un ton robotic sau formulele "Ca un model AI...". Ești prietenos și direct.`;

// Limite simple pentru a preveni abuz / payload-uri excesive.
const MAX_MESSAGE_LENGTH = 800;
const MAX_HISTORY_MESSAGES = 8;

exports.cmcChat = onRequest(
  {
    // Permitem cereri doar de la domeniul site-ului (ajusteaza daca ai alt domeniu/subdomeniu).
    cors: ["https://yo8aiu.ro", "https://www.yo8aiu.ro"],
    secrets: [GEMINI_API_KEY],
    region: "europe-west1", // regiune apropiata de România; schimba daca ai alta preferinta
    maxInstances: 10,
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // Doar POST este acceptat.
    if (req.method !== "POST") {
      res.status(405).json({ error: "Metoda nu este permisă. Folosește POST." });
      return;
    }

    try {
      const { message, history } = req.body || {};

      // --- Validare input ---
      if (typeof message !== "string" || message.trim().length === 0) {
        res.status(400).json({ error: "Mesajul lipsește sau este invalid." });
        return;
      }
      if (message.length > MAX_MESSAGE_LENGTH) {
        res.status(400).json({
          error: `Mesajul este prea lung (max ${MAX_MESSAGE_LENGTH} caractere).`,
        });
        return;
      }

      const safeHistory = Array.isArray(history)
        ? history
            .filter(
              (h) =>
                h &&
                (h.role === "user" || h.role === "assistant") &&
                typeof h.content === "string"
            )
            .slice(-MAX_HISTORY_MESSAGES)
        : [];

      // --- Construim conversatia in formatul Gemini ---
      // Gemini foloseste rolurile "user" si "model" (nu "assistant").
      const contents = [
        ...safeHistory.map((h) => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content.slice(0, MAX_MESSAGE_LENGTH) }],
        })),
        { role: "user", parts: [{ text: message.trim() }] },
      ];

      const apiKey = GEMINI_API_KEY.value();
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 300,
          },
        }),
      });

      if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        logger.error("Eroare de la Gemini API:", geminiResponse.status, errText);
        res.status(502).json({ error: "Serviciul de AI nu a putut fi contactat." });
        return;
      }

      const geminiData = await geminiResponse.json();
      const reply =
        geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;

      if (!reply) {
        logger.warn("Raspuns Gemini fara continut text:", JSON.stringify(geminiData));
        res.status(200).json({
          reply:
            "Îmi pare rău, nu am reușit să formulez un răspuns. Poți reformula întrebarea?",
        });
        return;
      }

      res.status(200).json({ reply });
    } catch (err) {
      logger.error("Eroare in cmcChat:", err);
      res.status(500).json({ error: "A apărut o eroare internă. Încearcă din nou." });
    }
  }
);

/**
 * =============================================================================
 *  ALTERNATIVA: daca preferi OpenAI (GPT-4o-mini / GPT-3.5) in loc de Gemini,
 *  inlocuieste blocul de fetch de mai sus cu urmatorul (si schimba
 *  GEMINI_API_KEY -> OPENAI_API_KEY in defineSecret si in instructiunile de
 *  deploy din README_CLOUD_FUNCTION.md):
 *
 *  const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
 *    method: "POST",
 *    headers: {
 *      "Content-Type": "application/json",
 *      "Authorization": `Bearer ${OPENAI_API_KEY.value()}`,
 *    },
 *    body: JSON.stringify({
 *      model: "gpt-4o-mini",
 *      messages: [
 *        { role: "system", content: SYSTEM_PROMPT },
 *        ...safeHistory.map(h => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })),
 *        { role: "user", content: message.trim() },
 *      ],
 *      temperature: 0.6,
 *      max_tokens: 300,
 *    }),
 *  });
 *
 *  const openaiData = await openaiResponse.json();
 *  const reply = openaiData?.choices?.[0]?.message?.content?.trim() || null;
 * =============================================================================
 */
