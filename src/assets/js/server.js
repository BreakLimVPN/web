function ServerPage() {
    const [server, setServer] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [isDownloadingConfig, setIsDownloadingConfig] = React.useState(false);
    const [isTokenValidated, setIsTokenValidated] = React.useState(false);
    const [isUserAuthorized, setIsUserAuthorized] = React.useState(false);
    const [isNavigating, setIsNavigating] = React.useState(false);
    const [loadingNavButton, setLoadingNavButton] = React.useState('');
    const [clients, setClients] = React.useState([]);
    const [clientStats, setClientStats] = React.useState({
        total: 0,
        online: 0,
        totalSpeed: 0,
        avgSpeed: 0
    });

    const serverId = window.SERVER_ID;

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

        const checkUserAuthorization = async () => {
            try {
                const response = await fetch('/api/users/self/', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (!response.ok) {
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
                console.log('User is authorized.');
                return true;
            } catch (error) {
                console.error('Error during user authorization check:', error);
                window.location.href = '/self/?message=Требуется войти';
                return false;
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

        const fetchServerData = async () => {
            try {
                const response = await fetch(`/api/servers/${serverId}/`);
                if (!response.ok) {
                    throw new Error('Failed to fetch server data');
                }
                const data = await response.json();
                if (data.ok && data.content) {
                    setServer(data.content);
                } else {
                    throw new Error(data.message || 'Server not found');
                }
            } catch (error) {
                console.error('Error fetching server data:', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchClientData = async () => {
            try {
                // Mock client data - replace with actual API call
                const mockClients = [
                    { id: 1, name: 'Client 1', ip: '192.168.1.100', speed: 2.5, uptime: '2h 15m', status: 'online' },
                    { id: 2, name: 'Client 2', ip: '192.168.1.101', speed: 1.8, uptime: '1h 45m', status: 'online' },
                    { id: 3, name: 'Client 3', ip: '192.168.1.102', speed: 0, uptime: '0m', status: 'offline' },
                    { id: 4, name: 'Client 4', ip: '192.168.1.103', speed: 3.2, uptime: '4h 30m', status: 'online' },
                    { id: 5, name: 'Client 5', ip: '192.168.1.104', speed: 1.1, uptime: '30m', status: 'online' }
                ];
                
                setClients(mockClients);
                
                const onlineClients = mockClients.filter(c => c.status === 'online');
                const totalSpeed = onlineClients.reduce((sum, c) => sum + c.speed, 0);
                
                setClientStats({
                    total: mockClients.length,
                    online: onlineClients.length,
                    totalSpeed: totalSpeed,
                    avgSpeed: onlineClients.length > 0 ? (totalSpeed / onlineClients.length).toFixed(1) : 0
                });
            } catch (error) {
                console.error('Error fetching client data:', error);
            }
        };

        const initializePage = async () => {
            const tokenValid = await checkTokenValidity();
            if (tokenValid) {
                setIsTokenValidated(true);
                const userAuthorized = await checkUserAuthorization();
                if (userAuthorized) {
                    setIsUserAuthorized(true);
                    await Promise.all([fetchServerData(), fetchClientData()]);
                }
            }
        };

        initializePage();
        
        // Устанавливаем периодическую проверку токена каждые 30 секунд
        const intervalId = setInterval(checkTokenValidityPeriodically, 30000);
        return () => clearInterval(intervalId);
    }, [serverId]);

    const handleDownloadConfig = async () => {
        if (!server || server.status !== 'Online' || !isUserAuthorized) return;
        
        setIsDownloadingConfig(true);
        
        try {
            const response = await fetch(`/api/servers/config/?id=${serverId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Не удалось получить конфигурацию сервера');
            }

            const configData = await response.blob();
            
            const url = window.URL.createObjectURL(configData);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${server.name || 'server'}_config.ovpn`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            console.log('Конфигурация успешно скачана');
        } catch (error) {
            console.error('Ошибка при скачивании конфигурации:', error);
            setError('Не удалось скачать конфигурацию сервера');
        } finally {
            setIsDownloadingConfig(false);
        }
    };

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

    if (!isTokenValidated || !isUserAuthorized || isLoading) {
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
            }, !isTokenValidated ? 'Проверка токена...' : !isUserAuthorized ? 'Проверка авторизации...' : 'Загрузка данных сервера...')
        ]);
    }

    if (error) {
        return React.createElement('div', {
            style: {
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
            }
        }, React.createElement('div', {
            className: 'server-error',
            style: {
                textAlign: 'center',
                padding: '40px',
                maxWidth: '500px'
            }
        }, [
            React.createElement('div', {
                key: 'icon',
                style: { fontSize: '4rem', marginBottom: '20px' }
            }, '⚠️'),
            React.createElement('h3', {
                key: 'title',
                style: { marginBottom: '15px', fontSize: '1.5rem' }
            }, 'Ошибка'),
            React.createElement('p', {
                key: 'message',
                style: { marginBottom: '20px', opacity: 0.8 }
            }, error),
            React.createElement('button', {
                key: 'back',
                onClick: () => window.location.href = '/home/',
                className: 'form-button',
                style: { marginTop: '10px' }
            }, 'Вернуться к серверам')
        ]));
    }

    return React.createElement('div', {
        className: 'server-page'
    }, [
        // Header
        React.createElement('header', {
            key: 'header',
            className: 'server-header'
        }, React.createElement('div', {
            className: 'server-header-content'
        }, [
            React.createElement('div', {
                key: 'title-section',
                className: 'server-title-section'
            }, [
                React.createElement('img', {
                    key: 'flag',
                    src: server.image_url,
                    alt: server.server_location + ' flag',
                    className: 'server-flag',
                    onError: (e) => {
                        e.target.style.display = 'none';
                    }
                }),
                React.createElement('h1', {
                    key: 'title',
                    className: 'server-title'
                }, server.name),
                React.createElement('div', {
                    key: 'status',
                    className: 'server-status-badge'
                }, [
                    React.createElement('div', {
                        key: 'dot',
                        className: `status-dot ${server.status === 'Online' ? 'online' : 'offline'}`
                    }),
                    React.createElement('span', {
                        key: 'text',
                        className: 'status-text'
                    }, server.status)
                ])
            ]),
            React.createElement('div', {
                key: 'actions',
                className: 'server-actions'
            }, [
                React.createElement('button', {
                    key: 'download',
                    onClick: handleDownloadConfig,
                    disabled: server.status !== 'Online' || isDownloadingConfig || !isUserAuthorized,
                    className: 'server-btn primary'
                }, isDownloadingConfig ? [
                    React.createElement('div', {
                        key: 'spinner',
                        className: 'button-spinner'
                    }),
                    'Скачивание...'
                ] : [
                    React.createElement('span', { key: 'icon' }, '📥'),
                    'Скачать конфиг'
                ]),
                React.createElement('a', {
                    key: 'back',
                    href: '/home/',
                    className: 'server-btn secondary'
                }, [
                    React.createElement('span', { key: 'icon' }, '←'),
                    'К серверам'
                ])
            ])
        ])),

        // Navigation
        React.createElement('nav', {
            key: 'nav',
            style: {
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
                padding: '24px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
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

        // Main Content
        React.createElement('main', {
            key: 'content',
            className: 'server-content'
        }, [
            // Server Grid
            React.createElement('div', {
                key: 'grid',
                className: 'server-grid'
            }, [
                // Server Info Card
                React.createElement('div', {
                    key: 'info',
                    className: 'server-info-card'
                }, [
                    React.createElement('h2', {
                        key: 'title',
                        className: 'card-title'
                    }, [
                        React.createElement('span', { key: 'icon' }, '🖥️'),
                        'Информация о сервере'
                    ]),
                    React.createElement('div', {
                        key: 'info-grid',
                        className: 'info-grid'
                    }, [
                        React.createElement('div', {
                            key: 'location',
                            className: 'info-item'
                        }, [
                            React.createElement('span', {
                                key: 'label',
                                className: 'info-label'
                            }, 'Локация'),
                            React.createElement('span', {
                                key: 'value',
                                className: 'info-value'
                            }, server.server_location)
                        ]),
                        React.createElement('div', {
                            key: 'ip',
                            className: 'info-item'
                        }, [
                            React.createElement('span', {
                                key: 'label',
                                className: 'info-label'
                            }, 'IP Адрес'),
                            React.createElement('span', {
                                key: 'value',
                                className: 'info-value ip'
                            }, server.ipv4)
                        ]),
                        React.createElement('div', {
                            key: 'provider',
                            className: 'info-item'
                        }, [
                            React.createElement('span', {
                                key: 'label',
                                className: 'info-label'
                            }, 'Провайдер'),
                            React.createElement('span', {
                                key: 'value',
                                className: 'info-value'
                            }, server.provider)
                        ]),
                        React.createElement('div', {
                            key: 'bandwidth',
                            className: 'info-item'
                        }, [
                            React.createElement('span', {
                                key: 'label',
                                className: 'info-label'
                            }, 'Пропускная способность'),
                            React.createElement('span', {
                                key: 'value',
                                className: 'info-value bandwidth'
                            }, `${server.networks_bandwidth} Mbps`)
                        ])
                    ])
                ]),

                // Clients Statistics Card
                React.createElement('div', {
                    key: 'clients',
                    className: 'clients-card'
                }, [
                    React.createElement('h2', {
                        key: 'title',
                        className: 'card-title'
                    }, [
                        React.createElement('span', { key: 'icon' }, '👥'),
                        'Клиенты сервера'
                    ]),
                    React.createElement('div', {
                        key: 'stats',
                        className: 'stats-grid'
                    }, [
                        React.createElement('div', {
                            key: 'total',
                            className: 'stat-item'
                        }, [
                            React.createElement('div', {
                                key: 'value',
                                className: 'stat-value'
                            }, clientStats.total),
                            React.createElement('div', {
                                key: 'label',
                                className: 'stat-label'
                            }, 'Всего')
                        ]),
                        React.createElement('div', {
                            key: 'online',
                            className: 'stat-item'
                        }, [
                            React.createElement('div', {
                                key: 'value',
                                className: 'stat-value'
                            }, clientStats.online),
                            React.createElement('div', {
                                key: 'label',
                                className: 'stat-label'
                            }, 'Онлайн')
                        ]),
                        React.createElement('div', {
                            key: 'total-speed',
                            className: 'stat-item'
                        }, [
                            React.createElement('div', {
                                key: 'value',
                                className: 'stat-value'
                            }, `${clientStats.totalSpeed} MB/s`),
                            React.createElement('div', {
                                key: 'label',
                                className: 'stat-label'
                            }, 'Общая скорость')
                        ]),
                        React.createElement('div', {
                            key: 'avg-speed',
                            className: 'stat-item'
                        }, [
                            React.createElement('div', {
                                key: 'value',
                                className: 'stat-value'
                            }, `${clientStats.avgSpeed} MB/s`),
                            React.createElement('div', {
                                key: 'label',
                                className: 'stat-label'
                            }, 'Средняя скорость')
                        ])
                    ]),
                    React.createElement('div', {
                        key: 'list',
                        className: 'clients-list'
                    }, clients.map(client => 
                        React.createElement('div', {
                            key: client.id,
                            className: 'client-item'
                        }, [
                            React.createElement('div', {
                                key: 'info',
                                className: 'client-info'
                            }, [
                                React.createElement('div', {
                                    key: 'avatar',
                                    className: 'client-avatar'
                                }, client.name.charAt(0)),
                                React.createElement('div', {
                                    key: 'details',
                                    className: 'client-details'
                                }, [
                                    React.createElement('h4', {
                                        key: 'name'
                                    }, client.name),
                                    React.createElement('p', {
                                        key: 'ip'
                                    }, client.ip)
                                ])
                            ]),
                            React.createElement('div', {
                                key: 'stats',
                                className: 'client-stats'
                            }, [
                                React.createElement('div', {
                                    key: 'speed',
                                    className: 'client-speed'
                                }, `${client.speed} MB/s`),
                                React.createElement('div', {
                                    key: 'uptime',
                                    className: 'client-uptime'
                                }, client.uptime)
                            ])
                        ])
                    ))
                ])
            ])
        ])
    ]);
}

ReactDOM.render(React.createElement(ServerPage), document.getElementById('root'));
