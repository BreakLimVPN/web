function SelfPage() {
    const [isLoggedIn, setIsLoggedIn] = React.useState(false);
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

    React.useEffect(() => {
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

        const initializePage = async () => {
            await checkUserSession();
            
            // Если пользователь авторизован, проверяем токен
            if (isLoggedIn) {
                const tokenValid = await checkTokenValidity();
                if (tokenValid) {
                    setIsTokenValidated(true);
                }
            } else {
                // Если пользователь не авторизован, не проверяем токен
                setIsTokenValidated(true);
            }
        };

        initializePage();
        
        // Устанавливаем периодическую проверку токена каждые 30 секунд
        const intervalId = setInterval(checkTokenValidityPeriodically, 30000);
        return () => clearInterval(intervalId);
    }, [isLoggedIn]);

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
            const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
            const payload = {
                username: formData.username,
                password: formData.password
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok && data.ok) {
                window.location.reload();
            } else {
                setError(data.message || 'Произошла ошибка');
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
            await fetch('/api/auth/logout', { method: 'POST' });
            document.cookie = 'bvpn_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.reload();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (isLoading || !isTokenValidated) {
        return (
            <div className="loading-container">
                <div className="text-white text-2xl">{isLoading ? 'Загрузка...' : 'Проверка токена...'}</div>
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
                    <div className="text-center fade-in">
                        <h1 className="text-4xl font-bold text-green-400 mb-8">Профиль пользователя</h1>

                        <div className="user-info-card">
                            <h3>Информация об аккаунте</h3>
                            <p>Имя пользователя: <span className="user-value">{userInfo?.username || 'N/A'}</span></p>
                            <p>ID: <span className="user-value">{userInfo?.id || 'N/A'}</span></p>
                            <p>VPN клиенты: <span className="user-value">{userInfo?.vpn_clients_count || 0}</span></p>
                        </div>

                        <button 
                            onClick={handleLogout}
                            className="form-button mt-6 max-w-xs"
                            style={{ backgroundColor: 'rgba(255, 68, 68, 0.2)', borderColor: 'rgba(255, 68, 68, 0.5)', color: '#ff4444' }}
                        >
                            Выйти
                        </button>
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

                                {error && <div className="error-message">{error}</div>}

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

                                {error && <div className="error-message">{error}</div>}

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
            <div></div>
        </div>
    );
}

ReactDOM.render(<SelfPage />, document.getElementById('root'));