import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  Edit3,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  UserPlus,
  FileText,
  AlertTriangle,
  ThumbsUp,
  Hash,
  Upload,
  TestTube,
} from "lucide-react";

// Importar hooks personalizados
import {
  useProyectos,
  useCurrentUser,
  useUsers,
  useFilters,
  useSearch,
} from "./hooks/useApi.js";
import apiService from "./services/apiService.js";
import { isAdminUser, isEditorUser, ADMIN_USER_IDS } from "./utils/roles";

function Dashboard() {
  // Estados usando hooks personalizados
  const { user: currentUser, loading: loadingUser } = useCurrentUser();
  const { users } = useUsers(true);
  const {
    proyectos,
    loading: loadingProyectos,
    createProyecto,
    updateProyecto,
    deleteProyecto,
    assignProyecto,
  } = useProyectos();

  // Estados locales para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProyecto, setSelectedProyecto] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProyecto, setEditingProyecto] = useState(null);

  const getFilteredUsers = () => {
    if (!users || !currentUser) return [];

    if (ADMIN_USER_IDS.includes(currentUser.id)) {
      return users;
    } else {
      return users.filter((user) => user.id === currentUser.id);
    }
  };

  const canAssignUsers = () => {
    if (isAdminUser(currentUser?.id)) {
      return true;
    }
    return currentUser?.role === "admin";
  };

  const canCreateProjects = () => {
    if (isAdminUser(currentUser?.id)) {
      return true;
    }
    return currentUser?.role === "admin";
  };

  const canDeleteProjects = () => {
    if (isAdminUser(currentUser?.id)) {
      return true;
    }
    return currentUser?.role === "admin";
  };

  const getAllUsers = () => {
    return users || [];
  };

  // Filtros y búsqueda
  const filterFunctions = {
    domain: (proyecto, value) => {
      if (value === "all") return true;
      return proyecto.domain === value;
    },
    status: (proyecto, value) => value === "all" || proyecto.status === value,
    priority: (proyecto, value) =>
      value === "all" || proyecto.priority === value,
    assignee: (proyecto, value) => {
      if (value === "all") return true;
      if (value === "unassigned") return !proyecto.assignedTo;
      return proyecto.assignedTo === value;
    },
    date: (proyecto, value) => {
      if (value === "all") return true;
      const now = new Date();
      const proyectoDate = new Date(proyecto.lastModified);
      const diffTime = now - proyectoDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (value) {
        case "today":
          return diffDays <= 1;
        case "week":
          return diffDays <= 7;
        case "month":
          return diffDays <= 30;
        default:
          return true;
      }
    },
  };

  const {
    filters,
    filteredData: filteredByFilters,
    updateFilter,
  } = useFilters(proyectos, filterFunctions);
  const { searchTerm, setSearchTerm, searchResults } = useSearch(
    filteredByFilters,
    ["name", "description"]
  );

  // Proyectos visibles según permisos del usuario
  const visibleProyectos = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    if (isAdminUser(currentUser.id)) {
      return searchResults;
    }

    if (currentUser.role === "admin") {
      return searchResults;
    }

    if (currentUser.role === "editor") {
      return searchResults.filter(
        (proyecto) =>
          proyecto.assignedTo === currentUser.id ||
          proyecto.assignedTo === null ||
          proyecto.createdBy === currentUser.id
      );
    }

    return searchResults.filter(
      (proyecto) =>
        proyecto.assignedTo === currentUser.id ||
        proyecto.createdBy === currentUser.id
    );
  }, [searchResults, currentUser]);

  // Estadísticas calculadas
  const stats = useMemo(() => {
    const total = visibleProyectos.length;
    const completed = visibleProyectos.filter(
      (p) => p.status === "completed"
    ).length;
    const nonCompleted = visibleProyectos.filter(
      (p) => p.status !== "completed"
    ).length;
    const unassigned = visibleProyectos.filter((p) => !p.assignedTo).length;

    return { total, completed, nonCompleted, unassigned };
  }, [visibleProyectos]);

  // Funciones auxiliares
  const getStatusColor = (status) => {
    const colors = {
      // Estados existentes
      completed: "#10b981",
      in_progress: "#3b82f6",
      review: "#8b5cf6",
      draft: "#6b7280",
      pen_review: "#f59e0b",
      pen_ajuste: "#ef4444",
      approved: "#059669",
      rev_kws: "#7c3aed",
      cargue: "#0ea5e9",
      test: "#f97316",
    };
    return colors[status] || "#6b7280";
  };

  const getStatusIcon = (status) => {
    const icons = {
      // Estados existentes
      completed: <CheckCircle2 size={16} />,
      in_progress: <Clock size={16} />,
      review: <Eye size={16} />,
      draft: <Edit3 size={16} />,
      pen_review: <FileText size={16} />,
      pen_ajuste: <AlertTriangle size={16} />,
      approved: <ThumbsUp size={16} />,
      rev_kws: <Hash size={16} />,
      cargue: <Upload size={16} />,
      test: <TestTube size={16} />,
    };
    return icons[status] || <Clock size={16} />;
  };

  const getStatusText = (status) => {
    const texts = {
      draft: "Borrador",
      review: "Pendiente de Redacción",
      in_progress: "En Redacción",
      pen_review: "Pendiente de Revisión",
      pen_ajuste: "Pendiente de Ajuste",
      apporved: "Aprobado",
      rev_kws: "Pendiente KWS",
      cargue: "Cargue",
      test: "Test",
      completed: "Publicado",
    };
    return texts[status] || status;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: "#ef4444",
      medium: "#f59e0b",
      low: "#10b981",
    };
    return colors[priority] || "#6b7280";
  };

  const canEdit = (proyecto) => {
    if (isAdminUser(currentUser?.id)) {
      return true;
    }

    if (currentUser?.role === "admin") {
      return true;
    }

    return (
      proyecto.assignedTo === currentUser?.id ||
      proyecto.createdBy === currentUser?.id
    );
  };

  const handleCreateProyecto = async (formData) => {
    try {
      await createProyecto(formData);
      setShowCreateModal(false);
    } catch (error) {
      alert("Error al crear el proyecto: " + error.message);
    }
  };

  const handleAssignProyecto = async (proyectoId, userId) => {
    try {
      await assignProyecto(proyectoId, userId);
      setShowAssignModal(false);
    } catch (error) {
      alert("Error al asignar usuario: " + error.message);
    }
  };

  const handleEditProyecto = async (formData) => {
    try {
      await updateProyecto(editingProyecto.id, formData);
      setShowEditModal(false);
      setEditingProyecto(null);
    } catch (error) {
      alert("Error al actualizar el proyecto: " + error.message);
    }
  };

  const handleDeleteProyecto = async (id) => {
    if (
      window.confirm("¿Estás seguro de que quieres eliminar este proyecto?")
    ) {
      try {
        await deleteProyecto(id);
      } catch (error) {
        alert("Error al eliminar el proyecto: " + error.message);
      }
    }
  };

  // Mostrar loading mientras cargan los datos principales
  if (loadingUser || loadingProyectos) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #e2e8f0",
              borderTop: "4px solid #3b82f6",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}
          ></div>
          <p style={{ color: "#64748b" }}>Cargando proyectos...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e2e8f0",
          padding: "1rem 2rem",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.875rem",
                fontWeight: "700",
                color: "#1e293b",
              }}
            >
              Dashboard Redactoria
            </h1>
            <p
              style={{
                margin: "0.25rem 0 0 0",
                color: "#64748b",
                fontSize: "0.875rem",
              }}
            >
              Gestiona y supervisa todos los proyectos
            </p>
          </div>

          {currentUser && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                backgroundColor: "#f1f5f9",
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
              }}
            >
              <div
                style={{
                  width: "2rem",
                  height: "2rem",
                  backgroundColor: "#3b82f6",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                }}
              >
                {currentUser.avatar ||
                  (currentUser.first_name || currentUser.last_name
                    ? `${(currentUser.first_name?.[0] || "").toUpperCase()}${(
                        currentUser.last_name?.[0] || ""
                      ).toUpperCase()}`
                    : (currentUser.email?.[0] || "").toUpperCase())}
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#1e293b",
                  }}
                >
                  {currentUser.name}
                </p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                  {isAdminUser(currentUser.id)
                    ? "Administrador"
                    : isEditorUser(currentUser.id)
                    ? "Editor"
                    : "Visualizador"}
                </p>
              </div>
            </div>
          )}
        </div>
      </header>

      <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Estadísticas rápidas */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <StatCard
            icon={<Edit3 size={20} />}
            value={stats.total}
            label="Proyectos Totales"
            color="#3b82f6"
            bgColor="#dbeafe"
          />
          <StatCard
            icon={<CheckCircle2 size={20} />}
            value={stats.completed}
            label="Publicados"
            color="#10b981"
            bgColor="#dcfce7"
          />
          <StatCard
            icon={<Clock size={20} />}
            value={stats.nonCompleted}
            label="En Proceso"
            color="#f59e0b"
            bgColor="#fef3c7"
          />
          <StatCard
            icon={<AlertCircle size={20} />}
            value={stats.unassigned}
            label="Sin Asignar"
            color="#ef4444"
            bgColor="#fee2e2"
          />
        </div>

        {/* Filtros y búsqueda */}
        <FilterPanel
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFilterChange={updateFilter}
          users={users}
          currentUser={currentUser}
          onCreateProject={() => setShowCreateModal(true)}
          canCreateProjects={canCreateProjects}
          isAdminUser={isAdminUser}
        />

        {/* Tabla de Proyectos */}
        <ProjectsTable
          proyectos={visibleProyectos}
          users={getAllUsers()}
          currentUser={currentUser}
          onEdit={canEdit}
          onAssign={(proyecto) => {
            setSelectedProyecto(proyecto);
            setShowAssignModal(true);
          }}
          onDelete={handleDeleteProyecto}
          onEditClick={(proyecto) => {
            setEditingProyecto(proyecto);
            setShowEditModal(true);
          }}
          canAssignUsers={canAssignUsers}
          canDeleteProjects={canDeleteProjects}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
          getStatusText={getStatusText}
          getPriorityColor={getPriorityColor}
        />
      </div>

      {/* Modales */}
      {showCreateModal && (
        <CreateProyectoModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateProyecto}
        />
      )}

      {showAssignModal && (
        <AssignModal
          proyecto={selectedProyecto}
          users={getFilteredUsers()}
          onClose={() => setShowAssignModal(false)}
          onAssign={handleAssignProyecto}
        />
      )}

      {showEditModal && editingProyecto && (
        <EditProyectoModal
          proyecto={editingProyecto}
          onClose={() => {
            setShowEditModal(false);
            setEditingProyecto(null);
          }}
          onSubmit={handleEditProyecto}
        />
      )}

      {/* CSS para animación de loading */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Componente de tarjeta de estadísticas
function StatCard({ icon, value, label, color, bgColor }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "1.5rem",
        borderRadius: "0.75rem",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div
          style={{
            width: "3rem",
            height: "3rem",
            backgroundColor: bgColor,
            borderRadius: "0.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color,
          }}
        >
          {icon}
        </div>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "1.875rem",
              fontWeight: "700",
              color: "#1e293b",
            }}
          >
            {value}
          </p>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

