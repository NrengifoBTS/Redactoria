import React, { useEffect, useState } from "react";
import apiService from "./services/apiService.js";
import { isAdminUser, isEditorUser } from "./utils/roles";
import { useCurrentUser } from "./hooks/useApi.js";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./css/blog_Metrics.css";

const BlogMetrics = ({ blogId, onBack }) => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useCurrentUser();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const url = blogId
          ? `http://localhost:8080/logs_blog/analytics/${blogId}`
          : `http://localhost:8080/logs_blog/analytics/global/summary`;

        const res = await axios.get(url);
        setData({
          ...res.data,
          sourceType: blogId ? "Análisis Individual" : "Consolidado Global",
          lastUpdated: new Date().toLocaleDateString(),
        });
      } catch (err) {
        console.error("Error cargando métricas:", err);
      } finally {
        setLoading(false); // [cite: 7]
      }
    };
    fetchMetrics();
  }, [blogId]);

  if (loading)
    return (
      <div className="p-20 text-center font-bold text-slate-400">
        Analizando registros de IA...
      </div>
    );

  const scores = data?.global_scores || data?.scores;
  const history = data?.history || [];
  const feedback = getAIFeedback(scores);

  return (
    <div className="metrics-wrapper animate-fade-in">
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
            Metricas <span style={{ color: "#3b82f6" }}>Blogs</span>
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
            {/*BOTON DE Dashboard */}
            <a
              href="/dashboard_blog"
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
                className="uil uil-dashboard"
                style={{ fontSize: "1.1rem" }}
              ></i>
              <span>Dashboard Blog</span>
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

      <main className="metrics-content-body">
        {/* Agrega esto justo antes de <div className="metrics-grid-top"> */}
        <div className="data-source-info">
          <div className="source-badge">
            <i className="uil uil-database"></i>
            <span>
              Origen: <strong>{data?.sourceType || "Cargando..."}</strong>
            </span>
          </div>
          <span className="last-sync">Sincronizado: {data?.lastUpdated}</span>
        </div>

        {/* CUERPO DE MÉTRICAS- TARJETAS */}
        {/* CUERPO DE MÉTRICAS - TARJETAS EXPANDIDAS */}
        <div className="metrics-grid-top">
          {/* Fila 1: Calidad de IA */}
          <MetricCard
            title="Fidelidad IA"
            subtitle="Precisión semántica"
            value={`${((scores?.avg_semantic || scores?.semantic || 0) * 100).toFixed(1)}%`}
            icon="uil-brain"
            color="#3b82f6"
            bgColor="rgba(59, 130, 246, 0.1)"
            trend="+2.4%"
          />
          <MetricCard
            title="Estructura"
            subtitle="Alineación de formato"
            value={`${((scores?.avg_alignment || scores?.alignment || 0) * 100).toFixed(1)}%`}
            icon="uil-layers-alt"
            color="#8b5cf6"
            bgColor="rgba(139, 92, 246, 0.1)"
            trend="Estable"
          />
          <MetricCard
            title="Originalidad"
            subtitle="Detección de IA"
            value={`${((scores?.avg_originality || scores?.originality || 0.95) * 100).toFixed(1)}%`}
            icon="uil-shield-check"
            color="#f59e0b"
            bgColor="rgba(245, 158, 11, 0.1)"
            trend="Humano"
          />

          {/* Fila 2: Rendimiento y SEO */}
          <MetricCard
            title="Optimización SEO"
            subtitle="Uso de Keywords"
            value={`${((scores?.avg_seo || scores?.seo || 0.88) * 100).toFixed(1)}%`}
            icon="uil-search-alt"
            color="#10b981"
            bgColor="rgba(16, 185, 129, 0.1)"
            trend="Alto"
          />
          <MetricCard
            title="Legibilidad"
            subtitle="Índice de lectura"
            value={`${((scores?.avg_readability || scores?.readability || 0.82) * 100).toFixed(1)}%`}
            icon="uil-book-open"
            color="#ec4899"
            bgColor="rgba(236, 72, 153, 0.1)"
            trend="Fluido"
          />
          <MetricCard
            title="Blogs Totales"
            subtitle="Historial analizado"
            value={scores?.total_analyzed || "1"}
            icon="uil-file-check-alt"
            color="#64748b"
            bgColor="rgba(100, 116, 139, 0.1)"
          />
        </div>

        {/* SECCIÓN DE FEEDBACK DE IA */}
        <div className="feedback-section">
          <div
            className="feedback-card"
            style={{ borderLeft: `6px solid ${feedback.color}` }}
          >
            <div className="feedback-icon" style={{ color: feedback.color }}>
              <i className={`uil ${feedback.icon}`}></i>
            </div>
            <div className="feedback-content">
              <div className="feedback-header">
                <h4>Diagnóstico de IA</h4>
                <span
                  className="feedback-status"
                  style={{
                    backgroundColor: `${feedback.color}15`,
                    color: feedback.color,
                  }}
                >
                  {feedback.status}
                </span>
              </div>
              <p className="feedback-text">{feedback.message}</p>

              <div className="feedback-suggestions">
                <span className="suggestion-tag">#Optimización</span>
                <span className="suggestion-tag">#Estructura</span>
                <span className="suggestion-tag">#SEO_Friendly</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENEDOR DE GRÁFICA MEJORADO */}
        <div className="chart-main-container">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">
                <i className="uil uil-analysis text-blue-500"></i>
                Comparativa: Fidelidad vs. Estructura
              </h3>
              <p className="chart-subtitle">
                Evolución histórica de calidad y formato
              </p>
            </div>
          </div>

          <div style={{ width: "100%", height: 350 }}>
            <ResponsiveContainer>
              <AreaChart data={history}>
                <defs>
                  {/* Gradiente para Semántica (Azul) */}
                  <linearGradient id="colorSem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  {/* Gradiente para Estructura (Morado) */}
                  <linearGradient id="colorStruct" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />

                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  dy={10}
                />

                <YAxis hide domain={[0, 1]} />

                <Tooltip
                  contentStyle={{
                    borderRadius: "15px",
                    border: "none",
                    boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
                    backgroundColor: "#ffffff",
                  }}
                />

                {/* ÁREA 1: SEMÁNTICA */}
                <Area
                  name="Semántica"
                  type="monotone"
                  dataKey="semantic"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSem)"
                />

                {/* ÁREA 2: ESTRUCTURA */}
                <Area
                  name="Estructura"
                  type="monotone"
                  dataKey="alignment"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorStruct)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
};

