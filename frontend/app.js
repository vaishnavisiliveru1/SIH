/* =========================================================
   AI THERMAL EVENT INTELLIGENCE CONTROL ENGINE
   WITH MULTILINGUAL UI & VOICE COMMAND ASSISTANT
========================================================= */

let allEvents = [];
let filteredEvents = [];
let map = null;
let markersLayer = null;

const STORAGE_KEY = "sih_thermal_event_database_v6";
const ALERT_RULES = { CRITICAL: 88, HIGH: 75 };

// Sample fire images for hotspot popups
const sampleFireImages = [
    "https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1508873696983-2df515122519?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=600&q=80"
];

// Default embedded dataset as fallback if local CSV loading is restricted
const defaultFallbackEvents = [
    { source_id: "SOURCE_0001", state: "Odisha", latitude: 20.7957, longitude: 85.2547, predicted_event_type: "Industrial", confidence: 92.4, persistence_score: 85, landcover: "Built-up", mean_frp: 35.4, imageUrl: sampleFireImages[0] },
    { source_id: "SOURCE_0002", state: "Jharkhand", latitude: 23.6102, longitude: 85.2799, predicted_event_type: "Forest/Natural", confidence: 89.1, persistence_score: 72, landcover: "Tree cover", mean_frp: 18.2, imageUrl: sampleFireImages[1] },
    { source_id: "SOURCE_0003", state: "Chhattisgarh", latitude: 21.2787, longitude: 81.8661, predicted_event_type: "Agricultural", confidence: 78.5, persistence_score: 45, landcover: "Cropland", mean_frp: 12.0, imageUrl: sampleFireImages[2] },
    { source_id: "SOURCE_0004", state: "Maharashtra", latitude: 19.7515, longitude: 75.7139, predicted_event_type: "Industrial", confidence: 94.0, persistence_score: 91, landcover: "Built-up", mean_frp: 52.1, imageUrl: sampleFireImages[0] },
    { source_id: "SOURCE_0005", state: "Karnataka", latitude: 15.3173, longitude: 75.7139, predicted_event_type: "Other", confidence: 64.2, persistence_score: 30, landcover: "Grassland", mean_frp: 8.5, imageUrl: sampleFireImages[1] }
];

