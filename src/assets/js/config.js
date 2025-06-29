function ConfigPage() {
    const [server, setServer] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [isTokenValidated, setIsTokenValidated] = React.useState(false);
    const [isUserAuthorized, setIsUserAuthorized] = React.useState(false);
    const [isNavigating, setIsNavigating] = React.useState(false);
    const [loadingNavButton, setLoadingNavButton] = React.useState('');
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [configError, setConfigError] = React.useState(null);
    const [configSuccess, setConfigSuccess] = React.useState(false);
    const [activeMode, setActiveMode] = React.useState('create'); // 'create' или 'edit'
    const [existingConfigs, setExistingConfigs] = React.useState([]);
    const [selectedConfig, setSelectedConfig] = React.useState(null);
    const [isLoadingConfigs, setIsLoadingConfigs] = React.useState(false);
    const [formData, setFormData] = React.useState({
        clientName: '',
        dns: ['1.1.1.1'],
        mtu: '1420',
        allowedIPs: '0.0.0.0/0',
        persistentKeepalive: '25'
    });
    const [configPreview, setConfigPreview] = React.useState('');
    
    // Ref для хранения интервалов
    const intervalsRef = React.useRef({});

    const serverId = window.SERVER_ID;

    // Популярные DNS серверы
    const popularDNS = [
        { value: '1.1.1.1', label: 'Cloudflare (1.1.1.1)', description: 'Быстрый и приватный' },
        { value: '1.0.0.1', label: 'Cloudflare (1.0.0.1)', description: 'Альтернативный Cloudflare' },
        { value: '8.8.8.8', label: 'Google (8.8.8.8)', description: 'Надежный и быстрый' },
        { value: '8.8.4.4', label: 'Google (8.8.4.4)', description: 'Альтернативный Google' },
        { value: '208.67.222.222', label: 'OpenDNS (208.67.222.222)', description: 'Семейный фильтр' },
        { value: '208.67.220.220', label: 'OpenDNS (208.67.220.220)', description: 'Альтернативный OpenDNS' },
        { value: '9.9.9.9', label: 'Quad9 (9.9.9.9)', description: 'Безопасность и приватность' },
        { value: '149.112.112.112', label: 'Quad9 (149.112.112.112)', description: 'Альтернативный Quad9' }
    ];

    // Функция для очистки интервалов
    const clearAllIntervals = () => {
        Object.values(intervalsRef.current).forEach(intervalId => {
            if (intervalId) clearInterval(intervalId);
        });
        intervalsRef.current = {};
    };

    // Функция для очистки уведомлений
    const clearNotifications = () => {
        setConfigError(null);
        setConfigSuccess(false);
    };

    // Автоматическая очистка уведомлений через 5 секунд
    React.useEffect(() => {
        if (configError || configSuccess) {
            const timer = setTimeout(clearNotifications, 5000);
            return () => clearTimeout(timer);
        }
    }, [configError, configSuccess]);

    React.useEffect(() => {
        const checkTokenValidity = async () => {
            try {
                const response = await fetch('/api/check/verify-token/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });

                if (!response.ok) {
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
            } catch (error) {
                console.error('Error during token check:', error);
                window.location.href = '/';
                return false;
            }
        };

        const checkUserAuthorization = async () => {
            try {
                const response = await fetch('/api/users/self/', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });

                if (!response.ok) {
                    console.log('Periodic check: token invalid, redirecting to /');
                    window.location.href = '/';
                    return;
                }

                const data = await response.json();
                if (!data.content?.accepted) {
                    console.log('Periodic check: server reported token invalid, redirecting to /');
                    window.location.href = '/';
                    return;
                }
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

        const initializePage = async () => {
            const tokenValid = await checkTokenValidity();
            if (tokenValid) {
                setIsTokenValidated(true);
                const userAuthorized = await checkUserAuthorization();
                if (userAuthorized) {
                    setIsUserAuthorized(true);
                    await fetchServerData();
                }
            }
        };

        initializePage();
        
        // Устанавливаем интервалы
        intervalsRef.current.tokenCheck = setInterval(checkTokenValidityPeriodically, 30000);
        
        return clearAllIntervals;
    }, [serverId]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Функция для загрузки существующих конфигов
    const fetchExistingConfigs = async () => {
        if (!server || !isUserAuthorized) return;
        
        setIsLoadingConfigs(true);
        try {
            const response = await fetch(`/api/servers/${serverId}/configs/`);
            if (response.ok) {
                const data = await response.json();
                if (data.ok && data.content) {
                    setExistingConfigs(data.content);
                }
            }
        } catch (error) {
            console.error('Error fetching existing configs:', error);
        } finally {
            setIsLoadingConfigs(false);
        }
    };

    // Функция для переключения режима с анимацией
    const switchMode = (mode) => {
        if (mode === activeMode) return;
        
        setActiveMode(mode);
        setSelectedConfig(null);
        clearNotifications();
        
        if (mode === 'edit') {
            fetchExistingConfigs();
        } else {
            // Сброс формы для создания нового конфига
            setFormData({
                clientName: '',
                dns: ['1.1.1.1'],
                mtu: '1420',
                allowedIPs: '0.0.0.0/0',
                persistentKeepalive: '25'
            });
        }
    };

    // Функция для выбора конфига для редактирования
    const selectConfigForEdit = (config) => {
        setSelectedConfig(config);
        setFormData({
            clientName: config.clientName || '',
            dns: config.dns ? config.dns.split(', ') : ['1.1.1.1'],
            mtu: config.mtu || '1420',
            allowedIPs: config.allowedIPs || '0.0.0.0/0',
            persistentKeepalive: config.persistentKeepalive || '25'
        });
    };

    // Функция для обработки DNS выбора
    const handleDNSChange = (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
        setFormData(prev => ({
            ...prev,
            dns: selectedOptions.length > 0 ? selectedOptions : ['1.1.1.1']
        }));
    };

    const generateConfigPreview = () => {
        if (!server) return '';
        
        const config = `[Interface]
PrivateKey = <Твой приватный ключ будет тут>
Address = 10.0.0.2/24
DNS = ${formData.dns.join(', ')}
MTU = ${formData.mtu}

[Peer]
PublicKey = <Публичный ключ сервера будет тут>
Endpoint = ${server.ipv4}:51820
AllowedIPs = ${formData.allowedIPs}
PersistentKeepalive = ${formData.persistentKeepalive}`;
        
        return config;
    };

    React.useEffect(() => {
        setConfigPreview(generateConfigPreview());
    }, [formData, server]);

    const handleCreateConfig = async () => {
        if (!server || !isUserAuthorized) return;
        
        // Очищаем предыдущие уведомления
        clearNotifications();
        
        // Add haptic feedback for mobile devices
        if ('vibrate' in navigator) {
            navigator.vibrate(100);
        }
        
        setIsDownloading(true);
        
        try {
            const endpoint = activeMode === 'edit' && selectedConfig 
                ? `/api/servers/${serverId}/configs/${selectedConfig.id}/`
                : `/api/servers/${serverId}/config/`;
            
            const method = activeMode === 'edit' ? 'PUT' : 'POST';
            
            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${formData.clientName || 'client'}.conf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                setConfigSuccess(true);
                
                // Если это было редактирование, обновляем список конфигов
                if (activeMode === 'edit') {
                    fetchExistingConfigs();
                }
            } else {
                let errorMessage = activeMode === 'edit' 
                    ? 'Ошибка при обновлении конфига' 
                    : 'Ошибка при создании конфига';
                
                try {
                    const errorData = await response.json();
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    } else if (errorData.detail) {
                        errorMessage = errorData.detail;
                    }
                } catch (parseError) {
                    // Если не удалось распарсить JSON, используем статус
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
                            errorMessage = activeMode === 'edit' ? 'Конфиг не найден' : 'Сервер не найден';
                            break;
                        case 500:
                            errorMessage = 'Внутренняя ошибка сервера';
                            break;
                        default:
                            errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
                    }
                }
                
                setConfigError(errorMessage);
            }
        } catch (error) {
            console.error('Error creating/updating config:', error);
            setConfigError('Ошибка сети. Проверьте подключение к интернету.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleNavigation = (page) => {
        if (isNavigating) return;
        
        setIsNavigating(true);
        setLoadingNavButton(page);
        
        // Add haptic feedback for mobile devices
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
        
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

    // Функция для создания уведомления
    const createNotification = (type, message) => {
        return React.createElement('div', {
            key: `notification-${Date.now()}`,
            className: `notification notification-${type}`,
            style: {
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 1000,
                maxWidth: '400px',
                padding: '16px 20px',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                border: type === 'error' ? '1px solid rgba(255, 59, 48, 0.3)' : '1px solid rgba(0, 255, 136, 0.3)',
                background: type === 'error' 
                    ? 'rgba(255, 59, 48, 0.1)' 
                    : 'rgba(0, 255, 136, 0.1)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                animation: 'slideInRight 0.3s ease-out',
                boxShadow: type === 'error'
                    ? '0 8px 32px rgba(255, 59, 48, 0.2)'
                    : '0 8px 32px rgba(0, 255, 136, 0.2)'
            }
        }, [
            React.createElement('span', {
                key: 'icon',
                style: {
                    fontSize: '20px',
                    flexShrink: 0
                }
            }, type === 'error' ? '⚠️' : '✅'),
            React.createElement('span', {
                key: 'message',
                style: { flex: 1 }
            }, message),
            React.createElement('button', {
                key: 'close',
                onClick: clearNotifications,
                style: {
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '0',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    transition: 'all 0.2s ease'
                },
                onMouseEnter: (e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.color = 'white';
                },
                onMouseLeave: (e) => {
                    e.target.style.background = 'none';
                    e.target.style.color = 'rgba(255, 255, 255, 0.7)';
                }
            }, '×')
        ]);
    };

    // Условия рендеринга
    if (!isTokenValidated || !isUserAuthorized || isLoading) {
        return React.createElement('div', {
            className: 'loading-container'
        }, [
            React.createElement('div', { key: 'spinner', className: 'loading-spinner' }),
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
            style: { textAlign: 'center', padding: '40px', maxWidth: '500px' }
        }, [
            React.createElement('div', { key: 'icon', style: { fontSize: '4rem', marginBottom: '20px' } }, '⚠️'),
            React.createElement('h3', { key: 'title', style: { marginBottom: '15px', fontSize: '1.5rem' } }, 'Ошибка'),
            React.createElement('p', { key: 'message', style: { marginBottom: '20px', opacity: 0.8 } }, error),
            React.createElement('button', {
                key: 'back',
                onClick: () => window.location.href = '/home/',
                className: 'form-button',
                style: { marginTop: '10px' }
            }, 'Вернуться к серверам')
        ]));
    }

    if (!server) {
        return React.createElement('div', {
            style: {
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
            }
        }, 'Загрузка данных сервера...');
    }

    // Основной рендеринг
    return React.createElement('div', { className: 'config-page' }, [
        // Уведомления
        configError && createNotification('error', configError),
        configSuccess && createNotification('success', activeMode === 'edit' ? 'Конфиг успешно обновлен и скачан!' : 'Конфиг успешно создан и скачан!'),
        
        // Header
        React.createElement('header', { key: 'header', className: 'config-header' }, 
            React.createElement('div', { className: 'config-header-content' }, [
                React.createElement('div', { key: 'title-section', className: 'config-title-section' }, [
                    React.createElement('img', {
                        key: 'flag',
                        src: server.image_url,
                        alt: server.server_location + ' flag',
                        className: 'server-flag',
                        onError: (e) => { e.target.style.display = 'none'; }
                    }),
                    React.createElement('h1', { key: 'title', className: 'config-title' }, server.name),
                    React.createElement('div', { key: 'status', className: 'server-status-badge' }, [
                        React.createElement('div', {
                            key: 'dot',
                            className: `status-dot ${server.status === 'Online' ? 'online' : 'offline'}`
                        }),
                        React.createElement('span', { key: 'text', className: 'status-text' }, server.status)
                    ])
                ]),
                React.createElement('div', { key: 'actions', className: 'config-actions' }, [
                    React.createElement('a', {
                        key: 'back',
                        href: `/servers/${serverId}/`,
                        className: 'config-btn secondary'
                    }, [
                        React.createElement('span', { key: 'icon' }, '←'),
                        'К серверу'
                    ])
                ])
            ])
        ),

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
                style: { opacity: isNavigating && loadingNavButton !== page ? 0.5 : 1 }
            }, page.charAt(0).toUpperCase() + page.slice(1))
        )),

        // Main Content
        React.createElement('main', { key: 'content', className: 'config-content' }, 
            React.createElement('div', { key: 'grid', className: 'config-grid' }, [
                // Config Creation/Edit Card with Slider
                React.createElement('div', { key: 'creation', className: 'config-creation-card' }, [
                    // Slider Container
                    React.createElement('div', { key: 'slider-container', className: 'config-slider-container' }, [
                        // Create Form
                        React.createElement('div', { 
                            key: 'create-form', 
                            className: `config-form-wrapper ${activeMode === 'create' ? 'active' : 'inactive'}` 
                        }, [
                            React.createElement('h2', { key: 'title', className: 'card-title' }, [
                                React.createElement('span', { key: 'icon' }, '⚙️'),
                                'Настройки конфига'
                            ]),
                            React.createElement('form', { key: 'form', className: 'config-form' }, [
                                React.createElement('div', { key: 'client-name', className: 'form-group' }, [
                                    React.createElement('label', { key: 'label', className: 'form-label' }, 'Имя клиента'),
                                    React.createElement('input', {
                                        key: 'input',
                                        type: 'text',
                                        name: 'clientName',
                                        value: formData.clientName,
                                        onChange: handleInputChange,
                                        placeholder: 'Введите имя клиента',
                                        className: 'form-input',
                                        required: true
                                    })
                                ]),
                                React.createElement('div', { key: 'dns', className: 'form-group' }, [
                                    React.createElement('label', { key: 'label', className: 'form-label' }, 'DNS серверы'),
                                    React.createElement('select', {
                                        key: 'select',
                                        name: 'dns',
                                        value: formData.dns[0] || '',
                                        onChange: (e) => setFormData(prev => ({
                                            ...prev,
                                            dns: [e.target.value]
                                        })),
                                        className: 'form-select'
                                    }, popularDNS.map(dns => 
                                        React.createElement('option', { 
                                            key: dns.value, 
                                            value: dns.value,
                                            title: dns.description
                                        }, dns.label)
                                    ))
                                ]),
                                React.createElement('div', { key: 'mtu', className: 'form-group' }, [
                                    React.createElement('label', { key: 'label', className: 'form-label' }, 'MTU'),
                                    React.createElement('select', {
                                        key: 'select',
                                        name: 'mtu',
                                        value: formData.mtu,
                                        onChange: handleInputChange,
                                        className: 'form-select'
                                    }, [
                                        React.createElement('option', { key: '1420', value: '1420' }, '1420 (Рекомендуется)'),
                                        React.createElement('option', { key: '1380', value: '1380' }, '1380'),
                                        React.createElement('option', { key: '1280', value: '1280' }, '1280')
                                    ])
                                ]),
                                React.createElement('div', { key: 'allowed-ips', className: 'form-group' }, [
                                    React.createElement('label', { key: 'label', className: 'form-label' }, 'Разрешенные IP'),
                                    React.createElement('select', {
                                        key: 'select',
                                        name: 'allowedIPs',
                                        value: formData.allowedIPs,
                                        onChange: handleInputChange,
                                        className: 'form-select'
                                    }, [
                                        React.createElement('option', { key: 'all', value: '0.0.0.0/0' }, 'Весь трафик'),
                                        React.createElement('option', { key: 'lan', value: '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16' }, 'Только LAN')
                                    ])
                                ]),
                                React.createElement('div', { key: 'keepalive', className: 'form-group' }, [
                                    React.createElement('label', { key: 'label', className: 'form-label' }, 'Persistent Keepalive'),
                                    React.createElement('select', {
                                        key: 'select',
                                        name: 'persistentKeepalive',
                                        value: formData.persistentKeepalive,
                                        onChange: handleInputChange,
                                        className: 'form-select'
                                    }, [
                                        React.createElement('option', { key: '25', value: '25' }, '25 секунд'),
                                        React.createElement('option', { key: '15', value: '15' }, '15 секунд'),
                                        React.createElement('option', { key: '0', value: '0' }, 'Отключено')
                                    ])
                                ]),
                                // Кнопка создания конфига
                                React.createElement('div', { key: 'submit', className: 'form-group' }, [
                                    React.createElement('div', { key: 'buttons-container', className: 'buttons-container' }, [
                                        React.createElement('button', {
                                            key: 'create',
                                            onClick: handleCreateConfig,
                                            disabled: !isUserAuthorized || !formData.clientName.trim() || isDownloading,
                                            className: 'config-btn primary main-action-btn',
                                            style: {
                                                flex: 1,
                                                padding: '12px 20px',
                                                fontSize: '14px',
                                                marginTop: '8px',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }
                                        }, [
                                            isDownloading ? 
                                                React.createElement('div', {
                                                    key: 'loading',
                                                    style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px'
                                                    }
                                                }, [
                                                    React.createElement('div', {
                                                        key: 'spinner',
                                                        style: {
                                                            width: '16px',
                                                            height: '16px',
                                                            border: '2px solid transparent',
                                                            borderTop: '2px solid currentColor',
                                                            borderRadius: '50%',
                                                            animation: 'spin 1s linear infinite'
                                                        }
                                                    }),
                                                    'Создание конфига...'
                                                ]) :
                                                React.createElement('div', {
                                                    key: 'content',
                                                    style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px'
                                                    }
                                                }, [
                                                    React.createElement('span', { key: 'icon' }, '⚙️'),
                                                    'Создать и скачать'
                                                ])
                                        ]),
                                        React.createElement('button', {
                                            key: 'mode-switch-btn',
                                            onClick: (e) => {
                                                e.preventDefault();
                                                switchMode(activeMode === 'create' ? 'edit' : 'create');
                                            },
                                            type: 'button',
                                            className: 'config-btn secondary switch-mode-btn',
                                            disabled: isDownloading,
                                            title: activeMode === 'create' ? 'Переключиться на редактирование' : 'Переключиться на создание',
                                            style: {
                                                padding: '12px 16px',
                                                fontSize: '14px',
                                                marginTop: '8px',
                                                marginLeft: '12px'
                                            }
                                        }, [
                                            React.createElement('span', { key: 'icon', className: 'switch-icon' }, '🔄'),
                                            React.createElement('span', { key: 'text', className: 'switch-text' }, 'Редакт')
                                        ])
                                    ])
                                ])
                            ])
                        ]),

                        // Edit Form
                        React.createElement('div', { 
                            key: 'edit-form', 
                            className: `config-form-wrapper ${activeMode === 'edit' ? 'active' : 'inactive'}` 
                        }, [
                            React.createElement('h2', { key: 'title', className: 'card-title' }, [
                                React.createElement('span', { key: 'icon' }, '✏️'),
                                'Редактирование конфига'
                            ]),
                            
                            // Config Selection for Edit Mode
                            React.createElement('div', { key: 'config-selector', className: 'config-selector' }, [
                                React.createElement('label', { key: 'label', className: 'form-label' }, 'Выберите конфиг для редактирования'),
                                React.createElement('select', {
                                    key: 'select',
                                    value: selectedConfig ? selectedConfig.id : '',
                                    onChange: (e) => {
                                        const config = existingConfigs.find(c => c.id === e.target.value);
                                        if (config) {
                                            selectConfigForEdit(config);
                                        } else {
                                            setSelectedConfig(null);
                                        }
                                    },
                                    className: 'form-select',
                                    disabled: isLoadingConfigs
                                }, [
                                    React.createElement('option', { key: 'placeholder', value: '' }, 
                                        isLoadingConfigs ? 'Загрузка конфигов...' : 'Выберите конфиг'
                                    ),
                                    ...existingConfigs.map(config => 
                                        React.createElement('option', { key: config.id, value: config.id }, 
                                            config.clientName || `Конфиг ${config.id}`
                                        )
                                    )
                                ])
                            ]),
                            
                            React.createElement('form', { key: 'form', className: 'config-form' }, [
                                React.createElement('div', { key: 'client-name', className: 'form-group' }, [
                                    React.createElement('label', { key: 'label', className: 'form-label' }, 'Имя клиента'),
                                    React.createElement('input', {
                                        key: 'input',
                                        type: 'text',
                                        name: 'clientName',
                                        value: formData.clientName,
                                        onChange: handleInputChange,
                                        placeholder: 'Введите имя клиента',
                                        className: 'form-input',
                                        required: true
                                    })
                                ]),
                                React.createElement('div', { key: 'dns', className: 'form-group' }, [
                                    React.createElement('label', { key: 'label', className: 'form-label' }, 'DNS серверы'),
                                    React.createElement('select', {
                                        key: 'select',
                                        name: 'dns',
                                        value: formData.dns[0] || '',
                                        onChange: (e) => setFormData(prev => ({
                                            ...prev,
                                            dns: [e.target.value]
                                        })),
                                        className: 'form-select'
                                    }, popularDNS.map(dns => 
                                        React.createElement('option', { 
                                            key: dns.value, 
                                            value: dns.value,
                                            title: dns.description
                                        }, dns.label)
                                    ))
                                ]),
                                React.createElement('div', { key: 'mtu', className: 'form-group' }, [
                                    React.createElement('label', { key: 'label', className: 'form-label' }, 'MTU'),
                                    React.createElement('select', {
                                        key: 'select',
                                        name: 'mtu',
                                        value: formData.mtu,
                                        onChange: handleInputChange,
                                        className: 'form-select'
                                    }, [
                                        React.createElement('option', { key: '1420', value: '1420' }, '1420 (Рекомендуется)'),
                                        React.createElement('option', { key: '1380', value: '1380' }, '1380'),
                                        React.createElement('option', { key: '1280', value: '1280' }, '1280')
                                    ])
                                ]),
                                React.createElement('div', { key: 'allowed-ips', className: 'form-group' }, [
                                    React.createElement('label', { key: 'label', className: 'form-label' }, 'Разрешенные IP'),
                                    React.createElement('select', {
                                        key: 'select',
                                        name: 'allowedIPs',
                                        value: formData.allowedIPs,
                                        onChange: handleInputChange,
                                        className: 'form-select'
                                    }, [
                                        React.createElement('option', { key: 'all', value: '0.0.0.0/0' }, 'Весь трафик'),
                                        React.createElement('option', { key: 'lan', value: '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16' }, 'Только LAN')
                                    ])
                                ]),
                                React.createElement('div', { key: 'keepalive', className: 'form-group' }, [
                                    React.createElement('label', { key: 'label', className: 'form-label' }, 'Persistent Keepalive'),
                                    React.createElement('select', {
                                        key: 'select',
                                        name: 'persistentKeepalive',
                                        value: formData.persistentKeepalive,
                                        onChange: handleInputChange,
                                        className: 'form-select'
                                    }, [
                                        React.createElement('option', { key: '25', value: '25' }, '25 секунд'),
                                        React.createElement('option', { key: '15', value: '15' }, '15 секунд'),
                                        React.createElement('option', { key: '0', value: '0' }, 'Отключено')
                                    ])
                                ]),
                                // Кнопка обновления конфига
                                React.createElement('div', { key: 'submit', className: 'form-group' }, [
                                    React.createElement('div', { key: 'buttons-container', className: 'buttons-container' }, [
                                        React.createElement('button', {
                                            key: 'update',
                                            onClick: handleCreateConfig,
                                            disabled: !isUserAuthorized || !formData.clientName.trim() || isDownloading || !selectedConfig,
                                            className: 'config-btn primary main-action-btn',
                                            style: {
                                                flex: 1,
                                                padding: '12px 20px',
                                                fontSize: '14px',
                                                marginTop: '8px',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }
                                        }, [
                                            isDownloading ? 
                                                React.createElement('div', {
                                                    key: 'loading',
                                                    style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px'
                                                    }
                                                }, [
                                                    React.createElement('div', {
                                                        key: 'spinner',
                                                        style: {
                                                            width: '16px',
                                                            height: '16px',
                                                            border: '2px solid transparent',
                                                            borderTop: '2px solid currentColor',
                                                            borderRadius: '50%',
                                                            animation: 'spin 1s linear infinite'
                                                        }
                                                    }),
                                                    'Обновление конфига...'
                                                ]) :
                                                React.createElement('div', {
                                                    key: 'content',
                                                    style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px'
                                                    }
                                                }, [
                                                    React.createElement('span', { key: 'icon' }, '✏️'),
                                                    'Обновить и скачать'
                                                ])
                                        ]),
                                        React.createElement('button', {
                                            key: 'mode-switch-btn',
                                            onClick: (e) => {
                                                e.preventDefault();
                                                switchMode(activeMode === 'create' ? 'edit' : 'create');
                                            },
                                            type: 'button',
                                            className: 'config-btn secondary switch-mode-btn',
                                            disabled: isDownloading,
                                            title: activeMode === 'create' ? 'Переключиться на редактирование' : 'Переключиться на создание',
                                            style: {
                                                padding: '12px 16px',
                                                fontSize: '14px',
                                                marginTop: '8px',
                                                marginLeft: '12px'
                                            }
                                        }, [
                                            React.createElement('span', { key: 'icon', className: 'switch-icon' }, '🔄'),
                                            React.createElement('span', { key: 'text', className: 'switch-text' }, 'Создать')
                                        ])
                                    ])
                                ])
                            ])
                        ])
                    ])
                ]),

                // Config Preview Section - теперь внутри config-grid
                React.createElement('div', { key: 'preview', className: 'config-preview-section' }, [
                    React.createElement('h2', { key: 'title', className: 'preview-title' }, [
                        React.createElement('span', { key: 'icon' }, '📄'),
                        'Предварительный просмотр конфига'
                    ]),
                    React.createElement('pre', {
                        key: 'preview',
                        className: `config-preview ${!configPreview ? 'empty' : ''}`,
                        style: { maxHeight: '400px' }
                    }, configPreview || 'Заполните форму выше для предварительного просмотра конфига')
                ])
            ])
        )
    ]);
}

ReactDOM.render(React.createElement(ConfigPage), document.getElementById('root')); 