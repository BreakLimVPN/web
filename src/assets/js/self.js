function SelfPage() {
    const [isLoggedIn, setIsLoggedIn] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [userInfo, setUserInfo] = React.useState(null);
    const [isLoginMode, setIsLoginMode] = React.useState(true);
    const [formData, setFormData] = React.useState({
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [isTokenValidated, setIsTokenValidated] = React.useState(false);
    
    // Новые состояния для конфигов
    const [configs, setConfigs] = React.useState([]);
    const [isLoadingConfigs, setIsLoadingConfigs] = React.useState(false);
    const [configError, setConfigError] = React.useState('');
    const [showQRModal, setShowQRModal] = React.useState(false);
    const [selectedConfigForQR, setSelectedConfigForQR] = React.useState(null);
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    
    // Состояние для серверов
    const [servers, setServers] = React.useState([]);
    const [isLoadingServers, setIsLoadingServers] = React.useState(false);
    
    // Состояние для отслеживания переключения конфигов
    const [togglingConfigs, setTogglingConfigs] = React.useState(new Set());
    
    // Mutex для предотвращения одновременных переключений
    const toggleMutexRef = React.useRef(false);
    
    // Состояние для уведомлений
    const [notifications, setNotifications] = React.useState([]);

    const [isNavigating, setIsNavigating] = React.useState(false);
    const [loadingNavButton, setLoadingNavButton] = React.useState('');

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

        const checkUserSession = async () => {
            try {
                const cookies = document.cookie.split(';');
                const sessionCookie = cookies.find(cookie => 
                    cookie.trim().startsWith('bvpn_session=')
                );

                if (!sessionCookie) {
                    setIsLoggedIn(false);
                    setIsLoading(false);
                    return;
                }

                const response = await fetch('/api/users/self/');
                if (response.ok) {
                    const data = await response.json();
                    if (data.ok && data.content) {
                        setUserInfo(data.content);
                        setIsLoggedIn(true);
                        // Загружаем конфиги и серверы после успешной авторизации
                        await Promise.all([fetchUserConfigs(), fetchServers()]);
                    } else {
                        setIsLoggedIn(false);
                    }
                } else {
                    setIsLoggedIn(false);
                }
            } catch (error) {
                console.error('Error checking user session:', error);
                setIsLoggedIn(false);
            } finally {
                setIsLoading(false);
            }
        };

        const initializePage = async () => {
            // Сначала проверяем токен
            const tokenValid = await checkTokenValidity();
            if (tokenValid) {
                setIsTokenValidated(true);
                // Проверяем сессию пользователя только если токен валиден
                await checkUserSession();
            }
        };

        initializePage();
        
        // Устанавливаем периодическую проверку токена каждые 30 секунд
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        if (!isLoginMode && formData.password !== formData.confirmPassword) {
            setError('Пароли не совпадают');
            setIsSubmitting(false);
            return;
        }

        try {
            const endpoint = isLoginMode ? '/api/auth/login/' : '/api/auth/register/';
            let response;
            // Теперь и логин, и регистрация отправляют form-data
            const form = new FormData();
            form.append('username', formData.username);
            form.append('password', formData.password);
            response = await fetch(endpoint, {
                method: 'POST',
                body: form
            });

            const data = await response.json();

            if (response.ok && data.ok) {
                window.location.reload();
            } else {
                let errorMsg = 'Произошла ошибка';
                if (data.detail) {
                    if (typeof data.detail === 'string') {
                        errorMsg = data.detail;
                    } else if (Array.isArray(data.detail)) {
                        errorMsg = data.detail.map(e => e.msg).join('\n');
                    }
                } else if (data.message) {
                    errorMsg = data.message;
                }
                setError(errorMsg);
            }
        } catch (error) {
            console.error('Auth error:', error);
            setError('Произошла ошибка соединения');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout/', { method: 'POST' });
            document.cookie = 'bvpn_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.reload();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Функция для сортировки конфигов
    const sortConfigs = React.useCallback((configsArray) => {
        return configsArray.sort((a, b) => {
            // Сначала активные конфиги (config_enabled: true)
            if (a.config_enabled && !b.config_enabled) return -1;
            if (!a.config_enabled && b.config_enabled) return 1;
            // Если статус одинаковый, сортируем по ID (новые сверху)
            return b.id - a.id;
        });
    }, []);

    // Функция для загрузки конфигов пользователя
    const fetchUserConfigs = React.useCallback(async (skipIfToggling = true) => {
        // Если идет переключение конфига и skipIfToggling = true, пропускаем обновление
        if (skipIfToggling && toggleMutexRef.current) {
            console.log('Skipping configs update due to ongoing toggle operation');
            return;
        }
        
        setIsLoadingConfigs(true);
        setConfigError('');
        
        try {
            const response = await fetch('/api/configs/');
            if (response.ok) {
                const data = await response.json();
                if (data.ok && data.content) {
                    // Сортируем конфиги при загрузке
                    const sortedConfigs = sortConfigs(data.content);
                    setConfigs(sortedConfigs);
                } else {
                    setConfigs([]);
                }
            } else {
                setConfigs([]);
            }
        } catch (error) {
            console.error('Error fetching configs:', error);
            setConfigError('Ошибка загрузки конфигов');
            setConfigs([]);
        } finally {
            setIsLoadingConfigs(false);
        }
    }, [sortConfigs]);

    // Функция для загрузки серверов
    const fetchServers = React.useCallback(async () => {
        setIsLoadingServers(true);
        
        try {
            const response = await fetch('/api/servers/');
            if (response.ok) {
                const data = await response.json();
                if (data.ok && data.content) {
                    setServers(data.content);
                } else {
                    setServers([]);
                }
            } else {
                setServers([]);
            }
        } catch (error) {
            console.error('Error fetching servers:', error);
            setServers([]);
        } finally {
            setIsLoadingServers(false);
        }
    }, []);

    // Функция для получения информации о сервере по ID
    const getServerInfo = (serverId) => {
        return servers.find(server => server.id === serverId) || null;
    };

    // Функция для получения локации сервера
    const getServerLocation = (serverLocation) => {
        const locationMap = {
            'US': { name: 'США', flag: '🇺🇸' },
            'EU': { name: 'Европа', flag: '🇪🇺' },
            'AS': { name: 'Азия', flag: '🌏' },
            'RU': { name: 'Россия', flag: '🇷🇺' },
            'UK': { name: 'Великобритания', flag: '🇬🇧' },
            'DE': { name: 'Германия', flag: '🇩🇪' },
            'NL': { name: 'Нидерланды', flag: '🇳🇱' },
            'SG': { name: 'Сингапур', flag: '🇸🇬' },
            'JP': { name: 'Япония', flag: '🇯🇵' },
            'AU': { name: 'Австралия', flag: '🇦🇺' },
            'CA': { name: 'Канада', flag: '🇨🇦' },
            'BR': { name: 'Бразилия', flag: '🇧🇷' },
            'MX': { name: 'Мексика', flag: '🇲🇽' },
            'IN': { name: 'Индия', flag: '🇮🇳' },
            'KR': { name: 'Южная Корея', flag: '🇰🇷' },
            'FR': { name: 'Франция', flag: '🇫🇷' },
            'IT': { name: 'Италия', flag: '🇮🇹' },
            'ES': { name: 'Испания', flag: '🇪🇸' },
            'PL': { name: 'Польша', flag: '🇵🇱' },
            'CZ': { name: 'Чехия', flag: '🇨🇿' },
            'SE': { name: 'Швеция', flag: '🇸🇪' },
            'NO': { name: 'Норвегия', flag: '🇳🇴' },
            'DK': { name: 'Дания', flag: '🇩🇰' },
            'FI': { name: 'Финляндия', flag: '🇫🇮' },
            'CH': { name: 'Швейцария', flag: '🇨🇭' },
            'AT': { name: 'Австрия', flag: '🇦🇹' },
            'BE': { name: 'Бельгия', flag: '🇧🇪' },
            'IE': { name: 'Ирландия', flag: '🇮🇪' },
            'PT': { name: 'Португалия', flag: '🇵🇹' },
            'GR': { name: 'Греция', flag: '🇬🇷' },
            'HU': { name: 'Венгрия', flag: '🇭🇺' },
            'RO': { name: 'Румыния', flag: '🇷🇴' },
            'BG': { name: 'Болгария', flag: '🇧🇬' },
            'HR': { name: 'Хорватия', flag: '🇭🇷' },
            'SI': { name: 'Словения', flag: '🇸🇮' },
            'SK': { name: 'Словакия', flag: '🇸🇰' },
            'LT': { name: 'Литва', flag: '🇱🇹' },
            'LV': { name: 'Латвия', flag: '🇱🇻' },
            'EE': { name: 'Эстония', flag: '🇪🇪' },
            'IS': { name: 'Исландия', flag: '🇮🇸' },
            'LU': { name: 'Люксембург', flag: '🇱🇺' },
            'MT': { name: 'Мальта', flag: '🇲🇹' },
            'CY': { name: 'Кипр', flag: '🇨🇾' },
            'TR': { name: 'Турция', flag: '🇹🇷' },
            'IL': { name: 'Израиль', flag: '🇮🇱' },
            'AE': { name: 'ОАЭ', flag: '🇦🇪' },
            'SA': { name: 'Саудовская Аравия', flag: '🇸🇦' },
            'ZA': { name: 'ЮАР', flag: '🇿🇦' },
            'EG': { name: 'Египет', flag: '🇪🇬' },
            'NG': { name: 'Нигерия', flag: '🇳🇬' },
            'KE': { name: 'Кения', flag: '🇰🇪' },
            'TH': { name: 'Таиланд', flag: '🇹🇭' },
            'VN': { name: 'Вьетнам', flag: '🇻🇳' },
            'MY': { name: 'Малайзия', flag: '🇲🇾' },
            'PH': { name: 'Филиппины', flag: '🇵🇭' },
            'ID': { name: 'Индонезия', flag: '🇮🇩' },
            'TW': { name: 'Тайвань', flag: '🇹🇼' },
            'HK': { name: 'Гонконг', flag: '🇭🇰' },
            'NZ': { name: 'Новая Зеландия', flag: '🇳🇿' },
            'CL': { name: 'Чили', flag: '🇨🇱' },
            'AR': { name: 'Аргентина', flag: '🇦🇷' },
            'PE': { name: 'Перу', flag: '🇵🇪' },
            'CO': { name: 'Колумбия', flag: '🇨🇴' },
            'VE': { name: 'Венесуэла', flag: '🇻🇪' },
            'EC': { name: 'Эквадор', flag: '🇪🇨' },
            'UY': { name: 'Уругвай', flag: '🇺🇾' },
            'PY': { name: 'Парагвай', flag: '🇵🇾' },
            'BO': { name: 'Боливия', flag: '🇧🇴' },
            'CR': { name: 'Коста-Рика', flag: '🇨🇷' },
            'PA': { name: 'Панама', flag: '🇵🇦' },
            'GT': { name: 'Гватемала', flag: '🇬🇹' },
            'SV': { name: 'Сальвадор', flag: '🇸🇻' },
            'HN': { name: 'Гондурас', flag: '🇭🇳' },
            'NI': { name: 'Никарагуа', flag: '🇳🇮' },
            'BZ': { name: 'Белиз', flag: '🇧🇿' },
            'GY': { name: 'Гайана', flag: '🇬🇾' },
            'SR': { name: 'Суринам', flag: '🇸🇷' },
            'GF': { name: 'Французская Гвиана', flag: '🇬🇫' },
            'FK': { name: 'Фолклендские острова', flag: '🇫🇰' },
            'GS': { name: 'Южная Георгия', flag: '🇬🇸' },
            'AQ': { name: 'Антарктида', flag: '🏔️' },
            'UNKNOWN': { name: 'Неизвестно', flag: '🌍' },
            // Новые локации
            'KZ': { name: 'Казахстан', flag: '🇰🇿' },
            'kz-1': { name: 'Казахстан', flag: '🇰🇿' },
            'kz': { name: 'Казахстан', flag: '🇰🇿' },
            'UA': { name: 'Украина', flag: '🇺🇦' },
            'ua': { name: 'Украина', flag: '🇺🇦' },
            'BY': { name: 'Беларусь', flag: '🇧🇾' },
            'by': { name: 'Беларусь', flag: '🇧🇾' },
            'MD': { name: 'Молдова', flag: '🇲🇩' },
            'md': { name: 'Молдова', flag: '🇲🇩' },
            'GE': { name: 'Грузия', flag: '🇬🇪' },
            'ge': { name: 'Грузия', flag: '🇬🇪' },
            'AM': { name: 'Армения', flag: '🇦🇲' },
            'am': { name: 'Армения', flag: '🇦🇲' },
            'AZ': { name: 'Азербайджан', flag: '🇦🇿' },
            'az': { name: 'Азербайджан', flag: '🇦🇿' },
            'KG': { name: 'Кыргызстан', flag: '🇰🇬' },
            'kg': { name: 'Кыргызстан', flag: '🇰🇬' },
            'TJ': { name: 'Таджикистан', flag: '🇹🇯' },
            'tj': { name: 'Таджикистан', flag: '🇹🇯' },
            'TM': { name: 'Туркменистан', flag: '🇹🇲' },
            'tm': { name: 'Туркменистан', flag: '🇹🇲' },
            'UZ': { name: 'Узбекистан', flag: '🇺🇿' },
            'uz': { name: 'Узбекистан', flag: '🇺🇿' }
        };
        
        return locationMap[serverLocation] || { name: serverLocation, flag: '🌍' };
    };

    // Функция для скачивания конфига
    const handleDownloadConfig = async (configId) => {
        setIsDownloading(true);
        try {
            const response = await fetch(`/api/configs/${configId}/configuration/`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                
                // Получаем имя файла из заголовка Content-Disposition или используем fallback
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = `config_${configId}.conf`;
                
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    if (filenameMatch) {
                        filename = filenameMatch[1];
                    }
                }
                
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                // Показываем уведомление об успешном скачивании
                showNotification('Конфиг успешно скачан', 'success');
            } else {
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = 'Ошибка скачивания конфига';
                
                if (errorData.detail) {
                    if (typeof errorData.detail === 'string') {
                        errorMessage = errorData.detail;
                    } else if (Array.isArray(errorData.detail)) {
                        errorMessage = errorData.detail.map(e => e.msg).join('\n');
                    }
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
                
                showNotification(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Error downloading config:', error);
            showNotification('Ошибка соединения при скачивании конфига', 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    // Функция для удаления конфига
    const handleDeleteConfig = React.useCallback(async (configId) => {
        if (!confirm('Вы уверены, что хотите удалить этот конфиг?')) {
            return;
        }
        
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/configs/${configId}/`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (response.ok && data.ok) {
                // Успешное удаление - обновляем список конфигов и серверов
                await Promise.all([fetchUserConfigs(), fetchServers()]);
                
                // Показываем уведомление об успехе
                showNotification('Конфиг успешно удален', 'success');
            } else {
                // Показываем ошибку
                let errorMessage = 'Ошибка удаления конфига';
                if (data.detail) {
                    if (typeof data.detail === 'string') {
                        errorMessage = data.detail;
                    } else if (Array.isArray(data.detail)) {
                        errorMessage = data.detail.map(e => e.msg).join('\n');
                    }
                } else if (data.message) {
                    errorMessage = data.message;
                }
                
                showNotification(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Error deleting config:', error);
            showNotification('Ошибка соединения при удалении конфига', 'error');
        } finally {
            setIsDeleting(false);
        }
    }, [fetchUserConfigs, fetchServers, showNotification]);

    // --- SVG QR-код: уменьшение размера ---
    function normalizeQrSvg(svgText) {
        if (!svgText) return svgText;
        // Удаляем width/height, если они есть
        let svg = svgText.replace(/(width|height)="[^"]*"/g, '');
        // Добавляем width="100%" height="100%" к <svg ...>
        svg = svg.replace(/<svg\s+/i, '<svg width="100%" height="100%" ');
        // Заменяем все fill, кроме fill="none" и fill="#000"/fill="#000000", на белый
        svg = svg.replace(/fill="(?!none)(?!#000000?)[^"]*"/gi, 'fill="#fff"');
        // Заменяем все stroke, кроме stroke="none" и stroke="#000"/stroke="#000000", на белый
        svg = svg.replace(/stroke="(?!none)(?!#000000?)[^"]*"/gi, 'stroke="#fff"');
        return svg;
    }

    // Функция для показа QR-кода
    const handleShowQR = React.useCallback(async (config) => {
        setSelectedConfigForQR(config);
        setShowQRModal(true);
        
        try {
            const response = await fetch(`/api/configs/${config.id}/qr/`);
            if (response.ok) {
                let svgText = await response.text();
                svgText = normalizeQrSvg(svgText); // уменьшить SVG
                // Обновляем состояние с SVG текстом
                setSelectedConfigForQR({
                    ...config,
                    qrSvg: svgText
                });
            } else {
                console.error('Error fetching QR code');
                showNotification('Ошибка загрузки QR-кода', 'error');
            }
        } catch (error) {
            console.error('Error fetching QR code:', error);
            showNotification('Ошибка соединения при загрузке QR-кода', 'error');
        }
    }, [showNotification]);

    // Функция для закрытия QR-модала
    const closeQRModal = () => {
        setShowQRModal(false);
        setSelectedConfigForQR(null);
    };

    // Функция для показа уведомлений
    const showNotification = React.useCallback((message, type = 'success') => {
        const id = Date.now() + Math.random();
        const notification = { id, message, type };
        
        setNotifications(prev => [...prev, notification]);
        
        // Автоматически удаляем уведомление через 3 секунды
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000);
    }, []);

    // Функция для переключения статуса конфига
    const handleToggleConfig = React.useCallback(async (configId, currentStatus) => {
        // Проверяем Mutex - если уже идет переключение, блокируем новые
        if (toggleMutexRef.current) {
            console.log('Toggle operation in progress, blocking new toggle');
            return;
        }
        
        // Предотвращаем повторные клики на тот же конфиг
        if (togglingConfigs.has(configId)) {
            return;
        }
        
        // Проверяем, что конфиг все еще существует
        const configExists = configs.find(config => config.id === configId);
        if (!configExists) {
            console.warn('Config not found during toggle:', configId);
            return;
        }
        
        // Устанавливаем Mutex
        toggleMutexRef.current = true;
        
        // Добавляем конфиг в список переключающихся
        setTogglingConfigs(prev => new Set(prev).add(configId));
        
        // Оптимистичное обновление UI с сохранением стабильной сортировки
        const originalConfigs = [...configs];
        const updatedConfigs = configs.map(config => 
            config.id === configId 
                ? { ...config, config_enabled: !currentStatus }
                : config
        );
        
        // Применяем стабильную сортировку
        const sortedConfigs = sortConfigs(updatedConfigs);
        setConfigs(sortedConfigs);
        
        try {
            const response = await fetch(`/api/configs/${configId}/toggle/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    enabled: !currentStatus
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.ok) {
                // Успешное переключение - принудительно обновляем данные с сервера
                await Promise.all([
                    fetchUserConfigs(false), // Принудительно обновляем, игнорируя Mutex
                    fetchServers()
                ]);
                
                // Показываем уведомление об успехе
                const statusText = !currentStatus ? 'активирован' : 'деактивирован';
                showNotification(`Конфиг успешно ${statusText}`, 'success');
            } else {
                // Ошибка - возвращаем исходное состояние с правильной сортировкой
                const originalSortedConfigs = sortConfigs(originalConfigs);
                setConfigs(originalSortedConfigs);
                
                // Показываем ошибку
                let errorMessage = 'Ошибка переключения статуса конфига';
                if (data.detail) {
                    if (typeof data.detail === 'string') {
                        errorMessage = data.detail;
                    } else if (Array.isArray(data.detail)) {
                        errorMessage = data.detail.map(e => e.msg).join('\n');
                    }
                } else if (data.message) {
                    errorMessage = data.message;
                }
                
                showNotification(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Error toggling config:', error);
            
            // Возвращаем исходное состояние при ошибке сети с правильной сортировкой
            const originalSortedConfigs = sortConfigs(originalConfigs);
            setConfigs(originalSortedConfigs);
            showNotification('Ошибка соединения при переключении конфига', 'error');
        } finally {
            // Удаляем конфиг из списка переключающихся
            setTogglingConfigs(prev => {
                const newSet = new Set(prev);
                newSet.delete(configId);
                return newSet;
            });
            
            // Освобождаем Mutex с небольшой задержкой для предотвращения race conditions
            setTimeout(() => {
                toggleMutexRef.current = false;
            }, 100);
        }
    }, [configs, togglingConfigs, fetchUserConfigs, fetchServers, showNotification, sortConfigs]);

    if (isLoading || !isTokenValidated || isLoggedIn === null) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-dots">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                </div>
                <div className="loading-text">{isLoading ? 'Загрузка...' : !isTokenValidated ? 'Проверка токена...' : 'Проверка авторизации...'}</div>
            </div>
        );
    }

    return (
        <div className="profile-page">
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

            {/* Navigation Bar (унифицированный стиль) */}
            <nav
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '24px',
                    marginBottom: '64px',
                    marginTop: '32px',
                }}
            >
                {['dashboard', 'servers', 'account'].map(page => (
                    <button
                        key={page}
                        onClick={() => handleNavigation(page)}
                        disabled={isNavigating}
                        className={`nav-button ${page === 'account' ? 'active' : ''} ${loadingNavButton === page ? 'loading' : ''}`}
                        style={{
                            opacity: isNavigating && loadingNavButton !== page ? 0.5 : 1
                        }}
                    >
                        {page.charAt(0).toUpperCase() + page.slice(1)}
                    </button>
                ))}
            </nav>

            {/* Основной контент */}
            <div className="profile-content">
                {isLoggedIn ? (
                    <div className="profile-layout">
                        {/* Левая панель - информация о пользователе */}
                        <div className="profile-sidebar">
                            <div className="user-card">
                                <div className="user-avatar">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="8" r="4"/>
                                        <path d="M16 20v-2a4 4 0 0 0-8 0v2"/>
                                    </svg>
                                </div>
                                <div className="user-info">
                                    <h2 className="user-name">{userInfo?.username || 'N/A'}</h2>
                                    <div className="user-status">
                                        <div className="status-indicator online"></div>
                                        <span>Онлайн</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleLogout}
                                    className="logout-button"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                        <polyline points="16,17 21,12 16,7"/>
                                        <line x1="21" y1="12" x2="9" y2="12"/>
                                    </svg>
                                    Выйти
                                </button>
                            </div>
                            
                            {/* Статистика */}
                            <div className="stats-card">
                                <h3 className="stats-title">Статистика</h3>
                                <div className="stats-grid">
                                    <div className="stat-item">
                                        <div className="stat-value">{configs.length}</div>
                                        <div className="stat-label">Конфигов</div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-value">{configs.filter(c => c.config_enabled).length}</div>
                                        <div className="stat-label">Активных</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Правая панель - конфиги */}
                        <div className="configs-panel">
                            <div className="configs-header">
                                <div className="configs-title-section">
                                    <h1 className="configs-main-title">Мои конфиги</h1>
                                    <p className="configs-subtitle">Управляйте вашими VPN конфигурациями</p>
                                </div>
                                <div className="configs-actions">
                                    {isLoadingConfigs && (
                                        <div className="loading-indicator">
                                            <div className="loading-spinner"></div>
                                            <span>Загрузка...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {configError && (
                                <div className="error-banner">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"/>
                                        <line x1="15" y1="9" x2="9" y2="15"/>
                                        <line x1="9" y1="9" x2="15" y2="15"/>
                                    </svg>
                                    {configError}
                                </div>
                            )}
                            
                            {configs.length === 0 && !isLoadingConfigs ? (
                                <div className="empty-state">
                                    <div className="empty-icon">
                                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                            <polyline points="14,2 14,8 20,8"/>
                                            <line x1="16" y1="13" x2="8" y2="13"/>
                                            <line x1="16" y1="17" x2="8" y2="17"/>
                                            <polyline points="10,9 9,9 8,9"/>
                                        </svg>
                                    </div>
                                    <h3 className="empty-title">У вас пока нет конфигов</h3>
                                    <p className="empty-description">Создайте первый конфиг для подключения к VPN серверу</p>
                                    <button className="create-config-btn" onClick={() => handleNavigation('servers')}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19"/>
                                            <line x1="5" y1="12" x2="19" y2="12"/>
                                        </svg>
                                        Создать конфиг
                                    </button>
                                </div>
                            ) : (
                                <div className="configs-grid">
                                    {(() => {
                                        const sortedConfigs = sortConfigs([...configs]);
                                        
                                        const activeConfigs = sortedConfigs.filter(config => config.config_enabled);
                                        const inactiveConfigs = sortedConfigs.filter(config => !config.config_enabled);
                                        
                                        return (
                                            <>
                                                {/* Активные конфиги */}
                                                {activeConfigs.length > 0 && (
                                                    <>
                                                        {activeConfigs.map((config) => (
                                                            <div key={config.id} className="config-card">
                                                                <div className="config-main-details">
                                                                    {getServerInfo(config.server_id) && (
                                                                        <span className="config-server-info">
                                                                            {getServerInfo(config.server_id).image_url ? (
                                                                                <img 
                                                                                    src={getServerInfo(config.server_id).image_url} 
                                                                                    alt={getServerLocation(getServerInfo(config.server_id).server_location).name}
                                                                                    className="server-flag-image"
                                                                                    onError={(e) => {
                                                                                        e.target.style.display = 'none';
                                                                                        e.target.nextSibling.style.display = 'inline';
                                                                                    }}
                                                                                />
                                                                            ) : null}
                                                                            <span className="flag-emoji" style={{ display: getServerInfo(config.server_id).image_url ? 'none' : 'inline' }}>
                                                                                {getServerLocation(getServerInfo(config.server_id).server_location).flag}
                                                                            </span>
                                                                            <span className="server-name">
                                                                                {getServerInfo(config.server_id).name || `Сервер #${config.server_id}`}
                                                                            </span>
                                                                        </span>
                                                                    )}
                                                                    <div className="config-name-and-status">
                                                                        <h3 className="config-name">{config.config_name || `Конфиг #${config.id}`}</h3>
                                                                        <div className="config-status enabled">
                                                                            <div className="status-dot online"></div>
                                                                            Активен
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="config-actions">
                                                                    <button
                                                                        className={`toggle-slider enabled ${togglingConfigs.has(config.id) ? 'loading' : ''} ${toggleMutexRef.current && !togglingConfigs.has(config.id) ? 'blocked' : ''}`}
                                                                        onClick={() => handleToggleConfig(config.id, config.config_enabled)}
                                                                        disabled={togglingConfigs.has(config.id) || (toggleMutexRef.current && !togglingConfigs.has(config.id))}
                                                                        title={toggleMutexRef.current && !togglingConfigs.has(config.id) ? "Подождите, идет переключение другого конфига" : "Отключить конфиг"}
                                                                    >
                                                                        <div className="toggle-slider-thumb">
                                                                            {togglingConfigs.has(config.id) && (
                                                                                <div className="toggle-spinner"></div>
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                    <button
                                                                        className="action-btn download-btn"
                                                                        onClick={() => handleDownloadConfig(config.id)}
                                                                        disabled={isDownloading}
                                                                        title="Скачать конфиг"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        className="action-btn qr-btn"
                                                                        onClick={() => handleShowQR(config)}
                                                                        title="Показать QR-код"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        className="action-btn delete-btn"
                                                                        onClick={() => handleDeleteConfig(config.id)}
                                                                        disabled={isDeleting}
                                                                        title="Удалить конфиг"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
                                                
                                                {/* Разделитель между активными и неактивными конфигами */}
                                                {activeConfigs.length > 0 && inactiveConfigs.length > 0 && (
                                                    <div className="configs-divider">
                                                        <div className="divider-line"></div>
                                                        <span className="divider-text">Неактивные конфиги</span>
                                                        <div className="divider-line"></div>
                                                    </div>
                                                )}
                                                
                                                {/* Неактивные конфиги */}
                                                {inactiveConfigs.map((config) => (
                                                    <div key={config.id} className="config-card disabled">
                                                        <div className="config-main-details">
                                                            {getServerInfo(config.server_id) && (
                                                                <span className="config-server-info">
                                                                    {getServerInfo(config.server_id).image_url ? (
                                                                        <img 
                                                                            src={getServerInfo(config.server_id).image_url} 
                                                                            alt={getServerLocation(getServerInfo(config.server_id).server_location).name}
                                                                            className="server-flag-image"
                                                                            onError={(e) => {
                                                                                        e.target.style.display = 'none';
                                                                                        e.target.nextSibling.style.display = 'inline';
                                                                                    }}
                                                                        />
                                                                    ) : null}
                                                                    <span className="flag-emoji" style={{ display: getServerInfo(config.server_id).image_url ? 'none' : 'inline' }}>
                                                                        {getServerLocation(getServerInfo(config.server_id).server_location).flag}
                                                                    </span>
                                                                    <span className="server-name">
                                                                        {getServerInfo(config.server_id).name || `Сервер #${config.server_id}`}
                                                                    </span>
                                                                </span>
                                                            )}
                                                            <div className="config-name-and-status">
                                                                <h3 className="config-name">{config.config_name || `Конфиг #${config.id}`}</h3>
                                                                <div className="config-status disabled">
                                                                    <div className="status-dot offline"></div>
                                                                    Отключен
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="config-actions">
                                                            <button
                                                                className={`toggle-slider disabled ${togglingConfigs.has(config.id) ? 'loading' : ''} ${toggleMutexRef.current && !togglingConfigs.has(config.id) ? 'blocked' : ''}`}
                                                                onClick={() => handleToggleConfig(config.id, config.config_enabled)}
                                                                disabled={togglingConfigs.has(config.id) || (toggleMutexRef.current && !togglingConfigs.has(config.id))}
                                                                title={toggleMutexRef.current && !togglingConfigs.has(config.id) ? "Подождите, идет переключение другого конфига" : "Активировать конфиг"}
                                                            >
                                                                <div className="toggle-slider-thumb">
                                                                    {togglingConfigs.has(config.id) && (
                                                                        <div className="toggle-spinner"></div>
                                                                    )}
                                                                </div>
                                                            </button>
                                                            <button
                                                                className="action-btn download-btn"
                                                                onClick={() => handleDownloadConfig(config.id)}
                                                                disabled={isDownloading}
                                                                title="Скачать конфиг"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                className="action-btn qr-btn"
                                                                onClick={() => handleShowQR(config)}
                                                                title="Показать QR-код"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                className="action-btn delete-btn"
                                                                onClick={() => handleDeleteConfig(config.id)}
                                                                disabled={isDeleting}
                                                                title="Удалить конфиг"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="auth-slider-container">
                        <div className="auth-form-wrapper">
                            {/* Login Form */}
                            <div className={`auth-form ${isLoginMode ? 'active' : 'inactive'}`}>
                                <div className="form-header">
                                    <h2 className="form-title">Вход в систему</h2>
                                    <div className="form-subtitle">Добро пожаловать обратно</div>
                                </div>

                                {error && (
                                    <div className="error-message" style={{ whiteSpace: 'pre-line', border: '1.5px solid #ff4444', background: 'rgba(255,68,68,0.08)', color: '#ff4444', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '15px', fontWeight: 500 }}>
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    <div className="input-group">
                                        <div className="input-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            name="username"
                                            placeholder="Имя пользователя"
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            required
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <div className="input-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            placeholder="Пароль"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            required
                                            disabled={isSubmitting}
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowPassword(prev => !prev)}
                                            tabIndex={-1}
                                            aria-label="Toggle password visibility"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                {showPassword ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.057.163-2.074.462-3.029m2.445-2.445A9.956 9.956 0 0112 5c5.523 0 10 4.477 10 10 0 1.164-.206 2.28-.583 3.304m-2.512 2.512A9.975 9.975 0 0112 19c-.656 0-1.3-.065-1.925-.187" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-.284.884-.678 1.712-1.17 2.464" />
                                                )}
                                            </svg>
                                        </button>
                                    </div>

                                    <button 
                                        type="submit" 
                                        className="form-button"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <div className="button-loading">
                                                <div className="button-spinner"></div>
                                                <span>Вход...</span>
                                            </div>
                                        ) : (
                                            'Войти в систему'
                                        )}
                                    </button>
                                </form>

                                <div className="form-footer">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsLoginMode(false);
                                            setError('');
                                            setFormData({ username: '', password: '', confirmPassword: '' });
                                        }}
                                        disabled={isSubmitting}
                                        className="form-switch-btn"
                                    >
                                        Нет аккаунта? Создать
                                    </button>
                                </div>
                            </div>

                            {/* Register Form */}
                            <div className={`auth-form ${!isLoginMode ? 'active' : 'inactive'}`}>
                                <div className="form-header">
                                    <h2 className="form-title">Регистрация</h2>
                                    <div className="form-subtitle">Создайте новый аккаунт</div>
                                </div>

                                {error && (
                                    <div className="error-message" style={{ whiteSpace: 'pre-line', border: '1.5px solid #ff4444', background: 'rgba(255,68,68,0.08)', color: '#ff4444', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '15px', fontWeight: 500 }}>
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    <div className="input-group">
                                        <div className="input-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            name="username"
                                            placeholder="Имя пользователя"
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            required
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <div className="input-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            placeholder="Пароль"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            required
                                            disabled={isSubmitting}
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowPassword(prev => !prev)}
                                            tabIndex={-1}
                                            aria-label="Toggle password visibility"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                {showPassword ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.057.163-2.074.462-3.029m2.445-2.445A9.956 9.956 0 0112 5c5.523 0 10 4.477 10 10 0 1.164-.206 2.28-.583 3.304m-2.512 2.512A9.975 9.975 0 0112 19c-.656 0-1.3-.065-1.925-.187" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-.284.884-.678 1.712-1.17 2.464" />
                                                )}
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="input-group">
                                        <div className="input-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            name="confirmPassword"
                                            placeholder="Подтвердите пароль"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            required
                                            disabled={isSubmitting}
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowConfirmPassword(prev => !prev)}
                                            tabIndex={-1}
                                            aria-label="Toggle confirm password visibility"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                {showConfirmPassword ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.057.163-2.074.462-3.029m2.445-2.445A9.956 9.956 0 0112 5c5.523 0 10 4.477 10 10 0 1.164-.206 2.28-.583 3.304m-2.512 2.512A9.975 9.975 0 0112 19c-.656 0-1.3-.065-1.925-.187" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-.284.884-.678 1.712-1.17 2.464" />
                                                )}
                                            </svg>
                                        </button>
                                    </div>

                                    <button 
                                        type="submit" 
                                        className="form-button"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <div className="button-loading">
                                                <div className="button-spinner"></div>
                                                <span>Создание...</span>
                                            </div>
                                        ) : (
                                            'Создать аккаунт'
                                        )}
                                    </button>
                                </form>

                                <div className="form-footer">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsLoginMode(true);
                                            setError('');
                                            setFormData({ username: '', password: '', confirmPassword: '' });
                                        }}
                                        disabled={isSubmitting}
                                        className="form-switch-btn"
                                    >
                                        Уже есть аккаунт? Войти
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* QR Modal */}
            {showQRModal && selectedConfigForQR && (
                <div className="qr-modal-overlay" onClick={closeQRModal}>
                    <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="qr-modal-header">
                            <h3>QR-код {selectedConfigForQR.config_name || `#${selectedConfigForQR.id}`}</h3>
                            <button className="qr-modal-close" onClick={closeQRModal}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="qr-modal-content">
                            {selectedConfigForQR.qrSvg ? (
                                <div className="qr-placeholder">
                                    <div 
                                        dangerouslySetInnerHTML={{ __html: selectedConfigForQR.qrSvg }}
                                    />
                                </div>
                            ) : (
                                <div className="qr-placeholder">
                                    <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                    <p>Загрузка QR-кода...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Notifications */}
            <div className="notifications-container">
                {notifications.map((notification) => (
                    <div 
                        key={notification.id} 
                        className={`notification ${notification.type}`}
                    >
                        <div className="notification-icon">
                            {notification.type === 'success' ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                    <polyline points="22,4 12,14.01 9,11.01"/>
                                </svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="15" y1="9" x2="9" y2="15"/>
                                    <line x1="9" y1="9" x2="15" y2="15"/>
                                </svg>
                            )}
                        </div>
                        <div className="notification-message">{notification.message}</div>
                        <button 
                            className="notification-close"
                            onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

ReactDOM.render(<SelfPage />, document.getElementById('root'));