/* DICTIONARY FOR MULTILINGUAL UI TRANSLATION */
const uiTranslations = {
    "en-US": {
        appHeading: "AI THERMAL EVENT INTELLIGENCE",
        appSubheading: "NASA FIRMS • OSM • SATELLITE MULTI-MODAL DETECTION",
        sysOnline: "SYSTEM ONLINE",
        navDash: "Dashboard", navMap: "Geospatial Map", navPredict: "AI Predictor", navAlerts: "Alerts Center", navDb: "Event Database", navLogin: "Login / Register",
        lblTotalSources: "TOTAL THERMAL SOURCES", lblIndFires: "INDUSTRIAL FIRES", lblForestFires: "FOREST / NATURAL", lblAgriFires: "AGRICULTURAL", lblOtherFires: "OTHER / UNKNOWN",
        lblSelectState: "Select Jurisdiction / State", lblEventType: "Event Type", lblMinConf: "Min Confidence Score (%)", lblLandcover: "Landcover Class", lblSearchId: "Search ID / Region",
        lblResetBtn: "Reset Filters", lblMapHeading: "Spatial Distribution & Active Hotspots", lblPredictHeading: "Run AI Classification & Thermal Persistence Analysis",
        lblPredictBtn: "PREDICT & SAVE EVENT", lblAlertsHeading: "Thermal Event Alerts", lblDispatchBtn: "Dispatch National Authority Alert", lblDbHeading: "Detected Thermal Sources Registry",
        voicePrompt: "Press Voice Control and say a command (e.g. 'Show Odisha', 'Filter Industrial')...",
        micLabel: "Voice Control", listening: "Listening..."
    },
    "hi-IN": {
        appHeading: "एआई थर्मल इवेंट इंटेलिजेंस",
        appSubheading: "नासा फर्म्स • ओएसएम • उपग्रह मल्टी-मॉडल पहचान",
        sysOnline: "सिस्टम ऑनलाइन",
        navDash: "डैशबोर्ड", navMap: "भू-स्थानिक मानचित्र", navPredict: "एआई भविष्यवाणियां", navAlerts: "चेतावनी केंद्र", navDb: "इवेंट डेटाबेस", navLogin: "लॉगिन / रजिस्टर",
        lblTotalSources: "कुल थर्मल स्रोत", lblIndFires: "औद्योगिक आग", lblForestFires: "वन / प्राकृतिक", lblAgriFires: "कृषि आग", lblOtherFires: "अन्य / अज्ञात",
        lblSelectState: "क्षेत्रीय राज्य चुनें", lblEventType: "इवेंट का प्रकार", lblMinConf: "न्यूनतम विश्वास स्कोर (%)", lblLandcover: "भूमि कवर श्रेणी", lblSearchId: "आईडी / क्षेत्र खोजें",
        lblResetBtn: "फ़िल्टर रीसेट करें", lblMapHeading: "स्थानिक वितरण और सक्रिय हॉटस्पॉट", lblPredictHeading: "एआई वर्गीकरण और थर्मल स्थायित्व विश्लेषण",
        lblPredictBtn: "पूर्वानुमान और सहेजें", lblAlertsHeading: "थर्मल चेतावनी केंद्र", lblDispatchBtn: "राष्ट्रीय प्राधिकरण चेतावनी भेजें", lblDbHeading: "पहचाने गए थर्मल स्रोतों की सूची",
        voicePrompt: "वॉयस कंट्रोल दबाएं और आदेश दें (जैसे 'ओडिशा दिखाएं', 'इंडस्ट्रियल फ़िल्टर करें')...",
        micLabel: "वॉयस कंट्रोल", listening: "सुन रहा है..."
    },
    "ta-IN": {
        appHeading: "AI வெப்ப நிகழ்வு நுண்ணறிவு",
        appSubheading: "நாசா நிறுவனங்கள் • OSM • செயற்கைக்கோள் கண்டறிதல்",
        sysOnline: "சிஸ்டம் ஆன்லைன்",
        navDash: "டாஷ்போர்டு", navMap: "வரைபடம்", navPredict: "AI கணிப்பு", navAlerts: "எச்சரிக்கை மையம்", navDb: "தரவுத்தளம்", navLogin: "உள்நுழைவு",
        lblTotalSources: "மொத்த வெப்ப ஆதாரங்கள்", lblIndFires: "தொழில்துறை தீ", lblForestFires: "காடு / இயற்கை", lblAgriFires: "விவசாய தீ", lblOtherFires: "மற்றவை",
        lblSelectState: "மாநிலத்தைத் தேர்ந்தெடுக்கவும்", lblEventType: "நிகழ்வு வகை", lblMinConf: "குறைந்தபட்ச நம்பகத்தன்மை (%)", lblLandcover: "நிலப்பரப்பு", lblSearchId: "தேடல் ID",
        lblResetBtn: "மீட்டமை", lblMapHeading: "வெப்பப் பகுதிகள் வரைபடம்", lblPredictHeading: "AI பகுப்பாய்வு",
        lblPredictBtn: "கணித்து சேமிக்கவும்", lblAlertsHeading: "வெப்ப எச்சரிக்கைகள்", lblDispatchBtn: "தேசிய அதிகாரிகளுக்கு அனுப்பு", lblDbHeading: "பதிவு செய்யப்பட்ட விவரங்கள்",
        voicePrompt: "குரல் கட்டுப்பாட்டை அழுத்தி கட்டளையிடவும்...",
        micLabel: "குரல் கட்டுப்பாடு", listening: "கேட்கிறது..."
    },
    "te-IN": {
        appHeading: "AI థర్మల్ ఈవెంట్ ఇంటెలిజెన్స్",
        appSubheading: "నాసా ఫిర్మ్స్ • OSM • ఉపగ్రహ మల్టీ-మోడల్ డిటెక్షన్",
        sysOnline: "సిస్టమ్ ఆన్‌లైన్",
        navDash: "డాష్‌బోర్డ్", navMap: "జియోస్పేషియల్ మ్యాప్", navPredict: "AI ప్రిడిక్టర్", navAlerts: "అలర్ట్స్ సెంటర్", navDb: "ఈవెంట్ డేటాబేస్", navLogin: "లాగిన్ / రిజిస్టర్",
        lblTotalSources: "మొత్తం థర్మల్ మూలాలు", lblIndFires: "పారిశ్రామిక మంటలు", lblForestFires: "అడవి / సహజ స్థలాలు", lblAgriFires: "వ్యవసాయ మంటలు", lblOtherFires: "ఇతర / తెలియనివి",
        lblSelectState: "రాష్ట్రాన్ని ఎంచుకోండి", lblEventType: "ఈవెంట్ రకం", lblMinConf: "కనీస విశ్వసనీయత (%)", lblLandcover: "ల్యాండ్‌కవర్ రకం", lblSearchId: "శోధన ID",
        lblResetBtn: "ఫిల్టర్లు రీసెట్ చేయండి", lblMapHeading: "స్పేషియల్ డిస్ట్రిబ్యూషన్ & హాట్‌స్పాట్‌లు", lblPredictHeading: "AI వర్గీకరణ విశ్లేషణ",
        lblPredictBtn: "అంచనా వేసి సేవ్ చేయండి", lblAlertsHeading: "థర్మల్ హెచ్చరికలు", lblDispatchBtn: "అధికారులకు హెచ్చరిక పంపండి", lblDbHeading: "నమోదిత థర్మల్ మూలాలు",
        voicePrompt: "వాయిస్ కంట్రోల్ నొక్కి ఆదేశం ఇవ్వండి...",
        micLabel: "వాయిస్ కంట్రోల్", listening: "వింటోంది..."
    }
};

