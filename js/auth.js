// Authentication functions
const API_URL = 'http://localhost:5000/api';

// Toast notification function
function showToast(message, type = 'error') {
    // Check if toast exists, if not create it
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    
    // Add styles if not present
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                min-width: 300px;
                padding: 15px 20px;
                border-radius: 10px;
                color: white;
                font-weight: 500;
                z-index: 9999;
                animation: slideInRight 0.3s ease;
                box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            }
            .toast.success {
                background: linear-gradient(135deg, #51cf66, #40c057);
            }
            .toast.error {
                background: linear-gradient(135deg, #ff6b6b, #fa5252);
            }
            .toast.info {
                background: linear-gradient(135deg, #4a6cf7, #3b5bdb);
            }
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Handle Login
document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth.js loaded - DOM ready');
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('Login form found');
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Login form submitted');
            
            const email = document.getElementById('email')?.value.trim();
            const password = document.getElementById('password')?.value;
            const loginBtn = document.getElementById('loginBtn');
            const loadingSpinner = document.getElementById('loginLoading');
            
            console.log('Email:', email);
            console.log('Password length:', password?.length);
            
            if (!email || !password) {
                showToast('Please fill in all fields', 'error');
                return;
            }
            
            // Disable button and show loading
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.style.opacity = '0.7';
            }
            if (loadingSpinner) {
                loadingSpinner.style.display = 'block';
            }
            
            try {
                console.log('Sending request to:', `${API_URL}/auth/login`);
                
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                console.log('Response status:', response.status);
                
                const data = await response.json();
                console.log('Response data:', data);
                
                if (response.ok) {
                    // Store token and user data
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Also store in cookie for backup (optional)
                    document.cookie = `token=${data.token}; path=/`;
                    
                    showToast('Login successful! Redirecting...', 'success');
                    
                    // Redirect after short delay
                    setTimeout(() => {
                        window.location.href = 'role-select.html';
                    }, 1500);
                } else {
                    // Show error message from server
                    showToast(data.message || 'Invalid email or password', 'error');
                    
                    // Re-enable button
                    if (loginBtn) {
                        loginBtn.disabled = false;
                        loginBtn.style.opacity = '1';
                    }
                    if (loadingSpinner) {
                        loadingSpinner.style.display = 'none';
                    }
                }
            } catch (error) {
                console.error('Network/Server Error:', error);
                
                // More specific error message
                if (!navigator.onLine) {
                    showToast('You are offline. Please check your internet connection.', 'error');
                } else {
                    showToast('Cannot connect to server. Please make sure the backend is running on port 5000.', 'error');
                }
                
                // Re-enable button
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.style.opacity = '1';
                }
                if (loadingSpinner) {
                    loadingSpinner.style.display = 'none';
                }
            }
        });
    } else {
        console.log('Login form not found on this page');
    }
    
    // Handle Registration
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        console.log('Register form found');
        
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form values
            const fullName = document.getElementById('fullName')?.value.trim();
            const username = document.getElementById('username')?.value.trim();
            const email = document.getElementById('email')?.value.trim();
            const password = document.getElementById('password')?.value;
            const role = document.getElementById('role')?.value;
            
            console.log('Registration data:', { fullName, username, email, role });
            
            // Validation
            if (!fullName || !username || !email || !password || !role) {
                showToast('Please fill in all fields', 'error');
                return;
            }
            
            if (password.length < 6) {
                showToast('Password must be at least 6 characters long', 'error');
                return;
            }
            
            // Prepare user data
            const userData = {
                fullName: fullName,
                username: username,
                email: email,
                password: password,
                role: role
            };
            
            try {
                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
                
                const data = await response.json();
                console.log('Registration response:', data);
                
                if (response.ok) {
                    showToast('Registration successful! Redirecting to login...', 'success');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                } else {
                    showToast(data.message || 'Registration failed', 'error');
                }
            } catch (error) {
                console.error('Network Error:', error);
                
                if (!navigator.onLine) {
                    showToast('You are offline. Please check your internet connection.', 'error');
                } else {
                    showToast('Cannot connect to server. Please make sure the backend is running on port 5000.', 'error');
                }
            }
        });
    }
    
    // Handle Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.href = 'index.html';
        });
    }
    
    // Display username in dashboard
    const userNameSpan = document.getElementById('userName');
    if (userNameSpan) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        userNameSpan.textContent = user.fullName || user.username || 'User';
    }
});

// Add this for debugging - check if server is accessible
async function checkServerStatus() {
    try {
        const response = await fetch('http://localhost:5000/api/health', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
            console.log('✅ Server is running on port 5000');
        } else {
            console.log('❌ Server responded with status:', response.status);
        }
    } catch (error) {
        console.log('❌ Server is not accessible. Make sure backend is running on http://localhost:5000');
    }
}

// Check server on load
setTimeout(checkServerStatus, 1000);