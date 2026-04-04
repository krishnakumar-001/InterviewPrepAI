// ============================================================
// AI Interview Smart — interview.js
// Ye file interview.html ke saath kaam karti hai
// Camera + Interview dono ek saath "Start Interview" se shuru
// ============================================================

const API = '/api/interview';
const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
let questions     = [];
let sessionId     = null;
let currentQ      = 0;
let sessionSecs   = 0;
let sessionTimer  = null;
let answers       = [];
let lastScores    = { clarity: 0, relevance: 0, confidence: 0 };
let isRecording   = false;
let recognition   = null;
let cameraEnabled = false;

// Focus monitor
let focusActive    = false;
let focusCounts    = { faceLost: 0, away: 0, tab: 0 };
let focusSecs      = 0;
let focusTimerInt  = null;
let focusCheckInt  = null;
let lastFaceTime   = Date.now();
let lastAwayTime   = Date.now();
let focusScore     = 100;

// ─────────────────────────────────────────────
// DOM Ready
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    runLoadingSequence();
    trackTabSwitch();
});

// ─────────────────────────────────────────────
// STEP 1 — Loading Screen
// ─────────────────────────────────────────────
async function runLoadingSequence() {
    const bar  = document.getElementById('loaderBar');
    const step = document.getElementById('loaderStep');

    const steps = [
        [15,  'Authenticating session...'],
        [35,  'Loading interview questions...'],
        [60,  'Preparing AI interviewer...'],
        [80,  'Setting up focus monitor...'],
        [95,  'Almost ready...'],
    ];

    for (const [pct, text] of steps) {
        if (bar)  bar.style.width = pct + '%';
        if (step) step.textContent = text;
        await sleep(380);
    }

    // Questions backend se load karo
    await loadQuestions();

    if (bar)  bar.style.width = '100%';
    if (step) step.textContent = 'Ready!';
    await sleep(300);

    // Loading screen hide karo
    const ls = document.getElementById('loadingScreen');
    if (ls) { ls.style.opacity = '0'; setTimeout(() => ls.style.display = 'none', 500); }

    // Camera permission modal dikhao
    const modal = document.getElementById('camPermModal');
    if (modal) modal.classList.add('show');
}

// ─────────────────────────────────────────────
// STEP 2 — Questions Backend Se
// ─────────────────────────────────────────────
async function loadQuestions() {
    // Pehle localStorage check karo (dashboard ne save kiya hoga)
    const saved = localStorage.getItem('interviewQuestions');
    if (saved) {
        try { questions = JSON.parse(saved); if (questions.length) return; } catch(e) {}
    }

    // Backend se lo
    const prefs = JSON.parse(localStorage.getItem('interviewPrefs') || '{}');
    const type  = prefs.interviewType || 'mixed';
    try {
        const res  = await apiFetch(`${API}/questions?type=${type}&count=5`);
        const data = await res.json();
        if (data.questions) questions = data.questions;
    } catch (e) {
        // Fallback questions
        questions = [
            "Tell me about yourself and your experience.",
            "What are your greatest strengths and weaknesses?",
            "Describe a challenging project you worked on.",
            "Where do you see yourself in 5 years?",
            "Why do you want this role?"
        ];
    }
}

// ─────────────────────────────────────────────
// STEP 3 — Camera Permission Handlers
// ─────────────────────────────────────────────
async function requestCameraAndStart() {
    hideCamModal();
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const video  = document.getElementById('camVideo');
        if (video) {
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                setHidden('camPlaceholder', true);
                setLight('sCamera', 'green');
                cameraEnabled = true;
            };
        }
    } catch (err) {
        console.warn('Camera denied:', err);
        setLight('sCamera', 'red');
    }
    startEverything();
}

function skipCameraAndStart() {
    hideCamModal();
    setLight('sCamera', 'amber');
    startEverything();
}

function hideCamModal() {
    const m = document.getElementById('camPermModal');
    if (m) m.classList.remove('show');
}

// ─────────────────────────────────────────────
// STEP 4 — Start Everything Together
// ─────────────────────────────────────────────
async function startEverything() {
    // Backend session start karo
    await startBackendSession();

    // UI init
    initInterviewUI();
    startSessionTimer();
    startFocusMonitor();
}

async function startBackendSession() {
    const prefs = JSON.parse(localStorage.getItem('interviewPrefs') || '{}');
    try {
        const res  = await apiFetch(`${API}/start`, 'POST', prefs);
        const data = await res.json();
        if (data.sessionId) {
            sessionId = data.sessionId;
            localStorage.setItem('sessionId', sessionId);
            // Backend ne questions diye to unhe use karo
            if (data.questions && data.questions.length) questions = data.questions;
        }
    } catch (e) {
        // Session ID locally bana lo agar backend down ho
        sessionId = `local_${Date.now()}`;
        localStorage.setItem('sessionId', sessionId);
        console.warn('Backend session fallback:', e);
    }
}