/* STATE BOUNDING COORDINATES FOR MAP PANNING */
const stateCoordinates = {
    "Odisha": { lat: 20.9517, lng: 85.0985, zoom: 7 },
    "Jharkhand": { lat: 23.6102, lng: 85.2799, zoom: 7 },
    "Chhattisgarh": { lat: 21.2787, lng: 81.8661, zoom: 7 },
    "Maharashtra": { lat: 19.7515, lng: 75.7139, zoom: 6 },
    "Karnataka": { lat: 15.3173, lng: 75.7139, zoom: 6 }
};

/* DOM INITIALIZATION ROUTINE */
document.addEventListener("DOMContentLoaded", function () {
    initializeThemeToggle();
    initializeSidebarAndNavigation();
    initializeAuthModal();
    initializeMap();
    setupEventListeners();
    setupPredictionForm();
    setupNationalAuthorityAlerts();
    initializeMultilingualAndVoice();
    loadDualCsvData();
});

/* MULTILINGUAL TRANSLATION ENGINE & SPEECH RECOGNITION */
function initializeMultilingualAndVoice() {
    const langSelect = document.getElementById("language-select");
    const micBtn = document.getElementById("mic-btn");
    const transcriptText = document.getElementById("transcript-text");

    // Dynamic UI Translation Change
    langSelect?.addEventListener("change", (e) => {
        const lang = e.target.value;
        applyLanguageTranslations(lang);
    });

    // Voice Command Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        micBtn?.addEventListener("click", () => {
            const currentLang = langSelect.value;
            recognition.lang = currentLang;
            recognition.start();
            
            micBtn.classList.add("listening");
            document.getElementById("mic-label").textContent = uiTranslations[currentLang]?.listening || "Listening...";
        });

        recognition.onresult = (event) => {
            micBtn.classList.remove("listening");
            const command = event.results[0][0].transcript.toLowerCase();
            const currentLang = langSelect.value;
            if (transcriptText) transcriptText.textContent = `"${command}"`;

            processVoiceCommand(command, currentLang);
        };

        recognition.onerror = () => micBtn?.classList.remove("listening");
        recognition.onend = () => {
            micBtn?.classList.remove("listening");
            const micLabel = document.getElementById("mic-label");
            if (micLabel) micLabel.textContent = uiTranslations[langSelect.value]?.micLabel || "Voice Control";
        };
    }
}

/* APPLY UI TEXT TRANSLATIONS */
function applyLanguageTranslations(lang) {
    const t = uiTranslations[lang] || uiTranslations["en-US"];
    
    setText("app-heading", t.appHeading);
    setText("app-subheading", t.appSubheading);
    setText("txt-sys-online", t.sysOnline);
    setText("nav-dash", t.navDash);
    setText("nav-map", t.navMap);
    setText("nav-predict", t.navPredict);
    setText("nav-alerts", t.navAlerts);
    setText("nav-db", t.navDb);
    setText("nav-login", t.navLogin);
    setText("lbl-total-sources", t.lblTotalSources);
    setText("lbl-ind-fires", t.lblIndFires);
    setText("lbl-forest-fires", t.lblForestFires);
    setText("lbl-agri-fires", t.lblAgriFires);
    setText("lbl-other-fires", t.lblOtherFires);
    setText("lbl-select-state", t.lblSelectState);
    setText("lbl-event-type", t.lblEventType);
    setText("lbl-min-conf", t.lblMinConf);
    setText("lbl-landcover", t.lblLandcover);
    setText("lbl-search-id", t.lblSearchId);
    setText("lbl-reset-btn", t.lblResetBtn);
    setText("lbl-map-heading", t.lblMapHeading);
    setText("lbl-predict-heading", t.lblPredictHeading);
    setText("lbl-predict-btn", t.lblPredictBtn);
    setText("lbl-alerts-heading", t.lblAlertsHeading);
    setText("lbl-dispatch-btn", t.lblDispatchBtn);
    setText("lbl-db-heading", t.lblDbHeading);
    setText("transcript-text", t.voicePrompt);
    setText("mic-label", t.micLabel);

    renderTable(); // Refresh table text
}

