const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Temporary users storage
let users = [];

// REGISTER API
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    
    console.log('📝 Register:', email);
    
    const userExists = users.find(u => u.email === email);
    if (userExists) {
        return res.json({ success: false, message: 'User already exists!' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ id: users.length + 1, name, email, password: hashedPassword });
    
    res.json({ success: true, message: 'Registration successful!' });
});

// LOGIN API
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    console.log('🔐 Login:', email);
    console.log('Users in DB:', users.map(u => u.email));
    
    const user = users.find(u => u.email === email);
    if (!user) {
        return res.json({ success: false, message: 'User not found! Please register first.' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        return res.json({ success: false, message: 'Wrong password!' });
    }
    
    res.json({ 
        success: true, 
        message: 'Login successful!',
        user: { id: user.id, name: user.name, email: user.email }
    });
});

// Get all users (testing)
app.get('/api/users', (req, res) => {
    res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email })));
});

app.listen(5000, () => {
    console.log('✅ Server running on http://localhost:5000');
});