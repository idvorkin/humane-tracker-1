import "./LoginButton.css";

export function LoginButton() {
	const handleLogin = () => {
		// TODO: Implement login functionality
		console.log("Login clicked - not implemented yet");
	};

	return (
		<button className="login-button" onClick={handleLogin}>
			Sign In
		</button>
	);
}