/* PROCESS VOICE COMMAND INTENTS */
function processVoiceCommand(command, lang) {
    const stateFilter = document.getElementById("state-filter");
    const typeFilter = document.getElementById("type-filter");

    // State Command Handling
    if (command.includes("odisha") || command.includes("ओडिशा") || command.includes("ஒடிசா")) {
        if (stateFilter) stateFilter.value = "Odisha";
        speakResponse("Filtering dashboard for Odisha", lang);
    } else if (command.includes("jharkhand") || command.includes("झारखंड") || command.includes("ஜார்க்கண்ட்")) {
        if (stateFilter) stateFilter.value = "Jharkhand";
        speakResponse("Filtering dashboard for Jharkhand", lang);
    } else if (command.includes("chhattisgarh") || command.includes("छत्तीसगढ़") || command.includes("சத்தீஸ்கர்")) {
        if (stateFilter) stateFilter.value = "Chhattisgarh";
        speakResponse("Filtering dashboard for Chhattisgarh", lang);
    } else if (command.includes("maharashtra") || command.includes("महाराष्ट्र") || command.includes("மகாராஷ்டிரா")) {
        if (stateFilter) stateFilter.value = "Maharashtra";
        speakResponse("Filtering dashboard for Maharashtra", lang);
    } else if (command.includes("karnataka") || command.includes("कर्नाटक") || command.includes("கர்நாடகா")) {
        if (stateFilter) stateFilter.value = "Karnataka";
        speakResponse("Filtering dashboard for Karnataka", lang);
    }

    // Category Command Handling
    if (command.includes("industrial") || command.includes("इंडस्ट्रियल") || command.includes("தொழில்துறை")) {
        if (typeFilter) typeFilter.value = "Industrial";
    } else if (command.includes("forest") || command.includes("जंगल") || command.includes("காடு")) {
        if (typeFilter) typeFilter.value = "Forest/Natural";
    } else if (command.includes("reset") || command.includes("रीसेट") || command.includes("மீட்டமை")) {
        document.getElementById("reset-btn")?.click();
        speakResponse("Filters reset", lang);
        return;
    }

    applyFilters();
}

function speakResponse(text, lang) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        window.speechSynthesis.speak(utterance);
    }
}

/* DARK / LIGHT THEME TOGGLE */
function initializeThemeToggle() {
    const themeBtn = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");
    const htmlEl = document.documentElement;

    themeBtn?.addEventListener("click", () => {
        const currentTheme = htmlEl.getAttribute("data-theme");
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        htmlEl.setAttribute("data-theme", nextTheme);
        
        if (themeIcon) {
            themeIcon.className = nextTheme === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";
        }
        showToast(`Switched to ${nextTheme.toUpperCase()} mode`, "info");
    });
}

/* SIDEBAR AND SEPARATE VIEW NAVIGATION */
function initializeSidebarAndNavigation() {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("sidebar-toggle");
    
    toggleBtn?.addEventListener("click", () => sidebar?.classList.toggle("collapsed"));

    const navItems = document.querySelectorAll(".nav-item");
    const viewSections = document.querySelectorAll(".view-section");

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            navItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            const targetViewId = item.getAttribute("data-target");
            
            if (targetViewId === "database-section") {
                viewSections.forEach(sec => sec.classList.add("hidden"));
                document.getElementById("database-section")?.classList.remove("hidden");
            } else {
                viewSections.forEach(sec => sec.classList.add("hidden"));
                document.getElementById("dashboard-section")?.classList.remove("hidden");
                
                if (targetViewId !== "dashboard-section") {
                    document.getElementById(targetViewId)?.scrollIntoView({ behavior: "smooth" });
                }
            }

            if (map && targetViewId === "map-section") {
                setTimeout(() => map.invalidateSize(), 200);
            }
        });
    });
}

