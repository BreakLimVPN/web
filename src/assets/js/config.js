function ConfigPage() {
    const [server, setServer] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [isTokenValidated, setIsTokenValidated] = React.useState(false);
    const [isUserAuthorized, setIsUserAuthorized] = React.useState(false);
    const [isNavigating, setIsNavigating] = React.useState(false);
    const [loadingNavButton, setLoadingNavButton] = React.useState('');
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [downloadProgress, setDownloadProgress] = React.useState('');
    const [configError, setConfigError] = React.useState(null);
    const [configSuccess, setConfigSuccess] = React.useState(false);
    const [fieldErrors, setFieldErrors] = React.useState({}); // Для отслеживания ошибок полей
    const [activeMode, setActiveMode] = React.useState('create'); // 'create' или 'edit'
    const [existingConfigs, setExistingConfigs] = React.useState([]);
    const [selectedConfig, setSelectedConfig] = React.useState(null);
    const [isLoadingConfigs, setIsLoadingConfigs] = React.useState(false);
    const [selectedProtocol, setSelectedProtocol] = React.useState('amneziawg'); // Новое состояние для протокола
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
    
    // Ref для AbortController
    const abortControllerRef = React.useRef(null);

    const serverId = window.SERVER_ID;

    // Определение протоколов и их настроек
    const protocols = {
        amneziawg: {
            name: 'AmneziaWG',
            icon: '🔒',
            defaultSettings: {
                dns: ['1.1.1.1'],
                mtu: '1420',
                allowedIPs: '0.0.0.0/0',
                persistentKeepalive: '25'
            },
            mtuOptions: [
                { value: '1420', label: '1420 (Рекомендуется)' },
                { value: '1380', label: '1380' },
                { value: '1280', label: '1280' }
            ],
            keepaliveOptions: [
                { value: '25', label: '25 секунд' },
                { value: '15', label: '15 секунд' },
                { value: '0', label: 'Отключено' }
            ]
        },
        xray: {
            name: 'Xray',
            icon: '🚀',
            disabled: true,
            defaultSettings: {
                dns: ['8.8.8.8'],
                mtu: '1500',
                allowedIPs: '0.0.0.0/0',
                persistentKeepalive: '30'
            },
            mtuOptions: [
                { value: '1500', label: '1500 (Рекомендуется)' },
                { value: '1400', label: '1400' },
                { value: '1300', label: '1300' }
            ],
            keepaliveOptions: [
                { value: '30', label: '30 секунд' },
                { value: '20', label: '20 секунд' },
                { value: '0', label: 'Отключено' }
            ],
        }
    };

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
        setDownloadProgress(''); // Очищаем прогресс
        setFieldErrors({}); // Очищаем ошибки полей
    };

    // Автоматическая очистка уведомлений через 5 секунд
    React.useEffect(() => {
        if (configError || configSuccess) {
            const timer = setTimeout(clearNotifications, 5000);
            return () => clearTimeout(timer);
        }
    }, [configError, configSuccess]);

    // Функция для изменения протокола
    const handleProtocolChange = (protocol) => {
        setSelectedProtocol(protocol);
        const protocolSettings = protocols[protocol].defaultSettings;
        setFormData(prev => ({
            ...prev,
            dns: protocolSettings.dns,
            mtu: protocolSettings.mtu,
            allowedIPs: protocolSettings.allowedIPs,
            persistentKeepalive: protocolSettings.persistentKeepalive
        }));
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
        
        return () => {
            clearAllIntervals();
            // Отменяем активный запрос при размонтировании
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [serverId]);

    // Функция для валидации имени клиента
    const validateClientName = (name) => {
        const trimmedName = name.trim();
        
        if (!trimmedName) {
            return 'Пожалуйста, введите имя клиента';
        }
        
        if (trimmedName.length < 3) {
            return 'Имя клиента должно содержать минимум 3 символа';
        }
        
        if (trimmedName.length > 50) {
            return 'Имя клиента не должно превышать 50 символов';
        }
        
        const validNamePattern = /^[a-zA-Z0-9а-яА-Я\s\-_\.]+$/;
        if (!validNamePattern.test(trimmedName)) {
            return 'Имя клиента может содержать только буквы, цифры, пробелы, дефисы, подчеркивания и точки';
        }
        
        const dangerousChars = /[&<>"'`=;(){}[\]]/;
        if (dangerousChars.test(trimmedName)) {
            return 'Имя клиента содержит недопустимые символы: & < > " \' ` = ; ( ) { } [ ]';
        }
        
        return null; // Нет ошибок
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // Обновляем данные формы
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Валидируем поле в реальном времени
        if (name === 'clientName') {
            const error = validateClientName(value);
            setFieldErrors(prev => ({
                ...prev,
                clientName: error
            }));
            
            // Очищаем общую ошибку конфига если поле стало валидным
            if (!error && configError) {
                setConfigError(null);
            }
        }
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
            // Сброс формы для создания нового конфига с текущим протоколом
            const protocolSettings = protocols[selectedProtocol].defaultSettings;
            setFormData({
                clientName: '',
                dns: protocolSettings.dns,
                mtu: protocolSettings.mtu,
                allowedIPs: protocolSettings.allowedIPs,
                persistentKeepalive: protocolSettings.persistentKeepalive
            });
        }
    };

    // Функция для выбора конфига для редактирования
    const selectConfigForEdit = (config) => {
        setSelectedConfig(config);
        setFormData({
            clientName: config.clientName || '',
            dns: config.dns ? config.dns.split(', ') : protocols[selectedProtocol].defaultSettings.dns,
            mtu: config.mtu || protocols[selectedProtocol].defaultSettings.mtu,
            allowedIPs: config.allowedIPs || protocols[selectedProtocol].defaultSettings.allowedIPs,
            persistentKeepalive: config.persistentKeepalive || protocols[selectedProtocol].defaultSettings.persistentKeepalive
        });
    };

    // Функция для обработки DNS выбора
    const handleDNSChange = (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
        setFormData(prev => ({
            ...prev,
            dns: selectedOptions.length > 0 ? selectedOptions : protocols[selectedProtocol].defaultSettings.dns
        }));
    };

    const generateConfigPreview = () => {
        if (!server) return '';
        
        const currentProtocol = protocols[selectedProtocol];
        
        if (selectedProtocol === 'amneziawg') {
            return `[Interface]
PrivateKey = <Твой приватный ключ будет тут>
Address = 10.0.0.2/24
DNS = ${formData.dns.join(', ')}
MTU = ${formData.mtu}

[Peer]
PublicKey = <Публичный ключ сервера будет тут>
Endpoint = ${server.ipv4}:51820
AllowedIPs = ${formData.allowedIPs}
PersistentKeepalive = ${formData.persistentKeepalive}`;
        } else if (selectedProtocol === 'xray') {
            return `{
  "protocol": "vmess",
  "settings": {
    "vnext": [{
      "address": "${server.ipv4}",
      "port": 443,
      "users": [{
        "id": "<UUID будет тут>",
        "alterId": 0
      }]
    }]
  },
  "streamSettings": {
    "network": "ws",
    "security": "tls",
    "wsSettings": {
      "path": "/path",
      "headers": {
        "Host": "${server.ipv4}"
      }
    }
  }
}`;
        }
        
        return '';
    };

    React.useEffect(() => {
        setConfigPreview(generateConfigPreview());
    }, [formData, server, selectedProtocol]);

    const handleCreateConfig = async () => {
        if (!server || !isUserAuthorized) return;
        
        // Очищаем предыдущие уведомления
        clearNotifications();
        
        // Add haptic feedback for mobile devices
        if ('vibrate' in navigator) {
            navigator.vibrate(100);
        }
        
        // Валидация формы
        const trimmedClientName = formData.clientName.trim();
        const clientNameError = validateClientName(trimmedClientName);
        
        if (clientNameError) {
            setConfigError(clientNameError);
            setFieldErrors(prev => ({
                ...prev,
                clientName: clientNameError
            }));
            return;
        }
        
        setIsDownloading(true);
        setDownloadProgress('Подключение к серверу...');
        
        // Отменяем предыдущий запрос, если он есть
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        // Создаем новый AbortController
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;
        
        try {
            // Используем новый endpoint для создания конфига
            const endpoint = `/api/servers/${serverId}/clients/`;
            
            // Создаем URL с query параметрами
            const url = new URL(endpoint, window.location.origin);
            url.searchParams.append('client_name', trimmedClientName);
            
            setDownloadProgress('Создание конфига...');
            
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal // Добавляем signal для возможности отмены
            });

            if (response.ok) {
                setDownloadProgress('Получение конфига...');
                
                // Проверяем тип контента в ответе
                const contentType = response.headers.get('content-type');
                
                if (contentType && (contentType.includes('application/octet-stream') || 
                    contentType.includes('text/plain') || 
                    contentType.includes('application/x-wireguard-config'))) {
                    // Сервер вернул файл конфига напрямую
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    
                    // Получаем имя файла из заголовка Content-Disposition, если есть
                    const contentDisposition = response.headers.get('content-disposition');
                    let fileName = `${trimmedClientName}_${server.name || serverId}.conf`;
                    
                    if (contentDisposition) {
                        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                        if (fileNameMatch && fileNameMatch[1]) {
                            fileName = fileNameMatch[1].replace(/['"]/g, '');
                        }
                    }
                    
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    
                    setConfigSuccess(true);
                    
                    // Очищаем форму
                    setFormData(prev => ({
                        ...prev,
                        clientName: ''
                    }));
                    
                    // Логируем успешное создание
                    console.log('Config downloaded successfully:', {
                        clientName: trimmedClientName,
                        serverId: serverId,
                        fileName: fileName
                    });
                } else {
                    // Сервер вернул JSON ответ
                    const data = await response.json();
                    
                    if (data.ok && data.content === true) {
                        // API подтвердил создание конфига
                        setConfigSuccess(true);
                        
                        // Очищаем форму после успешного создания
                        setFormData(prev => ({
                            ...prev,
                            clientName: ''
                        }));
                        
                        // Если API не возвращает конфиг напрямую, показываем инструкцию
                        setConfigSuccess(true);
                        
                        // Логируем успешное создание
                        console.log('Config created successfully:', {
                            clientName: trimmedClientName,
                            serverId: serverId,
                            response: data
                        });
                        
                        // Автоматически переходим на страницу профиля через 2 секунды
                        setTimeout(() => {
                            window.location.href = '/self/';
                        }, 2000);
                    } else if (data.ok && data.content) {
                        // Если API возвращает конфиг в виде текста
                        if (data.content.config_content) {
                            // Создаем blob из текста конфига
                            const blob = new Blob([data.content.config_content], { 
                                type: 'text/plain' 
                            });
                            
                            // Скачиваем файл
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            
                            // Формируем имя файла
                            const fileName = data.content.file_name || 
                                           `${trimmedClientName}_${server.name || serverId}.conf`;
                            a.download = fileName;
                            
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            
                            setConfigSuccess(true);
                            
                            // Очищаем форму после успешного создания
                            setFormData(prev => ({
                                ...prev,
                                clientName: ''
                            }));
                            
                            // Обновляем список конфигов, если мы в режиме редактирования
                            if (activeMode === 'edit') {
                                fetchExistingConfigs();
                            }
                            
                            // Логируем успешное создание для аналитики
                            console.log('Config created successfully:', {
                                clientName: trimmedClientName,
                                serverId: serverId,
                                configId: data.content.id
                            });
                        } else {
                            // API вернул успешный ответ, но без конфига
                            // Возможно, конфиг нужно скачать отдельным запросом
                            throw new Error('Конфиг создан, но не получен. Попробуйте скачать его из списка конфигов.');
                        }
                    } else {
                        // Если ответ не содержит ожидаемых данных
                        throw new Error(data.message || 'Неверный формат ответа от сервера');
                    }
                }
            } else {
                // Обработка ошибок HTTP
                let errorMessage = 'Ошибка при создании конфига';
                
                try {
                    const errorData = await response.json();
                    
                    // Обработка различных форматов ошибок
                    if (errorData.detail) {
                        if (typeof errorData.detail === 'string') {
                            errorMessage = errorData.detail;
                        } else if (Array.isArray(errorData.detail)) {
                            // FastAPI validation errors
                            errorMessage = errorData.detail
                                .map(err => err.msg || err.message)
                                .join(', ');
                        } else if (typeof errorData.detail === 'object') {
                            errorMessage = errorData.detail.message || JSON.stringify(errorData.detail);
                        }
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    } else if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                    
                    // Специфичные ошибки по статус-коду
                    switch (response.status) {
                        case 400:
                            if (!errorData.detail && !errorData.message) {
                                errorMessage = 'Неверные параметры запроса. Проверьте введенные данные.';
                            }
                            break;
                        case 401:
                            errorMessage = 'Сессия истекла. Пожалуйста, войдите в систему снова.';
                            // Перенаправляем на страницу входа через 2 секунды
                            setTimeout(() => {
                                window.location.href = '/self/';
                            }, 2000);
                            break;
                        case 403:
                            errorMessage = 'У вас нет прав для создания конфигов на этом сервере.';
                            break;
                        case 404:
                            errorMessage = 'Сервер не найден. Возможно, он был удален.';
                            break;
                        case 409:
                            errorMessage = errorData.detail || 'Конфиг с таким именем уже существует.';
                            break;
                        case 422:
                            errorMessage = 'Неверный формат данных. Проверьте правильность заполнения формы.';
                            break;
                        case 429:
                            errorMessage = 'Слишком много запросов. Пожалуйста, подождите немного.';
                            break;
                        case 500:
                            errorMessage = 'Внутренняя ошибка сервера. Попробуйте позже.';
                            break;
                        case 503:
                            errorMessage = 'Сервер временно недоступен. Попробуйте позже.';
                            break;
                    }
                } catch (parseError) {
                    console.error('Error parsing error response:', parseError);
                    // Если не удалось распарсить JSON, используем общее сообщение
                    errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
                }
                
                setConfigError(errorMessage);
                
                // Логируем ошибку для отладки
                console.error('Config creation error:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorMessage
                });
            }
        } catch (error) {
            console.error('Error creating config:', error);
            
            // Обработка сетевых ошибок
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                setConfigError('Ошибка соединения. Проверьте подключение к интернету.');
            } else if (error.name === 'AbortError') {
                setConfigError('Запрос был отменен. Попробуйте еще раз.');
            } else {
                setConfigError(error.message || 'Произошла неожиданная ошибка. Попробуйте еще раз.');
            }
        } finally {
            setIsDownloading(false);
            setDownloadProgress('');
            // Очищаем ссылку на AbortController
            abortControllerRef.current = null;
        }
    };

    const handleNavigation = (page) => {
        if (isNavigating) return;
        
        if (window.VpnUtils?.NavigationUtils) {
            window.VpnUtils.NavigationUtils.navigate(page, setIsNavigating, setLoadingNavButton);
        } else {
            // Fallback
            setIsNavigating(true);
            setLoadingNavButton(page);
            setTimeout(() => {
                const routes = { dashboard: '/dashboard/', servers: '/home/', account: '/self/' };
                window.location.href = routes[page] || '/';
            }, 300);
        }
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

    const currentProtocol = protocols[selectedProtocol];

    // Основной рендеринг
    return React.createElement('div', { className: 'config-page' }, [
        // Уведомления
        configError && createNotification('error', configError),
        configSuccess && createNotification('success', 'Конфиг успешно создан! Переход в личный кабинет...'),
        
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
                    // Protocol Selection
                    React.createElement('div', { key: 'protocol-selector', className: 'protocol-selector' }, [
                        React.createElement('h3', { key: 'title', className: 'protocol-title' }, [
                            React.createElement('span', { key: 'icon' }, '🔧'),
                            'Выберите протокол'
                        ]),
                        React.createElement('div', { key: 'protocols', className: 'protocol-options' }, 
                            Object.entries(protocols).map(([key, protocol]) => 
                                React.createElement('button', {
                                    key: key,
                                    onClick: () => !protocol.disabled && handleProtocolChange(key),
                                    className: `protocol-option ${selectedProtocol === key ? 'active' : ''}`,
                                    disabled: isDownloading || protocol.disabled,
                                    style: protocol.disabled ? { opacity: 0.5, pointerEvents: 'none', cursor: 'not-allowed' } : {}
                                }, [
                                    React.createElement('span', { key: 'icon', className: 'protocol-icon' }, protocol.icon),
                                    React.createElement('span', { key: 'name', className: 'protocol-name' }, protocol.name),
                                    protocol.disabled && React.createElement('span', { 
                                        key: 'desc', 
                                        className: 'protocol-description' 
                                    }, 'Скоро')
                                ])
                            )
                        )
                    ]),

                    // Slider Container
                    React.createElement('div', { key: 'slider-container', className: 'config-slider-container' }, [
                        // Create Form
                        React.createElement('div', { 
                            key: 'create-form', 
                            className: `config-form-wrapper ${activeMode === 'create' ? 'active' : 'inactive'}` 
                        }, [
                            React.createElement('h2', { key: 'title', className: 'card-title' }, [
                                React.createElement('span', { key: 'icon', className: 'card-title-icon' }, currentProtocol.icon),
                                `Настройки ${currentProtocol.name}`
                            ]),
                            React.createElement('form', { 
                                key: 'form', 
                                className: 'config-form',
                                onSubmit: (e) => {
                                    e.preventDefault();
                                    if (!fieldErrors.clientName && formData.clientName.trim()) {
                                        handleCreateConfig();
                                    }
                                }
                            }, [
                                React.createElement('div', { 
                                    key: 'client-name', 
                                    className: `form-group ${fieldErrors.clientName ? 'error' : ''}` 
                                }, [
                                    React.createElement('label', { key: 'label', className: 'form-label' }, [
                                        React.createElement('span', { key: 'icon', className: 'form-label-icon' }, '👤'),
                                        'Имя клиента'
                                    ]),
                                    React.createElement('input', {
                                        key: 'input',
                                        type: 'text',
                                        name: 'clientName',
                                        value: formData.clientName,
                                        onChange: handleInputChange,
                                        placeholder: 'Например: Мой iPhone',
                                        className: `form-input ${fieldErrors.clientName ? 'error' : ''}`,
                                        required: true
                                    }),
                                    fieldErrors.clientName && React.createElement('div', {
                                        key: 'error',
                                        className: 'form-validation-message error'
                                    }, [
                                        React.createElement('span', { key: 'icon' }, '⚠️'),
                                        fieldErrors.clientName
                                    ])
                                ]),
                                React.createElement('div', { key: 'dns', className: 'form-group' }, [
                                    React.createElement('label', { key: 'label', className: 'form-label' }, [
                                        React.createElement('span', { key: 'icon', className: 'form-label-icon' }, '🌐'),
                                        'DNS серверы'
                                    ]),
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
                                    React.createElement('label', { key: 'label', className: 'form-label' }, [
                                        React.createElement('span', { key: 'icon', className: 'form-label-icon' }, '📏'),
                                        'MTU'
                                    ]),
                                    React.createElement('select', {
                                        key: 'select',
                                        name: 'mtu',
                                        value: formData.mtu,
                                        onChange: handleInputChange,
                                        className: 'form-select'
                                    }, currentProtocol.mtuOptions.map(option => 
                                        React.createElement('option', { key: option.value, value: option.value }, option.label)
                                    ))
                                ]),
                                React.createElement('div', { key: 'allowed-ips', className: 'form-group' }, [
                                    React.createElement('label', { key: 'label', className: 'form-label' }, [
                                        React.createElement('span', { key: 'icon', className: 'form-label-icon' }, '🛡️'),
                                        'Разрешенные IP'
                                    ]),
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
                                    React.createElement('label', { key: 'label', className: 'form-label' }, [
                                        React.createElement('span', { key: 'icon', className: 'form-label-icon' }, '⏰'),
                                        'Persistent Keepalive'
                                    ]),
                                    React.createElement('select', {
                                        key: 'select',
                                        name: 'persistentKeepalive',
                                        value: formData.persistentKeepalive,
                                        onChange: handleInputChange,
                                        className: 'form-select'
                                    }, currentProtocol.keepaliveOptions.map(option => 
                                        React.createElement('option', { key: option.value, value: option.value }, option.label)
                                    ))
                                ]),
                                // Кнопка создания конфига
                                React.createElement('div', { key: 'submit', className: 'form-group' }, [
                                    React.createElement('div', { key: 'buttons-container', className: 'buttons-container' }, [
                                        React.createElement('button', {
                                            key: 'create',
                                            onClick: handleCreateConfig,
                                            disabled: !isUserAuthorized || !formData.clientName.trim() || isDownloading || fieldErrors.clientName,
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
                                                    downloadProgress || 'Создание конфига...'
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
                                                    React.createElement('span', { key: 'icon' }, currentProtocol.icon),
                                                    'Создать'
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
                            React.createElement('div', {
                                key: 'edit-overlay',
                                className: 'edit-overlay',
                                style: activeMode === 'edit' ? {} : { display: 'none' }
                            }, [
                                React.createElement('p', {
                                    key: 'message',
                                    className: 'edit-overlay-message'
                                }, 'Редактирование временно недоступно'),
                                React.createElement('button', {
                                    key: 'return-btn',
                                    onClick: (e) => {
                                        e.preventDefault();
                                        switchMode('create');
                                    },
                                    className: 'edit-return-btn',
                                    type: 'button'
                                }, [
                                    React.createElement('span', { key: 'icon' }, '←'),
                                    'Вернуться к созданию'
                                ])
                            ]),
                            React.createElement('h2', { key: 'title', className: `card-title${activeMode === 'edit' ? ' deactivated-form deactivated-header' : ''}` }, [
                                React.createElement('span', { key: 'icon' }, '✏️'),
                                'Редактирование конфига'
                            ]),
                            // Config Selection for Edit Mode
                            React.createElement('div', { key: 'config-selector', className: `config-selector${activeMode === 'edit' ? ' deactivated-form deactivated-header' : ''}` }, [
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
                                    disabled: true
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
                            React.createElement('form', { key: 'form', className: `config-form${activeMode === 'edit' ? ' deactivated-form' : ''}` }, [
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
                                        required: true,
                                        disabled: true
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
                                        className: 'form-select',
                                        disabled: true
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
                                        className: 'form-select',
                                        disabled: true
                                    }, currentProtocol.mtuOptions.map(option => 
                                        React.createElement('option', { key: option.value, value: option.value }, option.label)
                                    ))
                                ]),
                                React.createElement('div', { key: 'allowed-ips', className: 'form-group' }, [
                                    React.createElement('label', { key: 'label', className: 'form-label' }, 'Разрешенные IP'),
                                    React.createElement('select', {
                                        key: 'select',
                                        name: 'allowedIPs',
                                        value: formData.allowedIPs,
                                        onChange: handleInputChange,
                                        className: 'form-select',
                                        disabled: true
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
                                        className: 'form-select',
                                        disabled: true
                                    }, currentProtocol.keepaliveOptions.map(option => 
                                        React.createElement('option', { key: option.value, value: option.value }, option.label)
                                    ))
                                ])
                            ]),
                            // Нижние кнопки без стилей размытия
                            React.createElement('div', { key: 'edit-buttons', className: 'buttons-container' }, [
                                React.createElement('button', {
                                    key: 'update',
                                    onClick: handleCreateConfig,
                                    disabled: true,
                                    className: 'config-btn primary main-action-btn'
                                }, [
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
                                        switchMode('create');
                                    },
                                    type: 'button',
                                    className: 'config-btn secondary switch-mode-btn',
                                    disabled: false,
                                    title: 'Переключиться на создание'
                                }, [
                                    React.createElement('span', { key: 'icon', className: 'switch-icon' }, '🔄'),
                                    React.createElement('span', { key: 'text', className: 'switch-text' }, 'Создать')
                                ])
                            ])
                        ])
                    ])
                ]),

                // Config Preview Section - теперь внутри config-grid
                React.createElement('div', { key: 'preview', className: 'config-preview-section' }, [
                    React.createElement('h2', { key: 'title', className: 'preview-title' }, [
                        React.createElement('span', { key: 'icon', className: 'card-title-icon' }, currentProtocol.icon),
                        `Предварительный просмотр ${currentProtocol.name}`
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