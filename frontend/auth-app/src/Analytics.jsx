import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft,
  RefreshCw,
  Edit,
  Zap,
  CheckCircle2,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import apiService from "./services/apiService";
import { useApp } from "./context/AppContext";
import { isAdminUser, isEditorUser } from "./utils/roles";

function Analytics() {
  const navigate = useNavigate();
  const { currentUser: user, landingPages, loading: userLoading } = useApp();

  const [selectedLP, setSelectedLP] = useState(null);
  const [selectedProyectoGeneral, setSelectedProyectoGeneral] = useState(null); // "viajemos", "mcr", etc.
  const [selectedUser, setSelectedUser] = useState(null);
  const [timeRange, setTimeRange] = useState(30);
  const [includeAdmins, setIncludeAdmins] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Check if user has permission
  useEffect(() => {
    // Wait for user to load
    if (userLoading) {
      return;
    }

    // If no user after loading, redirect to login
    if (!user) {
      navigate("/login");
      return;
    }

    // Check permissions
    if (!isAdminUser(user.id) && !isEditorUser(user.id)) {
      navigate("/dashboard");
    }
  }, [user, userLoading, navigate]);

  // Load users and templates for filters
  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        // Load users
        const usersResponse = await apiService.get("/users");
        setUsers(usersResponse || []);

        // Load ALL templates (from all users, active only) to properly match all LPs
        const templatesResponse = await apiService.get(
          "/templates/public/all-for-analytics",
        );
        setTemplates(templatesResponse || []);
      } catch (err) {
        console.error("Error loading filter data:", err);
      }
    };

    if (user && (isAdminUser(user.id) || isEditorUser(user.id))) {
      loadFiltersData();
    }
  }, [user]);

  // Get unique general projects from templates
  const proyectosGenerales = React.useMemo(() => {
    const uniqueProyectos = new Set();
    templates.forEach((t) => {
      if (t.proyecto) {
        uniqueProyectos.add(t.proyecto);
      }
    });
    return Array.from(uniqueProyectos).map((p) => ({
      value: p,
      label: p.toUpperCase(),
    }));
  }, [templates]);

  // Filter landing pages based on selected general project
  const filteredLandingPages = React.useMemo(() => {
    if (!selectedProyectoGeneral) return landingPages;

    return landingPages.filter((lp) => {
      // Support both camelCase and snake_case
      const templateId = lp.templateId || lp.template_id;
      const template = templates.find((t) => t.id === templateId);
      return template && template.proyecto === selectedProyectoGeneral;
    });
  }, [selectedProyectoGeneral, landingPages, templates]);

  // Fetch metrics when filters change
  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedLP,
    selectedProyectoGeneral,
    selectedUser,
    timeRange,
    includeAdmins,
    user,
  ]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedProyectoGeneral)
        params.append("proyecto_general", selectedProyectoGeneral);
      if (selectedLP) params.append("landing_page_id", selectedLP);
      if (selectedUser) params.append("user_id", selectedUser);
      if (timeRange !== null) params.append("days", timeRange);
      if (!includeAdmins) params.append("exclude_admins", "true");

      const response = await apiService.get(
        `/logs/metrics?${params.toString()}`,
      );
      setMetrics(response);
    } catch (err) {
      console.error("Error fetching metrics:", err);
      setError("Error al cargar las métricas. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchMetrics();
  };

  const handleBack = () => {
    navigate(
      selectedProyectoGeneral
        ? `/dashboard/${selectedProyectoGeneral}`
        : "/dashboard",
    );
  };

  // Prepare chart data from temporal trends
  const prepareChartData = () => {
    if (!metrics?.temporal_trends) return [];

    const dates = Object.keys(metrics.temporal_trends).sort();
    return dates.map((date) => ({
      date: new Date(date).toLocaleDateString("es-ES", {
        month: "short",
        day: "numeric",
      }),
      generaciones: metrics.temporal_trends[date].generations || 0,
      ediciones: metrics.temporal_trends[date].edits || 0,
    }));
  };

  // Prepare block data for bar chart
  const prepareBlockData = () => {
    if (!metrics?.most_edited_blocks) return [];

    // El backend retorna una lista de objetos BlockEditStats
    if (Array.isArray(metrics.most_edited_blocks)) {
      return metrics.most_edited_blocks.map((block) => ({
        bloque: block.block_type.replace("_", " ").toUpperCase(),
        ediciones: block.edit_count,
      }));
    }

    // Fallback para formato antiguo (diccionario)
    return Object.entries(metrics.most_edited_blocks)
      .slice(0, 5)
      .map(([blockType, count]) => ({
        bloque: blockType.replace("_", " ").toUpperCase(),
        ediciones: count,
      }));
  };

  // NEW: Prepare alignment chart data
  const prepareAlignmentChartData = () => {
    if (!metrics?.alignment_trends) return [];
    const dates = Object.keys(metrics.alignment_trends).sort();
    return dates.map((date) => ({
      date: new Date(date).toLocaleDateString("es-ES", {
        month: "short",
        day: "numeric",
      }),
      alineacion: metrics.alignment_trends[date] || 0,
    }));
  };

  // Show loading while user is being fetched
  if (userLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f9fafb",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <RefreshCw
            size={48}
            style={{ color: "#3b82f6", animation: "spin 1s linear infinite" }}
          />
          <p style={{ marginTop: "16px", color: "#6b7280" }}>
            Cargando usuario...
          </p>
        </div>
      </div>
    );
  }

  // Show loading while metrics are being fetched
  if (loading && !metrics) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f9fafb",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <RefreshCw
            size={48}
            style={{ color: "#3b82f6", animation: "spin 1s linear infinite" }}
          />
          <p style={{ marginTop: "16px", color: "#6b7280" }}>
            Cargando métricas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
        padding: "24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={handleBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                cursor: "pointer",
                color: "#374151",
                fontSize: "14px",
              }}
            >
              <ArrowLeft size={20} />
              Volver
            </button>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#111827",
                margin: 0,
              }}
            >
              📊 Analytics & Métricas
            </h1>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              fontSize: "14px",
            }}
          >
            <RefreshCw
              size={18}
              style={{
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />
            Actualizar
          </button>
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "16px",
            flexWrap: "wrap",
          }}
        >
          {/* Proyecto General Filter */}
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#6b7280",
                marginBottom: "4px",
              }}
            >
              Proyecto
            </label>
            <select
              value={selectedProyectoGeneral || ""}
              onChange={(e) => {
                setSelectedProyectoGeneral(e.target.value || null);
                setSelectedLP(null); // Reset LP when changing project
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "14px",
                backgroundColor: "white",
              }}
            >
              <option value="">Todos los proyectos</option>
              {proyectosGenerales.map((proy) => (
                <option key={proy.value} value={proy.value}>
                  {proy.label}
                </option>
              ))}
            </select>
          </div>

          {/* Landing Page Filter */}
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#6b7280",
                marginBottom: "4px",
              }}
            >
              Landing Page
            </label>
            <select
              value={selectedLP || ""}
              onChange={(e) => setSelectedLP(e.target.value || null)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "14px",
                backgroundColor: "white",
              }}
            >
              <option value="">Todas las landing pages</option>
              {filteredLandingPages.map((lp) => (
                <option key={lp.id} value={lp.id}>
                  {lp.title || `LP ${lp.id.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#6b7280",
                marginBottom: "4px",
              }}
            >
              Usuario
            </label>
            <select
              value={selectedUser || ""}
              onChange={(e) => setSelectedUser(e.target.value || null)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "14px",
                backgroundColor: "white",
              }}
            >
              <option value="">Todos los usuarios</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {(u.first_name || u.firstName) && (u.last_name || u.lastName)
                    ? `${u.first_name || u.firstName} ${u.last_name || u.lastName}`
                    : u.email}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Filter */}
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#6b7280",
                marginBottom: "4px",
              }}
            >
              Rango de Tiempo
            </label>
            <select
              value={timeRange === null ? "" : timeRange}
              onChange={(e) =>
                setTimeRange(
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "14px",
                backgroundColor: "white",
              }}
            >
              <option value="">Todo el tiempo</option>
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
            </select>
          </div>

          {/* Admin Filter Toggle */}
          <div
            style={{
              flex: "1",
              minWidth: "250px",
              display: "flex",
              alignItems: "flex-end",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "14px",
                color: "#374151",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={includeAdmins}
                onChange={(e) => setIncludeAdmins(e.target.checked)}
                style={{
                  width: "40px",
                  height: "20px",
                  cursor: "pointer",
                  accentColor: "#3b82f6",
                }}
              />
              <span>Incluir actividad de administradores</span>
            </label>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto 24px",
            padding: "16px",
            backgroundColor: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: "8px",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      {/* Main Content */}
      {metrics && (
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Metric Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            {/* Generation Success Rate */}
            <MetricCard
              icon={<Zap size={24} style={{ color: "#3b82f6" }} />}
              title="Tasa de Éxito IA"
              value={`${Math.round((metrics.generation_success_rate || 0) * 100)}%`}
              color="#3b82f6"
              subtitle={`${metrics.successful_generations || 0} exitosas / ${metrics.failed_generations || 0} fallidas`}
            />

            {/* Total Edits */}
            <MetricCard
              icon={<Edit size={24} style={{ color: "#8b5cf6" }} />}
              title="Ediciones de Usuario"
              value={metrics.total_edits || 0}
              color="#8b5cf6"
            />

            {/* Acceptance Rate */}
            <MetricCard
              icon={<CheckCircle2 size={24} style={{ color: "#10b981" }} />}
              title="Tasa de Aceptación"
              value={`${Math.round((metrics.acceptance_rate || 0) * 100)}%`}
              color="#10b981"
              subtitle="Generaciones exitosas aceptadas sin editar"
            />

            {/* Alignment Score */}
            <MetricCard
              icon={<Target size={24} style={{ color: "#06b6d4" }} />}
              title="Alineación con IA"
              value={
                metrics.avg_alignment_shift_score !== null &&
                metrics.avg_alignment_shift_score !== undefined
                  ? `${Math.round((metrics.avg_alignment_shift_score || 0) * 100)}%`
                  : "N/A"
              }
              color="#06b6d4"
              subtitle="Similitud entre contenido IA original y edición final"
            />
          </div>

          {/* Charts */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
              gap: "24px",
              marginBottom: "24px",
            }}
          >
            {/* Temporal Trends Chart */}
            <div
              style={{
                backgroundColor: "white",
                padding: "24px",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  color: "#111827",
                }}
              >
                Tendencia Temporal
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={prepareChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="generaciones"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ediciones"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: "#8b5cf6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Most Edited Blocks Chart */}
            <div
              style={{
                backgroundColor: "white",
                padding: "24px",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  color: "#111827",
                }}
              >
                Bloques Más Editados (Top 5)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={prepareBlockData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bloque" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="ediciones" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alignment Trends Chart - NEW */}
          {metrics.alignment_trends &&
            Object.keys(metrics.alignment_trends).length > 0 && (
              <div
                style={{
                  backgroundColor: "white",
                  padding: "24px",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  marginBottom: "24px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    marginBottom: "8px",
                    color: "#111827",
                  }}
                >
                  Evolución de la Alineación IA-Editor
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    marginBottom: "16px",
                  }}
                >
                  Muestra cómo mejora la IA con el tiempo (valores más altos =
                  menos correcciones necesarias)
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={prepareAlignmentChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis
                      domain={[0, 1]}
                      tickFormatter={(value) => `${Math.round(value * 100)}%`}
                    />
                    <Tooltip
                      formatter={(value) => `${Math.round(value * 100)}%`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="alineacion"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={{ fill: "#06b6d4" }}
                      name="Alineación IA"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

          {/* User Activity Section */}
          {metrics.user_activity && metrics.user_activity.length > 0 && (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  👥 Actividad por Usuario
                </h3>
              </div>

              <div style={{ padding: "16px 24px" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "left",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#6b7280",
                            textTransform: "uppercase",
                          }}
                        >
                          Usuario
                        </th>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#6b7280",
                            textTransform: "uppercase",
                          }}
                        >
                          Generaciones
                        </th>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#6b7280",
                            textTransform: "uppercase",
                          }}
                        >
                          Exitosas
                        </th>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#6b7280",
                            textTransform: "uppercase",
                          }}
                        >
                          Fallidas
                        </th>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#6b7280",
                            textTransform: "uppercase",
                          }}
                        >
                          Ediciones
                        </th>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#6b7280",
                            textTransform: "uppercase",
                          }}
                        >
                          Correcciones Admin
                        </th>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#6b7280",
                            textTransform: "uppercase",
                          }}
                        >
                          Alineación IA
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.user_activity.map((userStat, index) => (
                        <tr
                          key={userStat.user_id}
                          style={{
                            borderBottom:
                              index < metrics.user_activity.length - 1
                                ? "1px solid #f3f4f6"
                                : "none",
                            backgroundColor:
                              index % 2 === 0 ? "#ffffff" : "#f9fafb",
                          }}
                        >
                          <td
                            style={{
                              padding: "12px 8px",
                              fontSize: "14px",
                              color: "#111827",
                            }}
                          >
                            {userStat.user_email}
                          </td>
                          <td
                            style={{
                              padding: "12px 8px",
                              textAlign: "center",
                              fontSize: "14px",
                              color: "#111827",
                              fontWeight: "600",
                            }}
                          >
                            {userStat.total_generations}
                          </td>
                          <td
                            style={{
                              padding: "12px 8px",
                              textAlign: "center",
                              fontSize: "14px",
                              color: "#10b981",
                            }}
                          >
                            {userStat.successful_generations}
                          </td>
                          <td
                            style={{
                              padding: "12px 8px",
                              textAlign: "center",
                              fontSize: "14px",
                              color: "#ef4444",
                            }}
                          >
                            {userStat.failed_generations}
                          </td>
                          <td
                            style={{
                              padding: "12px 8px",
                              textAlign: "center",
                              fontSize: "14px",
                              color: "#8b5cf6",
                              fontWeight: "600",
                            }}
                          >
                            {userStat.total_edits}
                          </td>
                          <td
                            style={{
                              padding: "12px 8px",
                              textAlign: "center",
                              fontSize: "14px",
                              color: "#3b82f6",
                            }}
                          >
                            {userStat.admin_edits_received > 0 ? (
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "4px",
                                }}
                              >
                                <span>{userStat.admin_edits_received}</span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px 8px",
                              textAlign: "center",
                              fontSize: "14px",
                              color: "#06b6d4",
                            }}
                          >
                            {userStat.avg_alignment_score !== null &&
                            userStat.avg_alignment_score !== undefined
                              ? `${Math.round(userStat.avg_alignment_score * 100)}%`
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* User Profile Section (if available) */}
          {metrics.user_profile && (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <button
                onClick={() => setShowProfile(!showProfile)}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 24px",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                <span>👤 Perfil de Estilo de Usuario</span>
                {showProfile ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>

              {showProfile && (
                <div
                  style={{
                    padding: "0 24px 24px",
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ marginBottom: "16px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#6b7280",
                          }}
                        >
                          Confianza del Perfil
                        </span>
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#111827",
                          }}
                        >
                          {Math.round(
                            (metrics.user_profile.profile_confidence || 0) *
                              100,
                          )}
                          %
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "8px",
                          backgroundColor: "#e5e7eb",
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${(metrics.user_profile.profile_confidence || 0) * 100}%`,
                            height: "100%",
                            backgroundColor: "#10b981",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>

                    <DetailItem
                      label="Total de Ediciones Analizadas"
                      value={metrics.user_profile.total_edits_analyzed || 0}
                    />

                    {metrics.user_profile.avg_edit_time_seconds && (
                      <DetailItem
                        label="Tiempo Promedio de Edición"
                        value={`${Math.round(metrics.user_profile.avg_edit_time_seconds)} segundos`}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Inline styles for animation */}
      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}

// Metric Card Component
function MetricCard({ icon, title, value, color, subtitle }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "8px",
        }}
      >
        {icon}
        <h3
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "#6b7280",
            margin: 0,
          }}
        >
          {title}
        </h3>
      </div>
      <p
        style={{
          fontSize: "32px",
          fontWeight: "bold",
          color: "#111827",
          margin: "8px 0",
        }}
      >
        {value}
      </p>
      {subtitle && (
        <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// Detail Item Component
function DetailItem({ label, value }) {
  return (
    <div
      style={{
        padding: "12px",
        backgroundColor: "#f9fafb",
        borderRadius: "8px",
      }}
    >
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
        {label}
      </div>
      <div style={{ fontSize: "16px", fontWeight: "600", color: "#111827" }}>
        {value}
      </div>
    </div>
  );
}

export default Analytics;