/* AUTHENTICATION MODAL & GOOGLE OAUTH */
function initializeAuthModal() {
    const modal = document.getElementById("auth-modal");
    const openBtn = document.getElementById("open-auth-btn");
    const closeBtn = document.getElementById("close-auth-btn");
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const googleBtn = document.getElementById("google-auth-btn");

    if (openBtn) openBtn.onclick = () => modal?.classList.add("open");
    if (closeBtn) closeBtn.onclick = () => modal?.classList.remove("open");

    if (tabLogin && tabRegister) {
        tabLogin.onclick = () => {
            tabLogin.classList.add("active");
            tabRegister.classList.remove("active");
            loginForm?.classList.remove("hidden");
            registerForm?.classList.add("hidden");
        };
        tabRegister.onclick = () => {
            tabRegister.classList.add("active");
            tabLogin.classList.remove("active");
            registerForm?.classList.remove("hidden");
            loginForm?.classList.add("hidden");
        };
    }

    googleBtn?.addEventListener("click", () => {
        showToast("Authenticated via Google OAuth", "success");
        modal?.classList.remove("open");
    });
}

/* LEAFLET GIS MAP ENGINE */
function initializeMap() {
    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    map = L.map("map").setView([20.5937, 78.9629], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
}

/* DATA INGESTION ENGINE WITH STATE MAPPING */
function parseCSVFile(path) {
    return new Promise((resolve, reject) => {
        if (typeof Papa === "undefined") {
            return reject("PapaParse library missing");
        }
        Papa.parse(path, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data || []),
            error: (err) => reject(err)
        });
    });
}

async function loadDualCsvData() {
    const eventPaths = ["event_classification_features.csv", "event_classification_features (1) (3).csv", "./data/event_classification_features.csv"];
    const persPaths = ["source_persistence_features.csv", "source_persistence_features (1).csv", "./data/source_persistence_features.csv"];

    let eventData = [], persData = [];

    for (let path of eventPaths) {
        try {
            const data = await parseCSVFile(path);
            if (data && data.length > 0) { eventData = data; break; }
        } catch (e) {}
    }

    for (let path of persPaths) {
        try {
            const data = await parseCSVFile(path);
            if (data && data.length > 0) { persData = data; break; }
        } catch (e) {}
    }

    let mergedEvents = [];
    const statesList = ["Odisha", "Jharkhand", "Chhattisgarh", "Maharashtra", "Karnataka"];

    if (eventData.length > 0) {
        const persMap = new Map();
        persData.forEach(p => {
            if (p.source_id) persMap.set(String(p.source_id).trim(), p);
        });

        mergedEvents = eventData.map((event, idx) => {
            const sid = String(event.source_id || "").trim();
            const persRecord = persMap.get(sid) || {};
            const confidence = parseFloat(event.confidence_pct) || 75.0;

            let persistenceScore = 0;
            if (persRecord.persistence_score !== undefined && persRecord.persistence_score !== null) {
                const rawP = parseFloat(persRecord.persistence_score);
                persistenceScore = rawP <= 1 ? Math.round(rawP * 100 * 10) / 10 : Math.round(rawP);
            } else {
                const activeDays = parseFloat(event.active_days || persRecord.active_days || 0);
                const obsSpan = Math.max(1, parseFloat(event.observation_span_days || persRecord.observation_span_days || 1));
                persistenceScore = Math.min(100, Math.round((activeDays / obsSpan) * 100));
            }

            return {
                source_id: sid || "EVENT_" + Math.random().toString(36).substring(2, 7),
                state: event.state || statesList[idx % statesList.length],
                latitude: parseFloat(event.latitude),
                longitude: parseFloat(event.longitude),
                predicted_event_type: event.predicted_event_type || event.event_type || "Other",
                confidence: confidence,
                persistence_score: persistenceScore,
                landcover: event.landcover_class || "Unknown",
                mean_frp: parseFloat(event.mean_frp || persRecord.mean_frp || 0),
                max_frp: parseFloat(event.max_frp || persRecord.max_frp || 0),
                mean_brightness: parseFloat(event.mean_brightness || 0),
                imageUrl: sampleFireImages[idx % sampleFireImages.length]
            };
        }).filter(e => !isNaN(e.latitude) && !isNaN(e.longitude));
    }

    // Fallback to embedded mock data if CSV files could not be loaded locally
    if (mergedEvents.length === 0) {
        mergedEvents = [...defaultFallbackEvents];
        const statusSub = document.getElementById("database-status");
        if (statusSub) statusSub.textContent = "DATABASE READY (DEMO DATA)";
    }

    processData(mergedEvents);
}

