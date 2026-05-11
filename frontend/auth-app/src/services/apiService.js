const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://192.168.1.129:8080";

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }


  // Configurar headers comunes
  getHeaders() {
    const headers = {
      "Content-Type": "application/json",
    };
    const currentToken = localStorage.getItem("token");
    if (currentToken) {
      headers["Authorization"] = `Bearer ${currentToken}`;
    }

    return headers;
  }

  // Verificar si el usuario está autenticado
  isAuthenticated() {
    const token = localStorage.getItem("token");
    return !!token;
  }

  // Limpiar autenticación y redirigir silenciosamente
  handleAuthError() {
    localStorage.removeItem("token");
    // Guardar la ubicación actual antes de redirigir para volver después del login
    if (
      window.location.pathname !== "/login" &&
      window.location.pathname !== "/home"
    ) {
      const returnUrl = window.location.pathname + window.location.search;
      localStorage.setItem("returnUrl", returnUrl);
    }
    // Redirigir sin usar navigate para evitar errores de contexto
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  // Método para hacer requests HTTP
  async makeRequest(url, options = {}) {
    // Verificar autenticación antes de hacer la petición
    if (!this.isAuthenticated() && !url.includes("/auth/")) {
      this.handleAuthError();
      throw new Error("NOT_AUTHENTICATED");
    }

    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(`${this.baseURL}${url}`, config);

      if (!response.ok) {
        // Manejo silencioso de errores de autenticación
        if (response.status === 401 || response.status === 403) {
          this.handleAuthError();
          throw new Error("NOT_AUTHENTICATED");
        }

        const errorData = await response.json().catch(() => ({}));

        if (response.status === 422) {
          console.error("Full error response:", errorData);

          if (errorData.detail && Array.isArray(errorData.detail)) {
            const errorMessages = errorData.detail
              .map((err) => {
                const field = err.loc ? err.loc.join(".") : "unknown";
                const message = err.msg || "validation error";
                const input = err.input
                  ? ` (received: ${JSON.stringify(err.input)})`
                  : "";
                return `${field}: ${message}${input}`;
              })
              .join("\n");

            throw new Error(`Validation errors:\n${errorMessages}`);
          }
        }

        // Manejo de otros errores
        let errorMessage;
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else {
          errorMessage =
            JSON.stringify(errorData) ||
            `HTTP ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      // No mostrar errores de autenticación en consola
      if (error.message === "NOT_AUTHENTICATED") {
        throw error;
      }

      // Solo loggear errores reales de la API
      console.error(`API Error [${options.method || "GET"}] ${url}:`, error);
      throw error;
    }
  }

  // Setear token de autenticación
  setAuthToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }

  // Métodos genéricos HTTP para uso directo
  async get(url, options = {}) {
    return this.makeRequest(url, {
      method: "GET",
      ...options,
    });
  }

  async post(url, data, options = {}) {
    return this.makeRequest(url, {
      method: "POST",
      body: JSON.stringify(data),
      ...options,
    });
  }

  async put(url, data, options = {}) {
    return this.makeRequest(url, {
      method: "PUT",
      body: JSON.stringify(data),
      ...options,
    });
  }

  async delete(url, options = {}) {
    return this.makeRequest(url, {
      method: "DELETE",
      ...options,
    });
  }

  // ENDPOINTS DE PROYECTOS

  // Crear nuevo proyecto
  async createProyecto(proyectoData) {
    try {
      const backendData = this.mapFrontendToBackend(proyectoData);
      const response = await this.makeRequest("/proyectos/", {
        method: "POST",
        body: JSON.stringify(backendData),
      });

      return this.mapBackendToFrontend(response);
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      throw error;
    }
  }

  // Obtener proyectos con filtros
  async getProyectos(filters = {}) {
    try {
      const queryParams = new URLSearchParams();

      // Mapear filtros del frontend al backend
      if (filters.estado) {
        queryParams.append("estado", this.mapStatusToBackend(filters.estado));
      }
      if (filters.prioridad) {
        queryParams.append(
          "prioridad",
          this.mapPriorityToBackend(filters.prioridad),
        );
      }
      if (filters.assigned_to) {
        queryParams.append("assigned_to", filters.assigned_to);
      }

      const queryString = queryParams.toString();
      const url = `/proyectos/${queryString ? `?${queryString}` : ""}`;
      const response = await this.makeRequest(url);
      const mappedResponse = response.map((proyecto) => {
        const mapped = this.mapBackendToFrontend(proyecto);
        return mapped;
      });
      return mappedResponse;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return []; // Retornar array vacío en lugar de error
      }
      throw error;
    }
  }

  // Obtener proyecto por ID
  async getProyectoById(proyectoId) {
    try {
      const response = await this.makeRequest(`/proyectos/${proyectoId}`);
      return this.mapBackendToFrontend(response);
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      throw error;
    }
  }

  // Actualizar proyecto
  async updateProyecto(proyectoId, updates) {
    try {
      const backendUpdates = this.mapFrontendToBackend(updates, true);
      const response = await this.makeRequest(`/proyectos/${proyectoId}`, {
        method: "PUT",
        body: JSON.stringify(backendUpdates),
      });
      return this.mapBackendToFrontend(response);
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      throw error;
    }
  }

  // Eliminar proyecto
  async deleteProyecto(proyectoId) {
    try {
      await this.makeRequest(`/proyectos/${proyectoId}`, {
        method: "DELETE",
      });
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return;
      }
      throw error;
    }
  }

  // Asignar proyecto a usuario
  async assignProyecto(proyectoId, userId) {
    try {
      const response = await this.makeRequest(
        `/proyectos/${proyectoId}/assign`,
        {
          method: "POST",
          body: JSON.stringify({ assigned_to: userId }),
        },
      );
      return this.mapBackendToFrontend(response);
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      throw error;
    }
  }

  // Cambiar estado del proyecto
  async updateEstadoProyecto(proyectoId, estado) {
    try {
      const backendEstado = this.mapStatusToBackend(estado);
      const response = await this.makeRequest(
        `/proyectos/${proyectoId}/estado`,
        {
          method: "POST",
          body: JSON.stringify({ estado: backendEstado }),
        },
      );
      return this.mapBackendToFrontend(response);
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      throw error;
    }
  }

  // Obtener proyectos creados por el usuario actual
  async getMyCreatedProyectos() {
    try {
      const response = await this.makeRequest("/proyectos/created-by/me");
      return response.map((proyecto) => this.mapBackendToFrontend(proyecto));
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return [];
      }
      throw error;
    }
  }

  // Obtener proyectos asignados al usuario actual
  async getMyAssignedProyectos() {
    try {
      const response = await this.makeRequest("/proyectos/assigned-to/me");
      return response.map((proyecto) => this.mapBackendToFrontend(proyecto));
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return [];
      }
      throw error;
    }
  }

  // Obtener proyectos de un usuario específico (solo admin)
  async getProyectosByUser(userId) {
    try {
      const response = await this.makeRequest(`/proyectos/user/${userId}`);
      return response.map((proyecto) => this.mapBackendToFrontend(proyecto));
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return [];
      }
      throw error;
    }
  }

  // Generar contenido con IA
  async generateIAContent(params) {
    try {
      const {
        lpId,
        blockNumber,
        blockTitle,
        tema,
        cellKey,
        faqQuestions = [],
        favCityQuestions = [],
        blockType,
        carTypes = [],
        templateInfo,
      } = params;
      const payload = {
        cellKey,
        currentContent: "",
        blockNumber,
        blockType,
        tit: blockTitle,
        tema,
        lpId,
        brand: templateInfo?.proyecto || "mcr",
        faqQuestions,
        favCityQuestions,
      };

      if (!templateInfo) {
        console.warn("No hay templateInfo");
      }

      if (
        faqQuestions &&
        Array.isArray(faqQuestions) &&
        faqQuestions.length > 0
      ) {
        payload.faq_questions = faqQuestions;
      }

      if (
        favCityQuestions &&
        Array.isArray(favCityQuestions) &&
        favCityQuestions.length > 0
      ) {
        payload.fav_city_questions = favCityQuestions;
      }

      if (faqQuestions && faqQuestions.length > 0) {
        payload.faq_questions = faqQuestions;
      }

      if (carTypes && Array.isArray(carTypes) && carTypes.length > 0) {
        payload.car_types = carTypes;
      }

      const response = await fetch(`${this.baseURL}/ia/${lpId}/block-2`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      console.log(
        "🔥 API SERVICE - Payload que se envía:",
        JSON.stringify(payload, null, 2),
      );

      if (!response.ok) {
        // Manejo de errores de autenticación
        if (response.status === 401 || response.status === 403) {
          this.handleAuthError();
          throw new Error("NOT_AUTHENTICATED");
        }

        const errorText = await response.text();
        console.error("Error Response Status:", response.status);
        console.error("Error Response Text:", errorText);

        try {
          const errorData = JSON.parse(errorText);
          console.error("Error Data:", errorData);
          throw new Error(
            errorData.detail ||
              `Error ${response.status}: ${response.statusText}`,
          );
        } catch (e) {
          throw new Error(`Error ${response.status}: ${errorText}`);
        }
      }

      const data = await response.json();
      return data.generatedContent;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      console.error("Error completo generating IA content:", error);
      throw error;
    }
  }

  // Traducir contenido
  async translateContent(
    lpId,
    sourceContent,
    targetLanguage,
    cellKey,
    blockTitle,
    tema,
  ) {
    try {
      const response = await fetch(`${this.baseURL}/ia/${lpId}/translate`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          sourceContent: sourceContent,
          targetLanguage: targetLanguage,
          cellKey: cellKey,
          lpId: lpId,
          blockTitle: blockTitle,
          tema: tema,
        }),
      });

      if (!response.ok) {
        // Manejo de errores de autenticación
        if (response.status === 401 || response.status === 403) {
          this.handleAuthError();
          throw new Error("NOT_AUTHENTICATED");
        }

        const errorData = await response.json();
        throw new Error(
          errorData.detail ||
            `Error ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      return data.translatedContent;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      console.error("Error translating content:", error);
      throw error;
    }
  }

  // MAPEO DE DATOS ENTRE FRONTEND Y BACKEND
  async getTemplateById(templateId) {
    try {
      const response = await this.makeRequest(`/templates/${templateId}`, {
        method: "GET",
      });
      return response;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      throw error;
    }
  }

  // Mapear datos del frontend al backend
  mapFrontendToBackend(frontendData, isUpdate = false) {
    const backendData = {};

    // Mapear campos básicos
    if (frontendData.name !== undefined) backendData.name = frontendData.name;
    if (frontendData.description !== undefined)
      backendData.description = frontendData.description;
    backendData.estado = this.mapStatusToBackend(
      frontendData.status || "draft",
    );
    if (frontendData.status !== undefined) {
      backendData.estado = this.mapStatusToBackend(frontendData.status);
    }
    if (frontendData.priority !== undefined) {
      backendData.prioridad = this.mapPriorityToBackend(frontendData.priority);
    }

    // Mapear asignación
    if (frontendData.assignedTo !== undefined) {
      backendData.assigned_to = frontendData.assignedTo;
    }

    // Mapear template
    if (frontendData.template_id) {
      backendData.template_id = frontendData.template_id;
    }

    return backendData;
  }

  // Mapear datos del backend al frontend
  mapBackendToFrontend(backendData) {
    return {
      id: backendData.id,
      name: backendData.name,
      description: backendData.description,
      status: this.mapStatusToFrontend(backendData.estado),
      priority: this.mapPriorityToFrontend(backendData.prioridad),
      assignedTo: backendData.assigned_to,
      templateId: backendData.template_id,
      createdBy: backendData.created_by,
      createdDate: backendData.created_at
        ? backendData.created_at.split("T")[0]
        : null,
      lastModified: backendData.last_modified
        ? backendData.last_modified.split("T")[0]
        : null,
      updatedAt: backendData.updated_at,
      assignedAt: backendData.assigned_at
        ? backendData.assigned_at.split("T")[0]
        : null,

      // Campos calculados para el frontend
      progress: this.calculateProgress(backendData.estado),
      category: "proyecto", // Valor por defecto
    };
  }

  // Mapear estado del frontend al backend (según tus enums)
  mapStatusToBackend(frontendStatus) {
    const mapping = {
      draft: "draft",
      in_progress: "in_progress",
      review: "review",
      completed: "published",
      published: "published",
      pen_review: "pen_review",
      pen_ajuste: "pen_ajuste",
      ajuste_aplicado: "ajuste_aplicado",
      approved: "approved",
      rev_kws: "rev_kws",
      cargue: "cargue",
      en_it: "en_it",
      test: "test",
    };
    return mapping[frontendStatus] || "draft";
  }

  mapStatusToFrontend(backendStatus) {
    const mapping = {
      draft: "draft",
      in_progress: "in_progress",
      review: "review",
      published: "completed",
      pen_review: "pen_review",
      pen_ajuste: "pen_ajuste",
      ajuste_aplicado: "ajuste_aplicado",
      approved: "approved",
      rev_kws: "rev_kws",
      cargue: "cargue",
      en_it: "en_it",
      test: "test",
    };
    return mapping[backendStatus] || "draft";
  }

  // Mapear prioridad del frontend al backend
  mapPriorityToBackend(frontendPriority) {
    const mapping = {
      low: "low",
      medium: "medium",
      high: "high",
    };
    return mapping[frontendPriority] || "medium";
  }

  // Mapear prioridad del backend al frontend
  mapPriorityToFrontend(backendPriority) {
    const mapping = {
      low: "low",
      medium: "medium",
      high: "high",
    };
    return mapping[backendPriority] || "medium";
  }

  // Calcular progreso basado en el estado
  calculateProgress(estado) {
    const progressMapping = {
      DRAFT: 0,
      IN_PROGRESS: 50,
      REVIEW: 80,
      PUBLISHED: 100,
    };
    return progressMapping[estado] || 0;
  }

  // ENDPOINTS DE AUTENTICACIÓN

  async login(email, password) {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await this.makeRequest("/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (response.access_token) {
      this.setAuthToken(response.access_token);
    }

    return response;
  }

  async logout() {
    try {
      await this.makeRequest("/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      // No mostrar errores de logout en consola
      if (error.message !== "NOT_AUTHENTICATED") {
        console.error("Logout request failed:", error);
      }
    } finally {
      this.setAuthToken(null);
    }
  }

  // Obtener usuario actual
  async getCurrentUser() {
    try {
      const response = await this.makeRequest("/users/me");
      return {
        id: response.id,
        name:
          `${response.first_name || ""} ${response.last_name || ""}`.trim() ||
          response.email ||
          "Usuario",
        email: response.email,
        role: response.role || "user",
        avatar:
          `${response.first_name?.[0] || ""}${
            response.last_name?.[0] || ""
          }`.toUpperCase() ||
          response.email?.[0] ||
          "U",
      };
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      console.error("Error getting current user:", error);
      throw error;
    }
  }

  // ENDPOINTS DE USUARIOS

  async getUsers() {
    try {
      const response = await this.makeRequest("/users/");

      return response.map((user) => ({
        id: user.id,
        name:
          `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.email ||
          "Usuario",
        email: user.email,
        role: user.role || "user",
        avatar:
          `${user.first_name?.charAt(0) || ""}${
            user.last_name?.charAt(0) || ""
          }` ||
          user.email?.charAt(0) ||
          "U",
      }));
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return [];
      }
      console.error("Error getting users:", error);
      return [];
    }
  }

  // ENDPOINTS ADICIONALES

  // Todos
  async getTodos() {
    try {
      const response = await this.makeRequest("/todos/");
      return response;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return [];
      }
      throw error;
    }
  }

  // Templates
  async getTemplates() {
    try {
      const response = await this.makeRequest("/templates/");
      return response;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return [];
      }
      throw error;
    }
  }

  // Landing Pages
  async getLandingPages() {
    try {
      const response = await this.makeRequest("/landing-pages/");
      return response;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return [];
      }
      throw error;
    }
  }

  // Obtener landing page por proyecto ID
  async getLandingPageByProyecto(proyectoId) {
    try {
      const response = await this.makeRequest(
        `/landing-pages/by-proyecto/${proyectoId}`,
      );
      return response;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      throw error;
    }
  }

  // Crear landing page
  async createLandingPage(landingPageData) {
    try {
      const response = await this.makeRequest("/landing-pages/", {
        method: "POST",
        body: JSON.stringify(landingPageData),
      });
      return response;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      throw error;
    }
  }

  // Secciones LP
  async getSeccionesLP() {
    try {
      const response = await this.makeRequest("/secciones-lp/");
      return response;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return [];
      }
      throw error;
    }
  }

  // Anotaciones
  async getAnotaciones() {
    try {
      const response = await this.makeRequest("/anotaciones/");
      return response;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return [];
      }
      throw error;
    }
  }

  //Guardar Log completo de Landing Page
  async saveTrainingData(currentLP, tableData) {
    try {
      const payload = {
        landing_page_id: currentLP.id,
        template_id: currentLP.template_id, // Obligatorio para la consulta SQL
        proyecto_id: currentLP.proyecto_id,
        full_json_content: tableData,
        metadata: {
          tema:
            currentLP.name || currentLP.proyecto_name || "Landing sin nombre",
          tit_seo: currentLP.title || "Sin título",
          marca: currentLP.name?.toLowerCase().includes("miles")
            ? "miles"
            : "viajemos",
        },
      };

      return await this.makeRequest("/logs/training-dataset", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Error en saveTrainingData:", error);
    }
  }

  // Ejecutar scraping
  async runScraping(blogId, query, numResults = 3, useAi = true) {
    try {
      const payload = {
        query,
        num_results: numResults,
        use_ai: useAi,
      };

      // CRÍTICO: Cambiar la URL al endpoint de stream y añadir el blogId
      const response = await this.makeRequest(`/scraping/stream/${blogId}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      return response;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      throw error;
    }
  }

  // =========================================================================
  // ENDPOINTS DE BLOGS (NUEVA SECCIÓN)
  // =========================================================================

  /**
   * Obtiene todos los blogs, o los asignados/creados para el usuario actual.
   */
  async getBlogs(filters = {}) {
    try {
      // 1. Crear URLSearchParams para manejar los filtros
      const queryParams = new URLSearchParams();

      // 2. Mapear filtros del frontend al backend (ejemplo)
      if (filters.status) {
        queryParams.append("estado", this.mapStatusToBackend(filters.status));
      }
      if (filters.priority) {
        queryParams.append(
          "prioridad",
          this.mapPriorityToBackend(filters.priority),
        );
      }
      if (filters.assignedTo) {
        queryParams.append("assigned_to", filters.assignedTo);
      }
      if (filters.category) {
        queryParams.append("category", filters.category);
      }
      // Añade aquí cualquier otro filtro que el backend de blogs necesite

      const queryString = queryParams.toString();
      const url = `/blogs/${queryString ? `?${queryString}` : ""}`;

      // 3. Llamar a makeRequest con la URL construida
      const response = await this.makeRequest(url);

      // 4. Mapeo de la respuesta (Si tienes una función mapBackendToBlogFrontend, úsala aquí)
      return response;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return [];
      }
      throw error;
    }
  }

  /**
   * Crea un nuevo blog.
   */
  async createBlog(blogData) {
    try {
      // Mapeo crucial: asegura que 'name' se envíe con el valor de 'titulo'
      const payload = {
        ...blogData,
        name: blogData.titulo || blogData.name,
      };

      const response = await this.makeRequest("/blogs/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return response;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      throw error;
    }
  }
  /**
   * Actualiza un blog existente.
   */
  async updateBlog(blogId, updates) {
    try {
      // Asumimos que los campos en 'updates' son los que espera el backend.
      const response = await this.makeRequest(`/blogs/${blogId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      return response;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Elimina un blog.
   */
  async deleteBlog(blogId) {
    try {
      await this.makeRequest(`/blogs/${blogId}`, {
        method: "DELETE",
      });
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return;
      }
      throw error;
    }
  }

  /**
   * Asigna un blog a un usuario.
   */
  async assignBlog(blogId, userId) {
    try {
      const response = await this.makeRequest(`/blogs/${blogId}/assign`, {
        method: "POST",
        body: JSON.stringify({ assigned_to: userId }),
      });
      return response;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Cambia el estado del blog.
   */
  async updateEstadoBlog(blogId, estado) {
    try {
      const backendEstado = this.mapStatusToBackend(estado);
      const response = await this.makeRequest(`/blogs/${blogId}/estado`, {
        method: "POST",
        body: JSON.stringify({ estado: backendEstado }),
      });
      return response;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      throw error;
    }
  }

  // Obtener blog por ID
  async getBlogById(blogId) {
    try {
      const response = await this.makeRequest(`/blogs/${blogId}`);
      return response;
    } catch (error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Revisar ortografía del blog con IA (OpenAI).
   * Devuelve { blog_id, errors: [{wrong, correct, reason}], checked_chars }.
   * No modifica el blog en la DB; el frontend resalta los errores y se
   * marca el blog como "Revisado con IA".
   */
  async reviewBlogWithAI(blogId) {
    const response = await this.makeRequest(`/blogs/${blogId}/review-ia`, {
      method: "POST",
    });
    return response;
  }

  /**
   * Registra cambios estructurales o de contenido en el log de entrenamiento IA
   */
  async logBlogEdit(blogId, structureBefore, structureAfter, context = {}) {
    try {
      const payload = {
        blog_id: blogId,
        structure_before: structureBefore,
        structure_after: structureAfter,
        edit_context: context,
      };

      return await this.makeRequest(`/logs/blog/structure-change`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Error logging blog edit:", error);
      return null;
    }
  }

  // =========================================================================
  // LOGS DE ENTRENAMIENTO IA BLOGS
  // =========================================================================

  /**
   * Registro inicial: Lo que la IA propuso (Baseline)
   */
  async logInitialAI(blogId, scrapingId, titlesBefore, structure_before) {
    try {
      const payload = {
        blog_id: blogId,
        scraping_id: scrapingId,
        titles_before: titlesBefore, // La estructura JSON generada
        structure_before: structure_before,
        prompt_used: "Generación inicial de estructura",
        model_name: "gpt-4o",
      };

      // CORRECCIÓN: La ruta debe ser /ai-generation según tu controller.py
      return await this.makeRequest("/logs_blog/ai-generation", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Error logging initial AI:", error);
      return null;
    }
  }

  /**
   * Registro de cambios: Lo que el usuario dejó (Target)
   */
  async logBlogStructureEdit(
    blogId,
    titlesAfter,
    structureAfter,
    actionType,
    context = {},
  ) {
    try {
      const payload = {
        blog_id: blogId,
        titles_after: titlesAfter, // Títulos finales (H1, H2, H3)
        structure_after: structureAfter, // Estructura completa con contenido
        action_type: actionType, // ej: "reorder_structure" o "content_finalized"
        edit_context: context,
      };

      return await this.makeRequest("/logs_blog/structure-change", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Error logging structure edit:", error);
      return null;
    }
  }
}

// Crear instancia singleton
const apiService = new ApiService();

export default apiService;

// Exportar funciones de mapeo para uso directo si es necesario
export const {
  mapBackendToFrontend,
  mapFrontendToBackend,
  mapStatusToBackend,
  mapStatusToFrontend,
  mapPriorityToBackend,
  mapPriorityToFrontend,
  generateIAContent,
  translateContent,
} = apiService;
