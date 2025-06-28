function HomePage() {
    const [servers, setServers] = React.useState([]);
    const [isLoadingServers, setIsLoadingServers] = React.useState(true);
    const [isNavigating, setIsNavigating] = React.useState(false);
    const [loadingNavButton, setLoadingNavButton] = React.useState('');
    const [isTokenValidated, setIsTokenValidated] = React.useState(false);
    const [selectedServer, setSelectedServer] = React.useState(null);

    React.useEffect(() => {
        const checkTokenValidity = async () => {
            try {
                const response = await fetch('/api/check/verify-token/', {
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
                console.log('API Response:', data); // Для отладки
                if (data.ok && data.content && Array.isArray(data.content)) {
                    setServers(data.content);
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
                const response = await fetch('/api/check/verify-token/', {
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

        const initializePage = async () => {
            const tokenValid = await checkTokenValidity();
            if (tokenValid) {
                setIsTokenValidated(true);
                fetchServers();
            }
        };

        initializePage();
        
        const intervalId = setInterval(checkTokenValidityPeriodically, 30000);
        return () => clearInterval(intervalId);
    }, []);

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

    const handleLocationLinkClick = (e) => {
        e.preventDefault();
        alert('Transitioning to server location selection or contacts page...');
    };

    const handleServerGoTo = (serverId) => {
        window.location.href = `/servers/${serverId}/`;
    };

    if (!isTokenValidated || isLoadingServers) {
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
            }, !isTokenValidated ? 'Проверка токена...' : 'Загрузка серверов...')
        ]);
    }

    return React.createElement('div', {
        className: 'page-content',
        style: {
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px 20px'
        }
    }, [
        // Page Transition Overlay
        React.createElement('div', {
            key: 'overlay',
            className: `page-transition-overlay ${isNavigating ? 'active' : ''}`,
        }, React.createElement('div', null, [
            React.createElement('div', {
                key: 'spinner',
                className: 'loading-spinner'
            }),
            React.createElement('div', {
                key: 'text',
                className: 'loading-text'
            }, 'Переход на страницу...')
        ])),

        // Navigation
        React.createElement('nav', {
            key: 'nav',
            style: {
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
                marginBottom: '64px'
            }
        }, ['dashboard', 'servers', 'account'].map(page => 
            React.createElement('button', {
                key: page,
                onClick: () => handleNavigation(page),
                disabled: isNavigating,
                className: `nav-button ${page === 'servers' ? 'active' : ''} ${loadingNavButton === page ? 'loading' : ''}`,
                style: {
                    opacity: isNavigating && loadingNavButton !== page ? 0.5 : 1
                }
            }, page.charAt(0).toUpperCase() + page.slice(1))
        )),

        // Server Grid
        React.createElement('div', {
            key: 'servers',
            style: {
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                maxWidth: '1200px'
            }
        }, servers.length > 0 ? 
            React.createElement('div', {
                style: {
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '24px',
                    width: '100%'
                }
            }, servers.map(server => 
                React.createElement('div', {
                    key: server.id,
                    className: 'server-card',
                    style: {
                        width: '280px',
                        minHeight: '320px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }
                }, [
                    // Server Flag
                    React.createElement('div', {
                        key: 'flag',
                        style: {
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: '16px'
                        }
                    }, React.createElement('img', {
                        src: server.image_url,
                        alt: server.server_location + ' flag',
                        style: {
                            width: '48px',
                            height: '36px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: '2px solid rgba(255, 255, 255, 0.2)'
                        },
                        onError: (e) => {
                            e.target.style.display = 'none';
                        }
                    })),

                    // Server Name
                    React.createElement('h3', {
                        key: 'name',
                        style: {
                            marginBottom: '12px',
                        }
                    }, server.name),

                    // Server Details
                    React.createElement('div', {
                        key: 'details',
                        style: { marginBottom: '16px', fontSize: '14px', flex: 1 }
                    }, [
                        React.createElement('p', {
                            key: 'location',
                            style: { margin: '6px 0' }
                        }, `Location: ${server.server_location}`),
                        React.createElement('p', {
                            key: 'provider',
                            style: { margin: '6px 0' }
                        }, `Provider: ${server.provider}`),
                        React.createElement('p', {
                            key: 'bandwidth',
                            style: { color: '#00b7ff', margin: '6px 0' }
                        }, `Bandwidth: ${server.networks_bandwidth} Mbps`),
                        React.createElement('p', {
                            key: 'status',
                            style: { margin: '6px 0' }
                        }, [
                            'Status: ',
                            React.createElement('span', {
                                key: 'status-text',
                                style: { 
                                    color: server.status === 'Online' ? '#22c55e' : '#ef4444',
                                    fontWeight: 'bold'
                                }
                            }, server.status)
                        ]),
                        React.createElement('p', {
                            key: 'ip',
                            style: { color: '#ccc', margin: '6px 0', fontSize: '12px', fontFamily: 'monospace' }
                        }, `IP: ${server.ipv4}`)
                    ]),

                    // Go To Button
                    React.createElement('button', {
                        key: 'goto',
                        onClick: () => handleServerGoTo(server.id),
                        className: 'form-button',
                        style: {
                            marginTop: 'auto',
                            opacity: server.status === 'Online' ? 1 : 0.5,
                            cursor: server.status === 'Online' ? 'pointer' : 'not-allowed',
                        },
                        disabled: server.status !== 'Online'
                    }, server.status === 'Online' ? 'Перейти' : 'Offline')
                ])
            )) : 
            React.createElement('div', {
                className: 'loading-container'
            }, [
                React.createElement('div', {
                    key: 'icon',
                    style: {
                        width: '96px',
                        height: '96px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px',
                        fontSize: '48px',
                        color: '#666'
                    }
                }, '🖥️'),
                React.createElement('p', {
                    key: 'text',
                    style: { color: '#666', fontSize: '20px' }
                }, 'No servers available.')
            ])
        ),

        // Bottom Link
        React.createElement('div', {
            key: 'bottom',
            style: {
                textAlign: 'center',
                marginTop: '64px'
            }
        }, React.createElement('a', {
            href: '#',
            onClick: handleLocationLinkClick,
            className: 'location-link'
        }, 'Не устраивает локация серверов ?'))
    ]);
}

ReactDOM.render(React.createElement(HomePage), document.getElementById('root'));