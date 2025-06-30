// Common JavaScript utilities and helpers

// API utilities
const ApiUtils = {
  // Base API request with error handling
  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      return { response, ok: response.ok };
    } catch (error) {
      console.error('API request failed:', error);
      return { response: null, ok: false, error };
    }
  },

  // Token validation
  async verifyToken() {
    const { response, ok } = await this.request('/api/check/verify-token/', {
      method: 'POST',
      body: JSON.stringify({})
    });

    if (!ok) {
      console.log('Token invalid, redirecting to /');
      window.location.href = '/';
      return false;
    }

    const data = await response.json();
    if (!data.content?.accepted) {
      console.log('Server reported token invalid, redirecting to /');
      window.location.href = '/';
      return false;
    }
    
    return true;
  },

  // User authorization check
  async checkUserAuth() {
    const { response, ok } = await this.request('/api/users/self/');

    if (!ok) {
      console.log('User not authorized, redirecting to /self/');
      window.location.href = '/self/?message=Требуется войти';
      return false;
    }

    const data = await response.json();
    if (!data.ok || !data.content) {
      console.log('User data invalid, redirecting to /self/');
      window.location.href = '/self/?message=Требуется войти';
      return false;
    }
    
    return true;
  }
};

// Navigation utilities
const NavigationUtils = {
  // Handle page navigation with loading state
  navigate(page, setNavigating, setLoadingButton) {
    if (setNavigating) setNavigating(true);
    if (setLoadingButton) setLoadingButton(page);
    
    // Add haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    setTimeout(() => {
      const routes = {
        dashboard: '/dashboard/',
        servers: '/home/',
        account: '/self/',
        home: '/home/'
      };
      
      window.location.href = routes[page] || '/';
    }, 300);
  }
};

// Notification utilities
const NotificationUtils = {
  // Create notification element (React)
  createNotification(type, message, onClose) {
    return React.createElement('div', {
      key: `notification-${Date.now()}`,
      className: `notification ${type}`,
      onClick: onClose
    }, [
      React.createElement('span', {
        key: 'icon',
        style: { fontSize: '20px', flexShrink: 0 }
      }, type === 'error' ? '⚠️' : '✅'),
      React.createElement('span', {
        key: 'message',
        style: { flex: 1 }
      }, message),
      React.createElement('button', {
        key: 'close',
        onClick: onClose,
        className: 'notification-close'
      }, '×')
    ]);
  },

  // Auto-clear notifications
  setupAutoClearing(error, success, clearFn, delay = 5000) {
    React.useEffect(() => {
      if (error || success) {
        const timer = setTimeout(clearFn, delay);
        return () => clearTimeout(timer);
      }
    }, [error, success]);
  }
};

// Form utilities
const FormUtils = {
  // Handle input changes
  createInputHandler(setFormData) {
    return (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    };
  },

  // Validate form data
  validateRequired(data, requiredFields) {
    const errors = {};
    
    requiredFields.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
        errors[field] = 'Это поле обязательно';
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Validate email
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};

// Loading utilities
const LoadingUtils = {
  // Create loading component (React)
  createLoadingSpinner(text = 'Загрузка...') {
    return React.createElement('div', {
      className: 'loading-container'
    }, [
      React.createElement('div', { 
        key: 'spinner', 
        className: 'loading-spinner' 
      }),
      React.createElement('div', { 
        key: 'text', 
        className: 'loading-text' 
      }, text)
    ]);
  },

  // Create inline spinner
  createInlineSpinner() {
    return React.createElement('div', {
      className: 'spinner-sm'
    });
  }
};

// File download utilities
const FileUtils = {
  // Download file from blob
  downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Get file extension from protocol
  getConfigExtension(protocol) {
    const extensions = {
      'amneziawg': 'conf',
      'xray': 'json',
      'wireguard': 'conf'
    };
    return extensions[protocol] || 'conf';
  }
};

// Local storage utilities
const StorageUtils = {
  // Set item with error handling
  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  },

  // Get item with error handling
  getItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue;
    }
  },

  // Remove item
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
      return false;
    }
  }
};

// Date utilities
const DateUtils = {
  // Format date for display
  formatDate(date, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Intl.DateTimeFormat('ru-RU', {
      ...defaultOptions,
      ...options
    }).format(new Date(date));
  },

  // Get relative time (e.g., "2 hours ago")
  getRelativeTime(date) {
    const now = new Date();
    const target = new Date(date);
    const diffMs = now - target;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    
    return DateUtils.formatDate(date, { 
      month: 'short', 
      day: 'numeric' 
    });
  }
};

// Device utilities
const DeviceUtils = {
  // Check if mobile device
  isMobile() {
    return window.innerWidth <= 768;
  },

  // Check if touch device
  isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  // Add haptic feedback
  hapticFeedback(pattern = 100) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  },

  // Get device info
  getDeviceInfo() {
    return {
      isMobile: this.isMobile(),
      isTouch: this.isTouchDevice(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language
    };
  }
};

// Debounce utility
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle utility
const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Error handling utilities
const ErrorUtils = {
  // Parse API error response
  async parseApiError(response) {
    let errorMessage = 'Произошла ошибка';
    
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch (parseError) {
      // If JSON parsing fails, use status-based messages
      switch (response.status) {
        case 400:
          errorMessage = 'Неверные параметры запроса';
          break;
        case 401:
          errorMessage = 'Требуется авторизация';
          break;
        case 403:
          errorMessage = 'Доступ запрещен';
          break;
        case 404:
          errorMessage = 'Ресурс не найден';
          break;
        case 500:
          errorMessage = 'Внутренняя ошибка сервера';
          break;
        default:
          errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
      }
    }
    
    return errorMessage;
  },

  // Handle network errors
  handleNetworkError(error) {
    console.error('Network error:', error);
    return 'Ошибка сети. Проверьте подключение к интернету.';
  }
};

// Interval management utilities
const IntervalUtils = {
  // Create interval manager
  createManager() {
    const intervals = {};
    
    return {
      set(key, callback, delay) {
        this.clear(key);
        intervals[key] = setInterval(callback, delay);
      },
      
      clear(key) {
        if (intervals[key]) {
          clearInterval(intervals[key]);
          delete intervals[key];
        }
      },
      
      clearAll() {
        Object.values(intervals).forEach(clearInterval);
        Object.keys(intervals).forEach(key => delete intervals[key]);
      }
    };
  }
};

// Export utilities for use in other files
if (typeof window !== 'undefined') {
  window.VpnUtils = {
    ApiUtils,
    NavigationUtils,
    NotificationUtils,
    FormUtils,
    LoadingUtils,
    FileUtils,
    StorageUtils,
    DateUtils,
    DeviceUtils,
    ErrorUtils,
    IntervalUtils,
    debounce,
    throttle
  };
} 