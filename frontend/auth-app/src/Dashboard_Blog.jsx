import "@iconscout/unicons/css/line.css";
import "./css/styles.css";
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useBlogs } from "./hooks/useApi.js";
import { useUsers, useFilters, useSearch } from "./hooks/useApi.js";

// -----------------------------------------------------------------------------
// FUNCIONES AUXILIARES DE VISTA
// -----------------------------------------------------------------------------

const getStatusText = (status) => {
  const texts = {
    draft: "Borrador",
    review: "Pendiente de Redacción",
    in_progress: "En Redacción",
    completed: "Publicado",
    approved: "Aprobado",
  };
  return texts[status] || status;
};

const getPriorityText = (priority) => {
  const texts = {
    // Estas son las únicas claves que el backend/DB puede enviar
    Alta: "Alta",
    Media: "Media",
    Baja: "Baja",
  };

  // Devuelve el valor mapeado o el valor original si no lo encuentra.
  return texts[priority] || priority || "N/A";
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

// -----------------------------------------------------------------------------
// 1. COMPONENTE MODAL DE CREACIÓN DE BORRADOR INICIAL
// -----------------------------------------------------------------------------
const ModalCreacionBlog = ({ onClose, onCreateSuccess }) => {
  const [formData, setFormData] = useState({
    title: "",
    categoria: "",
    keywords: "",
    idioma: "Español",
    tecnica: "Persuasiva",
    acento: "Neutral",
    tono: "Profesional",
    prioridad: "Baja",
  });

  // Usando la función real de creación
  const { createBlog } = useBlogs();
  const [loading, setLoading] = useState(false);

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
        name: formData.title, // Asegurar que el título se envíe como 'name' si la API lo requiere
        status: "draft", // Fuerza el estado inicial
      };

      // 1. LLAMADA A LA API: Guardar la idea/borrador inicial
      const newBlog = await createBlog(payload);

      if (newBlog && newBlog.id) {
        // 2. Éxito: Notificar al dashboard y pasar el ID para la redirección
        onCreateSuccess(newBlog);
      } else {
        throw new Error("No se pudo obtener el ID del borrador creado.");
      }
    } catch (error) {
      alert(`Error al guardar la idea inicial: ${error.message}`);
      console.error("Error en handleSubmit del Modal:", error);
      onClose(); // Cerrar si hay error, dependiendo del UX deseado
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Generar Idea y Borrador Inicial</h2>
          <button className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Campos del formulario */}
          <div className="form-group">
            <label>Título del Blog/Tema Central (Query):</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="categoria">Categoría:</label>
            <select
              id="categoria"
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona una categoría</option>
              <option value="Arriendo">Arriendo</option>
              <option value="Viajemos">Viajemos</option>
              <option value="Guia legal">Guía Legal</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="keywords">Keywords Secundarias:</label>
            <textarea
              id="keywords"
              name="keywords"
              value={formData.keywords}
              onChange={handleChange}
              rows="3"
              placeholder="Ej: 'impuestos, contrato alquiler, avalúo'"
            ></textarea>
          </div>
          <div className="form-group-inline">
            <div className="form-group">
              <label htmlFor="idioma">Idioma:</label>
              <select
                id="idioma"
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
              <label htmlFor="tecnica">Técnica:</label>
              <select
                id="tecnica"
                name="tecnica"
                value={formData.tecnica}
                onChange={handleChange}
              >
                <option value="Persuasiva">Persuasiva</option>
                <option value="Informativa">Informativa/Educativa</option>
                <option value="Narrativa">Narrativa</option>
              </select>
            </div>
          </div>
          <div className="form-group-inline">
            <div className="form-group">
              <label htmlFor="acento">Acento:</label>
              <select
                id="acento"
                name="acento"
                value={formData.acento}
                onChange={handleChange}
              >
                <option value="Neutral">Neutral (Latam)</option>
                <option value="Español(España)">España</option>
                <option value="Mexico">México</option>
                <option value="Colombia">Colombia</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="tono">Tono:</label>
              <select
                id="tono"
                name="tono"
                value={formData.tono}
                onChange={handleChange}
              >
                <option value="Profesional">Profesional</option>
                <option value="Amigable">Amigable</option>
                <option value="Formal">Formal</option>
                <option value="Entusiasta">Entusiasta</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="prioridad">Prioridad</label>
            <select
              id="prioridad"
              name="prioridad" // El nombre de la propiedad debe ser 'prioridad'
              value={formData.prioridad}
              onChange={handleChange}
              required
            >
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
            </select>
          </div>

          <button type="submit" className="btn-create" disabled={loading}>
            {loading ? "Guardando Idea..." : "Generar Idea y Borrador"}
          </button>
        </form>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 2. COMPONENTE DE FILA DE LA TABLA (CRUD VISTAS)
