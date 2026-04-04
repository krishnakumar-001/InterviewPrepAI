// Scroll Animation - Cards ek ek karke visible honge
document.addEventListener('DOMContentLoaded', function() {
    
    // Function to check if element is in viewport
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight * 0.8) && 
            rect.bottom >= 0
        );
    }
    
    // Function to handle scroll animations
    function handleScrollAnimations() {
        // Animate feature cards
        document.querySelectorAll('.feature-card').forEach(card => {
            if (isInViewport(card) && !card.classList.contains('visible')) {
                card.classList.add('visible');
            }
        });
        
        // Animate steps in How It Works section
        document.querySelectorAll('.step').forEach(step => {
            if (isInViewport(step) && !step.classList.contains('visible')) {
                step.classList.add('visible');
            }
        });
    }
    
    // Initial check after small delay
    setTimeout(handleScrollAnimations, 200);
    
    // Check on scroll
    window.addEventListener('scroll', handleScrollAnimations);
});