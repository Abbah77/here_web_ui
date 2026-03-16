// Path: here-social/js/utils/animations.js

/**
 * Animation Utilities
 */

// Fade in element
function fadeIn(element, duration = 300) {
    element.style.opacity = 0;
    element.style.display = 'block';
    
    let start = null;
    
    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const opacity = Math.min(progress / duration, 1);
        
        element.style.opacity = opacity;
        
        if (progress < duration) {
            window.requestAnimationFrame(step);
        }
    }
    
    window.requestAnimationFrame(step);
}

// Fade out element
function fadeOut(element, duration = 300) {
    let start = null;
    
    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const opacity = Math.max(1 - progress / duration, 0);
        
        element.style.opacity = opacity;
        
        if (progress < duration) {
            window.requestAnimationFrame(step);
        } else {
            element.style.display = 'none';
        }
    }
    
    window.requestAnimationFrame(step);
}

// Slide down
function slideDown(element, duration = 300) {
    element.style.height = '0';
    element.style.overflow = 'hidden';
    element.style.display = 'block';
    
    const targetHeight = element.scrollHeight;
    
    let start = null;
    
    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const height = Math.min((progress / duration) * targetHeight, targetHeight);
        
        element.style.height = height + 'px';
        
        if (progress < duration) {
            window.requestAnimationFrame(step);
        } else {
            element.style.height = '';
            element.style.overflow = '';
        }
    }
    
    window.requestAnimationFrame(step);
}

// Slide up
function slideUp(element, duration = 300) {
    const startHeight = element.offsetHeight;
    
    element.style.height = startHeight + 'px';
    element.style.overflow = 'hidden';
    
    let start = null;
    
    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const height = Math.max(startHeight - (progress / duration) * startHeight, 0);
        
        element.style.height = height + 'px';
        
        if (progress < duration) {
            window.requestAnimationFrame(step);
        } else {
            element.style.display = 'none';
            element.style.height = '';
            element.style.overflow = '';
        }
    }
    
    window.requestAnimationFrame(step);
}

// Scale in
function scaleIn(element, duration = 300) {
    element.style.transform = 'scale(0)';
    element.style.display = 'block';
    
    let start = null;
    
    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const scale = Math.min(progress / duration, 1);
        
        element.style.transform = `scale(${scale})`;
        
        if (progress < duration) {
            window.requestAnimationFrame(step);
        }
    }
    
    window.requestAnimationFrame(step);
}

// Scale out
function scaleOut(element, duration = 300) {
    let start = null;
    
    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const scale = Math.max(1 - progress / duration, 0);
        
        element.style.transform = `scale(${scale})`;
        
        if (progress < duration) {
            window.requestAnimationFrame(step);
        } else {
            element.style.display = 'none';
        }
    }
    
    window.requestAnimationFrame(step);
}

// Pulse animation
function pulse(element, duration = 1000) {
    element.style.animation = `pulse ${duration}ms ease-in-out`;
    
    element.addEventListener('animationend', () => {
        element.style.animation = '';
    }, { once: true });
}

// Shake animation
function shake(element) {
    element.style.animation = 'shake 0.5s ease-in-out';
    
    element.addEventListener('animationend', () => {
        element.style.animation = '';
    }, { once: true });
}

// Bounce animation
function bounce(element) {
    element.style.animation = 'bounce 1s ease infinite';
}

// Typing animation
function createTypingAnimation(container) {
    const dots = ['', '.', '..', '...'];
    let index = 0;
    
    return setInterval(() => {
        index = (index + 1) % dots.length;
        container.textContent = dots[index];
    }, 500);
}

// Animate counter
function animateCounter(element, start, end, duration = 1000) {
    const range = end - start;
    const increment = range / (duration / 10);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        
        element.textContent = Math.round(current);
    }, 10);
}

// Parallax scroll
function parallax(element, speed = 0.5) {
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        element.style.transform = `translateY(${scrollY * speed}px)`;
    });
}

// Sticky header on scroll
function stickyHeader(header, threshold = 100) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > threshold) {
            header.classList.add('sticky');
        } else {
            header.classList.remove('sticky');
        }
    });
}

// Infinite scroll
function setupInfiniteScroll(container, loadMore, threshold = 200) {
    const onScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        
        if (scrollHeight - scrollTop - clientHeight < threshold) {
            loadMore();
        }
    };
    
    container.addEventListener('scroll', onScroll);
    
    return () => container.removeEventListener('scroll', onScroll);
}

// Smooth scroll to element
function smoothScrollTo(element, offset = 0, duration = 500) {
    const targetY = element.getBoundingClientRect().top + window.pageYOffset - offset;
    const startY = window.pageYOffset;
    const distance = targetY - startY;
    let startTime = null;

    function step(currentTime) {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const ease = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        window.scrollTo(0, startY + distance * ease);
        
        if (elapsed < duration) {
            window.requestAnimationFrame(step);
        }
    }

    window.requestAnimationFrame(step);
}

// Add animation classes
const animations = {
    fadeIn: 'fade-in',
    fadeOut: 'fade-out',
    slideIn: 'slide-in',
    slideOut: 'slide-out',
    zoomIn: 'zoom-in',
    zoomOut: 'zoom-out',
    flip: 'flip',
    rotate: 'rotate',
    bounce: 'bounce',
    shake: 'shake',
    pulse: 'pulse'
};

// Inject keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
    }
    
    @keyframes slideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    .fade-in {
        animation: fadeIn 0.3s ease;
    }
    
    .slide-in {
        animation: slideIn 0.3s ease;
    }
`;

document.head.appendChild(style);