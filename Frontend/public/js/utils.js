// Utility functions for HRIM Frontend

export function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

export function formatTime(date) {
    return new Date(date).toLocaleTimeString();
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

export function showNotification(message, type = 'info') {
    // Basic notification function
    console.log(`${type.toUpperCase()}: ${message}`);
}

console.log('Utils module loaded successfully');
