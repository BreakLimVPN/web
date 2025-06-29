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
        downloadSpeed: 0,
        uploadSpeed: 0
    });
    
    // Refs для хранения данных между рендерами
    const previousClientDataRef = React.useRef(null);
    const smoothedSpeedsRef = React.useRef({ downloadSpeed: 0, uploadSpeed: 0 });
    const intervalsRef = React.useRef({});
    // Ref для хранения истории онлайн статуса клиентов
    const clientOnlineHistoryRef = React.useRef({});
    // Ref для сглаженного количества онлайн клиентов
    const smoothedOnlineCountRef = React.useRef(0);

    const serverId = window.SERVER_ID;

    // Функция для форматирования скорости с подходящими единицами
    const formatSpeed = (bytesPerSecond) => {
        if (bytesPerSecond >= 1024 * 1024 * 1024) {
            return `${(bytesPerSecond / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
        } else if (bytesPerSecond >= 1024 * 1024) {
            return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
        } else if (bytesPerSecond >= 1024) {
            return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`;
        } else {
            return `${bytesPerSecond.toFixed(2)} B/s`;
        }
    };

    // Функция для форматирования общего объема данных с подходящими единицами
    const formatTransfer = (bytes) => {
        if (bytes >= 1024 * 1024 * 1024) {
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
        } else if (bytes >= 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        } else if (bytes >= 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        } else {
            return `${bytes} B`;
        }
    };

    // Улучшенная функция сглаживания с более сильным эффектом
    const smoothSpeed = (currentSpeed, previousSpeed, smoothingFactor = 0.15) => {
        return previousSpeed * (1 - smoothingFactor) + currentSpeed * smoothingFactor;
    };

    // Функция для расчета скорости на основе изменения transferRx/transferTx
    const calculateSpeed = (currentData, previousData) => {
        if (!previousData) return { downloadSpeed: 0, uploadSpeed: 0 };
        
        let totalDownloadSpeed = 0;
        let totalUploadSpeed = 0;
        
        currentData.forEach((currentClient, index) => {
            const previousClient = previousData[index];
            if (previousClient) {
                // Tx (Transmit) - сервер отправляет клиенту = клиент получает (Download)
                const downloadDiff = currentClient.transferTx - previousClient.transferTx;
                // Rx (Receive) - сервер получает от клиента = клиент отправляет (Upload)
                const uploadDiff = currentClient.transferRx - previousClient.transferRx;
                
                // Добавляем только положительные изменения (в байтах в секунду)
                totalDownloadSpeed += Math.max(0, downloadDiff);
                totalUploadSpeed += Math.max(0, uploadDiff);
            }
        });
        
        return {
            downloadSpeed: totalDownloadSpeed,
            uploadSpeed: totalUploadSpeed
        };
    };

    // Улучшенная функция для определения онлайн клиентов с использованием latestHandshakeAt
    const getOnlineClients = (currentData, previousData) => {
        if (!previousData) {
            // При первом запуске анализируем данные клиентов для определения начального статуса
            const currentTime = Date.now();
            const handshakeThreshold = 300000; // 5 минут - клиент считается онлайн если handshake был менее 5 минут назад
            let initialOnlineCount = 0;
            
            currentData.forEach((client) => {
                const clientId = `${client.name}_${client.createdAt}`;
                
                // Инициализируем историю клиента
                clientOnlineHistoryRef.current[clientId] = [];
                
                // Определяем статус на основе latestHandshakeAt
                if (client.latestHandshakeAt && client.latestHandshakeAt !== null) {
                    const lastHandshakeTime = new Date(client.latestHandshakeAt).getTime();
                    const timeSinceHandshake = currentTime - lastHandshakeTime;
                    
                    // Клиент считается онлайн если handshake был недавно
                    const isRecentlyHandshaked = timeSinceHandshake < handshakeThreshold;
                    
                    if (isRecentlyHandshaked) {
                        initialOnlineCount++;
                        // Добавляем текущее время в историю активности
                        clientOnlineHistoryRef.current[clientId].push(currentTime);
                    }
                }
            });
            
            smoothedOnlineCountRef.current = initialOnlineCount;
            return initialOnlineCount;
        }
        
        const currentTime = Date.now();
        const handshakeThreshold = 300000; // 5 минут для handshake
        const activityThreshold = 15000; // 15 секунд для текущей активности
        const smoothingFactor = 0.3; // Увеличиваем коэффициент сглаживания для более быстрой реакции
        
        let onlineCount = 0;
        const currentOnlineStatus = {};
        
        currentData.forEach((currentClient, index) => {
            const previousClient = previousData[index];
            const clientId = `${currentClient.name}_${currentClient.createdAt}`;
            
            if (previousClient) {
                // Проверяем изменения в transfer данных (текущая активность)
                const downloadChanged = currentClient.transferTx !== previousClient.transferTx;
                const uploadChanged = currentClient.transferRx !== previousClient.transferRx;
                const isCurrentlyActive = downloadChanged || uploadChanged;
                
                // Получаем историю активности клиента
                const history = clientOnlineHistoryRef.current[clientId] || [];
                
                // Добавляем текущую активность в историю
                if (isCurrentlyActive) {
                    history.push(currentTime);
                }
                
                // Удаляем старые записи (старше 60 секунд)
                const cutoffTime = currentTime - 60000;
                const filteredHistory = history.filter(time => time > cutoffTime);
                
                // Сохраняем обновленную историю
                clientOnlineHistoryRef.current[clientId] = filteredHistory;
                
                // Определяем онлайн статус на основе handshake и текущей активности
                let isOnline = false;
                
                // Проверяем handshake
                if (currentClient.latestHandshakeAt && currentClient.latestHandshakeAt !== null) {
                    const lastHandshakeTime = new Date(currentClient.latestHandshakeAt).getTime();
                    const timeSinceHandshake = currentTime - lastHandshakeTime;
                    const hasRecentHandshake = timeSinceHandshake < handshakeThreshold;
                    
                    // Проверяем текущую активность
                    const lastActivity = filteredHistory.length > 0 ? Math.max(...filteredHistory) : 0;
                    const hasRecentActivity = (currentTime - lastActivity) < activityThreshold;
                    
                    // Клиент онлайн если есть недавний handshake ИЛИ текущая активность
                    isOnline = hasRecentHandshake || hasRecentActivity;
                }
                
                if (isOnline) {
                    onlineCount++;
                }
                
                currentOnlineStatus[clientId] = isOnline;
            } else {
                // Новый клиент - анализируем его данные для определения статуса
                let isOnline = false;
                
                if (currentClient.latestHandshakeAt && currentClient.latestHandshakeAt !== null) {
                    const lastHandshakeTime = new Date(currentClient.latestHandshakeAt).getTime();
                    const timeSinceHandshake = currentTime - lastHandshakeTime;
                    
                    // Для новых клиентов используем более строгий порог - 2 минуты
                    const isRecentlyHandshaked = timeSinceHandshake < 120000;
                    
                    if (isRecentlyHandshaked) {
                        isOnline = true;
                        onlineCount++;
                        clientOnlineHistoryRef.current[clientId] = [currentTime];
                    } else {
                        clientOnlineHistoryRef.current[clientId] = [];
                    }
                } else {
                    clientOnlineHistoryRef.current[clientId] = [];
                }
                
                currentOnlineStatus[clientId] = isOnline;
            }
        });
        
        // Применяем сглаживание к количеству онлайн клиентов
        const smoothedOnlineCount = Math.round(
            smoothedOnlineCountRef.current * (1 - smoothingFactor) + onlineCount * smoothingFactor
        );
        
        // Ограничиваем изменение не более чем на 2 за раз для более быстрой реакции
        const maxChange = 2;
        const currentSmoothed = smoothedOnlineCountRef.current;
        let finalOnlineCount;
        
        if (Math.abs(smoothedOnlineCount - currentSmoothed) > maxChange) {
            if (smoothedOnlineCount > currentSmoothed) {
                finalOnlineCount = currentSmoothed + maxChange;
            } else {
                finalOnlineCount = currentSmoothed - maxChange;
            }
        } else {
            finalOnlineCount = smoothedOnlineCount;
        }
        
        // Ограничиваем значения от 0 до общего количества клиентов
        finalOnlineCount = Math.max(0, Math.min(finalOnlineCount, currentData.length));
        
        smoothedOnlineCountRef.current = finalOnlineCount;
        
        return finalOnlineCount;
    };

    // Функция для очистки интервалов
    const clearAllIntervals = () => {
        Object.values(intervalsRef.current).forEach(intervalId => {
            if (intervalId) clearInterval(intervalId);
        });
        intervalsRef.current = {};
    };

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

        const fetchClientData = async () => {
            try {
                const response = await fetch(`/api/servers/${serverId}/clients/`);
                if (!response.ok) {
                    throw new Error('Failed to fetch client data');
                }
                
                const data = await response.json();
                if (!data.ok || !data.content) {
                    throw new Error('Invalid client data response');
                }
                
                const currentClients = data.content;
                setClients(currentClients);
                
                const previousData = previousClientDataRef.current;
                const totalClients = currentClients.length;
                const onlineClients = getOnlineClients(currentClients, previousData);
                const speeds = calculateSpeed(currentClients, previousData);
                
                // Применяем сглаживание с более сильным эффектом
                const smoothedDownloadSpeed = smoothSpeed(speeds.downloadSpeed, smoothedSpeedsRef.current.downloadSpeed);
                const smoothedUploadSpeed = smoothSpeed(speeds.uploadSpeed, smoothedSpeedsRef.current.uploadSpeed);
                
                smoothedSpeedsRef.current = {
                    downloadSpeed: smoothedDownloadSpeed,
                    uploadSpeed: smoothedUploadSpeed
                };
                
                setClientStats({
                    total: totalClients,
                    online: onlineClients,
                    downloadSpeed: smoothedDownloadSpeed,
                    uploadSpeed: smoothedUploadSpeed
                });
                
                previousClientDataRef.current = currentClients;
                
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
        
        // Устанавливаем интервалы
        intervalsRef.current.tokenCheck = setInterval(checkTokenValidityPeriodically, 30000);
        intervalsRef.current.clientData = setInterval(fetchClientData, 3000);
        
        return clearAllIntervals;
    }, [serverId]);

    const handleDownloadConfig = async () => {
        if (!server || server.status !== 'Online' || !isUserAuthorized) return;
        
        setIsDownloadingConfig(true);
        
        // Add haptic feedback for mobile devices
        if ('vibrate' in navigator) {
            navigator.vibrate(100);
        }
        
        try {
            const response = await fetch(`/api/servers/config/?id=${serverId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
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

    // Функция для определения онлайн статуса клиента
    const isClientOnline = (client, currentTime = Date.now()) => {
        const handshakeThreshold = 300000; // 5 минут для handshake
        const activityThreshold = 15000; // 15 секунд для текущей активности
        
        // Проверяем handshake
        if (client.latestHandshakeAt && client.latestHandshakeAt !== null) {
            const lastHandshakeTime = new Date(client.latestHandshakeAt).getTime();
            const timeSinceHandshake = currentTime - lastHandshakeTime;
            const hasRecentHandshake = timeSinceHandshake < handshakeThreshold;
            
            if (hasRecentHandshake) {
                return true;
            }
        }
        
        // Проверяем текущую активность (если есть предыдущие данные)
        const previousData = previousClientDataRef.current;
        if (previousData) {
            const previousClient = previousData.find(p => 
                p.name === client.name && p.createdAt === client.createdAt
            );
            
            if (previousClient) {
                const downloadChanged = client.transferTx !== previousClient.transferTx;
                const uploadChanged = client.transferRx !== previousClient.transferRx;
                const isCurrentlyActive = downloadChanged || uploadChanged;
                
                if (isCurrentlyActive) {
                    return true;
                }
            }
        }
        
        return false;
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
    return React.createElement('div', { className: 'server-page' }, [
        // Header
        React.createElement('header', { key: 'header', className: 'server-header' }, 
            React.createElement('div', { className: 'server-header-content' }, [
                React.createElement('div', { key: 'title-section', className: 'server-title-section' }, [
                    React.createElement('img', {
                        key: 'flag',
                        src: server.image_url,
                        alt: server.server_location + ' flag',
                        className: 'server-flag',
                        onError: (e) => { e.target.style.display = 'none'; }
                    }),
                    React.createElement('h1', { key: 'title', className: 'server-title' }, server.name),
                    React.createElement('div', { key: 'status', className: 'server-status-badge' }, [
                        React.createElement('div', {
                            key: 'dot',
                            className: `status-dot ${server.status === 'Online' ? 'online' : 'offline'}`
                        }),
                        React.createElement('span', { key: 'text', className: 'status-text' }, server.status)
                    ])
                ]),
                React.createElement('div', { key: 'actions', className: 'server-actions' }, [
                    React.createElement('button', {
                        key: 'download',
                        onClick: handleDownloadConfig,
                        disabled: server.status !== 'Online' || isDownloadingConfig || !isUserAuthorized,
                        className: 'server-btn primary'
                    }, isDownloadingConfig ? [
                        React.createElement('div', { key: 'spinner', className: 'button-spinner' }),
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
        React.createElement('main', { key: 'content', className: 'server-content' }, 
            React.createElement('div', { key: 'grid', className: 'server-grid' }, [
                // Server Info Card
                React.createElement('div', { key: 'info', className: 'server-info-card' }, [
                    React.createElement('h2', { key: 'title', className: 'card-title' }, [
                        React.createElement('span', { key: 'icon' }, '🖥️'),
                        'Информация о сервере'
                    ]),
                    React.createElement('div', { key: 'info-grid', className: 'info-grid' }, [
                        React.createElement('div', { key: 'location', className: 'info-item' }, [
                            React.createElement('span', { key: 'label', className: 'info-label' }, 'Локация'),
                            React.createElement('span', { key: 'value', className: 'info-value' }, server.server_location)
                        ]),
                        React.createElement('div', { key: 'ip', className: 'info-item' }, [
                            React.createElement('span', { key: 'label', className: 'info-label' }, 'IP Адрес'),
                            React.createElement('span', { key: 'value', className: 'info-value ip' }, server.ipv4)
                        ]),
                        React.createElement('div', { key: 'provider', className: 'info-item' }, [
                            React.createElement('span', { key: 'label', className: 'info-label' }, 'Провайдер'),
                            React.createElement('span', { key: 'value', className: 'info-value' }, server.provider)
                        ]),
                        React.createElement('div', { key: 'bandwidth', className: 'info-item' }, [
                            React.createElement('span', { key: 'label', className: 'info-label' }, 'Пропускная способность'),
                            React.createElement('span', { key: 'value', className: 'info-value bandwidth' }, `${server.networks_bandwidth} Mbps`)
                        ])
                    ])
                ]),

                // Clients Statistics Card
                React.createElement('div', { key: 'clients', className: 'clients-card' }, [
                    React.createElement('h2', { key: 'title', className: 'card-title' }, [
                        React.createElement('span', { key: 'icon' }, '👥'),
                        'Клиенты сервера'
                    ]),
                    React.createElement('div', { key: 'stats', className: 'stats-grid' }, [
                        React.createElement('div', { key: 'total', className: 'stat-item' }, [
                            React.createElement('div', { key: 'value', className: 'stat-value' }, clientStats.total),
                            React.createElement('div', { key: 'label', className: 'stat-label' }, 'Всего')
                        ]),
                        React.createElement('div', { key: 'online', className: 'stat-item' }, [
                            React.createElement('div', { key: 'value', className: 'stat-value' }, clientStats.online),
                            React.createElement('div', { key: 'label', className: 'stat-label' }, 'Онлайн')
                        ]),
                        React.createElement('div', { key: 'download-speed', className: 'stat-item' }, [
                            React.createElement('div', { key: 'value', className: 'stat-value' }, formatSpeed(clientStats.downloadSpeed)),
                            React.createElement('div', { key: 'label', className: 'stat-label' }, 'Скорость загрузки')
                        ]),
                        React.createElement('div', { key: 'upload-speed', className: 'stat-item' }, [
                            React.createElement('div', { key: 'value', className: 'stat-value' }, formatSpeed(clientStats.uploadSpeed)),
                            React.createElement('div', { key: 'label', className: 'stat-label' }, 'Скорость отдачи')
                        ])
                    ]),
                    React.createElement('div', { key: 'list', className: 'clients-list' }, 
                        clients.map((client, index) => {
                            const isOnline = isClientOnline(client);
                            return React.createElement('div', { 
                                key: index, 
                                className: `client-item ${isOnline ? 'client-online' : 'client-offline'}`,
                                style: {
                                    borderColor: isOnline ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                                    background: isOnline ? 'rgba(0, 255, 136, 0.02)' : 'rgba(255, 255, 255, 0.02)'
                                }
                            }, [
                                React.createElement('div', { key: 'info', className: 'client-info' }, [
                                    React.createElement('div', { 
                                        key: 'avatar', 
                                        className: 'client-avatar',
                                        style: {
                                            background: isOnline ? 'linear-gradient(135deg, #00ff88, #00b7ff)' : 'linear-gradient(135deg, #666, #999)'
                                        }
                                    }, 
                                        client.name ? client.name.charAt(0) : '?'),
                                    React.createElement('div', { key: 'details', className: 'client-details' }, [
                                        React.createElement('h4', { 
                                            key: 'name',
                                            style: { color: isOnline ? '#00ff88' : '#fff' }
                                        }, client.name || 'Unknown'),
                                        React.createElement('p', { 
                                            key: 'status',
                                            style: { color: isOnline ? '#00b7ff' : '#aaa' }
                                        }, isOnline ? 'Онлайн' : 'Оффлайн')
                                    ])
                                ]),
                                React.createElement('div', { key: 'stats', className: 'client-stats' }, [
                                    React.createElement('div', { 
                                        key: 'transfer', 
                                        className: 'client-transfer'
                                    }, 
                                        `↓ ${formatTransfer(client.transferTx)}`),
                                    React.createElement('div', { 
                                        key: 'transfer-up', 
                                        className: 'client-transfer'
                                    }, 
                                        `↑ ${formatTransfer(client.transferRx)}`),
                                ])
                            ]);
                        })
                    )
                ])
            ])
        )
    ]);
}

ReactDOM.render(React.createElement(ServerPage), document.getElementById('root'));
