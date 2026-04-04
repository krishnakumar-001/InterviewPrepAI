// Register
const registerForm = document.getElementById('registerForm');
if(registerForm) {
    registerForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const fullName = document.getElementById('fullName').value;
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;
        
        if(!fullName || !username || !email || !password || !role) {
            alert('Please fill all fields');
            return;
        }
        
        let users = localStorage.getItem('users');
        if(users) {
            users = JSON.parse(users);
        } else {
            users = [];
        }
        
        const existingUser = users.find(function(u) {
            return u.email === email;
        });
        
        if(existingUser) {
            alert('Email already registered!');
            return;
        }
        
        const newUser = {
            fullName: fullName,
            username: username,
            email: email,
            password: password,
            role: role
        };
        
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        
        alert('Registration Successful!');
        window.location.href = 'dashboard.html';
    });
}

// Login
const loginForm = document.getElementById('loginForm');
if(loginForm) {
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const users = localStorage.getItem('users');
        
        if(!users) {
            alert('No account found. Please register first.');
            return;
        }
        
        const allUsers = JSON.parse(users);
        let foundUser = null;
        
        for(let i = 0; i < allUsers.length; i++) {
            if(allUsers[i].email === email && allUsers[i].password === password) {
                foundUser = allUsers[i];
                break;
            }
        }
        
        if(foundUser) {
            localStorage.setItem('currentUser', JSON.stringify(foundUser));
            alert('Login Successful!');
            window.location.href = 'dashboard.html';
        } else {
            alert('Invalid email or password');
        }
    });
}

// Dashboard - check login
if(window.location.pathname.includes('dashboard.html')) {
    const currentUser = localStorage.getItem('currentUser');
    if(!currentUser) {
        window.location.href = 'login.html';
    } else {
        const user = JSON.parse(currentUser);
        const userNameSpan = document.getElementById('userName');
        if(userNameSpan) {
            userNameSpan.innerText = user.fullName || user.username;
        }
    }
}