// ─────────────────────────────────────────────
// Interview UI
// ─────────────────────────────────────────────
function initInterviewUI() {
    buildProgressDots();
    updateQuestion();
    const ta = document.getElementById('answerInput');
    if (ta) ta.addEventListener('input', e => analyzeAnswerLocal(e.target.value));
}

function buildProgressDots() {
    const wrap = document.getElementById('qDots');
    if (!wrap) return;
    wrap.innerHTML = questions.map((_, i) => `<div class="q-dot" id="dot${i}"></div>`).join('');
    updateDots();
}

function updateDots() {
    questions.forEach((_, i) => {
        const d = document.getElementById('dot' + i);
        if (!d) return;
        d.className = 'q-dot' + (i < currentQ ? ' done' : i === currentQ ? ' active' : '');
    });
}

function updateQuestion() {
    if (!questions.length) return;
    setText('qBadge',       `Question ${currentQ + 1}/${questions.length}`);
    setText('questionText', questions[currentQ]);
    updateDots();
    // AI speaking animation
    const si = document.getElementById('speakIndicator');
    if (si) { si.classList.remove('hidden'); setTimeout(() => si.classList.add('hidden'), 2200); }
}

// ─────────────────────────────────────────────
// Session Timer
// ─────────────────────────────────────────────
function startSessionTimer() {
    sessionTimer = setInterval(() => {
        sessionSecs++;
        const m = pad(Math.floor(sessionSecs / 60));
        const s = pad(sessionSecs % 60);
        setText('sessionTimerDisplay', `${m}:${s}`);
    }, 1000);
}

// ─────────────────────────────────────────────
// Answer Analysis (Local — instant feedback)
// ─────────────────────────────────────────────
function analyzeAnswerLocal(text) {
    if (!text.trim()) return;
    const words = text.trim().split(/\s+/).length;

    let clarity = Math.min(100, Math.round(50 + words * 1.5));
    if (text.includes('.') || text.includes(',')) clarity = Math.min(100, clarity + 10);

    let confidence = 65;
    if (words > 15) confidence += 10;
    if (words > 40) confidence += 10;
    if (/\bum\b|\buh\b/i.test(text)) confidence -= 10;
    confidence = Math.min(100, Math.max(40, Math.round(confidence)));

    let relevance = 60;
    ['experience','project','team','work','skill','learn','develop','manage','led','built','created','solved']
        .forEach(k => { if (text.toLowerCase().includes(k)) relevance += 5; });
    relevance = Math.min(100, Math.round(relevance));

    lastScores = { clarity, relevance, confidence };
    updateBars(clarity, relevance, confidence);
    updateTips(clarity, relevance, confidence);
}

function updateBars(c, r, conf) {
    setBar('barClarity',    c,    'pClarity');
    setBar('barRelevance',  r,    'pRelevance');
    setBar('barConfidence', conf, 'pConfidence');
}

function setBar(barId, val, pctId) {
    const b = document.getElementById(barId);
    const p = document.getElementById(pctId);
    if (b) b.style.width = val + '%';
    if (p) p.textContent  = val + '%';
}

function updateTips(c, r, conf) {
    const tips = [];
    tips.push(c    < 70 ? '🎯 Be more clear and structured' : '✅ Great speech clarity!');
    if (r < 70) { tips.push('📌 Answer more directly'); tips.push('💡 Use STAR method with examples'); }
    else         tips.push('📊 Very relevant answer!');
    tips.push(conf < 70 ? '⚡ Reduce filler words (um, uh)' : '🎯 You sound confident — keep it up!');

    const ul = document.getElementById('tipsList');
    if (ul) ul.innerHTML = tips.map(t => `<li>${t}</li>`).join('');
}

// ─────────────────────────────────────────────
// Recording (Speech Recognition)
// ─────────────────────────────────────────────
function toggleRecording() {
    if (isRecording) stopRecording();
    else             startRecording();
}

function startRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported. Please type your answer.'); return; }

    recognition = new SR();
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.lang           = 'en-US';

    recognition.onresult = e => {
        let t = '';
        for (let i = e.resultIndex; i < e.results.length; i++)
            t += e.results[i][0].transcript;
        const ta = document.getElementById('answerInput');
        if (ta) { ta.value = t; analyzeAnswerLocal(t); }
    };
    recognition.onerror = stopRecording;
    recognition.start();

    isRecording = true;
    const btn = document.getElementById('recBtn');
    if (btn) { btn.textContent = '⏹ Stop Recording'; btn.classList.add('recording'); }
    setVisible('recStatus', true);
}

