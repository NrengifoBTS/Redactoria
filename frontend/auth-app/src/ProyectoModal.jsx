import React from 'react';
import './ProyectoModal.css';

const ProyectoModal = ({ isOpen, onClose, proyecto }) => {
  if (!isOpen) return null;

  // Verificar si hay múltiples links
  const hasMultipleLinks = proyecto?.links && Array.isArray(proyecto.links) && proyecto.links.length > 1;
  const hasSingleLink = proyecto?.link || (proyecto?.links && proyecto.links.length === 1);

  const handleLinkClick = (url) => {
    // Si es una ruta interna (empieza con /), usar la navegación del SPA
    if (url.startsWith('/')) {
      window.location.href = url;
    } else {
      // Si es externa, abrir en nueva pestaña
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  return (
    <div className="proyecto-modal-overlay" onClick={onClose}>
      <div className="proyecto-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="proyecto-modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="proyecto-modal-header">
          <h2 className="proyecto-modal-title">{proyecto?.titulo}</h2>
          <p className="proyecto-modal-descripcion">{proyecto?.descripcion}</p>
        </div>

        <div className="proyecto-modal-body">
          {hasMultipleLinks ? (
            <>
              <h3 className="proyecto-modal-subtitle">Selecciona una opción:</h3>
              <div className="proyecto-links-grid">
                {proyecto.links.map((linkItem, index) => (
                  <button
                    key={index}
                    className="proyecto-link-card"
                    onClick={() => handleLinkClick(linkItem.url)}
                  >
                    <div className="proyecto-link-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </div>
                    <div className="proyecto-link-content">
                      <h4 className="proyecto-link-title">{linkItem.nombre}</h4>
                      {linkItem.descripcion && (
                        <p className="proyecto-link-descripcion">{linkItem.descripcion}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : hasSingleLink ? (
            <div className="proyecto-modal-single">
              <p className="proyecto-modal-message">¿Deseas abrir este proyecto?</p>
              <button
                className="proyecto-modal-button-primary"
                onClick={() => handleLinkClick(proyecto.link || proyecto.links[0].url)}
              >
                Abrir Proyecto
              </button>
            </div>
          ) : (
            <div className="proyecto-modal-single">
              <p className="proyecto-modal-message">Este proyecto no tiene enlaces disponibles.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProyectoModal;
