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

        checkUserSession();
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

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="text-white text-2xl">Загрузка...</div>
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
                    <div className={`form-container transition-all duration-500 ease-in-out ${isLoginMode ? 'fade-in' : 'fade-in-alt'}`}>
                        <h2 className="text-2xl font-bold text-center text-green-400 mb-6">
                            {isLoginMode ? 'Вход' : 'Регистрация'}
                        </h2>

                        {error && <div className="error-message">{error}</div>}

                        <form onSubmit={handleSubmit}>
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

                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    placeholder="Пароль"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="form-input pr-12"
                                    required
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyan-300 hover:text-white transition"
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

                            {!isLoginMode && (
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        placeholder="Подтвердите пароль"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        className="form-input pr-12"
                                        required
                                        disabled={isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyan-300 hover:text-white transition"
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
                            )}

                            <button 
                                type="submit" 
                                className="form-button"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Загрузка...' : (isLoginMode ? 'Войти' : 'Зарегистрироваться')}
                            </button>
                        </form>

                        <div className="form-toggle">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsLoginMode(!isLoginMode);
                                    setError('');
                                    setFormData({ username: '', password: '', confirmPassword: '' });
                                }}
                                disabled={isSubmitting}
                            >
                                {isLoginMode ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div></div>
        </div>
    );
}

ReactDOM.render(<SelfPage />, document.getElementById('root'));