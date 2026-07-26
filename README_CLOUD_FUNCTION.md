# Ghid pas-cu-pas: Cloud Function pentru chatbot-ul „cmc"

Acest ghid te ajută să pui în funcțictează chatbot-ul
„cmc" de pe yo8aiu.ro la un AI real (Gemini), **fără să expui vreodată cune backend-ul care coneheia
API în codul frontend** (fișierul `index.html`).

De ce e nevoie de asta: `index.html` este cod care rulează în browserul
vizitatorului. Oricine poate deschide "View Page Source" sau Inspect Element
și vedea tot ce e scris acolo — inclusiv o eventuală cheie API. O Cloud
Function rulează pe serverele Google, în afara vederii publicului; cheia stă
acolo, izolată.

---

## Pasul 0 — Ce ai nevoie înainte de a începe

- Contul tău Google, cel folosit deja pentru proiectul Firebase
  `yo8aiu-website` (îl văd în `firebaseConfig` din `index.html`).
- Node.js instalat pe calculatorul tău (versiunea 20 recomandată — verifică
  rulând `node -v` în terminal; dacă nu ai Node, descarcă-l de pe
  [nodejs.org](https://nodejs.org)).
- Acces la [Firebase Console](https://console.firebase.google.com) pentru
  proiectul tău.

---

## Pasul 1 — Activează planul „Blaze" (Pay as you go) pe proiectul Firebase

Cloud Functions (versiunea 2, cea mai nouă și cea folosită în acest cod) cer
planul Blaze, chiar dacă rămâi în cota gratuită lunară.

1. Mergi la [Firebase Console](https://console.firebase.google.com) → alege
   proiectul `yo8aiu-website`.
2. Din meniul din stânga-jos, click pe numele planului curent (probabil
   „Spark") → „Upgrade".
3. Alege „Blaze" și adaugă un cont de facturare Google Cloud (necesită un
   card, dar cota gratuită lunară pentru Functions rămâne generoasă pentru un
   site personal — nu vei plăti nimic dacă traficul e normal pentru o stație
   de radioamator).

---

## Pasul 2 — Obține o cheie API Gemini (gratuită)

Codul de mai jos folosește Gemini (Google), care are un nivel gratuit
generos și nu cere card de credit doar pentru a obține cheia.

1. Mergi la [Google AI Studio](https://aistudio.google.com/apikey).
2. Autentifică-te cu **același cont Google** ca proiectul Firebase (recomandat,
   nu obligatoriu).
3. Click pe „Create API key" → alege proiectul `yo8aiu-website` (sau creează
   o cheie într-un proiect nou, dacă preferi izolare).
4. Copiază cheia generată (arată cam așa: `AIzaSy...`). **Nu o pune nicăieri
   în `index.html` sau în alt fișier care ajunge pe GitHub/site public.**

> Dacă preferi OpenAI (GPT-4o-mini) în loc de Gemini, sări la secțiunea
> „Alternativă: OpenAI" de la finalul acestui ghid — codul din `index.js`
> are deja comentat blocul echivalent.

---

## Pasul 3 — Instalează Firebase CLI

În terminal, pe calculatorul tău:

```bash
npm install -g firebase-tools
```

Verifică instalarea:

```bash
firebase --version
```

Autentifică-te cu contul Google (se va deschide un browser):

```bash
firebase login
```

---

## Pasul 4 — Inițializează Functions în proiectul tău

Dacă nu ai deja un folder `functions/` pentru acest proiect Firebase:

1. Deschide un terminal în folderul unde vrei să ții codul (poate fi lângă
   `index.html`, într-un folder părinte, sau un repo separat — nu contează,
   Functions nu se servesc din același loc ca site-ul static).
2. Rulează:

   ```bash
   firebase init functions
   ```

3. La întrebări, răspunde așa:
   - „Please select an option" → **Use an existing project** → alege
     `yo8aiu-website`.
   - „What language..." → **JavaScript**.
   - „Do you want to use ESLint?" → poți răspunde Yes sau No (opțional).
   - „Do you want to install dependencies now?" → **Yes**.

Asta creează un folder `functions/` cu un `index.js` și `package.json`
minime, generate automat de Firebase.

4. **Înlocuiește** conținutul lui `functions/index.js` cu fișierul `index.js`
   pe care ți l-am pus la dispoziție mai sus.
5. **Înlocuiește/completează** `functions/package.json` cu cel furnizat (sau
   adaugă manual dependența `firebase-functions` versiunea `^6.0.1` dacă
   preferi să păstrezi restul generat automat de CLI).
6. Din folderul `functions/`, rulează:

   ```bash
   npm install
   ```

---

## Pasul 5 — Salvează cheia API ca „secret" (nu ca variabilă simplă!)

Firebase Functions v2 are un sistem dedicat de secrete, criptate, separate de
codul sursă. Din folderul `functions/`:

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

Ți se va cere să lipești cheia (cea de la Pasul 2) direct în terminal —
apasă Enter după ce o lipești. Cheia e criptată și stocată în Google Secret
Manager, legată de proiectul tău. Codul din `index.js` o citește prin
`GEMINI_API_KEY.value()`, fără să apară niciodată în text simplu în cod.

Dacă mai târziu vrei să schimbi cheia (de exemplu ai regenerat-o), rulezi
aceeași comandă din nou — versiunea nouă înlocuiește automat referința activă.

---

## Pasul 6 — Publică (deploy) funcția

Tot din folderul `functions/`:

```bash
firebase deploy --only functions:cmcChat
```

Așteaptă câteva minute (primul deploy poate dura 2-5 minute). La final, în
terminal vei vedea ceva de forma:

```
✔  functions[cmcChat(europe-west1)] Successful create operation.
Function URL (cmcChat): https://europe-west1-yo8aiu-website.cloudfunctions.net/cmcChat
```

**Copiază acel URL** — e adresa reală a backend-ului tău.

> Notă despre regiune: codul e configurat cu `region: "europe-west1"`
> (Belgia), cea mai apropiată regiune Google Cloud de România la momentul
> scrierii acestui ghid. Dacă vrei alta, schimbă valoarea `region` din
> `index.js` înainte de deploy.

---

## Pasul 7 — Conectează frontend-ul la URL-ul real

În `index.html`, caută linia:

```javascript
const CMC_ENDPOINT = 'https://REGIUNE-PROIECTUL_TAU.cloudfunctions.net/cmcChat';
```

Înlocuiește-o cu URL-ul copiat la Pasul 6, de exemplu:

```javascript
const CMC_ENDPOINT = 'https://europe-west1-yo8aiu-website.cloudfunctions.net/cmcChat';
```

Salvează, urcă `index.html` pe server (yo8aiu.ro) ca de obicei. Chatbot-ul ar
trebui să funcționeze imediat — deschide site-ul, click pe butonul plutitor
din dreapta-jos, și trimite un mesaj de test.

---

## Pasul 8 — Verificare și depanare

Dacă botul răspunde cu mesajul de eroare generic ("Momentan nu mă pot
conecta la server..."), verifică în ordine:

1. **Console-ul din browser** (F12 → tab Console) — orice eroare de rețea
   sau CORS apare aici.
2. **Log-urile funcției**, rulând din folderul `functions/`:
   ```bash
   firebase functions:log
   ```
   sau direct din Firebase Console → Functions → click pe `cmcChat` → tab
   „Logs".
3. **CORS**: dacă site-ul tău e servit de pe alt domeniu decât
   `https://yo8aiu.ro` / `https://www.yo8aiu.ro`, actualizează lista din
   `cors: [...]` din `index.js` și re-fă deploy.
4. **Cota Gemini**: dacă primești erori 429 (too many requests), e posibil
   să fi atins limita gratuită zilnică — verifică în
   [Google AI Studio](https://aistudio.google.com) secțiunea de utilizare.

---

## Costuri estimate

Pentru un site personal cu trafic moderat:
- **Cloud Functions**: cota gratuită include 2 milioane de invocări/lună —
  practic imposibil de atins pentru un chatbot personal.
- **Gemini API** (modelul `gemini-1.5-flash` folosit în cod): are un nivel
  gratuit generos (verifică limitele curente în
  [documentația oficială](https://ai.google.dev/pricing), care se pot
  schimba în timp).

Realist, pentru traficul unui site de radioamator, costul lunar va fi **0
lei**, cât timp rămâi în cotele gratuite.

---

## Alternativă: OpenAI în loc de Gemini

Dacă preferi OpenAI (de exemplu ai deja cont și credit acolo):

1. Obține o cheie de pe [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. La Pasul 5, folosește `OPENAI_API_KEY` în loc de `GEMINI_API_KEY`:
   ```bash
   firebase functions:secrets:set OPENAI_API_KEY
   ```
3. În `index.js`:
   - Schimbă `const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");` în
     `const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");`.
   - Adaugă `OPENAI_API_KEY` (nu `GEMINI_API_KEY`) în array-ul `secrets: [...]`
     din configurarea `onRequest`.
   - Înlocuiește blocul de `fetch` către Gemini cu blocul comentat de la
     finalul fișierului `index.js` (secțiunea „ALTERNATIVA: OpenAI").
4. Reface deploy (Pasul 6).

OpenAI **nu** are un nivel complet gratuit fără card adăugat, dar modelul
`gpt-4o-mini` este foarte ieftin per cerere (fracțiuni de cent).
