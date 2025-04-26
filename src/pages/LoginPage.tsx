import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
    const [password, setPassword] = useState<string>('');
    const navigate = useNavigate();

    const handleLogin = (event: React.FormEvent) => {
        event.preventDefault();
        console.log('Attempting login with password:', password);
        // TODO: Implement actual login call to the backend
        // If successful:
        //  - Store the received JWT (e.g., in localStorage or context)
        //  - Navigate to the home page
        // If failed:
        //  - Show an error message

        // Mock success for now:
        if (password === 'password') { // Replace with actual check later
            console.log('Mock login successful!');
            navigate('/'); // Redirect to home page on successful mock login
        } else {
            alert('Mock login failed. Try password: \'password\'');
        }
    };

    return (
        <div>
            <h1>Login</h1>
            <form onSubmit={handleLogin}>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Log In</button>
            </form>
        </div>
    );
};

export default LoginPage;