// Componente del panel de filtros
function FilterPanel({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  users,
  currentUser,
  onCreateProject,
  canCreateProjects,
  isAdminUser,
}) {
  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "1.5rem",
        borderRadius: "0.75rem",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        border: "1px solid #e2e8f0",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{ display: "flex", gap: "1rem", flexWrap: "wrap", flex: 1 }}
        >
          {/* Búsqueda */}
          <div style={{ position: "relative", minWidth: "300px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#64748b",
              }}
            />
            <input
              type="text"
              placeholder="       Buscar proyectos..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                paddingLeft: "2.5rem",
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                width: "100%",
                outline: "none",
                height: "2.25rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Filtros de dominio */}
          <select
            value={filters.domain || "all"}
            onChange={(e) => onFilterChange("domain", e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              outline: "none",
            }}
          >
            <option value="all">Viajemos</option>
            <option value="ejemplo.com">Miles Car Rental</option>
            <option value="miempresa.com">Blog Viajemos</option>
            <option value="otrodominio.com">Arriendo</option>
            <option value="otrodominio.com">Hoteles Viajemos</option>
          </select>

          {/* Filtros */}
          <select
            value={filters.status || "all"}
            onChange={(e) => onFilterChange("status", e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              outline: "none",
            }}
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="review">Pendiente de Redacción</option>
            <option value="in_progress">En Redacción</option>
            <option value="pen_review">Pendiente de Revisión</option>
            <option value="pen_ajuste">Pendiente de Ajuste</option>
            <option value="approved">Aprobado</option>
            <option value="rev_kws">Pendiente KWS</option>
            <option value="cargue">Cargue</option>
            <option value="test">Test</option>
            <option value="completed">Publicado</option>
          </select>

          {(isAdminUser(currentUser?.id) || currentUser?.role === "admin") &&
            users && (
              <select
                value={filters.assignee || "all"}
                onChange={(e) => onFilterChange("assignee", e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  outline: "none",
                }}
              >
                <option value="all">Todos los asignados</option>
                <option value="unassigned">Sin asignar</option>
                {users
                  .filter((u) => u.role !== "viewer")
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
              </select>
            )}

          <select
            value={filters.priority || "all"}
            onChange={(e) => onFilterChange("priority", e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              outline: "none",
            }}
          >
            <option value="all">Todas las prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>

          <select
            value={filters.date || "all"}
            onChange={(e) => onFilterChange("date", e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              outline: "none",
            }}
          >
            <option value="all">Todas las fechas</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
            <option value="year">Este año</option>
          </select>
        </div>

        {/* Botones de acción */}
        {canCreateProjects() && (
          <button
            onClick={onCreateProject}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            Nuevo Proyecto
          </button>
        )}

        <button
          onClick={() => (window.location.href = "/dashboard_blog.html")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          <FileText size={16} />
          Blog
        </button>
      </div>
    </div>
  );
}