function stopRecording() {
    if (recognition) { recognition.stop(); recognition = null; }
    isRecording = false;
    const btn = document.getElementById('recBtn');
    if (btn) { btn.textContent = '🎙️ Start Recording'; btn.classList.remove('recording'); }
    setVisible('recStatus', false);
}

// ─────────────────────────────────────────────
// Submit Answer
// ─────────────────────────────────────────────
async function submitAnswer() {
    const ta = document.getElementById('answerInput');
    if (!ta) return;
    const answer = ta.value.trim();
    if (!answer) { alert('Please provide an answer first.'); return; }
    if (isRecording) stopRecording();

    // Backend ko bhejo — refined scores lo
    try {
        const res  = await apiFetch(`${API}/submit-answer`, 'POST', { sessionId, questionIndex: currentQ, answer });
        const data = await res.json();
        if (data.scores) {
            lastScores = data.scores;
            updateBars(data.scores.clarity, data.scores.relevance, data.scores.confidence);
            updateTips(data.scores.clarity, data.scores.relevance, data.scores.confidence);
        }
    } catch (e) { /* local scores use karo */ }

    // Answer save karo
    answers.push({ question: questions[currentQ], answer, scores: { ...lastScores } });

    // Agli question
    if (currentQ < questions.length - 1) {
        currentQ++;
        ta.value = '';
        updateQuestion();
        updateBars(0, 0, 0);
        resetTips();
    } else {
        completeInterview();
    }
}

function resetTips() {
    const ul = document.getElementById('tipsList');
    if (ul) ul.innerHTML = `
        <li>Speak clearly and at a moderate pace</li>
        <li>Use the STAR method for answers</li>
        <li>Maintain eye contact with camera</li>`;
}

// ─────────────────────────────────────────────
// Complete Interview
// ─────────────────────────────────────────────
async function completeInterview() {
    clearInterval(sessionTimer);
    stopFocusMonitor();

    const avgScores = computeAvgScores();
    const focusData = { ...focusCounts, focusScore };

    try {
        await apiFetch(`${API}/complete`, 'POST', {
            sessionId,
            answers,
            scores:    avgScores,
            timeSpent: sessionSecs,
            focusData
        });
    } catch (e) { console.log('Complete error:', e); }

    showReport(avgScores, focusData);
}

function computeAvgScores() {
    if (!answers.length) return { clarity: 75, relevance: 75, confidence: 75, overall: 75 };
    const avg = k => Math.round(answers.reduce((a, b) => a + (b.scores?.[k] || 0), 0) / answers.length);
    const c = avg('clarity'), r = avg('relevance'), conf = avg('confidence');
    return { clarity: c, relevance: r, confidence: conf, overall: Math.round((c + r + conf) / 3) };
}

function showReport(scores, focusData) {
    const overall = scores.overall;
    const color   = overall >= 80 ? '#51cf66' : overall >= 60 ? '#ffd93d' : '#ff6b6b';
    const el      = document.getElementById('reportScore');
    if (el) { el.textContent = overall + '%'; el.style.color = color; }

    setText('repClarity',    scores.clarity    + '%');
    setText('repRelevance',  scores.relevance  + '%');
    setText('repConfidence', scores.confidence + '%');

    const totalFocus = focusData.faceLost + focusData.away + focusData.tab;
    let fb = '';
    fb += overall >= 80 ? `<div class="fi-row fi-good">🌟 Excellent! You are interview-ready.</div>`
        : overall >= 60 ? `<div class="fi-row fi-good">👍 Good job! Keep practicing.</div>`
                        : `<div class="fi-row fi-bad">💪 Keep practicing — you will improve!</div>`;
    fb += totalFocus === 0
        ? `<div class="fi-row fi-good">🎯 Perfect focus — no interruptions!</div>`
        : `<div class="fi-row fi-bad">⚠️ ${totalFocus} focus interruption(s). Stay in frame next time.</div>`;

    const rf = document.getElementById('reportFeedback');
    if (rf) rf.innerHTML = fb;

    setVisible('overlay',     true,  true);
    setVisible('reportModal', true,  true);
}

function closeModal() {
    setVisible('overlay',     false, true);
    setVisible('reportModal', false, true);
}

function goToDashboard() {
    window.location.href = 'dashboard.html';
}

function confirmEndInterview() {
    if (confirm('End the interview early? Your progress will be saved.')) completeInterview();
}

