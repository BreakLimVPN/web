function DashboardPage() {
    const [isNavigating, setIsNavigating] = React.useState(false);
    const [loadingNavButton, setLoadingNavButton] = React.useState('');
    const [isTokenValidated, setIsTokenValidated] = React.useState(false);

    React.useEffect(() => {
        const checkTokenValidity = async () => {
            try {
                const response = await fetch('/api/check/verify-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({})
                });

                if (!response.ok) {
                    console.log('Initial check: token invalid or missing, redirecting to /');
                    window.location.href = '/';
                    return false;
                }

                const data = await response.json();
                if (!data.content?.accepted) {
                    console.log('Initial check: server reported token invalid, redirecting to /');
                    window.location.href = '/';
                    return false;
                }
                console.log('Initial check: token is valid.');
                return true;
            } catch (error) {
                console.error('Error during initial token check:', error);
                window.location.href = '/';
                return false;
            }
        };

        const checkTokenValidityPeriodically = async () => {
            try {
                const response = await fetch('/api/check/verify-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({})
                });

                if (!response.ok) {
                    console.log('Periodic check: token invalid or missing, redirecting to /');
                    window.location.href = '/';
                    return;
                }

                const data = await response.json();
                if (!data.content?.accepted) {
                    console.log('Periodic check: server reported token invalid, redirecting to /');
                    window.location.href = '/';
                    return;
                }
                console.log('Periodic check: token is valid.');
            } catch (error) {
                console.error('Error during periodic token check:', error);
                window.location.href = '/';
            }
        };

        // Проверяем токен при загрузке страницы
        const initializePage = async () => {
            const tokenValid = await checkTokenValidity();
            if (tokenValid) {
                setIsTokenValidated(true);
            }
        };

        initializePage();
        
        // Устанавливаем периодическую проверку каждые 30 секунд
        const intervalId = setInterval(checkTokenValidityPeriodically, 30000);
        return () => clearInterval(intervalId);
    }, []);

    if (!isTokenValidated) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-dots">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                </div>
                <div className="loading-text">Проверка токена...</div>
            </div>
        );
    }

    const handleNavigation = (page) => {
        if (isNavigating) return;
        
        setIsNavigating(true);
        setLoadingNavButton(page);
        
        setTimeout(() => {
            switch(page) {
                case 'dashboard':
                    window.location.href = '/dashboard/';
                    break;
                case 'servers':
                    window.location.href = '/home/';
                    break;
                case 'account':
                    window.location.href = '/self/';
                    break;
            }
        }, 300);
    };

    return (
        <div className="page-content">
            {/* Page Transition Overlay */}
            <div className={`page-transition-overlay ${isNavigating ? 'active' : ''}`}>
                <div>
                    <div className="loading-spinner"></div>
                    <div className="loading-dots">
                        <div className="loading-dot"></div>
                        <div className="loading-dot"></div>
                        <div className="loading-dot"></div>
                    </div>
                    <div className="loading-text">Переход на страницу...</div>
                </div>
            </div>

            <div className="flex flex-col items-center justify-between min-h-screen p-8">
                {/* Top Navigation */}
                <div className="flex justify-center space-x-6 w-full mt-8">
                    <button 
                        className={`nav-button active ${loadingNavButton === 'dashboard' ? 'loading' : ''}`}
                        onClick={() => handleNavigation('dashboard')}
                        disabled={isNavigating}
                    >
                        Dashboard
                    </button>
                    <button 
                        className={`nav-button ${loadingNavButton === 'servers' ? 'loading' : ''}`}
                        onClick={() => handleNavigation('servers')}
                        disabled={isNavigating}
                    >
                        Servers
                    </button>
                    <button 
                        className={`nav-button ${loadingNavButton === 'account' ? 'loading' : ''}`}
                        onClick={() => handleNavigation('account')}
                        disabled={isNavigating}
                    >
                        Account
                    </button>
                </div>

                {/* Dashboard Content - Empty for now */}
                <div className="dashboard-container">
                    <h1 className="text-4xl font-bold text-green-400 mb-8">Dashboard</h1>
                    <div className="dashboard-placeholder">
                        Содержимое дашборда будет добавлено позже
                    </div>
                </div>

                {/* Bottom spacing */}
                <div></div>
            </div>
        </div>
    );
}

ReactDOM.render(<DashboardPage />, document.getElementById('root'));