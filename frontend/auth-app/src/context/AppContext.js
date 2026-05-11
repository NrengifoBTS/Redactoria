import React, { createContext, useState, useContext, useEffect } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [landingPages, setLandingPages] = useState([]);
  const [users, setUsers] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Configuración base de la API
  const API_BASE = process.env.REACT_APP_API_URL || "http://192.168.1.129:8080";

  // Funciones de utilidad para headers de API
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  // Inicializar usuario desde token
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          // Obtener datos del usuario actual desde la API
          const response = await fetch(`${API_BASE}/users/me`, {
            headers: getAuthHeaders(),
          });

          if (response.ok) {
            const userData = await response.json();
            setCurrentUser(userData);
            setIsAuthenticated(true);

            // Cargar usuarios, landing pages y proyectos iniciales
            await Promise.all([
              loadUsers(),
              loadLandingPages(),
              loadProyectos(),
            ]);
          } else {
            // Token inválido, limpiar
            localStorage.removeItem("token");
          }
        } catch (error) {
          console.error("Error inicializando autenticación:", error);
          localStorage.removeItem("token");
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Cargar usuarios desde la API
  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/users`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const usersData = await response.json();
        setUsers(usersData);
        return usersData;
      }
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    }
    return [];
  };

  // Cargar landing pages desde la API
  const loadLandingPages = async () => {
    try {
      const response = await fetch(`${API_BASE}/landing-pages`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const lpData = await response.json();
        setLandingPages(lpData);
        return lpData;
      }
    } catch (error) {
      console.error("Error cargando landing pages:", error);
    }
    return [];
  };

  // Cargar proyectos desde la API
  const loadProyectos = async () => {
    try {
      const response = await fetch(`${API_BASE}/proyectos`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const proyectosData = await response.json();
        setProyectos(proyectosData);
        return proyectosData;
      }
    } catch (error) {
      console.error("Error cargando proyectos:", error);
    }
    return [];
  };

  // Actualizar landing page localmente
  const updateLandingPage = (id, updates) => {
    setLandingPages((prev) =>
      prev.map((lp) =>
        lp.id === id
          ? { ...lp, ...updates, lastModified: new Date().toISOString() }
          : lp,
      ),
    );
  };

  // Crear nueva landing page
  const createLandingPage = async (data) => {
    try {
      const response = await fetch(`${API_BASE}/landing-pages`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newLP = await response.json();
        setLandingPages((prev) => [...prev, newLP]);
        return newLP;
      } else {
        const error = await response.text();
        throw new Error(`Error ${response.status}: ${error}`);
      }
    } catch (error) {
      console.error("Error creando landing page:", error);
      throw error;
    }
  };

  // Obtener landing page por ID
  const getLandingPageById = (id) => {
    return landingPages.find((lp) => lp.id === parseInt(id));
  };

  // Obtener landing page por proyecto ID
  const getLandingPageByProyectoId = async (proyectoId) => {
    try {
      const response = await fetch(
        `${API_BASE}/landing-pages/by-proyecto/${proyectoId}`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.ok) {
        const landingPage = await response.json();
        return landingPage;
      } else if (response.status === 404) {
        return null;
      } else {
        const error = await response.text();
        throw new Error(`Error ${response.status}: ${error}`);
      }
    } catch (error) {
      throw error;
    }
  };

  // Guardar progreso del redactor
  const saveRedactorProgress = async (
    landingPageId,
    tableData,
    annotations = {},
  ) => {
    try {
      // Preparar todas las secciones (con y sin contenido)
      const sections = [];

      Object.entries(tableData).forEach(([cellPosition, cellData]) => {
        sections.push({
          cell_position: cellPosition,
          content: cellData.content || "",
          section_type: "custom",
        });
      });

      const response = await fetch(
        `${API_BASE}/secciones-lp/landing-page/${landingPageId}/bulk-update`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ sections }),
        },
      );

      if (response.ok) {
        const result = await response.json();

        // Calcular progreso
        const progress = calculateProgress(tableData);

        // Actualizar estado local
        updateLandingPage(landingPageId, {
          tableData,
          annotations,
          progress,
          status: progress > 0 ? "in_progress" : "draft",
        });

        return result;
      } else {
        const error = await response.text();
        console.error("Error en bulk update:", response.status, error);
        throw new Error(`Error ${response.status}: ${error}`);
      }
    } catch (error) {
      console.error("Error en saveRedactorProgress:", error);
      throw error;
    }
  };

  // Calcular progreso basado en celdas completadas
  const calculateProgress = (tableData) => {
    if (!tableData || Object.keys(tableData).length === 0) return 0;

    const totalCells = Object.keys(tableData).length;
    const filledCells = Object.values(tableData).filter(
      (cell) => cell.content && cell.content.trim() !== "",
    ).length;

    return Math.round((filledCells / totalCells) * 100);
  };

  // Cargar secciones de landing page
  const loadLandingPageSections = async (landingPageId) => {
    try {
      const response = await fetch(
        `${API_BASE}/secciones-lp/landing-page/${landingPageId}`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.ok) {
        const sections = await response.json();

        // Convertir secciones a formato tableData
        const tableData = {};
        sections.forEach((section) => {
          tableData[section.cell_position] = {
            content: section.content || "",
          };
        });

        return tableData;
      } else if (response.status === 404) {
        return {};
      }
      return {};
    } catch (error) {
      console.error("Error cargando secciones:", error);
      return {};
    }
  };

  // Cargar anotaciones de landing page
  const loadLandingPageAnnotations = async (landingPageId) => {
    try {
      const response = await fetch(
        `${API_BASE}/anotaciones/landing-page/${landingPageId}/panel`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.ok) {
        const panelData = await response.json();

        // Convertir al formato que usa el redactor
        const annotations = {};
        Object.entries(panelData.anotaciones_por_celda).forEach(
          ([cellPosition, anotacionesList]) => {
            annotations[cellPosition] = anotacionesList.map((anotacion) => ({
              text: anotacion.text,
              author: anotacion.author,
              date: new Date(anotacion.created_at).toLocaleString("es-ES", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              }),
              id: anotacion.id,
            }));
          },
        );

        return annotations;
      } else if (response.status === 404) {
        return {};
      }
      return {};
    } catch (error) {
      console.error("Error cargando anotaciones:", error);
      return {};
    }
  };

  // Guardar anotación en base de datos
  const saveAnnotationToDB = async (landingPageId, cellPosition, text) => {
    try {
      const response = await fetch(
        `${API_BASE}/anotaciones/landing-page/${landingPageId}/cell`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            cell_position: cellPosition,
            text: text,
          }),
        },
      );

      if (response.ok) {
        const savedAnnotation = await response.json();
        return {
          text: savedAnnotation.text,
          author: savedAnnotation.author,
          date: new Date(savedAnnotation.created_at).toLocaleString("es-ES", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
          id: savedAnnotation.id,
        };
      } else {
        const error = await response.text();
        throw new Error(`Error ${response.status}: ${error}`);
      }
    } catch (error) {
      console.error("Error guardando anotación:", error);
      throw error;
    }
  };

  // Eliminar anotación de base de datos
  const deleteAnnotationFromDB = async (annotationId) => {
    try {
      const response = await fetch(`${API_BASE}/anotaciones/${annotationId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        return true;
      } else {
        const error = await response.text();
        throw new Error(`Error ${response.status}: ${error}`);
      }
    } catch (error) {
      console.error("Error eliminando anotación:", error);
      throw error;
    }
  };

  // Eliminar todas las anotaciones de una celda
  const deleteAllAnnotationsFromCell = async (landingPageId, cellPosition) => {
    try {
      const response = await fetch(
        `${API_BASE}/anotaciones/landing-page/${landingPageId}/cell/${cellPosition}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      if (response.ok) {
        return true;
      } else {
        const error = await response.text();
        throw new Error(`Error ${response.status}: ${error}`);
      }
    } catch (error) {
      console.error("Error eliminando anotaciones de la celda:", error);
      throw error;
    }
  };

  // Funciones de autenticación
  const login = async (credentials) => {
    try {
      const params = new URLSearchParams();
      params.append("grant_type", "password");
      params.append("username", credentials.username);
      params.append("password", credentials.password);
      params.append("scope", "");
      params.append("client_id", "string");
      params.append("client_secret", "string");

      const response = await fetch(`${API_BASE}/auth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      if (response.ok) {
        const { access_token } = await response.json();
        localStorage.setItem("token", access_token);

        // Obtener datos del usuario autenticado
        const userResponse = await fetch(`${API_BASE}/users/me`, {
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
        });
        if (userResponse.ok) {
          const user = await userResponse.json();
          setCurrentUser(user);
          setIsAuthenticated(true);

          // Cargar datos iniciales
          await Promise.all([loadUsers(), loadLandingPages(), loadProyectos()]);

          return { success: true, user, token: access_token };
        } else {
          const error = await userResponse.text();
          return { success: false, error };
        }
      } else {
        const error = await response.text();
        return { success: false, error };
      }
    } catch (error) {
      console.error("Error en login:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setCurrentUser(null);
    setIsAuthenticated(false);
    setUsers([]);
    setLandingPages([]);
    setProyectos([]);
  };

  // Funciones de refrescado de datos
  const refreshData = async () => {
    try {
      await Promise.all([loadUsers(), loadLandingPages(), loadProyectos()]);
    } catch (error) {
      console.error("Error refrescando datos:", error);
    }
  };

  const [templates, setTemplates] = useState([]);
  const [templatesGrouped, setTemplatesGrouped] = useState({});

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE}/templates/public/active`);
      if (response.ok) {
        const templatesData = await response.json();

        setTemplates(templatesData);

        // ... resto del código igual
        return templatesData;
      } else {
        console.error("Error en response:", response.status);
      }
    } catch (error) {
      console.error("Error en fetch:", error);
      return [];
    }
  };

  const getTemplateById = (templateId) => {
    return templates.find((template) => template.id === templateId);
  };

  const value = {
    // Estado
    currentUser,
    landingPages,
    users,
    proyectos,
    isAuthenticated,
    loading,

    // Funciones de estado
    templates,
    templatesGrouped,
    loadTemplates,
    getTemplateById,

    // Funciones LP
    updateLandingPage,
    createLandingPage,
    getLandingPageById,
    saveRedactorProgress,
    getLandingPageByProyectoId,
    loadLandingPageSections,
    loadLandingPageAnnotations,
    saveAnnotationToDB,
    deleteAnnotationFromDB,
    deleteAllAnnotationsFromCell,

    // Funciones Auth
    login,
    logout,

    // Funciones de datos
    loadUsers,
    loadLandingPages,
    loadProyectos,
    refreshData,

    // Utilidades
    getAuthHeaders,
    API_BASE,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};
