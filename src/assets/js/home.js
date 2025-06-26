function HomePage() {
    const [servers, setServers] = React.useState([]);
    const [isLoadingServers, setIsLoadingServers] = React.useState(true);
    const [isNavigating, setIsNavigating] = React.useState(false);
    const [loadingNavButton, setLoadingNavButton] = React.useState('');

    React.useEffect(() => {
        const fetchServers = async () => {
            setIsLoadingServers(true);
            try {
                const response = await fetch('/api/servers/');
                if (!response.ok) {
                    console.error('Failed to fetch servers:', response.statusText);
                    setServers([]);
                    return;
                }
                const data = await response.json();
                if (data.ok && data.content && Array.isArray(data.content.vpn_servers)) {
                    setServers(data.content.vpn_servers);
                } else {
                    console.error('Unexpected API response structure:', data);
                    setServers([]);
                }
            } catch (error) {
                console.error('Error fetching servers:', error);
                setServers([]);
            } finally {
                setIsLoadingServers(false);
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
                if (!data.content.accepted) {
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

        fetchServers();
        const intervalId = setInterval(checkTokenValidityPeriodically, 30000);
        return () => clearInterval(intervalId);
    }, []);

    const handleNavigation = (page) => {
        if (isNavigating) return; // Prevent multiple clicks
        
        setIsNavigating(true);
        setLoadingNavButton(page);
        
        // Add a small delay to show the loading animation
        setTimeout(() => {
            switch(page) {
                case 'dashboard':
                    window.location.href = '/dashboard/';
                    break;
                case 'servers':
                    // Остаемся на текущей странице или редирект на /home/
                    window.location.href = '/home/';
                    break;
                case 'account':
                    window.location.href = '/self/';
                    break;
            }
        }, 300);
    };

    const handleLocationLinkClick = (e) => {
        e.preventDefault();
        alert('Transitioning to server location selection or contacts page...');
    };

    if (isLoadingServers) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-dots">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                </div>
                <div className="loading-text">Загрузка серверов...</div>
            </div>
        );
    }

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
                        className={`nav-button ${loadingNavButton === 'dashboard' ? 'loading' : ''}`}
                        onClick={() => handleNavigation('dashboard')}
                        disabled={isNavigating}
                    >
                        Dashboard
                    </button>
                    <button 
                        className={`nav-button active ${loadingNavButton === 'servers' ? 'loading' : ''}`}
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

                {/* Central Server Display */}
                <div className="flex flex-wrap justify-center my-auto">
                    {servers.length > 0 ? (
                        servers.map(server => (
                            <div key={server.id} className="server-card">
                                <h3>{server.name}</h3>
                                <p>Location: {server.location}</p>
                                <p>Provider: {server.provider}</p>
                                <p>Status: <span className={server.status === 'Online' ? 'text-green-500' : 'text-red-500'}>{server.status}</span></p>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400 text-lg">No servers available.</p>
                    )}
                </div>

                {/* Bottom Link */}
                <div className="text-center">
                    <a href="#" onClick={handleLocationLinkClick} className="location-link">
                        Не устраивает локация серверов ?
                    </a>
                </div>
            </div>
        </div>
    );
}

ReactDOM.render(<HomePage />, document.getElementById('root'));