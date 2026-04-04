// Dashboard functionality
class Dashboard {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        // Get interviews from localStorage - check both possible keys
        this.interviews = JSON.parse(localStorage.getItem('interviews') || '[]');
        
        // If no interviews found, check for interviewHistory
        if (this.interviews.length === 0) {
            this.interviews = JSON.parse(localStorage.getItem('interviewHistory') || '[]');
        }
        
        // If still no interviews, check for individual interview data
        if (this.interviews.length === 0) {
            const lastInterview = localStorage.getItem('lastInterview');
            if (lastInterview) {
                try {
                    this.interviews = [JSON.parse(lastInterview)];
                } catch (e) {
                    console.error('Error parsing lastInterview:', e);
                }
            }
        }
        
        console.log('Loaded interviews:', this.interviews); // Debug log
        
        // Set user name
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = this.user.name || this.user.fullName || 'User';
        }
        
        this.initialize();
    }
    
    initialize() {
        this.updateStats();
        this.displayRecentInterviews();
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            this.createPerformanceChart();
        }, 100);
        this.updateTips();
    }
    
    updateStats() {
        const totalInterviews = this.interviews.length;
        const completedInterviews = this.interviews.filter(i => i.score || (i.scores && i.scores.overall)).length;
        const inProgress = totalInterviews - completedInterviews;
        
        // Calculate average score
        let avgScore = 0;
        if (completedInterviews > 0) {
            let totalScore = 0;
            this.interviews.forEach(interview => {
                if (interview.score) {
                    totalScore += parseInt(interview.score);
                } else if (interview.scores && interview.scores.overall) {
                    totalScore += interview.scores.overall;
                }
            });
            avgScore = Math.round(totalScore / completedInterviews);
        }
        
        const totalElement = document.getElementById('totalInterviews');
        const avgElement = document.getElementById('avgScore');
        const completedElement = document.getElementById('completedInterviews');
        const progressElement = document.getElementById('inProgress');
        
        if (totalElement) totalElement.textContent = totalInterviews;
        if (avgElement) avgElement.textContent = avgScore + '%';
        if (completedElement) completedElement.textContent = completedInterviews;
        if (progressElement) progressElement.textContent = inProgress;
    }
    
    displayRecentInterviews() {
        const interviewsList = document.getElementById('interviewsList');
        
        if (!interviewsList) return;
        
        if (this.interviews.length === 0) {
            interviewsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎯</div>
                    <h3>No interviews yet</h3>
                    <p>Start your first interview to see your progress here!</p>
                    <a href="role-select.html" class="btn-primary pulse">Start First Interview</a>
                </div>
            `;
            return;
        }
        
        // Show last 5 interviews
        const recentInterviews = this.interviews.slice(-5).reverse();
        
        interviewsList.innerHTML = recentInterviews.map(interview => {
            const date = interview.date ? new Date(interview.date).toLocaleDateString() : 'Just now';
            const role = interview.role || interview.jobRole || 'General Interview';
            
            // Get score - check both score and scores formats
            let score = 'In Progress';
            let isCompleted = false;
            
            if (interview.score) {
                score = interview.score + '%';
                isCompleted = true;
            } else if (interview.scores && interview.scores.overall) {
                score = interview.scores.overall + '%';
                isCompleted = true;
            }
            
            return `
                <div class="interview-item">
                    <div>
                        <strong>${role}</strong>
                        <br>
                        <small>${date}</small>
                    </div>
                    <div>
                        ${isCompleted ? 
                            `<span class="score-badge">Score: ${score}</span>` : 
                            `<span class="status-badge in-progress">In Progress</span>`
                        }
                    </div>
                </div>
            `;
        }).join('');
    }
    
    createPerformanceChart() {
        const canvas = document.getElementById('performanceChart');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        // Clear previous chart if exists
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
        
        // Get completed interviews with scores
        const completedInterviews = this.interviews.filter(i => {
            const hasScore = i.score || (i.scores && i.scores.overall);
            return hasScore && i.date; // Ensure date exists
        });
        
        console.log('Completed interviews for chart:', completedInterviews); // Debug log
        
        if (completedInterviews.length === 0) {
            // Create empty chart with placeholder data
            const ctx = canvas.getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Interview Score',
                        data: [null, null, null, null, null, null, null],
                        borderColor: 'rgba(255,255,255,0.5)',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 2,
                        pointBorderColor: 'rgba(255,255,255,0.8)',
                        pointBackgroundColor: 'rgba(255,255,255,0.8)',
                        tension: 0.4,
                        fill: false,
                        spanGaps: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#fff',
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            enabled: true,
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            grid: {
                                color: 'rgba(255,255,255,0.2)',
                                drawBorder: true
                            },
                            ticks: {
                                color: '#fff',
                                stepSize: 20,
                                callback: function(value) {
                                    return value + '%';
                                }
                            },
                            title: {
                                display: true,
                                text: 'Score (%)',
                                color: '#fff'
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(255,255,255,0.2)',
                                drawBorder: true
                            },
                            ticks: {
                                color: '#fff'
                            },
                            title: {
                                display: true,
                                text: 'Day',
                                color: '#fff'
                            }
                        }
                    }
                }
            });
            return;
        }
        
        // Sort interviews by date
        const sortedInterviews = [...completedInterviews].sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });
        
        console.log('Sorted interviews:', sortedInterviews); // Debug log
        
        // Prepare data for chart
        const labels = [];
        const data = [];
        
        sortedInterviews.forEach(interview => {
            // Format date
            const date = new Date(interview.date);
            const formattedDate = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            labels.push(formattedDate);
            
            // Get score
            let score = 0;
            if (interview.score) {
                score = parseInt(interview.score);
            } else if (interview.scores && interview.scores.overall) {
                score = interview.scores.overall;
            }
            data.push(score);
        });
        
        console.log('Chart labels:', labels); // Debug log
        console.log('Chart data:', data); // Debug log
        
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Interview Score',
                    data: data,
                    borderColor: '#4a6cf7',
                    backgroundColor: 'rgba(74, 108, 247, 0.1)',
                    borderWidth: 3,
                    pointBorderColor: '#fff',
                    pointBackgroundColor: '#4a6cf7',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#4a6cf7',
                    pointHoverBorderWidth: 2,
                    tension: 0.3,
                    fill: false,
                    spanGaps: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#fff',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyColor: '#fff',
                        bodyFont: {
                            size: 13
                        },
                        borderColor: '#4a6cf7',
                        borderWidth: 2,
                        callbacks: {
                            label: function(context) {
                                return `Score: ${context.raw}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(255,255,255,0.15)',
                            drawBorder: true,
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#fff',
                            stepSize: 20,
                            callback: function(value) {
                                return value + '%';
                            },
                            font: {
                                size: 11
                            }
                        },
                        title: {
                            display: true,
                            text: 'Score (%)',
                            color: '#fff',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255,255,255,0.15)',
                            drawBorder: true,
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#fff',
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 10
                            }
                        },
                        title: {
                            display: true,
                            text: 'Interview Date & Time',
                            color: '#fff',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
    }
    
    updateTips() {
        const tipsList = document.getElementById('tipsList');
        if (!tipsList) return;
        
        // Calculate average score
        const completedInterviews = this.interviews.filter(i => i.score || (i.scores && i.scores.overall));
        let avgScore = 0;
        
        if (completedInterviews.length > 0) {
            let totalScore = 0;
            completedInterviews.forEach(interview => {
                if (interview.score) {
                    totalScore += parseInt(interview.score);
                } else if (interview.scores && interview.scores.overall) {
                    totalScore += interview.scores.overall;
                }
            });
            avgScore = totalScore / completedInterviews.length;
        }
        
        // Generate personalized tips based on performance
        let tips = [];
        let nextSteps = [];
        
        if (completedInterviews.length === 0) {
            tips = [
                'Start your first interview to get personalized feedback',
                'Choose a role you want to practice for',
                'Take your time and answer naturally'
            ];
            nextSteps = [
                'Click "New Interview" to begin',
                'Select your target job role',
                'Practice with different question types'
            ];
        } else if (avgScore < 60) {
            tips = [
                'Focus on practicing fundamental concepts',
                'Review common interview questions in your field',
                'Work on answer structure and clarity',
                'Practice with the STAR method for behavioral questions'
            ];
            nextSteps = [
                'Take another practice interview this week',
                'Review the feedback from your last interview',
                'Focus on your weakest areas first'
            ];
        } else if (avgScore < 80) {
            tips = [
                'Practice behavioral questions using STAR method',
                'Work on technical vocabulary and explanations',
                'Improve answer structure with concrete examples',
                'Focus on conciseness and clarity'
            ];
            nextSteps = [
                'Try more challenging roles',
                'Practice with mixed interview types',
                'Record yourself to analyze speaking patterns'
            ];
        } else {
            tips = [
                'Great job! Focus on advanced topics',
                'Practice system design and architecture questions',
                'Work on leadership and soft skills scenarios',
                'Help others by sharing your experience'
            ];
            nextSteps = [
                'Try mock interviews for senior positions',
                'Practice with time constraints',
                'Focus on areas that need slight improvement'
            ];
        }
        
        tipsList.innerHTML = `
            <div class="tip-card">
                <h4>🎯 Recommended Focus Areas</h4>
                <ul>
                    ${tips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            </div>
            <div class="tip-card">
                <h4>📈 Next Steps</h4>
                <ul>
                    ${nextSteps.map(step => `<li>${step}</li>`).join('')}
                </ul>
            </div>
        `;
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
    } else {
        new Dashboard();
    }
});

// Logout functionality
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('interviews');
        localStorage.removeItem('interviewHistory');
        window.location.href = 'index.html';
    });
}