function processData(csvEvents) {
    const savedEvents = loadDatabase();
    
    const eventMap = new Map();
    csvEvents.forEach(e => eventMap.set(String(e.source_id), e));
    savedEvents.forEach(e => eventMap.set(String(e.source_id), e));

    allEvents = Array.from(eventMap.values());
    filteredEvents = [...allEvents];

    updateDashboard();
    renderMarkers();
    renderTable();
    updateAlerts();
}

/* RENDER & UI UPDATES */
function updateDashboard() {
    const industrial = filteredEvents.filter(e => normalizeType(e.predicted_event_type) === "Industrial").length;
    const forest = filteredEvents.filter(e => normalizeType(e.predicted_event_type) === "Forest/Natural").length;
    const agricultural = filteredEvents.filter(e => normalizeType(e.predicted_event_type) === "Agricultural").length;
    const other = filteredEvents.filter(e => normalizeType(e.predicted_event_type) === "Other").length;

    setText("total-sources", filteredEvents.length);
    setText("industrial-count", industrial);
    setText("forest-count", forest);
    setText("agricultural-count", agricultural);
    setText("other-count", other);
    setText("visible-count", `${filteredEvents.length} EVENTS`);
    setText("database-count-badge", `${filteredEvents.length} TOTAL RECORDS`);
}

