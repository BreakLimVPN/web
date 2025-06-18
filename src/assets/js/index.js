function VPNLogin() {
    const [password, setPassword] = React.useState('');
    const [isActive, setIsActive] = React.useState(false);
    const [showPopup, setShowPopup] = React.useState(false);
    const inputRef = React.useRef(null);

    React.useEffect(() => {
        inputRef.current.focus();
        setIsActive(true);

        const currentInput = inputRef.current;

        const handleFocus = () => setIsActive(true);
        const handleBlur = () => setIsActive(false);

        currentInput.addEventListener('focus', handleFocus);
        currentInput.addEventListener('blur', handleBlur);

        return () => {
            currentInput.removeEventListener('focus', handleFocus);
            currentInput.removeEventListener('blur', handleBlur);
        };
    }, []);

    const checkCodeOnBackend = async (code) => {
        const numericCode = Number(code);

        try {
            const response = await fetch('api/checkCode/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code: numericCode }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Что-то пошло не так при проверке кода.');
            }

            const data = await response.json();

            if (data.ok && data.content && data.content.accepted) {
                setPassword('');
                window.location.href = '/home';
            } else {
                setShowPopup(true);
                setPassword('');
            }

        } catch (error) {
            console.error('Error checking code:', error);
            setShowPopup(true);
            setPassword('');
        }
    };

    const handleInput = (e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setPassword(value);

        if (value.length === 6) {
            checkCodeOnBackend(value);
        }
    };

    const handleClick = () => {
        inputRef.current.focus();
    };

    const closePopup = () => {
        setShowPopup(false);
        inputRef.current.focus();
    };

    return (
        <div className="text-center text-white" onClick={handleClick}>
            <h1 className="vpn-logo mb-10">BreakLimVPN</h1>
            <div className="flex justify-center space-x-2 mb-6">
                {[...Array(6)].map((_, i) => (
                    <span
                        key={i}
                        className={`char ${password.length > i ? 'filled glow' : ''} ${isActive && i === password.length ? 'active' : ''}`}
                    >
                        {password.length > i ? password[i] : '*'}
                    </span>
                ))}
            </div>
            <input
                ref={inputRef}
                type="text"
                value={password}
                onChange={handleInput}
                maxLength="6"
            />
            <p className="text-gray-400 mt-4">Enter 6-digit code</p>

            {/* Всплывающее окно с Окак */}
            {showPopup && (
                <div className="popup-overlay" onClick={closePopup}>
                    <div className={`popup-content ${showPopup ? 'show' : ''}`} onClick={e => e.stopPropagation()}>
                        <button className="popup-close-button" onClick={closePopup}>&times;</button>
                        {/* Текст перемещен вниз */}
                        <p className="popup-message">Окак</p>
                        <p className="popup-submessage">Код не принят</p>
                    </div>
                </div>
            )}
        </div>
    );
}

ReactDOM.render(<VPNLogin />, document.getElementById('root'));