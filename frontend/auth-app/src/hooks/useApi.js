// useApi.js - Hook personalizado para manejar las llamadas a la API

import { useState, useEffect, useCallback } from "react";
import apiService from "../services/apiService";
import { useNavigate } from "react-router-dom";

// Hook genérico para cualquier llamada a la API
export const useApi = (apiFunction, dependencies = [], options = {}) => {
  const [data, setData] = useState(options.initialData || null);
  const [loading, setLoading] = useState(options.immediate !== false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      console.error("API call failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    if (options.immediate !== false) {
      execute();
    }
  }, dependencies);

  const refresh = () => execute();

  return { data, loading, error, execute, refresh, setData };
};

// Hook específico para proyectos
export const useProyectos = (filters = {}) => {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar proyectos
  const loadProyectos = useCallback(async (newFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getProyectos({ ...filters, ...newFilters });
      setProyectos(data);
      return data;
    } catch (err) {
      setError(err.message);
      console.error("Error loading proyectos:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear proyecto
  const createProyecto = useCallback(async (proyectoData) => {
    try {
      const nuevoProyecto = await apiService.createProyecto(proyectoData);
      // 💡 Usa esta forma para que aparezca arriba de todo inmediatamente
      setProyectos((prev) => [nuevoProyecto, ...prev]);
      return nuevoProyecto;
    } catch (err) {
      console.error("Error al crear proyecto:", err);
      throw err;
    }
  }, []);

  // Actualizar proyecto
  const updateProyecto = useCallback(async (id, proyectoData) => {
    try {
      const actualizado = await apiService.updateProyecto(id, proyectoData);
      // 🔥 CRUCIAL: Reemplazar el proyecto viejo por el actualizado en el estado
      setProyectos((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
      return actualizado;
    } catch (err) {
      console.error("Error al actualizar proyecto:", err);
      throw err;
    }
  }, []);

  // Eliminar proyecto
  const deleteProyecto = useCallback(async (id) => {
    try {
      await apiService.deleteProyecto(id);
      setProyectos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error deleting proyecto:", err);
      throw err;
    }
  }, []);

  // Asignar proyecto
  const assignProyecto = useCallback(async (proyectoId, userId) => {
    try {
      const updatedProyecto = await apiService.assignProyecto(
        proyectoId,
        userId,
      );
      setProyectos((prev) =>
        prev.map((p) => (p.id === proyectoId ? updatedProyecto : p)),
      );
      return updatedProyecto;
    } catch (err) {
      console.error("Error assigning proyecto:", err);
      throw err;
    }
  }, []);

  // Cambiar estado de proyecto
  const updateEstadoProyecto = useCallback(async (proyectoId, estado) => {
    try {
      const updatedProyecto = await apiService.updateEstadoProyecto(
        proyectoId,
        estado,
      );
      setProyectos((prev) =>
        prev.map((p) => (p.id === proyectoId ? updatedProyecto : p)),
      );
      return updatedProyecto;
    } catch (err) {
      console.error("Error updating estado:", err);
      throw err;
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    loadProyectos();
  }, []);

  return {
    proyectos,
    loading,
    error,
    loadProyectos,
    createProyecto,
    updateProyecto,
    deleteProyecto,
    assignProyecto,
    updateEstadoProyecto,
    setProyectos,
  };
};

// Hook para el usuario actual
export const useCurrentUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await apiService.getCurrentUser();
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.message);
      console.error("Error loading user:", err);
      navigate("/login");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Redirige si hay error y no hay usuario
  useEffect(() => {
    if (error && !user && !loading) {
      navigate("/login", { replace: true });
    }
  }, [error, user, loading, navigate]);

  return { user, loading, error, loadUser, setUser };
};

// Hook para usuarios (lista completa)
export const useUsers = (immediate = true) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const usersData = await apiService.getUsers();
      setUsers(usersData);
      return usersData;
    } catch (err) {
      setError(err.message);
      console.error("Error loading users:", err);
      navigate("/login");
      return null;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (immediate) {
      loadUsers();
    }
  }, [immediate]);

  return { users, loading, error, loadUsers, setUsers };
};

// Hook para manejar autenticación
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      const response = await apiService.login(email, password);
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (err) {
      console.error("Login failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error("Logout failed:", err);
      // Logout local even if API call fails
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (token) {
        const userData = await apiService.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    checkAuth,
  };
};

// Hook para manejar formularios con API
export const useApiForm = (submitFunction, options = {}) => {
  const [formData, setFormData] = useState(options.initialData || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (error) setError(null);
      if (success) setSuccess(false);
    },
    [error, success],
  );

  const handleSubmit = useCallback(
    async (e) => {
      if (e) e.preventDefault();

      try {
        setLoading(true);
        setError(null);
        setSuccess(false);

        const result = await submitFunction(formData);
        setSuccess(true);

        if (options.resetOnSuccess) {
          setFormData(options.initialData || {});
        }

        if (options.onSuccess) {
          options.onSuccess(result);
        }

        return result;
      } catch (err) {
        setError(err.message);
        if (options.onError) {
          options.onError(err);
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [formData, submitFunction, options],
  );

  const reset = useCallback(() => {
    setFormData(options.initialData || {});
    setError(null);
    setSuccess(false);
  }, [options.initialData]);

  return {
    formData,
    setFormData,
    loading,
    error,
    success,
    handleChange,
    handleSubmit,
    reset,
  };
};

// Hook para paginación
export const usePagination = (items, itemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  const goToPage = useCallback(
    (page) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // Reset to page 1 when items change
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  return {
    currentPage,
    totalPages,
    currentItems,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};

// Hook para filtros
export const useFilters = (data, filterFunctions) => {
  const [filters, setFilters] = useState({});
  const [filteredData, setFilteredData] = useState(data);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilter = useCallback((key) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  useEffect(() => {
    let filtered = [...data];

    Object.entries(filters).forEach(([key, value]) => {
      if (value && filterFunctions[key]) {
        filtered = filtered.filter((item) => filterFunctions[key](item, value));
      }
    });

    setFilteredData(filtered);
  }, [data, filters, filterFunctions]);

  return {
    filters,
    filteredData,
    updateFilter,
    clearFilter,
    clearAllFilters,
  };
};

// Hook para búsqueda
export const useSearch = (data, searchFields) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(data);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults(data);
      return;
    }

    const filtered = data.filter((item) => {
      return searchFields.some((field) => {
        const value = field.split(".").reduce((obj, key) => obj?.[key], item);
        return value
          ?.toString()
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      });
    });

    setSearchResults(filtered);
  }, [data, searchTerm, searchFields]);

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
  };
};

//_______________________________________________________________
// Hook específico para blogs
//_______________________________________________________________
export const useBlogs = (filters = {}) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar blogs
  const loadBlogs = useCallback(async (newFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      // ASUMIMOS que apiService tiene una función getBlogs
      const data = await apiService.getBlogs({ ...filters, ...newFilters });
      setBlogs(data);
      return data;
    } catch (err) {
      setError(err.message);
      console.error("Error loading blogs:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear blog
  const createBlog = useCallback(async (blogData) => {
    try {
      // ASUMIMOS que apiService tiene una función createBlog
      const newBlog = await apiService.createBlog(blogData);
      setBlogs((prev) => [...prev, newBlog]);
      return newBlog;
    } catch (err) {
      console.error("Error creating blog:", err);
      throw err;
    }
  }, []);

  // Actualizar blog
  const updateBlog = useCallback(async (id, updates) => {
    try {
      // ASUMIMOS que apiService tiene una función updateBlog
      const updatedBlog = await apiService.updateBlog(id, updates);
      setBlogs((prev) => prev.map((b) => (b.id === id ? updatedBlog : b)));
      return updatedBlog;
    } catch (err) {
      console.error("Error updating blog:", err);
      throw err;
    }
  }, []);

  // Eliminar blog
  const deleteBlog = useCallback(async (id) => {
    try {
      // ASUMIMOS que apiService tiene una función deleteBlog
      await apiService.deleteBlog(id);
      setBlogs((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error("Error deleting blog:", err);
      throw err;
    }
  }, []);

  // Asignar blog (análogo a assignProyecto)
  const assignBlog = useCallback(async (blogId, userId) => {
    try {
      // Llama a la API, la cual espera { assigned_to: userId }
      const updatedBlog = await apiService.assignBlog(blogId, userId);
      // Actualiza el estado de la lista de blogs en el frontend (CRÍTICO)
      setBlogs((prev) => prev.map((b) => (b.id === blogId ? updatedBlog : b)));
      return updatedBlog;
    } catch (err) {
      console.error("Error al asignar blog:", err);
      throw err;
    }
  }, []);

  // Cambiar estado de blog (análogo a updateEstadoProyecto)
  const updateEstadoBlog = useCallback(async (blogId, estado) => {
    try {
      // ASUMIMOS que apiService tiene una función updateEstadoBlog
      const updatedBlog = await apiService.updateEstadoBlog(blogId, estado);
      setBlogs((prev) => prev.map((b) => (b.id === blogId ? updatedBlog : b)));
      return updatedBlog;
    } catch (err) {
      console.error("Error updating blog estado:", err);
      throw err;
    }
  }, []);

  // OBTENER BLOG INDIVIDUAL (Usado por componentes fuera de la lista principal)
  const getBlogById = useCallback(async (blogId) => {
    try {
      return await apiService.getBlogById(blogId);
    } catch (err) {
      console.error("Error fetching single blog:", err);
      throw err;
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    loadBlogs();
  }, []);

  return {
    blogs,
    loading,
    error,
    loadBlogs,
    createBlog,
    updateBlog,
    deleteBlog,
    assignBlog,
    updateEstadoBlog,
    getBlogById,
    setBlogs,
  };
};

export default {
  useApi,
  useProyectos,
  useCurrentUser,
  useUsers,
  useAuth,
  useApiForm,
  usePagination,
  useFilters,
  useSearch,
  //---------------------------
  //EXPORT PARA BLOGS
  //---------------------------
  useBlogs,
};