function renderTable() {
    const tbody = document.getElementById("table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (filteredEvents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: var(--muted);">No thermal events match current filter conditions.</td></tr>`;
        return;
    }

    filteredEvents.forEach(e => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${escapeHTML(e.source_id)}</strong></td>
            <td><span class="badge">${escapeHTML(e.state || 'National')}</span></td>
            <td><span class="badge" style="background: ${getEventColor(normalizeType(e.predicted_event_type))}22; color: ${getEventColor(normalizeType(e.predicted_event_type))}">${normalizeType(e.predicted_event_type)}</span></td>
            <td><strong>${Number(e.confidence).toFixed(1)}%</strong></td>
            <td><strong style="color:var(--cyan)">${e.persistence_score}%</strong></td>
            <td>${e.latitude ? Number(e.latitude).toFixed(4) : "—"}</td>
            <td>${e.longitude ? Number(e.longitude).toFixed(4) : "—"}</td>
            <td>${e.mean_frp ? Number(e.mean_frp).toFixed(1) : "—"}</td>
            <td><button class="btn-secondary" onclick="showEventDetails('${e.source_id}')">View</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderMarkers() {
    if (!markersLayer) return;
    markersLayer.clearLayers();

    filteredEvents.forEach(e => {
        if (!e.latitude || !e.longitude) return;
        const marker = L.circleMarker([e.latitude, e.longitude], {
            radius: 8,
            fillColor: getEventColor(normalizeType(e.predicted_event_type)),
            color: "#ffffff", 
            weight: 1.5, 
            fillOpacity: 0.85
        });
        
        const popupContent = `
            <div class="popup-container">
                <h4>🔥 ${escapeHTML(e.source_id)}</h4>
                <p><strong>State:</strong> ${escapeHTML(e.state || 'N/A')}</p>
                <p><strong>Type:</strong> ${normalizeType(e.predicted_event_type)}</p>
                <p><strong>Confidence:</strong> ${Number(e.confidence).toFixed(1)}%</p>
                <p><strong>Persistence:</strong> ${e.persistence_score}%</p>
                <img 
                  src="${e.imageUrl || sampleFireImages[0]}" 
                  alt="Fire Image at ${e.source_id}" 
                  class="popup-fire-img"
                  onerror="this.onerror=null; this.src='https://via.placeholder.com/200x120?text=Fire+Image+Unavailable';"
                />
            </div>
        `;

        marker.bindPopup(popupContent);
        
        marker.on("click", () => showEventDetails(e.source_id));
        marker.addTo(markersLayer);
    });
}

function updateAlerts() {
    const list = document.getElementById("alerts-list");
    if (!list) return;

    const criticalEvents = filteredEvents.filter(e => e.confidence >= ALERT_RULES.CRITICAL);
    const highEvents = filteredEvents.filter(e => e.confidence >= ALERT_RULES.HIGH && e.confidence < ALERT_RULES.CRITICAL);
    const monitoredEvents = filteredEvents.filter(e => e.confidence < ALERT_RULES.HIGH);

    setText("critical-alert-count", criticalEvents.length);
    setText("high-alert-count", highEvents.length);
    setText("monitor-alert-count", monitoredEvents.length);

    list.innerHTML = "";
    criticalEvents.slice(0, 5).forEach(e => {
        const item = document.createElement("div");
        item.className = "alert-card";
        item.innerHTML = `
            <div>
                <strong>${e.source_id} [${e.state}] - High Intensity Event</strong>
                <p style="font-size:12px; color:var(--muted)">Type: ${e.predicted_event_type} | Confidence: ${Number(e.confidence).toFixed(1)}% | Persistence: ${e.persistence_score}%</p>
            </div>
            <button class="btn-secondary" onclick="showEventDetails('${e.source_id}')">Inspect</button>
        `;
        list.appendChild(item);
    });
}

/* NATIONAL AUTHORITY ALERT DISPATCHER */
function setupNationalAuthorityAlerts() {
    const btn = document.getElementById("send-national-alert-btn");
    btn?.addEventListener("click", () => {
        const criticalCount = filteredEvents.filter(e => e.confidence >= ALERT_RULES.CRITICAL).length;
        const stateSelect = document.getElementById("state-filter");
        const currentState = stateSelect ? stateSelect.value : "National";
        showToast(`Dispatched Urgent Incident Brief (${criticalCount} Critical Anomalies in ${currentState}) to NDMA Desk.`, "alert");
    });
}

function showEventDetails(sourceId) {
    const event = allEvents.find(e => String(e.source_id) === String(sourceId));
    const container = document.getElementById("details-content");
    if (!event || !container) return;

    document.querySelectorAll(".view-section").forEach(sec => sec.classList.add("hidden"));
    document.getElementById("dashboard-section")?.classList.remove("hidden");

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div><span style="color:var(--muted); font-size:12px;">SOURCE ID</span><br><strong>${escapeHTML(event.source_id)}</strong></div>
            <div><span style="color:var(--muted); font-size:12px;">STATE JURISDICTION</span><br><strong>${escapeHTML(event.state)}</strong></div>
            <div><span style="color:var(--muted); font-size:12px;">EVENT CLASSIFICATION</span><br><strong>${escapeHTML(event.predicted_event_type)}</strong></div>
            <div><span style="color:var(--muted); font-size:12px;">CONFIDENCE SCORE</span><br><strong style="color:var(--cyan)">${Number(event.confidence).toFixed(1)}%</strong></div>
            <div><span style="color:var(--muted); font-size:12px;">PERSISTENCE SCORE</span><br><strong style="color:var(--agricultural)">${event.persistence_score}%</strong></div>
            <div><span style="color:var(--muted); font-size:12px;">LATITUDE / LONGITUDE</span><br><strong>${event.latitude}, ${event.longitude}</strong></div>
        </div>
        <div style="margin-top: 15px;">
            <span style="color:var(--muted); font-size:12px;">THERMAL DETECTION SNAPSHOT</span><br>
            <img src="${event.imageUrl || sampleFireImages[0]}" alt="Thermal Fire Snapshot" style="width:100%; max-width:350px; height:auto; margin-top:8px; border-radius:6px;" />
        </div>
    `;

    document.getElementById("details-panel")?.scrollIntoView({ behavior: 'smooth' });
}

/* AI PREDICTION FORM */
function setupPredictionForm() {
    const form = document.getElementById("prediction-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const activeDays = Number(document.getElementById("active_days")?.value) || 0;
        const obsSpan = Number(document.getElementById("observation_span")?.value) || 1;
        const calculatedPersistence = Math.min(100, Math.round((activeDays / obsSpan) * 100));
        
        const stateSelect = document.getElementById("state-filter");
        const selectedState = (stateSelect && stateSelect.value !== "ALL") ? stateSelect.value : "Odisha";

        const payload = {
            source_id: "PRED_" + Date.now().toString().substring(8),
            state: selectedState,
            latitude: Number(document.getElementById("latitude")?.value),
            longitude: Number(document.getElementById("longitude")?.value),
            mean_frp: Number(document.getElementById("mean_frp")?.value),
            predicted_event_type: document.getElementById("facility_type")?.value !== "None" ? "Industrial" : "Agricultural",
            confidence: Math.floor(Math.random() * (98 - 72 + 1)) + 72,
            persistence_score: calculatedPersistence,
            landcover: "Monitored Zone",
            imageUrl: sampleFireImages[0]
        };

        saveEventToDatabase(payload);
        allEvents.unshift(payload);
        applyFilters();

        const resultBox = document.getElementById("prediction-result");
        resultBox?.classList.remove("hidden");
        setText("result-type", payload.predicted_event_type);
        setText("result-confidence-value", `${payload.confidence.toFixed(1)}%`);
        setText("result-persistence-value", `${payload.persistence_score}%`);

        const confFill = document.getElementById("result-confidence-fill");
        const persFill = document.getElementById("result-persistence-fill");
        if (confFill) confFill.style.width = `${payload.confidence}%`;
        if (persFill) persFill.style.width = `${payload.persistence_score}%`;
        
        showToast(`New prediction recorded: ${payload.source_id}`, "success");
        resultBox?.scrollIntoView({ behavior: 'smooth' });
    });
}