// -----------------------------------------------------------------------------
const TableRow = ({ blog, onDelete, onEditClick, assignedUsers, onAssign }) => {
  // <-- NUEVA LÓGICA DE ASIGNACIÓN: Estado para el dropdown
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  // Llama a la función auxiliar para mostrar el nombre del asignado
  const assignedUserName = getUserName(blog.assigned_to, assignedUsers);

  // Handler que llama a la función del padre y cierra el dropdown
  const handleUserSelect = (userId) => {
    // userId puede ser el UUID de un usuario, o null para desasignar
    onAssign(blog.id, userId);
    setShowAssignDropdown(false);
  };

  return (
    <tr>
      <td>{blog.title}</td>
      <td>{blog.categoria}</td>

      {/* CELDA DE USUARIO ASIGNADO (Muestra el nombre) */}
      <td>{assignedUserName}</td>

      <td className={`status-${blog.estado}`}>{getStatusText(blog.estado)}</td>
      <td className={`priority-${blog.prioridad}`}>
        {getPriorityText(blog.prioridad)}
      </td>
      <td>{formatDateTime(blog.last_modified)}</td>

      {/* CELDA DE OPCIONES (Lleva la lógica del dropdown) */}
      <td>
        <div className="options-container" style={{ position: "relative" }}>
          {/* BOTÓN/ICONO DE ASIGNACIÓN */}
          <button
            onClick={() => setShowAssignDropdown(!showAssignDropdown)}
            className="btn-action assign"
            title="Asignar/Desasignar Usuario"
          >
            {/* Ícono uil-user-plus para asignar */}
            <i className="uil uil-user-plus"></i>
          </button>

          {/* DROPDOWN DE ASIGNACIÓN */}
          {showAssignDropdown && (
            // NOTA: Debes añadir CSS para la clase 'dropdown-menu'
            <div className="dropdown-menu">
              {/* Opción 1: Desasignar (solo si ya está asignado) */}
              {blog.assigned_to && (
                <button
                  // Envia 'null' para desasignar
                  onClick={() => handleUserSelect(null)}
                  className="dropdown-item desasignar"
                >
                  <i className="uil uil-times-circle"></i> Desasignar
                </button>
              )}

              {/* Opción 2: Lista de Usuarios para Asignar */}
              <div className="dropdown-title">Asignar a:</div>
              {(assignedUsers || []).map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user.id)}
                  className="btn-action user"
                  // Resalta al usuario actualmente asignado
                  style={{
                    fontWeight:
                      user.id === blog.assigned_to ? "bold" : "normal",
                  }}
                >
                  {user.name || user.email}
                </button>
              ))}
            </div>
          )}

          {/* Boton de Editar  */}
          <button
            onClick={() => onEditClick(blog.id)}
            className="btn-action edit"
            title="Editar Blog"
          >
            <i className="uil uil-edit"></i>
          </button>

          {/* Boton de Eliminar */}
          <button
            onClick={() => onDelete(blog.id)}
            className="btn-action delete"
            title="Eliminar Blog"
          >
            <i className="uil uil-trash-alt"></i>
          </button>
          {/* Boton de Visualizar  */}
          <button className="btn-action view" title="Visualizar Blog">
            <i className="uil uil-eye"></i>
          </button>
          {/* Boton de Descarga  */}
          <button className="btn-action download" title="Descargar Blog">
            <i className="uil uil-download-alt"></i>
          </button>
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

  // 🛑 Usando los hooks reales de tu aplicación
  // <-- NUEVA LÓGICA DE ASIGNACIÓN: Obtener 'assignBlog' del hook
  const {
    blogs,
    loading: loadingBlogs,
    loadBlogs,
    deleteBlog,
    assignBlog,
  } = useBlogs();
  const { users, loading: loadingUsers } = useUsers();

  const [isModalOpen, setIsModalOpen] = useState(false);

  //Logica de busqueda y filtros
  const { searchTerm, setSearchTerm, searchResults } = useSearch(blogs, [
    "title", // Buscar por título
    "categoria", // Buscar por categoría
  ]);

  const filterFunctions = useMemo(() => {
    return {
      // Filtro por ESTADO (blog.estado)
      estado: (blog, value) => {
        return value === "" || blog.estado === value;
      },
      // Filtro por ASIGNADO A (blog.assigned_to)
      assigned_to: (blog, value) => {
        // value puede ser el UUID de un usuario, o "unassigned" para los sin asignar
        if (value === "") return true; // Mostrar todos
        if (value === "unassigned") return !blog.assigned_to; // No asignado
        return blog.assigned_to === value;
      },
      // Filtro por PRIORIDAD (blog.prioridad)
      prioridad: (blog, value) => {
        return value === "" || blog.prioridad === value;
      },
    };
  }, []);

  // Aplicar useFilters sobre los resultados de la búsqueda (searchResults)
  const { filteredData, updateFilter, filters, clearAllFilters } = useFilters(
    searchResults,
    filterFunctions
  );

  const blogsToDisplay = filteredData;

  // Función que se llama al guardar exitosamente el borrador
  const handleCreationSuccess = (newBlogData) => {
    setIsModalOpen(false); // Cierra el modal
    loadBlogs(); // Recarga la lista para mostrar el nuevo borrador

    // VISTA CRUD: Navegar al editor del blog recién creado
    navigate(`/blog/edit/${newBlogData.id}`);
  };

  // Función para manejar la edición (VISTA CRUD)
  const handleEditClick = (blogId) => {
    navigate(`/blog/edit/${blogId}`);
  };

  // Función para eliminar (Llama a la función del hook)
  const handleDeleteBlog = async (id) => {
    if (
      window.confirm("¿Estás seguro de que quieres eliminar este borrador?")
    ) {
      try {
        await deleteBlog(id);
        loadBlogs(); // Recargar tras eliminar
      } catch (error) {
        alert("Error al eliminar el blog: " + error.message);
        console.error("Error deleting blog:", error);
      }
    }
  };

  // <-- NUEVA LÓGICA DE ASIGNACIÓN: Handler para asignar/desasignar
  const handleAssignBlog = async (blogId, userId) => {
    try {
      // Llama a la función del hook, que a su vez llama a apiService.assignBlog.
      // El valor userId puede ser un UUID o 'null' para desasignar.
      await assignBlog(blogId, userId);
      // loadBlogs() NO ES NECESARIO si el hook useBlogs actualiza la lista
      // internamente (como se ve en useApi.js).
    } catch (error) {
      console.error("Error al asignar/desasignar el blog:", error);
      alert("Hubo un error al asignar el blog. Verifica tus permisos.");
    }
  };

  const statsData = useMemo(() => {
    const totalBlogs = blogs ? blogs.length : 0;
    return [
      { value: "1,245", label: "Visitas Totales" },
      { value: totalBlogs, label: "Artículos Generados" },
      { value: "142", label: "Imágenes Generadas" },
    ];
  }, [blogs]);

  const Header = () => (
    <header className="navbar">
      <h1>Analíticas</h1>
      <nav>
        <button className="btn-create" onClick={() => navigate(-1)}>
          Volver
        </button>
      </nav>
    </header>
  );

  const Stats = () => (
    <section className="stats">
      {statsData.map((stat, idx) => (
        <div className="stat-card" key={idx}>
          <h2>{stat.value}</h2>
          <p>{stat.label}</p>
        </div>
      ))}
    </section>
  );

  const Footer = () => <footer className="footer"></footer>;

  // --- Renderizado Principal ---
  return (
    <div style={{ background: "#e6e6e6", minHeight: "100vh" }}>
      <Header />
      <main className="container">
        <Stats />
        {/* LLAMADA AL NUEVO COMPONENTE BlogsTable */}
        <BlogsTable
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
          handleAssignBlog={handleAssignBlog}
          clearAllFilters={clearAllFilters}
          setIsModalOpen={setIsModalOpen} // Pasa el setter del modal
        />
      </main>
      <Footer />

      {/* Modal de Creación de Borrador */}
      {isModalOpen && (
        <ModalCreacionBlog
          onClose={() => setIsModalOpen(false)}
          onCreateSuccess={handleCreationSuccess}
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
}) => (
  <section className="table-section">
    <div className="table-controls">
      <div className="filters">
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm} // Estado controlado
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {/* 2. FILTRO DE ESTADOS */}
        <select
          value={filters.estado || ""}
          onChange={(e) => updateFilter("estado", e.target.value)}
        >
          <option value="">Todos los Estados</option>
          <option value="draft">Borrador</option>
          <option value="review">Pendiente de Redacción</option>
          <option value="in_progress">En Redacción</option>
          <option value="completed">Publicado</option>
          <option value="approved">Aprobado</option>
        </select>
        {/* 3. FILTRO DE FECHAS */}
        <select>
          <option>Todas las fechas</option>
          <option value="last_7_days">Últimos 7 días</option>
          <option value="last_30_days">Últimos 30 días</option>
          <option value="last_90_days">Últimos 90 días</option>
        </select>

        {/* 4. FILTRO DE USUARIOS ASIGNADOS */}
        <select
          disabled={loadingUsers}
          value={filters.assigned_to || ""}
          onChange={(e) => updateFilter("assigned_to", e.target.value)}
        >
          <option value="">Todos los asignados</option>
          <option value="unassigned">Sin asignar</option>
          {users &&
            users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
        </select>

        {/* 5. FILTRO DE PRIORIDADES */}
        <select
          value={filters.prioridad || ""}
          onChange={(e) => updateFilter("prioridad", e.target.value)}
        >
          <option value="">Todas las prioridades</option>
          <option value="Baja">Baja</option>
          <option value="Media">Media</option>
          <option value="Alta">Alta</option>
        </select>

        {/* AHORA EL BOTÓN BORRAR FILTROS ESTÁ AQUÍ, JUNTO A LOS FILTROS */}
        {(Object.keys(filters).length > 0 || searchTerm) && (
          <button
            className="btn-clear-filters"
            onClick={() => {
              clearAllFilters(); // Limpia los filtros
              setSearchTerm(""); // Limpia la búsqueda
            }}
            title="Restablecer todos los filtros y la búsqueda"
          >
            <i className="uil uil-times-circle"></i> Borrar Filtros
          </button>
        )}
      </div>

      <div className="actions-group">
        {/* 1. BOTÓN CREAR BLOG (QUEDA APILADO ARRIBA) */}
        <button
          className="btn-create"
          onClick={() => setIsModalOpen(true)}
          disabled={loadingBlogs}
        >
          + Crear Blog
        </button>
        {/* NOTA: El actions-group ahora solo tiene el botón de crear */}
      </div>
    </div>
    <h3>Últimos Archivos Generados</h3>
    <table>
      <thead>
        <tr>
          <th>Título</th>
          <th>Proyecto (Categoría)</th>
          <th>Asignado a</th>
          <th>Estado</th>
          <th>Prioridad</th>
          <th>Última modificación</th>
          <th>Opciones</th>
        </tr>
      </thead>
      <tbody>
        {loadingBlogs && !blogsToDisplay.length ? (
          <tr>
            <td colSpan="7">Cargando datos...</td>
          </tr>
        ) : (
          // ITERAR sobre la lista FINAL filtrada y buscada: blogsToDisplay
          (blogsToDisplay || []).map((blog) => (
            <TableRow
              key={blog.id}
              blog={blog}
              onDelete={handleDeleteBlog}
              onEditClick={handleEditClick}
              assignedUsers={users}
              onAssign={handleAssignBlog}
            />
          ))
        )}

        {!(blogsToDisplay || []).length && !loadingBlogs && (
          <tr>
            <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
              No hay resultados que coincidan con los filtros/búsqueda.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </section>
);

export default DashboardBlog;
