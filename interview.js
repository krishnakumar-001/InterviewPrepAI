const express = require('express');
const router = express.Router();
const db = require('../database');

// ─────────────────────────────────────────────
// Question Bank
// ─────────────────────────────────────────────
const questionBank = {
    general: [
        "Tell me about yourself and your experience.",
        "What are your greatest strengths and weaknesses?",
        "Describe a challenging project you worked on and how you handled it.",
        "Where do you see yourself in 5 years?",
        "Why do you want to work for our company?"
    ],
    technical: [
        "Explain the difference between REST and GraphQL APIs.",
        "What is the difference between synchronous and asynchronous programming?",
        "How do you ensure code quality in your projects?",
        "Describe your experience with version control systems.",
        "How would you optimize a slow database query?"
    ],
    behavioral: [
        "Tell me about a time you had a conflict with a teammate. How did you resolve it?",
        "Describe a situation where you had to meet a tight deadline.",
        "Give an example of a time you showed leadership.",
        "Tell me about a failure and what you learned from it.",
        "How do you handle working under pressure?"
    ],
    mixed: [
        "Tell me about yourself and your technical background.",
        "Describe a challenging technical problem you solved.",
        "How do you prioritize tasks when everything seems urgent?",
        "What is your experience with agile methodologies?",
        "Where do you see technology heading in the next 5 years?"
    ]
};

// ─────────────────────────────────────────────
// Helper: Answer analyze karo
// ─────────────────────────────────────────────
function analyzeAnswer(answer) {
    const words = answer.trim().split(/\s+/).length;

    // Clarity score
    let clarity = Math.min(100, 50 + words * 1.5);
    if (answer.includes('.') || answer.includes(',')) clarity += 10;
    clarity = Math.min(100, Math.round(clarity));

    // Confidence score
    let confidence = 65;
    if (words > 15) confidence += 10;
    if (words > 40) confidence += 10;
    if (/\bum\b|\buh\b/i.test(answer)) confidence -= 10;
    confidence = Math.min(100, Math.max(40, Math.round(confidence)));

    // Relevance score
    let relevance = 60;
    const keywords = [
        'experience', 'project', 'team', 'work', 'skill',
        'learn', 'develop', 'manage', 'led', 'built', 'created', 'solved'
    ];
    keywords.forEach(k => {
        if (answer.toLowerCase().includes(k)) relevance += 5;
    });
    relevance = Math.min(100, Math.round(relevance));

    // Tips
    const tips = [];
    if (clarity < 70)    tips.push('🎯 Be more clear and structured in your speech');
    else                 tips.push('✅ Great speech clarity!');
    if (relevance < 70) {
        tips.push('📌 Answer the question more directly');
        tips.push('💡 Use the STAR method with specific examples');
    } else {
        tips.push('📊 Very relevant answer!');
    }
    if (confidence < 70) tips.push('⚡ Reduce filler words (um, uh) for more confidence');
    else                 tips.push('🎯 You sound confident — keep it up!');

    return { clarity, relevance, confidence, tips, wordCount: words };
}

// ─────────────────────────────────────────────
// GET /api/interview/questions
// Query: ?type=mixed&count=5
// ─────────────────────────────────────────────
router.get('/questions', (req, res) => {
    try {
        const { type = 'mixed', count = 5 } = req.query;
        const pool = questionBank[type] || questionBank.mixed;
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        res.json({
            questions: shuffled.slice(0, parseInt(count)),
            type,
            total: pool.length
        });
    } catch (err) {
        console.error('Questions error:', err);
        res.status(500).json({ error: 'Failed to load questions' });
    }
});

// ─────────────────────────────────────────────
// POST /api/interview/start
// Body: { jobRole, industry, experience, interviewType }
// ─────────────────────────────────────────────
router.post('/start', (req, res) => {
    try {
        const { jobRole, industry, experience, interviewType } = req.body;
        const userId = req.user.id;

        const type = interviewType || 'mixed';
        const pool = questionBank[type] || questionBank.mixed;
        const questions = [...pool].sort(() => Math.random() - 0.5).slice(0, 5);

        const sessionId = `sess_${Date.now()}_${userId}`;

        // DB mein save karo
        if (db && db.run) {
            db.run(
                `INSERT OR IGNORE INTO interviews
                 (session_id, user_id, job_role, industry, experience, interview_type, questions, status, started_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))`,
                [
                    sessionId, userId,
                    jobRole   || 'General',
                    industry  || 'Technology',
                    experience|| 'entry',
                    type,
                    JSON.stringify(questions)
                ],
                (err) => { if (err) console.error('DB insert error:', err); }
            );
        }

        res.json({
            sessionId,
            questions,
            message: 'Interview session started successfully'
        });
    } catch (err) {
        console.error('Start interview error:', err);
        res.status(500).json({ error: 'Failed to start interview' });
    }
});

