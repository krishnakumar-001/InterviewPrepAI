const express = require('express');
const router = express.Router();

// Dashboard routes
router.get('/stats', (req, res) => {
    res.json({ message: 'Dashboard stats route working' });
});

router.get('/history', (req, res) => {
    res.json({ message: 'Interview history route working' });
});

module.exports = router;