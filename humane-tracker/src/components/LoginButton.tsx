import { handleSignIn } from "../utils/authUtils";
import "./LoginButton.css";

export function LoginButton() {
	return (
		<button className="login-button" onClick={() => handleSignIn()}>
			Sign In
		</button>
	);
}