// ─────────────────────────────────────────────
// POST /api/interview/submit-answer
// Body: { sessionId, questionIndex, answer }
// ─────────────────────────────────────────────
router.post('/submit-answer', (req, res) => {
    try {
        const { sessionId, questionIndex, answer } = req.body;

        if (!answer || !answer.trim()) {
            return res.status(400).json({ error: 'Answer cannot be empty' });
        }

        const scores = analyzeAnswer(answer);

        // DB mein answer save karo
        if (db && db.run) {
            db.run(
                `INSERT OR IGNORE INTO interview_answers
                 (session_id, question_index, answer, clarity, relevance, confidence, submitted_at)
                 VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
                [
                    sessionId, questionIndex, answer,
                    scores.clarity, scores.relevance, scores.confidence
                ],
                (err) => { if (err) console.error('Answer save error:', err); }
            );
        }

        res.json({
            scores: {
                clarity:    scores.clarity,
                relevance:  scores.relevance,
                confidence: scores.confidence
            },
            tips:      scores.tips,
            wordCount: scores.wordCount
        });
    } catch (err) {
        console.error('Submit answer error:', err);
        res.status(500).json({ error: 'Failed to submit answer' });
    }
});

// ─────────────────────────────────────────────
// POST /api/interview/complete
// Body: { sessionId, answers, scores, timeSpent, focusData }
// ─────────────────────────────────────────────
router.post('/complete', (req, res) => {
    try {
        const {
            sessionId,
            answers   = [],
            scores    = {},
            timeSpent = 0,
            focusData = {}
        } = req.body;

        const overall = scores.overall ||
            Math.round(
                ((scores.clarity    || 0) +
                 (scores.relevance  || 0) +
                 (scores.confidence || 0)) / 3
            );

        // DB update
        if (db && db.run) {
            db.run(
                `UPDATE interviews
                 SET status           = 'completed',
                     completed_at     = datetime('now'),
                     final_clarity    = ?,
                     final_relevance  = ?,
                     final_confidence = ?,
                     overall_score    = ?,
                     time_spent       = ?,
                     focus_face_lost  = ?,
                     focus_away       = ?,
                     focus_tab        = ?,
                     focus_score      = ?
                 WHERE session_id = ?`,
                [
                    scores.clarity      || 0,
                    scores.relevance    || 0,
                    scores.confidence   || 0,
                    overall,
                    timeSpent,
                    focusData.faceLost  || 0,
                    focusData.away      || 0,
                    focusData.tab       || 0,
                    focusData.focusScore|| 100,
                    sessionId
                ],
                (err) => { if (err) console.error('Complete update error:', err); }
            );
        }

        const feedback =
            overall >= 80 ? '🌟 Excellent performance! You are interview-ready.'  :
            overall >= 60 ? '👍 Good job! Keep practicing to improve.'             :
                            '💪 Keep practicing — consistency is key!';

        res.json({
            message: 'Interview completed successfully',
            sessionId,
            overall,
            feedback
        });
    } catch (err) {
        console.error('Complete error:', err);
        res.status(500).json({ error: 'Failed to complete interview' });
    }
});

// ─────────────────────────────────────────────
// GET /api/interview/history
// Logged-in user ki saari completed interviews
// ─────────────────────────────────────────────
router.get('/history', (req, res) => {
    try {
        const userId = req.user.id;

        if (db && db.all) {
            db.all(
                `SELECT session_id, job_role, industry, interview_type,
                        overall_score, final_clarity, final_relevance, final_confidence,
                        time_spent, completed_at,
                        focus_face_lost, focus_away, focus_tab, focus_score
                 FROM interviews
                 WHERE user_id = ? AND status = 'completed'
                 ORDER BY completed_at DESC
                 LIMIT 20`,
                [userId],
                (err, rows) => {
                    if (err) {
                        console.error('History DB error:', err);
                        return res.json({ interviews: [], total: 0 });
                    }
                    const interviews = (rows || []).map(r => ({
                        sessionId:     r.session_id,
                        jobRole:       r.job_role,
                        industry:      r.industry,
                        interviewType: r.interview_type,
                        completedAt:   r.completed_at,
                        timeSpent:     r.time_spent,
                        scores: {
                            overall:    r.overall_score,
                            clarity:    r.final_clarity,
                            relevance:  r.final_relevance,
                            confidence: r.final_confidence
                        },
                        focusData: {
                            faceLost:   r.focus_face_lost,
                            away:       r.focus_away,
                            tab:        r.focus_tab,
                            focusScore: r.focus_score
                        }
                    }));
                    res.json({ interviews, total: interviews.length });
                }
            );
        } else {
            res.json({ interviews: [], total: 0 });
        }
    } catch (err) {
        console.error('History error:', err);
        res.status(500).json({ error: 'Failed to load history' });
    }
});

// ─────────────────────────────────────────────
// GET /api/interview/session/:sessionId
// Ek specific session ki details
// ─────────────────────────────────────────────
router.get('/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        if (db && db.get) {
            db.get(
                `SELECT * FROM interviews WHERE session_id = ? AND user_id = ?`,
                [sessionId, userId],
                (err, row) => {
                    if (err || !row) {
                        return res.status(404).json({ error: 'Session not found' });
                    }
                    res.json({
                        sessionId:     row.session_id,
                        jobRole:       row.job_role,
                        industry:      row.industry,
                        interviewType: row.interview_type,
                        status:        row.status,
                        startedAt:     row.started_at,
                        completedAt:   row.completed_at,
                        questions:     JSON.parse(row.questions || '[]'),
                        scores: {
                            overall:    row.overall_score,
                            clarity:    row.final_clarity,
                            relevance:  row.final_relevance,
                            confidence: row.final_confidence
                        }
                    });
                }
            );
        } else {
            res.status(404).json({ error: 'Database not available' });
        }
    } catch (err) {
        console.error('Session detail error:', err);
        res.status(500).json({ error: 'Failed to load session' });
    }
});

module.exports = router;