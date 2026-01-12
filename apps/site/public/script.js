document.addEventListener('DOMContentLoaded', () => {
    // 1. Smooth Scroll for Navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // 2. The Black Cat Interaction
    const catContainer = document.querySelector('.guardian-cat-container');
    const catEyes = document.querySelectorAll('.cat .eyes .pupil');
    
    if (catContainer) {
        catContainer.addEventListener('click', () => {
            // Create a meow bubble
            const bubble = document.createElement('div');
            bubble.textContent = "Your secrets are safe.";
            bubble.style.position = 'absolute';
            bubble.style.top = '-40px';
            bubble.style.left = '-30px';
            bubble.style.background = '#fff';
            bubble.style.color = '#000';
            bubble.style.padding = '5px 10px';
            bubble.style.borderRadius = '10px';
            bubble.style.fontSize = '12px';
            bubble.style.fontWeight = 'bold';
            bubble.style.pointerEvents = 'none';
            bubble.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            
            catContainer.appendChild(bubble);

            // Change eye color briefly
            catEyes.forEach(eye => eye.style.background = '#ff00ff');

            // Remove after 2 seconds
            setTimeout(() => {
                bubble.remove();
                catEyes.forEach(eye => eye.style.background = ''); // reset
            }, 2000);
        });
    }

    // 3. Simple Intersection Observer for Fade-in effects
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = 1;
                entry.target.style.transform = 'translateY(0)';
            }
        });
    });

    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.style.opacity = 0;
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.6s ease-out';
        observer.observe(card);
    });
});