// Componente de Tarjeta mejorado
const MetricCard = ({
  title,
  subtitle,
  value,
  icon,
  color,
  bgColor,
  trend,
}) => (
  <div className="card-metric-premium">
    <div
      className="card-inner"
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div className="metric-header">
        <div
          className="metric-icon-bg"
          style={{
            backgroundColor: bgColor,
            width: "45px",
            height: "45px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
          }}
        >
          <i className={`uil ${icon}`} style={{ color: color }}></i>
        </div>
        {trend && (
          <span
            className={`metric-trend ${trend.includes("+") ? "up" : ""}`}
            style={{
              fontSize: "0.75rem",
              padding: "4px 8px",
              borderRadius: "10px",
              background: trend.includes("+") ? "#ecfdf5" : "#f1f5f9",
              color: trend.includes("+") ? "#10b981" : "#64748b",
              fontWeight: "bold",
            }}
          >
            {trend}
          </span>
        )}
      </div>

      <div className="metric-info" style={{ marginTop: "15px" }}>
        <span
          className="metric-label-text"
          style={{
            fontSize: "0.75rem",
            fontWeight: "700",
            color: "#64748b",
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
        <div
          className="metric-main-value"
          style={{
            fontSize: "1.8rem",
            fontWeight: "800",
            color: "#0f172a",
            margin: "4px 0",
          }}
        >
          {value}
        </div>
        <p
          className="metric-subtitle"
          style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0 }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  </div>
);

// 1. Función para generar el feedback (colócala antes del return)
const getAIFeedback = (scores) => {
  const semantic = (scores?.avg_semantic || scores?.semantic || 0) * 100;
  const alignment = (scores?.avg_alignment || scores?.alignment || 0) * 100;

  if (semantic >= 90 && alignment >= 90) {
    return {
      status: "Excelente",
      message:
        "El contenido tiene una coherencia excepcional y sigue la estructura perfectamente.",
      color: "#10b981",
      icon: "uil-check-circle",
    };
  } else if (semantic < 70) {
    return {
      status: "Mejora Sugerida",
      message:
        "La fidelidad semántica es baja. Intenta enriquecer el vocabulario y evitar repeticiones innecesarias.",
      color: "#f59e0b",
      icon: "uil-exclamation-triangle",
    };
  } else {
    return {
      status: "Buen Rendimiento",
      message:
        "El blog cumple con los estándares, pero podrías ajustar el formato para una mejor legibilidad.",
      color: "#3b82f6",
      icon: "uil-info-circle",
    };
  }
};

// Tooltip personalizado para la gráfica
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{`${label}`}</p>
        <p className="intro" style={{ color: "#3b82f6" }}>
          Score:{" "}
          <span className="value">{(payload[0].value * 100).toFixed(1)}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export default BlogMetrics;
