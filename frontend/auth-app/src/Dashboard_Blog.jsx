import "@iconscout/unicons/css/line.css";
import "./css/dashboard_Blog.css";
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useBlogs } from "./hooks/useApi.js";
import { useUsers, useFilters, useSearch } from "./hooks/useApi.js";
import apiService from "./services/apiService.js";
import { useCurrentUser } from "./hooks/useApi.js";
import { isAdminUser, isEditorUser } from "./utils/roles";

// -----------------------------------------------------------------------------
// FUNCIONES AUXILIARES DE VISTA
// -----------------------------------------------------------------------------

const getStatusText = (status) => {
  const texts = {
    draft: "Borrador",
    generated: "Estructura Generada",
    review: "En Revisión",
    reviewed_ai: "Revisado con IA",
    approved: "Aprobado",
    published: "Publicado",
    ajusted: "Ajustes Aplicados",
  };
  return texts[status] || status;
};

const getUserName = (userId, users) => {
  if (!userId || !users) return "N/A"; // Maneja casos nulos (desasignado)

  // Busca el usuario por su ID (UUID)
  const user = users.find((u) => u.id === userId);
  return user ? user.name || user.email : "Desconocido"; // Muestra el nombre o email
};

// Función auxiliar para formatear la fecha
const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    // Formato: DD/MM/YYYY HH:MM
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "Fecha inválida";
  }
};