// Componente de la tabla de proyectos
function ProjectsTable({
  proyectos,
  users,
  currentUser,
  onEdit,
  onAssign,
  onDelete,
  onEditClick,
  canAssignUsers,
  canDeleteProjects,
  getStatusColor,
  getStatusIcon,
  getStatusText,
  getPriorityColor,
}) {
  const openRedactor = async (proyectoId) => {
    try {
      // Verificar que existe la landing page
      const landingPage = await apiService.getLandingPageByProyecto(proyectoId);

      // Abrir redactor con el proyecto_id
      window.open(`/redactor/${proyectoId}`, "_blank");
    } catch (error) {
      console.error("❌ Error al verificar landing page:", error);
      alert("Error al acceder a la landing page: " + error.message);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "0.75rem",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f8fafc" }}>
            <tr>
              <th
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "left",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#374151",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Nombre
              </th>
              <th
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "left",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#374151",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Asignado a
              </th>
              <th
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "left",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#374151",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Estado
              </th>
              <th
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "left",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#374151",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Prioridad
              </th>
              <th
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "left",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#374151",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Última Modificación
              </th>
              <th
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "right",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#374151",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {proyectos.map((proyecto, index) => {
              const assignedUser = users?.find(
                (u) => u.id === proyecto.assignedTo
              );

              return (
                <tr
                  key={proyecto.id}
                  style={{
                    borderTop: index > 0 ? "1px solid #e2e8f0" : "none",
                  }}
                >
                  <td style={{ padding: "1rem" }}>
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: "600",
                          color: "#1e293b",
                        }}
                      >
                        {proyecto.name}
                      </p>
                    </div>
                  </td>

                  <td style={{ padding: "1rem" }}>
                    {assignedUser ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <div
                          style={{
                            width: "1.5rem",
                            height: "1.5rem",
                            backgroundColor: "#3b82f6",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                          }}
                        >
                          {assignedUser.avatar || assignedUser.name?.charAt(0)}
                        </div>
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.875rem",
                              fontWeight: "500",
                              color: "#1e293b",
                            }}
                          >
                            {assignedUser.name}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: "#64748b", fontSize: "0.875rem" }}>
                        Sin asignar
                      </span>
                    )}
                  </td>

                  <td style={{ padding: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.25rem 0.75rem",
                        backgroundColor: `${getStatusColor(proyecto.status)}15`,
                        color: getStatusColor(proyecto.status),
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                        width: "fit-content",
                      }}
                    >
                      {getStatusIcon(proyecto.status)}
                      {getStatusText(proyecto.status)}
                    </div>
                  </td>

                  <td style={{ padding: "1rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        backgroundColor: `${getPriorityColor(
                          proyecto.priority
                        )}15`,
                        color: getPriorityColor(proyecto.priority),
                        borderRadius: "0.25rem",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                      }}
                    >
                      {proyecto.priority === "high"
                        ? "Alta"
                        : proyecto.priority === "medium"
                        ? "Media"
                        : "Baja"}
                    </span>
                  </td>

                  <td style={{ padding: "1rem" }}>
                    <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
                      {proyecto.lastModified
                        ? new Date(proyecto.lastModified).toLocaleDateString(
                            "es-ES"
                          )
                        : "-"}
                    </span>
                  </td>

                  <td style={{ padding: "1rem", textAlign: "right" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "0.5rem",
                      }}
                    >
                      {onEdit(proyecto) && (
                        <button
                          onClick={() => onEditClick(proyecto)}
                          style={{
                            padding: "0.5rem",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Editar proyecto"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}

                      {canAssignUsers() && (
                        <button
                          onClick={() => onAssign(proyecto)}
                          style={{
                            padding: "0.5rem",
                            backgroundColor: "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Asignar usuario"
                        >
                          <UserPlus size={14} />
                        </button>
                      )}

                      <button
                        onClick={() => openRedactor(proyecto.id)}
                        style={{
                          padding: "0.5rem",
                          backgroundColor: "#f3f4f6",
                          color: "#64748b",
                          border: "none",
                          borderRadius: "0.375rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Ver Proyecto"
                      >
                        <Eye size={14} />
                      </button>

                      {canAssignUsers() && (
                        <button
                          onClick={() => onDelete(proyecto.id)}
                          style={{
                            padding: "0.5rem",
                            backgroundColor: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Eliminar proyecto"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {proyectos.length === 0 && (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          <AlertCircle
            size={48}
            style={{ margin: "0 auto 1rem", opacity: 0.5 }}
          />
          <p style={{ margin: 0, fontSize: "1.125rem", fontWeight: "500" }}>
            No se encontraron proyectos
          </p>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>
            Ajusta los filtros o crea un nuevo proyecto
          </p>
        </div>
      )}
    </div>
  );
}

// Modal para crear nuevo proyecto
function CreateProyectoModal({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priority: "",
    template_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesGrouped, setTemplatesGrouped] = useState({});

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setTemplatesLoading(true);
        const response = await fetch(
          "http://192.168.1.129:8000/templates/public/active"
        );

        if (response.ok) {
          const templatesData = await response.json();
          setTemplates(templatesData);

          // Agrupar templates por proyecto > dominio > categoria
          const grouped = {};
          templatesData.forEach((template) => {
            const { proyecto, dominio, categoria } = template;

            if (!grouped[proyecto]) {
              grouped[proyecto] = {};
            }
            if (!grouped[proyecto][dominio]) {
              grouped[proyecto][dominio] = {};
            }
            if (!grouped[proyecto][dominio][categoria]) {
              grouped[proyecto][dominio][categoria] = [];
            }

            grouped[proyecto][dominio][categoria].push(template);
          });

          setTemplatesGrouped(grouped);
        } else {
          console.error("Error cargando templates:", response.status);
        }
      } catch (error) {
        console.error("Error cargando templates:", error);
      } finally {
        setTemplatesLoading(false);
      }
    };

    loadTemplates();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.template_id) {
      alert("Por favor selecciona un template");
      return;
    }

    if (formData.name.trim()) {
      try {
        setLoading(true);

        await onSubmit(formData);
      } catch (error) {
        console.error("Error in form submission:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const [expandedProjects, setExpandedProjects] = useState(new Set());

  const toggleProject = (proyecto) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(proyecto)) {
      newExpanded.delete(proyecto);
    } else {
      newExpanded.add(proyecto);
    }
    setExpandedProjects(newExpanded);
  };

  const renderTemplateSelector = () => {
    if (templatesLoading) {
      return (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            border: "1px solid #e2e8f0",
            borderRadius: "0.375rem",
            backgroundColor: "#f8fafc",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              border: "2px solid #e2e8f0",
              borderTop: "2px solid #3b82f6",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 0.5rem",
            }}
          ></div>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
            Cargando templates...
          </p>
        </div>
      );
    }

    if (templates.length === 0) {
      return (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            border: "1px solid #e2e8f0",
            borderRadius: "0.375rem",
            backgroundColor: "#fef2f2",
            color: "#dc2626",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.875rem" }}>
            No hay templates disponibles
          </p>
        </div>
      );
    }

    return (
      <div
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.375rem",
          maxHeight: "400px",
          overflowY: "auto",
          backgroundColor: "white",
        }}
      >
        {Object.entries(templatesGrouped).map(([proyecto, dominios]) => {
          const isExpanded = expandedProjects.has(proyecto);

          return (
            <div key={proyecto} style={{ borderBottom: "1px solid #f3f4f6" }}>
              {/* Header del proyecto - clickeable para expandir/colapsar */}
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: "#f8fafc",
                  fontWeight: "600",
                  fontSize: "0.875rem",
                  color: "#374151",
                  borderBottom: isExpanded ? "1px solid #e5e7eb" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "background-color 0.2s",
                  userSelect: "none",
                }}
                onClick={() => toggleProject(proyecto)}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#f8fafc";
                }}
              >
                <span>📁 {proyecto.toUpperCase()}</span>
                <span
                  style={{
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                  }}
                >
                  ▶
                </span>
              </div>

              {/* Contenido del proyecto - solo se muestra si está expandido */}
              {isExpanded && (
                <div
                  style={{
                    backgroundColor: "white",
                    animation: "slideDown 0.2s ease-out",
                  }}
                >
                  {Object.entries(dominios).map(([dominio, categorias]) => (
                    <div key={dominio} style={{ paddingLeft: "1rem" }}>
                      <div
                        style={{
                          padding: "0.5rem 0.75rem",
                          backgroundColor: "#fafafa",
                          fontSize: "0.875rem",
                          color: "#6b7280",
                          fontWeight: "500",
                        }}
                      >
                        🌐 {dominio}
                      </div>

                      {Object.entries(categorias).map(
                        ([categoria, templatesList]) => (
                          <div key={categoria} style={{ paddingLeft: "1rem" }}>
                            <div
                              style={{
                                padding: "0.25rem 0.75rem",
                                fontSize: "0.75rem",
                                color: "#9ca3af",
                                fontWeight: "500",
                              }}
                            >
                              🏷️ {categoria}
                            </div>

                            {templatesList.map((template) => (
                              <label
                                key={template.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  padding: "0.5rem 0.75rem 0.5rem 2rem",
                                  cursor: "pointer",
                                  backgroundColor:
                                    formData.template_id === template.id
                                      ? "#dbeafe"
                                      : "transparent",
                                  transition: "background-color 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  if (formData.template_id !== template.id) {
                                    e.target.style.backgroundColor = "#f3f4f6";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (formData.template_id !== template.id) {
                                    e.target.style.backgroundColor =
                                      "transparent";
                                  }
                                }}
                              >
                                <input
                                  type="radio"
                                  name="template"
                                  value={template.id}
                                  checked={formData.template_id === template.id}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      template_id: e.target.value,
                                    })
                                  }
                                  style={{ marginRight: "0.5rem" }}
                                />
                                <div>
                                  <div
                                    style={{
                                      fontSize: "0.875rem",
                                      fontWeight: "500",
                                      color: "#1f2937",
                                    }}
                                  >
                                    {template.name}
                                  </div>
                                  {template.description && (
                                    <div
                                      style={{
                                        fontSize: "0.75rem",
                                        color: "#6b7280",
                                        marginTop: "0.125rem",
                                      }}
                                    >
                                      {template.description}
                                    </div>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Estilos CSS para la animación */}
        <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 1000px;
          }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      </div>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "0.75rem",
          padding: "2rem",
          minWidth: "500px",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h2
          style={{
            margin: "0 0 1.5rem 0",
            fontSize: "1.5rem",
            fontWeight: "700",
          }}
        >
          Crear Nuevo Proyecto
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Campo Nombre */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Nombre *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="Nombre del proyecto"
              required
            />
          </div>

          {/* Campo Descripción */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                outline: "none",
                boxSizing: "border-box",
                resize: "vertical",
              }}
              placeholder="Descripción del proyecto (opcional)"
            />
          </div>

          {/* Selector de Template */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Template *
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  fontWeight: "400",
                  marginLeft: "0.5rem",
                }}
              >
                (Selecciona el template base para tu proyecto)
              </span>
            </label>
            {renderTemplateSelector()}
          </div>

          {/* Campo Prioridad */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Prioridad
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                outline: "none",
                boxSizing: "border-box",
              }}
              required
            >
              <option value="">Selecciona una prioridad</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          {/* Template seleccionado - Info */}
          {formData.template_id && (
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "0.75rem",
                backgroundColor: "#f0f9ff",
                border: "1px solid #0ea5e9",
                borderRadius: "0.375rem",
              }}
            >
              <div style={{ fontSize: "0.875rem", color: "#0c4a6e" }}>
                <strong>Template seleccionado:</strong>
                {(() => {
                  const selectedTemplate = templates.find(
                    (t) => t.id === formData.template_id
                  );
                  return selectedTemplate ? (
                    <div style={{ marginTop: "0.25rem" }}>
                      📄 {selectedTemplate.name}
                      <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                        ({selectedTemplate.proyecto} →{" "}
                        {selectedTemplate.dominio} →{" "}
                        {selectedTemplate.categoria})
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          )}

          {/* Botones */}
          <div
            style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                backgroundColor: "white",
                color: "#374151",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                loading || !formData.name.trim() || !formData.template_id
              }
              style={{
                padding: "0.5rem 1rem",
                border: "none",
                borderRadius: "0.375rem",
                backgroundColor:
                  loading || !formData.name.trim() || !formData.template_id
                    ? "#94a3b8"
                    : "#3b82f6",
                color: "white",
                cursor:
                  loading || !formData.name.trim() || !formData.template_id
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {loading ? "Creando..." : "Crear Proyecto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal para asignar usuario
function AssignModal({ proyecto, users, onClose, onAssign }) {
  const [selectedUser, setSelectedUser] = useState(proyecto?.assignedTo || "");
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    try {
      setLoading(true);
      await onAssign(proyecto.id, selectedUser || null);
    } catch (error) {
      console.error("Error in assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "0.75rem",
          padding: "2rem",
          minWidth: "400px",
        }}
      >
        <h2
          style={{
            margin: "0 0 1.5rem 0",
            fontSize: "1.5rem",
            fontWeight: "700",
          }}
        >
          Asignar Usuario
        </h2>

        <p style={{ margin: "0 0 1rem 0", color: "#64748b" }}>
          Proyecto: <strong>{proyecto?.name}</strong>
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
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              outline: "none",
              boxSizing: "border-box",
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
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              backgroundColor: "white",
              color: "#374151",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              borderRadius: "0.375rem",
              backgroundColor: loading ? "#94a3b8" : "#3b82f6",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Asignando..." : "Asignar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal para editar proyecto
function EditProyectoModal({ proyecto, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: proyecto.name || "",
    description: proyecto.description || "",
    status: proyecto.status,
    priority: proyecto.priority,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.name.trim()) {
      try {
        setLoading(true);
        await onSubmit(formData);
      } catch (error) {
        console.error("Error in form submission:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "0.75rem",
          padding: "2rem",
          minWidth: "500px",
          maxWidth: "600px",
        }}
      >
        <h2
          style={{
            margin: "0 0 1.5rem 0",
            fontSize: "1.5rem",
            fontWeight: "700",
          }}
        >
          Editar Proyecto
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Campo Nombre */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Nombre
            </label>
            <input
              type="text"
              value={formData.name}
              readOnly
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                outline: "none",
                boxSizing: "border-box",
                backgroundColor: "#f9fafb",
                color: "#6b7280",
              }}
              placeholder="Nombre del proyecto"
              required
            />
          </div>

          {/* Campo Descripción */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                outline: "none",
                boxSizing: "border-box",
                resize: "vertical",
              }}
              placeholder="Descripción del proyecto"
            />
          </div>

          {/* Campo Estado */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Estado
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            >
              <option value="all">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="review">Pendiente de Redacción</option>
              <option value="in_progress">En Redacción</option>
              <option value="pen_review">Pendiente de Revisión</option>
              <option value="pen_ajuste">Pendiente de Ajuste</option>
              <option value="approved">Aprobado</option>
              <option value="rev_kws">Pendiente KWS</option>
              <option value="cargue">Cargue</option>
              <option value="test">Test</option>
              <option value="completed">Publicado</option>
            </select>
          </div>

          {/* Campo Prioridad */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Prioridad
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          {/* Botones */}
          <div
            style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                backgroundColor: "white",
                color: "#374151",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              style={{
                padding: "0.5rem 1rem",
                border: "none",
                borderRadius: "0.375rem",
                backgroundColor:
                  loading || !formData.name.trim() ? "#94a3b8" : "#3b82f6",
                color: "white",
                cursor:
                  loading || !formData.name.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Dashboard;
