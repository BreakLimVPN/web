function VPNLogin() {
    const [password, setPassword] = React.useState('');
    const inputRef = React.useRef(null);

    React.useEffect(() => {
    inputRef.current.focus();
    }, []);

    const handleInput = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPassword(value);
    };

    const handleClick = () => {
    inputRef.current.focus();
    };

    return (
    <div className="text-center text-white" onClick={handleClick}>
        <h1 className="vpn-logo mb-10">BreakLimVPN</h1>
        <div className="flex justify-center space-x-2 mb-6">
        {[...Array(6)].map((_, i) => (
            <span
            key={i}
            className={`char ${password.length > i ? 'filled glow' : ''}`}
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
    </div>
    );
}

ReactDOM.render(<VPNLogin />, document.getElementById('root'));