function EditBlogModal({ blog, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: blog.title || "",
    categoria: blog.categoria || "",
    estado: blog.estado,
    prioridad: blog.prioridad,
    keywords: blog.keywords,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (error) {
      console.error("Error al actualizar el blog:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">Editar Blog</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Título */}
          <div className="form-group">
            <label>Título del Proyecto</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>

          {/* Keywords de Apoyo */}
          <div className="form-group">
            <label>Keywords (separadas por coma)</label>
            <textarea
              value={formData.keywords}
              onChange={(e) =>
                setFormData({ ...formData, keywords: e.target.value })
              }
              placeholder="ej: seguros, arriendo, colombia"
              className="auto-expand"
              rows="3"
            />
          </div>

          {/* Categoría y Estado en fila (Opcional, usando idea-layout o similar) */}
          <div className="form-row">
            <div className="form-group flex-1">
              <label>Categoría / Proyecto</label>
              <select
                value={formData.categoria}
                onChange={(e) =>
                  setFormData({ ...formData, categoria: e.target.value })
                }
                required
              >
                <option value="">Selecciona...</option>
                <option value="arriendo">Arriendo</option>
                <option value="viajemos">Viajemos</option>
                <option value="guia_legal">Guía Legal</option>
              </select>
            </div>

            <div className="form-group flex-1">
              <label>Estado</label>
              <select
                value={formData.estado}
                onChange={(e) =>
                  setFormData({ ...formData, estado: e.target.value })
                }
              >
                <option value="draft">Borrador</option>
                <option value="generated">Estructura Generada</option>
                <option value="published">Publicado</option>
                <option value="review">En revision</option>
                <option value="reviewed_ai">Revisado con IA</option>
                <option value="approved">Aprobado</option>
                <option value="ajusted">Ajustes aplicados</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Prioridad</label>
            <select
              value={formData.prioridad}
              onChange={(e) =>
                setFormData({ ...formData, prioridad: e.target.value })
              }
            >
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
            </select>
          </div>

          {/* Botones de acción */}
          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-cancel"
            >
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-generate">
              {loading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// CONFIGURACIÓN DINÁMICA POR CATEGORÍA
// -----------------------------------------------------------------------------
const configsPorCategoria = {
  Viajemos: {
    tecnicas: ["SEO Narrativo", "Top y Curiosidades", "Guía de Destino"],
    tonos: ["Cercano y Entusiasta", "Inspirador", "Amigable"],
    acentos: ["Neutral", "Español(España)", "Mexico", "Colombia"],
  },
  Arriendo: {
    tecnicas: ["Informativa", "Comparativa de Precios", "Guía de Trámites"],
    tonos: ["Profesional", "Directo", "Amigable"],
    acentos: ["Neutral", "Colombia", "Mexico"],
  },
  "Guia legal": {
    tecnicas: ["Explicativa Educativa", "Análisis de Normativas"],
    tonos: ["Formal", "Analítico", "Profesional"],
    acentos: ["Neutral"],
  },
};

// -----------------------------------------------------------------------------
// 1. COMPONENTE MODAL DE CREACIÓN DE BORRADOR INICIAL (DINÁMICO)
// -----------------------------------------------------------------------------
const ModalCreacionBlog = ({ onClose, onCreateSuccess }) => {
  const [formData, setFormData] = useState({
    title: "",
    categoria: "",
    keywords: "",
    idioma: "Español",
    tecnica: "",
    acento: "",
    tono: "",
    prioridad: "Baja",
  });

  const { createBlog } = useBlogs();
  const [loading, setLoading] = useState(false);

  // MANEJADOR ESPECÍFICO PARA CATEGORÍA
  const handleCategoriaChange = (e) => {
    const nuevaCat = e.target.value;
    const config = configsPorCategoria[nuevaCat];

    setFormData((prev) => ({
      ...prev,
      categoria: nuevaCat,
      // Al cambiar categoría, reseteamos los valores dependientes a los primeros de la lista
      tecnica: config ? config.tecnicas[0] : "",
      tono: config ? config.tonos[0] : "",
      acento: config ? config.acentos[0] : "",
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...formData,
        name: formData.title,
        status: "draft",
      };
      const newBlog = await createBlog(payload);
      if (newBlog && newBlog.id) {
        onCreateSuccess(newBlog);
      } else {
        throw new Error("No se pudo obtener el ID del borrador creado.");
      }
    } catch (error) {
      alert(`Error al guardar la idea inicial: ${error.message}`);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Obtener la configuración actual según la categoría seleccionada
  const currentConfig = configsPorCategoria[formData.categoria];

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Generar Idea y Borrador Inicial</h2>
          <button
            className="btn-close"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <i className="uil uil-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Sección Principal */}
          <div className="form-group">
            <label>Título del Blog / Tema Central</label>
            <input
              type="text"
              name="title"
              placeholder="Ej: Tendencias de arriendo en 2024"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="categoria">Categoría</label>
            <select
              id="categoria"
              name="categoria"
              value={formData.categoria}
              onChange={handleCategoriaChange}
              required
            >
              <option value="">Seleccionar...</option>
              <option value="Arriendo">Arriendo</option>
              <option value="Viajemos">Viajemos</option>
              <option value="Guia legal">Guía Legal</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="keywords">Keywords Secundarias</label>
            <textarea
              name="keywords"
              value={formData.keywords}
              onChange={handleChange}
              rows="2"
              placeholder="Separa con comas (ej: impuestos, contrato alquiler)"
            />
          </div>

          {/* CAMPOS DINÁMICOS: Aparecen con una transición suave */}
          {currentConfig && (
            <div className="dynamic-fields-section">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="idioma">Idioma</label>
                  <select
                    name="idioma"
                    value={formData.idioma}
                    onChange={handleChange}
                    required
                  >
                    <option value="Español">Español</option>
                    <option value="Ingles">Inglés</option>
                    <option value="Portugés">Portugués</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="prioridad">Prioridad</label>
                  <select
                    name="prioridad"
                    value={formData.prioridad}
                    onChange={handleChange}
                    required
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button
              type="submit"
              className="btn-generate"
              disabled={loading || !formData.categoria}
            >
              {loading ? (
                <>
                  <i className="uil uil-spinner-alt spin"></i> Guardando...
                </>
              ) : (
                "Generar Idea y Borrador"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal reutilizado del Dashboard principal
function AssignModal({ proyecto, users, onClose, onAssign }) {
  // 'proyecto' aquí es el objeto 'blog' que pasamos desde la tabla
  const [selectedUser, setSelectedUser] = useState(proyecto?.assigned_to || "");
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    try {
      setLoading(true);
      // Ejecutamos la función que pasamos desde el DashboardBlog
      await onAssign(proyecto.id, selectedUser || null);
    } catch (error) {
      console.error("Error in assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "0.75rem",
          minWidth: "400px",
        }}
      >
        <h2 style={{ margin: "0 0 1.5rem 0" }}>Asignar Usuario</h2>

        <p style={{ marginBottom: "1rem", color: "#64748b" }}>
          {/* Usamos title porque es un Blog */}
          Blog: <strong>{proyecto?.title}</strong>
        </p>

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "500",
            }}
          >
            Asignar a
          </label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "0.375rem",
              border: "1px solid #d1d5db",
            }}
          >
            <option value="">Sin asignar</option>
            {users?.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}
        >
          <button
            onClick={onClose}
            className="btn-generate"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#f63b3b",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            className="btn-generate"
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            {loading ? "Asignando..." : "Asignar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 2. COMPONENTE DE FILA DE LA TABLA (CRUD VISTAS)
// -----------------------------------------------------------------------------
const TableRow = ({
  blog,
  onDelete,
  onEditClick,
  assignedUsers,
  onAssign,
  onViewClick,
  currentUser,
}) => {
  // 1. LÓGICA DE PERMISOS
  const isIdAdmin = isAdminUser(currentUser?.id);
  const isAssignedToMe = blog.assigned_to === currentUser?.id;

  // Obtenemos el nombre del usuario para mostrarlo en la celda
  const assignedUserName = getUserName(blog.assigned_to, assignedUsers);

  // Función para obtener el icono según el estado
  const getStatusIcon = (status) => {
    const icons = {
      draft: "uil-edit-alt",
      generated: "uil-layer-group",
      review: "uil-clock",
      reviewed_ai: "uil-robot",
      approved: "uil-check-circle",
      published: "uil-rocket",
    };
    return icons[status] || "uil-info-circle";
  };

  return (
    <tr>
      <td style={{ fontWeight: "600", color: "#1e293b" }}>{blog.title}</td>
      <td>
        <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
          <i className="uil uil-folder" style={{ marginRight: "4px" }}></i>
          {blog.categoria}
        </span>
      </td>

      <td>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "#e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.7rem",
            }}
          >
            <i className="uil uil-user"></i>
          </div>
          <span style={{ fontSize: "0.85rem" }}>{assignedUserName}</span>
        </div>
      </td>

      <td>
        <span className={`badge status-${blog.estado}`}>
          <i
            className={`uil ${getStatusIcon(blog.estado)}`}
            style={{ fontSize: "0.9rem" }}
          ></i>
          {getStatusText(blog.estado)}
        </span>
      </td>

      <td>
        <span className={`badge priority-${blog.prioridad}`}>
          <span
            className="dot"
            style={{
              backgroundColor:
                blog.prioridad === "Alta"
                  ? "#dc3545"
                  : blog.prioridad === "Media"
                    ? "#ffc107"
                    : "#28a745",
            }}
          ></span>
          {blog.prioridad}
        </span>
      </td>

      <td style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
        {formatDateTime(blog.last_modified)}
      </td>

      <td>
        <div className="options-container">
          {/* BOTÓN VER: Siempre visible para todos */}
          <button
            onClick={onViewClick}
            className="btn-action view"
            title="Ver/Generar"
          >
            <i className="uil uil-eye"></i>
          </button>

          {/* BOTÓN ASIGNAR: Solo visible para Administradores */}
          {isIdAdmin && (
            <button
              onClick={onAssign}
              className="btn-action assign"
              title="Asignar Usuario"
            >
              <i className="uil uil-user-plus"></i>
            </button>
          )}

          {/* BOTÓN EDITAR PARÁMETROS: Visible para Admin O si el Editor está asignado */}
          {(isIdAdmin || isAssignedToMe) && (
            <button
              onClick={onEditClick}
              className="btn-action edit"
              title="Editar Configuración"
            >
              <i className="uil uil-setting"></i>
            </button>
          )}

          {/* BOTÓN ELIMINAR: Solo visible para Administradores */}
          {isIdAdmin && (
            <button
              onClick={() => onDelete(blog.id)}
              className="btn-action delete"
              title="Eliminar"
            >
              <i className="uil uil-trash-alt"></i>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

// -----------------------------------------------------------------------------
// 3. COMPONENTE PRINCIPAL DASHBOARD BLOG (Integrado)
// -----------------------------------------------------------------------------
export const DashboardBlog = () => {
  const navigate = useNavigate();
  // --- HOOK PARA EL USUARIO ACTUAL ---
  const { user: currentUser } = useCurrentUser();

  const {
    blogs,
    loading: loadingBlogs,
    loadBlogs,
    deleteBlog,
    assignBlog,
  } = useBlogs();
  const { users, loading: loadingUsers } = useUsers();

  const [isModalOpen, setIsModalOpen] = useState(false); // Modal de creación

  // --- ESTADOS PARA ASIGNACIÓN ---
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBlogForAssign, setSelectedBlogForAssign] = useState(null);

  //-- ESTADOS PARA EDICION ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBlogForEdit, setSelectedBlogForEdit] = useState(null);

  // Lógica de búsqueda y filtros
  const { searchTerm, setSearchTerm, searchResults } = useSearch(blogs, [
    "title",
    "categoria",
  ]);

  const filterFunctions = useMemo(() => {
    return {
      estado: (blog, value) => value === "" || blog.estado === value,
      assigned_to: (blog, value) => {
        if (value === "") return true;
        if (value === "unassigned") return !blog.assigned_to;
        return blog.assigned_to === value;
      },
      prioridad: (blog, value) => value === "" || blog.prioridad === value,
    };
  }, []);

  const { filteredData, updateFilter, filters, clearAllFilters } = useFilters(
    searchResults,
    filterFunctions,
  );

  const blogsToDisplay = filteredData;

  // --- HANDLERS ---

  // Al hacer clic en el botón de asignar en la tabla
  const handleAssignClick = (blog) => {
    setSelectedBlogForAssign(blog);
    setShowAssignModal(true);
  };

  // Procesa la asignación final desde el Modal
  const handleProcessAssignment = async (blogId, userId) => {
    try {
      await assignBlog(blogId, userId);
      setShowAssignModal(false);
      // loadBlogs(); // Opcional si el hook no refresca solo
    } catch (error) {
      console.error("Error al asignar:", error);
      alert("Error al asignar usuario.");
    }
  };

  const handleCreationSuccess = (newBlogData) => {
    setIsModalOpen(false);
    loadBlogs();
  };

  const handleViewClick = (blogId) => {
    navigate(`/blog/edit/${blogId}`);
  };

  // Función que abre el modal (se la pasaremos a la tabla)
  const handleEditClick = (blog) => {
    setSelectedBlogForEdit(blog);
    setShowEditModal(true);
  };

  // Función que procesa el guardado
  const handleUpdateBlog = async (updatedData) => {
    try {
      // Aquí usamos la lógica de tu api o hook para actualizar
      // Por ejemplo, si usas supabase o un apiService:
      await apiService.updateBlog(selectedBlogForEdit.id, updatedData);

      setShowEditModal(false);
      loadBlogs(); // Recargar la lista
    } catch (error) {
      alert("Error al actualizar: " + error.message);
    }
  };

  const handleDeleteBlog = async (id) => {
    if (
      window.confirm("¿Estás seguro de que quieres eliminar este borrador?")
    ) {
      try {
        await deleteBlog(id);
        loadBlogs();
      } catch (error) {
        alert("Error al eliminar el blog: " + error.message);
      }
    }
  };

  const statsData = useMemo(() => {
    const totalBlogs = blogs ? blogs.length : 0;
    return [
      { value: totalBlogs, label: "Artículos Generados" },
      {
        value: blogs.filter((blog) => blog.estado === "published").length,
        label: "Publicados",
      },
      {
        value: blogs.filter((blog) => !blog.assigned_to).length,
        label: "Sin Asignar",
      },
      {
        value: blogs.filter((blog) => blog.estado === "generated").length,
        label: "En progreso",
      },
    ];
  }, [blogs]);

  return (
    <div style={{ background: "#e6e6e6", minHeight: "100vh" }}>
      <header
        className="navbar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.75rem 2rem",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Sección Izquierda: Título */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "1.80rem",
              fontWeight: "800",
              color: "#0f172a",
              letterSpacing: "-0.025em",
            }}
          >
            Dashboard <span style={{ color: "#3b82f6" }}>Blogs</span>
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "1.00rem",
              color: "#64748b",
              fontWeight: "500",
            }}
          >
            Sistema de gestión de contenido
          </p>
        </div>

        {/* Sección Derecha: Nav y Usuario */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <nav>
            <a
              href="/"
              style={{
                textDecoration: "none",
                fontSize: "0.85rem",
                color: "#475569",
                fontWeight: "700",
                padding: "0.6rem 1.2rem",
                borderRadius: "0.75rem",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
              // Efectos dinámicos con JS para el hover
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#3b82f6";
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow =
                  "0 0 15px rgba(59, 130, 246, 0.5)"; // Efecto de iluminación
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#f8fafc";
                e.currentTarget.style.color = "#475569";
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <i className="uil uil-estate" style={{ fontSize: "1.1rem" }}></i>
              <span>Volver al Home</span>
            </a>
          </nav>

          <nav>
            {/*BOTON DE METRICAS */}
            <a
              href="/blog_metrics"
              style={{
                textDecoration: "none",
                fontSize: "0.85rem",
                color: "#66a175",
                fontWeight: "700",
                padding: "0.6rem 1.2rem",
                borderRadius: "0.75rem",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
              // Efectos dinámicos con JS para el hover
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#3fb21f";
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.borderColor = "#3bf64e";
                e.currentTarget.style.boxShadow =
                  "0 0 15px rgba(59, 130, 246, 0.5)"; // Efecto de iluminación
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#f8fafc";
                e.currentTarget.style.color = "#475569";
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <i
                className="uil uil-analytics"
                style={{ fontSize: "1.1rem" }}
              ></i>
              <span>Metricas</span>
            </a>
          </nav>

          {/* SECCIÓN DEL USUARIO MEJORADA */}
          {currentUser && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
                padding: "0.4rem",
                paddingRight: "1rem",
                backgroundColor: "#ffffff",
                borderRadius: "9999px", // Estilo píldora
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.2s ease",
              }}
            >
              {/* Avatar con gradiente y borde */}
              <div
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "0.9rem",
                  fontWeight: "700",
                  boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
                  border: "2px solid #fff",
                }}
              >
                {currentUser.avatar ||
                  (currentUser.first_name || currentUser.last_name
                    ? `${(currentUser.first_name?.[0] || "").toUpperCase()}${(currentUser.last_name?.[0] || "").toUpperCase()}`
                    : (currentUser.email?.[0] || "").toUpperCase())}
              </div>

              {/* Textos: Nombre y Rol */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    color: "#1e293b",
                    lineHeight: "1.1",
                  }}
                >
                  {currentUser.name || currentUser.first_name}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: "600",
                    color: "#2b76ef", // Color del rol para resaltar
                    textTransform: "uppercase",
                    letterSpacing: "0.025em",
                    marginTop: "2px",
                  }}
                >
                  {isAdminUser(currentUser.id)
                    ? "Administrador"
                    : isEditorUser(currentUser.id)
                      ? "Editor"
                      : "Redactor"}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="container">
        <section className="stats">
          {statsData.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-icon">
                {/* Asignación lógica de iconos según el índice o label */}
                {index === 0 && <i className="uil uil-files-landscapes"></i>}
                {index === 1 && <i className="uil uil-check-circle"></i>}
                {index === 2 && <i className="uil uil-user-exclamation"></i>}
                {index === 3 && <i className="uil uil-sync"></i>}
              </div>
              <p>{stat.label}</p>
              <h2>{stat.value}</h2>
            </div>
          ))}
        </section>

        <BlogsTable
          currentUser={currentUser}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filters={filters}
          updateFilter={updateFilter}
          loadingUsers={loadingUsers}
          users={users}
          loadingBlogs={loadingBlogs}
          blogsToDisplay={blogsToDisplay}
          handleDeleteBlog={handleDeleteBlog}
          handleEditClick={handleEditClick}
          handleAssignBlog={handleAssignClick}
          clearAllFilters={clearAllFilters}
          setIsModalOpen={setIsModalOpen}
          handleViewClick={handleViewClick} // Visualizador de la generación
        />
      </main>

      {/* MODAL DE CREACIÓN */}
      {isModalOpen && (
        <ModalCreacionBlog
          onClose={() => setIsModalOpen(false)}
          onCreateSuccess={handleCreationSuccess}
        />
      )}

      {/* MODAL DE ASIGNACIÓN (EL QUE SOLICITASTE) */}
      {showAssignModal && (
        <AssignModal
          proyecto={selectedBlogForAssign} // El modal usa la prop .title y .id
          users={users}
          onClose={() => setShowAssignModal(false)}
          onAssign={handleProcessAssignment}
        />
      )}

      {/* Renderizar el modal al final del componente */}
      {showEditModal && (
        <EditBlogModal
          blog={selectedBlogForEdit}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdateBlog}
        />
      )}
    </div>
  );
};

const BlogsTable = ({
  searchTerm,
  setSearchTerm,
  filters,
  updateFilter,
  loadingUsers,
  users,
  loadingBlogs,
  blogsToDisplay,
  handleDeleteBlog,
  handleEditClick,
  handleAssignBlog,
  setIsModalOpen,
  clearAllFilters,
  handleViewClick,
  currentUser,
}) => (
  <section className="table-section">
    <div className="table-header-flex">
      <h3>Últimos Archivos Generados</h3>

      <div className="table-actions-top">
        {/* 1. BUSCADOR (Ocupará el espacio disponible) */}
        <div className="search-container">
          <div className="search-wrapper">
            <i className="uil uil-search"></i>
            <input
              type="text"
              placeholder="Buscar por título o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* 2. FILTROS Y BOTONES (Agrupados al final) */}
        <div className="controls-container">
          <div className="filters-row">
            <select
              className="filter-select"
              value={filters.estado || ""}
              onChange={(e) => updateFilter("estado", e.target.value)}
            >
              <option value="">Estado</option>
              <option value="draft">Borrador</option>
              <option value="review">En Revisión</option>
              <option value="reviewed_ai">Revisado con IA</option>
              <option value="published">Publicado</option>
            </select>

            <select
              className="filter-select"
              disabled={loadingUsers}
              value={filters.assigned_to || ""}
              onChange={(e) => updateFilter("assigned_to", e.target.value)}
            >
              <option value="">Asignado</option>
              <option value="unassigned">Sin asignar</option>
              {users?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={filters.prioridad || ""}
              onChange={(e) => updateFilter("prioridad", e.target.value)}
            >
              <option value="">Prioridad</option>
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
            </select>
          </div>

          <div className="button-group">
            {(Object.keys(filters).length > 0 || searchTerm) && (
              <button
                className="btn-clear-filters"
                onClick={() => {
                  clearAllFilters();
                  setSearchTerm("");
                }}
              >
                <i className="uil uil-refresh"></i>
              </button>
            )}
            {isAdminUser(currentUser?.id) && (
              <button
                className="btn-create-new"
                onClick={() => setIsModalOpen(true)}
              >
                <i className="uil uil-plus"></i> Nuevo Blog
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    <div className="table-container shadow-sm">
      <table className="modern-table">
        <thead>
          <tr>
            <th>Título del Contenido</th>
            <th>Categoría</th>
            <th>Asignado</th>
            <th>Estado</th>
            <th>Prioridad</th>
            <th>Modificación</th>
            <th style={{ textAlign: "right" }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loadingBlogs && !blogsToDisplay.length ? (
            <tr>
              <td colSpan="7" className="text-center py-4">
                Cargando datos...
              </td>
            </tr>
          ) : (
            (blogsToDisplay || []).map((blog) => (
              <TableRow
                key={blog.id}
                blog={blog}
                onDelete={handleDeleteBlog}
                onEditClick={() => handleEditClick(blog)}
                onViewClick={() => handleViewClick(blog.id)}
                onAssign={() => handleAssignBlog(blog)}
                currentUser={currentUser}
                assignedUsers={users}
              />
            ))
          )}
          {!(blogsToDisplay || []).length && !loadingBlogs && (
            <tr>
              <td colSpan="7" className="text-center py-5">
                No se encontraron resultados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
);

export default DashboardBlog;
