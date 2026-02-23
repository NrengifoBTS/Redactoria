import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from './context/AppContext'; 
import './Loginmodal.css';

function LoginModal({ isOpen, onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useApp(); 
  const navigate = useNavigate();

  // No mostrar nada si el modal no está abierto
  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);

    try {
      const result = await login({ username, password });

      setLoading(false);

      if (result.success) {
        // Limpiar el formulario
        setUsername('');
        setPassword('');
        setError('');
        onClose();
      } else {
        setError(result.error || 'Authentication failed!');
      }
    } catch (error) {
      setLoading(false);
      setError('An error occurred. Please try again later.');
    }
  };

  const handleOverlayClick = (e) => {
    // Cerrar el modal solo si se hace clic en el overlay (fondo oscuro)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-contentlp">
        {/* Botón de cerrar */}
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        {/* Contenedor del login */}
        <div className="login-modal-card">
          {/* Header */}
          <div className="login-modal-header">
            <div className="login-modal-avatar">
              <span>👤</span>
            </div>
            <h1 className="login-modal-title">Login</h1>
            <p className="login-modal-subtitle">Sign in to your account</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="login-modal-form">
            {/* Campo Username */}
            <div className="modal-form-group">
              <label className="modal-form-label">Username</label>
              <div className="modal-input-wrapper">
                <span className="modal-input-icon">👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="modal-form-input"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            {/* Campo Password */}
            <div className="modal-form-group">
              <label className="modal-form-label">Password</label>
              <div className="modal-input-wrapper">
                <span className="modal-input-icon">🔒</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="modal-form-input"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="modal-error-message">
                <span className="modal-error-icon">⚠️</span>
                <p className="modal-error-text">{error}</p>
              </div>
            )}

            {/* Botón de submit */}
            <button
              type="submit"
              disabled={loading}
              className="login-modal-button"
            >
              {loading ? (
                <div className="modal-loading-spinner">
                  <div className="modal-spinner"></div>
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

export default LoginModal;