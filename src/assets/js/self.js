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
                        // Загружаем конфиги после успешной авторизации
                        await fetchUserConfigs();
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

    // Функция для загрузки конфигов пользователя
    const fetchUserConfigs = async () => {
        setIsLoadingConfigs(true);
        setConfigError('');
        
        try {
            const response = await fetch('/api/configs/');
            if (response.ok) {
                const data = await response.json();
                if (data.ok && data.content) {
                    setConfigs(data.content);
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
    };

    // Функция для скачивания конфига
    const handleDownloadConfig = async (configId) => {
        setIsDownloading(true);
        try {
            const response = await fetch(`/api/configs/${configId}/download/`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `config_${configId}.conf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                setConfigError('Ошибка скачивания конфига');
            }
        } catch (error) {
            console.error('Error downloading config:', error);
            setConfigError('Ошибка скачивания конфига');
        } finally {
            setIsDownloading(false);
        }
    };

    // Функция для удаления конфига
    const handleDeleteConfig = async (configId) => {
        if (!confirm('Вы уверены, что хотите удалить этот конфиг?')) {
            return;
        }
        
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/configs/${configId}/`, {
                method: 'DELETE'
            });
            if (response.ok) {
                // Обновляем список конфигов
                await fetchUserConfigs();
            } else {
                setConfigError('Ошибка удаления конфига');
            }
        } catch (error) {
            console.error('Error deleting config:', error);
            setConfigError('Ошибка удаления конфига');
        } finally {
            setIsDeleting(false);
        }
    };

    // Функция для показа QR-кода
    const handleShowQR = async (config) => {
        setSelectedConfigForQR(config);
        setShowQRModal(true);
        
        try {
            const response = await fetch(`/api/configs/${config.id}/qr/`);
            if (response.ok) {
                const blob = await response.blob();
                const imageUrl = URL.createObjectURL(blob);
                
                // Обновляем состояние с URL изображения
                setSelectedConfigForQR({
                    ...config,
                    qrImageUrl: imageUrl
                });
            } else {
                console.error('Error fetching QR code');
            }
        } catch (error) {
            console.error('Error fetching QR code:', error);
        }
    };

    // Функция для закрытия QR-модала
    const closeQRModal = () => {
        // Очищаем URL изображения при закрытии
        if (selectedConfigForQR?.qrImageUrl) {
            URL.revokeObjectURL(selectedConfigForQR.qrImageUrl);
        }
        setShowQRModal(false);
        setSelectedConfigForQR(null);
    };

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
        <div className="flex flex-col items-center justify-between min-h-screen p-8">
            <div className="flex justify-center space-x-6 w-full mt-8">
                <button className="nav-button" onClick={() => handleNavigation('dashboard')}>Dashboard</button>
                <button className="nav-button" onClick={() => handleNavigation('servers')}>Servers</button>
                <button className="nav-button active" onClick={() => handleNavigation('account')}>Account</button>
            </div>

            <div className="flex-1 flex items-center justify-center w-full">
                {isLoggedIn ? (
                    <div className="user-profile-outer">
                        <div className="user-profile-card">
                            <div className="user-profile-header">
                                <div className="user-profile-avatar">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M16 20v-2a4 4 0 0 0-8 0v2"/></svg>
                                </div>
                                <div className="user-profile-title">Профиль</div>
                            </div>
                            <div className="user-profile-info">
                                <div className="user-profile-row">
                                    <span className="user-profile-label">Имя пользователя:</span>
                                    <span className="user-profile-value">{userInfo?.username || 'N/A'}</span>
                                </div>
                            </div>
                            
                            {/* Секция конфигов */}
                            <div className="configs-section">
                                <div className="configs-header">
                                    <h3 className="configs-title">Мои конфиги</h3>
                                    {isLoadingConfigs && <div className="configs-loading">Загрузка...</div>}
                                </div>
                                
                                {configError && (
                                    <div className="config-error">{configError}</div>
                                )}
                                
                                {configs.length === 0 && !isLoadingConfigs ? (
                                    <div className="configs-empty">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                            <polyline points="14,2 14,8 20,8"/>
                                            <line x1="16" y1="13" x2="8" y2="13"/>
                                            <line x1="16" y1="17" x2="8" y2="17"/>
                                            <polyline points="10,9 9,9 8,9"/>
                                        </svg>
                                        <span>У вас пока нет конфигов</span>
                                    </div>
                                ) : (
                                    <div className="configs-list">
                                        {configs.map((config) => (
                                            <div key={config.id} className="config-item">
                                                <div className="config-info">
                                                    <div className="config-name">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                            <polyline points="14,2 14,8 20,8"/>
                                                        </svg>
                                                        <span>Конфиг #{config.id}</span>
                                                    </div>
                                                    <div className="config-details">
                                                        <span className="config-date">
                                                            Создан: {new Date(config.created_at).toLocaleDateString('ru-RU')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="config-actions">
                                                    <button
                                                        className="config-action-btn download-btn"
                                                        onClick={() => handleDownloadConfig(config.id)}
                                                        disabled={isDownloading}
                                                        title="Скачать конфиг"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        className="config-action-btn delete-btn"
                                                        onClick={() => handleDeleteConfig(config.id)}
                                                        disabled={isDeleting}
                                                        title="Удалить конфиг"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        className="config-action-btn qr-btn"
                                                        onClick={() => handleShowQR(config)}
                                                        title="Показать QR-код"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <button 
                                onClick={handleLogout}
                                className="form-button user-profile-logout"
                                style={{ background: 'linear-gradient(90deg, rgba(255,68,68,0.15), rgba(255,68,68,0.25))', borderColor: '#ff4444', color: '#ff4444', marginTop: '32px' }}
                            >
                                Выйти
                            </button>
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
                            <h3>QR-код конфига #{selectedConfigForQR.id}</h3>
                            <button className="qr-modal-close" onClick={closeQRModal}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="qr-modal-content">
                            {selectedConfigForQR.qrImageUrl ? (
                                <div className="qr-placeholder">
                                    <img src={selectedConfigForQR.qrImageUrl} alt="QR-код" />
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
            
            <div></div>
        </div>
    );
}

ReactDOM.render(<SelfPage />, document.getElementById('root'));