/* FILTERS & SEARCH CONTROLS */
function setupEventListeners() {
    const stateFilter = document.getElementById("state-filter");
    const typeFilter = document.getElementById("type-filter");
    const confidenceFilter = document.getElementById("confidence-filter");
    const confidenceOutput = document.getElementById("confidence-output");
    const landcoverFilter = document.getElementById("landcover-filter");
    const searchInput = document.getElementById("search-input");
    const resetBtn = document.getElementById("reset-btn");

    confidenceFilter?.addEventListener("input", (e) => {
        if (confidenceOutput) confidenceOutput.value = `${e.target.value}%`;
        applyFilters();
    });

    stateFilter?.addEventListener("change", () => {
        applyFilters();
        const selectedState = stateFilter.value;
        if (stateCoordinates[selectedState] && map) {
            map.flyTo([stateCoordinates[selectedState].lat, stateCoordinates[selectedState].lng], stateCoordinates[selectedState].zoom);
        }
    });

    typeFilter?.addEventListener("change", applyFilters);
    landcoverFilter?.addEventListener("change", applyFilters);
    searchInput?.addEventListener("input", applyFilters);

    resetBtn?.addEventListener("click", () => {
        if (stateFilter) stateFilter.value = "ALL";
        if (typeFilter) typeFilter.value = "ALL";
        if (confidenceFilter) {
            confidenceFilter.value = "0";
            if (confidenceOutput) confidenceOutput.value = "0%";
        }
        if (landcoverFilter) landcoverFilter.value = "ALL";
        if (searchInput) searchInput.value = "";
        applyFilters();
        if (map) map.setView([20.5937, 78.9629], 5);
    });
}

function applyFilters() {
    const stateSelect = document.getElementById("state-filter");
    const typeSelect = document.getElementById("type-filter");
    const confInput = document.getElementById("confidence-filter");
    const landcoverSelect = document.getElementById("landcover-filter");
    const searchInp = document.getElementById("search-input");

    const state = stateSelect?.value || "ALL";
    const type = typeSelect?.value || "ALL";
    const minConf = Number(confInput?.value || 0);
    const landcover = landcoverSelect?.value || "ALL";
    const query = searchInp?.value.toLowerCase().trim() || "";

    filteredEvents = allEvents.filter(e => {
        const matchesState = (state === "ALL") || e.state === state;
        const matchesType = (type === "ALL") || normalizeType(e.predicted_event_type) === type;
        const matchesConf = e.confidence >= minConf;
        const matchesLandcover = (landcover === "ALL") || e.landcover === landcover;
        const matchesSearch = !query || String(e.source_id).toLowerCase().includes(query);

        return matchesState && matchesType && matchesConf && matchesLandcover && matchesSearch;
    });

    updateDashboard();
    renderTable();
    renderMarkers();
    updateAlerts();
}

/* LOCAL STORAGE & TOAST MESSAGES */
function loadDatabase() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } 
    catch { return []; }
}

function saveEventToDatabase(event) {
    const db = loadDatabase();
    db.push(event);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function normalizeType(type) {
    const val = String(type).toLowerCase();
    if (val.includes("industrial")) return "Industrial";
    if (val.includes("forest") || val.includes("natural")) return "Forest/Natural";
    if (val.includes("agricultural")) return "Agricultural";
    return "Other";
}

function getEventColor(type) {
    if (type === "Industrial") return "#ff4d5a";
    if (type === "Forest/Natural") return "#22c55e";
    if (type === "Agricultural") return "#f59e0b";
    return "#94a3b8";
}

function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, '');
}