// ─────────────────────────────────────────────
// Focus Monitor
// ─────────────────────────────────────────────
function startFocusMonitor() {
    focusActive  = true;
    focusSecs    = 0;
    focusCounts  = { faceLost: 0, away: 0, tab: 0 };
    focusScore   = 100;
    lastFaceTime = Date.now();
    lastAwayTime = Date.now();

    const badge = document.getElementById('liveBadge');
    if (badge) { badge.classList.add('live'); badge.innerHTML = '<span class="badge-dot">●</span> Live'; }

    if (cameraEnabled) {
        setLight('sFace',  'green');
        setLight('sFocus', 'green');
    }

    focusTimerInt = setInterval(() => {
        focusSecs++;
        setText('focusTimer', `${pad(Math.floor(focusSecs/60))}:${pad(focusSecs%60)}`);
    }, 1000);

    if (cameraEnabled) {
        focusCheckInt = setInterval(runFocusCheck, 2000);
    }
}

function stopFocusMonitor() {
    focusActive = false;
    clearInterval(focusTimerInt);
    clearInterval(focusCheckInt);
    const badge = document.getElementById('liveBadge');
    if (badge) { badge.classList.remove('live'); badge.innerHTML = '<span class="badge-dot">●</span> Ended'; }
}

function runFocusCheck() {
    if (!focusActive) return;
    const now = Date.now();

    // Simulated face detection (95% success)
    const faceDetected = Math.random() > 0.05;
    setLight('sFace', faceDetected ? 'green' : 'red');

    if (!faceDetected) {
        if (now - lastFaceTime > 3000) {
            addFocusEvent('Face Lost', 'You moved out of camera frame', 'faceLost');
            lastFaceTime = now;
        }
    } else {
        lastFaceTime = now;
    }

    // Looking away (10% chance, 5s cooldown)
    if (faceDetected && Math.random() > 0.9 && now - lastAwayTime > 5000) {
        addFocusEvent('Looking Away', 'Keep eye contact with camera', 'away');
        lastAwayTime = now;
    }

    const total = focusCounts.faceLost + focusCounts.away + focusCounts.tab;
    focusScore  = Math.max(0, 100 - total * 7);

    setLight('sFocus', total > 5 ? 'red' : total > 2 ? 'amber' : 'green');
    setText('focusScoreText', focusScore + '%');
    const ff = document.getElementById('focusFill');
    if (ff) ff.style.width = focusScore + '%';
}

function addFocusEvent(title, desc, type) {
    if (type === 'faceLost') focusCounts.faceLost++;
    if (type === 'away')     focusCounts.away++;
    if (type === 'tab')      focusCounts.tab++;

    // Update all counter elements
    ['mFaceLost','focusFaceLost'].forEach(id => setText(id, focusCounts.faceLost));
    ['mAway',    'focusAway'    ].forEach(id => setText(id, focusCounts.away));
    ['mTab',     'focusTab'     ].forEach(id => setText(id, focusCounts.tab));

    // Alert
    setText('alertTitle', title);
    setText('alertDesc',  desc);
    const al = document.getElementById('camAlert');
    if (al) { al.classList.remove('hidden'); setTimeout(() => al.classList.add('hidden'), 3000); }

    // Events list
    const list = document.getElementById('eventsList');
    if (list) {
        if (list.querySelector('.no-events')) list.innerHTML = '';
        const row = document.createElement('div');
        row.className = 'event-row';
        row.innerHTML = `<span class="e-time">${new Date().toLocaleTimeString()}</span><span class="e-text">${title}</span>`;
        list.insertBefore(row, list.firstChild);
        if (list.children.length > 8) list.removeChild(list.lastChild);
    }
}

function trackTabSwitch() {
    document.addEventListener('visibilitychange', () => {
        if (focusActive && document.hidden)
            addFocusEvent('Tab Switch', 'You switched away from interview', 'tab');
    });
}

// ─────────────────────────────────────────────
// API Helper
// ─────────────────────────────────────────────
function apiFetch(url, method = 'GET', body = null) {
    const opts = {
        method,
        headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + token
        }
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch(url, opts);
}

// ─────────────────────────────────────────────
// Utility Helpers
// ─────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function pad(n)    { return String(n).padStart(2, '0'); }
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setHidden(id, hide) { const el = document.getElementById(id); if (el) el.classList[hide ? 'add' : 'remove']('hidden'); }
function setLight(id, color) {
    const el = document.getElementById(id);
    if (el) el.className = 'slight' + (color ? ' ' + color : '');
}
function setVisible(id, show, useClass = false) {
    const el = document.getElementById(id);
    if (!el) return;
    if (useClass) el.classList[show ? 'add' : 'remove']('show');
    else          el.style.display = show ? 'block' : 'none';
}
