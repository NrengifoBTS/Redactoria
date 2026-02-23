import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from './context/AppContext'; 
import './login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useApp(); 
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);

    try {
      // Llama al login del contexto, que ya hace el fetch y guarda el usuario/token
      const result = await login({ username, password });

      setLoading(false);

      if (result.success) {
        // Verificar si hay una URL de retorno guardada (por expiración de token)
        const returnUrl = localStorage.getItem("returnUrl");
        if (returnUrl) {
          localStorage.removeItem("returnUrl");
          navigate(returnUrl);
        } else {
          navigate('/home');
        }
      } else {
        setError(result.error || 'Authentication failed!');
      }
    } catch (error) {
      setLoading(false);
      setError('An error occurred. Please try again later.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Contenedor principal */}
        <div className="login-card">
          {/* Header */}
          <div className="login-header">
            <div className="login-avatar">
              <span>👤</span>
            </div>
            <h1 className="login-title">Login</h1>
            <p className="login-subtitle">Sign in to your account</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="login-form">
            {/* Campo Username */}
            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            {/* Campo Password */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                <p className="error-text">{error}</p>
              </div>
            )}

            {/* Botón de submit */}
            <button
              type="submit"
              disabled={loading}
              className="login-button"
            >
              {loading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <span>Logging in...</span>
                </div>
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;