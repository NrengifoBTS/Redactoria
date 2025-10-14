import React, { useState, useRef } from "react";
import "@iconscout/unicons/css/line.css"; // Añadido para los iconos
import "./css/styles_generacion.css";

// Componente principal para la generación y análisis de blog
const GeneracionBlog = ({ initialParams = {}, onBackToDashboard }) => {
  // =======================================================================
  // 1. REFERENCIAS DE ELEMENTOS (useRef)
  // =======================================================================
  const referenciaUrls = useRef(null);
  const referenciaControladorAborto = useRef(null);

  // =======================================================================
  // 2. DATO INICIAL Y ESTADOS CLAVE
  // =======================================================================

  const [cardVisibility, setCardVisibility] = useState({
    temasKeywords: true,
    estiloTono: true,
    contexto: true,
  });

  // URLs de la API del backend
  const URL_API_SCRAPING = "http://192.168.1.129:8000/scraping/stream";
  const URL_API_IA = "http://192.168.1.129:8000/ai/generate_structure";

  // --- Estados de Datos y Control ---
  const [datosFinales, setDatosFinales] = useState(null);
  const [cargandoScraping, setCargandoScraping] = useState(false);
  const [error, setError] = useState(null);
  const [usarIA, setUsarIA] = useState(true);

  // Resultados parseados para la vista
  const [tablaEstructuraFinal, setTablaEstructuraFinal] = useState("");

  // ESTADOS DE HISTORIAL para la funcionalidad de regeneración
  const [historialIntencion, setHistorialIntencion] = useState([]);

  // ESTADOS CLAVE para el flujo manual (FASE 4: Análisis IA)
  const [contenidoConsolidado, setContenidoConsolidado] = useState(null);
  const [cargandoIA, setCargandoIA] = useState(false);
  const [seccionRegenerando, setSeccionRegenerando] = useState(null);
  const [selectedSectionForRegen, setSelectedSectionForRegen] = useState(null);
  const [regenTextareaValue, setRegenTextareaValue] = useState("");

  // =======================================================================
  // 3. FUNCIONES DE MANEJO DE PROCESOS (Scraping, Cancelación, Utilidades)
  // =======================================================================

  const toggleCardVisibility = (cardName) => {
    setCardVisibility((prev) => ({
      ...prev,
      [cardName]: !prev[cardName],
    }));
  };

  // --- Función para Cancelar la Ejecución del Scraping ---
  const cancelarScraping = () => {
    if (referenciaControladorAborto.current) {
      referenciaControladorAborto.current.abort();
      setCargandoScraping(false);
      setError("Ejecución de scraping cancelada por el usuario.");
      referenciaControladorAborto.current = null;
      console.log("[SCRAPING] Ejecución cancelada por el usuario.");
    }
  };

  // Funcion: Parsear el Markdown de estructura H2/H3 a un objeto anidado para renderizar

  const parseMarkdownStructure = (markdown) => {
    if (!markdown) return [];

    const lines = markdown.split("\n");
    const structure = [];
    let idCounter = 0;

    // RegEx para capturar: [H{N} - X.Y] Título
    // Grupo 1: H{N} (ej. H2)
    // Grupo 2: X.Y (ej. 1.0 o 2.1)
    // Grupo 3: Título (el resto de la línea)
    const structuredRegex = /^\[(H\d+)\s*-\s*(\d+\.?\d*)]\s*(.*)/i;

    for (const line of lines) {
      const trimmedLine = line.trim();
      const matchStructured = trimmedLine.match(structuredRegex);

      if (matchStructured) {
        const level = matchStructured[1].toLowerCase(); // 'h2', 'h3', etc.
        const enumeration = matchStructured[2]; // '1.0', '1.1', etc.
        const text = matchStructured[3].trim();

        structure.push({
          id: idCounter++,
          // Combina la enumeración con el texto para la visualización final
          text: `${enumeration} ${text}`,
          level: level,
          children: [],
          // Opcional: puede ser útil para la edición posterior
          enumeration: enumeration,
        });
      }
    }
    return structure;
  };

  // FUNCIÓN: Maneja la selección del título en el StructureRenderer
  const handleSectionSelect = (section) => {
    setSelectedSectionForRegen(section);
    setRegenTextareaValue(section.text); // Inicializa el área de texto con el título actual
  };

  const handleGuardarCambiosTitulo = () => {
    // 1. Validaciones
    if (!selectedSectionForRegen || !regenTextareaValue) {
      console.error(
        "ERROR: No se ha seleccionado una sección o el nuevo título está vacío."
      );
      return;
    }

    // Usamos el valor del estado que contiene el texto editado del textarea
    const newTitle = regenTextareaValue.trim();

    // -----------------------------------------------------------
    // >> LÓGICA DE REEMPLAZO ADAPTADA AL NUEVO FORMATO <<
    // -----------------------------------------------------------
    const level = selectedSectionForRegen.level.toUpperCase(); // Obtiene H2 o H3
    const enumeration = selectedSectionForRegen.enumeration; // Obtiene 1.0, 1.1, etc.
    const currentMarkdown = tablaEstructuraFinal;

    // 1. Construcción de la RegEx para encontrar la línea completa
    // La RegEx busca la línea que COMIENZA exactamente con la etiqueta [H{N} - X.Y].
    // Escapa los puntos de la enumeración (\.) para que RegEx los trate como puntos literales.
    const targetRegex = new RegExp(
      `^(\\[${level}\\s*-\\s*${enumeration.replace(/\./g, "\\.")}\\]\\s*).*$`,
      "m" // 'm' para modo multilínea, el '^' busca el inicio de la línea.
    );

    // 2. Construcción de la nueva línea completa con el título editado
    // El formato de salida debe coincidir con el que la IA genera: [H{N} - X.Y] Nuevo Título
    const newFullLine = `[${level} - ${enumeration}] ${newTitle}`;

    // 3. Ejecutar el reemplazo (solo la primera coincidencia, que debe ser la línea completa)
    const newStructureString = currentMarkdown.replace(
      targetRegex,
      newFullLine
    );

    // -----------------------------------------------------------
    // >> FIN LÓGICA DE REEMPLAZO <<
    // -----------------------------------------------------------

    // 4. Verificación y Actualización
    if (newStructureString === currentMarkdown) {
      console.error(
        "ERROR CRÍTICO: Falló la sustitución. La RegEx no encontró el título con los marcadores de nivel."
      );
      // Opcional: Mostrar un error al usuario.
    } else {
      // Sustitución exitosa
      setTablaEstructuraFinal(newStructureString);
      // Limpiar estados de edición
      setSelectedSectionForRegen(null);
      setRegenTextareaValue("");
      console.log("Sustitución local exitosa.");
    }
  };

  // --- Función Principal de Scraping (FASE 1-3) ---
  const ejecutarScraping = async () => {
    // 1. Resetear estados al iniciar
    setCargandoScraping(true);
    setError(null);
    // Limpieza de todos los estados de resultado
    setDatosFinales(null);
    setTablaEstructuraFinal("");
    setContenidoConsolidado(null);
    // Limpiar el historial al iniciar un nue
    // Limpiar estados de selección de regeneración
    setSelectedSectionForRegen(null);
    setRegenTextareaValue("");

    console.clear();
    console.log("[SCRAPING] Iniciando nueva ejecución de scraping...");

    const controller = new AbortController();
    referenciaControladorAborto.current = controller;
    const signal = controller.signal;

    // 2. Procesar input de URLs y Query
    const lineasConsulta = referenciaUrls.current?.value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const consulta = lineasConsulta[0];
    const urls = lineasConsulta.slice(1);
    const numResultados = urls.length > 0 ? urls.length : 1;

    if (!consulta || numResultados < 1) {
      const msg =
        "Por favor, ingresa la consulta en la primera línea y al menos 3 URLs en las siguientes.";
      setError(msg);
      setCargandoScraping(false);
      referenciaControladorAborto.current = null;
      console.error("[SCRAPING] Error de validación: " + msg);
      return;
    }

    // Extracción de initialParams
    const title_base = initialParams.titulo || consulta;
    const main_keyword = initialParams.keywordPrincipal || consulta;
    const principal_keywords_str = initialParams.keywords || "";
    const principal_keywords = principal_keywords_str
      .split(",")
      .map((kw) => kw.trim())
      .filter((kw) => kw.length > 0);
    const categoria = initialParams.categoria || "SEO";
    const idioma = initialParams.idioma || "es";
    const tecnica = initialParams.tecnica || "SEO";
    const acento = initialParams.acento || "neutral";
    const tono = initialParams.tono || "profesional";

    try {
      // 3. LLAMADA AL ENDPOINT DE SCRAPING
      const response = await fetch(URL_API_SCRAPING, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: consulta,
          urls, // <--- LISTA DE URLS
          num_results: numResultados,
          use_ai: usarIA,
          run_intent_keywords: false,
          run_structure: false,
          title_base,
          main_keyword,
          principal_keywords,
          categoria,
          idioma,
          tecnica,
          acento,
          tono,
        }),
        signal: signal,
      });

      if (!response.ok) {
        throw new Error(
          `Error HTTP: ${response.status} - Verifica la URL del backend.`
        );
      }

      // 4. Manejo del stream de logs y datos finales
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let currentEvent = null;
      let finalDataReceived = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done || signal.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (let line of lines) {
          line = line.trim();
          if (!line) continue;

          if (line.startsWith("event:")) {
            currentEvent = line.replace("event:", "").trim();
          } else if (line.startsWith("data:")) {
            const dataLine = line.replace("data:", "").trim();

            if (currentEvent === "final_data") {
              try {
                const parsed = JSON.parse(dataLine);
                setDatosFinales(parsed);
                finalDataReceived = true;
                setContenidoConsolidado(parsed.consolidated_content || null);

                if (parsed.log && Array.isArray(parsed.log)) {
                  console.log("[SCRAPING - LOGS DETALLADOS]");
                  parsed.log.forEach((log) => console.log(` - ${log}`));
                }
                console.log(
                  "[SCRAPING] Contenido consolidado listo para Análisis IA."
                );

                reader.cancel();
                setCargandoScraping(false);
                return;
              } catch (e) {
                console.error("[SCRAPING] Error parsing final JSON:", e);
              }
            } else {
              const timestamp = new Date().toLocaleTimeString();
              const logEntry = `[${timestamp}] ${dataLine}`;
              console.log(logEntry);
            }
          }
        }
      }

      if (!finalDataReceived && !signal.aborted) {
        const msg =
          "El proceso de scraping finalizó sin entregar el resultado de la IA.";
        setError(msg);
        console.error("[SCRAPING] Error: " + msg);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("[SCRAPING] Error crítico:", err);
        setError(`Fallo la conexión con el backend: ${err.message}`);
      }
    } finally {
      setCargandoScraping(false);
      referenciaControladorAborto.current = null;
    }
  };

  // =======================================================================
  // 4. FUNCIONES DE ANÁLISIS Y REGENERACIÓN DE IA (FASE 4-5)
  // =======================================================================

  // FUNCIÓN: Generación Manual de Análisis IA (FASE 4)
  const generarAnalisisIA = async () => {
    if (!contenidoConsolidado || !datosFinales?.query) {
      setError(
        "Error: Contenido consolidado o query no disponible. Ejecuta el scraping primero."
      );
      return;
    }

    console.log("Iniciando generación de Análisis de Estructura ...");

    setCargandoIA(true);
    setError(null);

    const textoConsolidado = contenidoConsolidado;
    const consulta =
      datosFinales?.query || referenciaUrls.current.value.split("\n")[0].trim();

    // Reutilizar parámetros de initialParams para la llamada a la IA (FASE 4)
    const title_base = initialParams.titulo || consulta;
    const main_keyword = initialParams.keywordPrincipal || consulta;
    const principal_keywords_str = initialParams.keywords || "";
    const principal_keywords = principal_keywords_str
      .split(",")
      .map((kw) => kw.trim())
      .filter((kw) => kw.length > 0);

    const categoria = initialParams.categoria || "SEO";
    const idioma = initialParams.idioma || "es";
    const tecnica = initialParams.tecnica || "SEO";
    const acento = initialParams.acento || "neutral";
    const tono = initialParams.tono || "profesional";

    try {
      // LLamada al endpoint de generación de estructura con el contenido consolidado
      const requestData = {
        query: consulta,
        consolidated_content: textoConsolidado,
        keywords: datosFinales?.final_keywords || [],
        title_base,
        main_keyword,
        principal_keywords,
        categoria,
        idioma,
        tecnica,
        acento,
        tono,
      };

      const response = await fetch(URL_API_IA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Error en la llamada a la IA: ${response.statusText}`);
      }

      const result = await response.json();

      // 1. Desestructurar y actualizar el estado principal
      const { search_intent, final_keywords, final_structure_json } = result;

      setDatosFinales((prev) => ({
        ...prev,
        search_intent: search_intent,
        final_keywords: final_keywords,
        final_structure: JSON.stringify(final_structure_json, null, 2),
        final_structure_object: final_structure_json,
      }));

      // 2. Asignar resultados para el render de componentes separados
      const structureMarkdown = final_structure_json?.structure_markdown || "";

      setTablaEstructuraFinal(structureMarkdown);

      // 3. Inicializar historial
      if (search_intent) setHistorialIntencion([search_intent]);
      // 4. Ocultar el botón al finalizar exitosamente
      setContenidoConsolidado(null);

      console.log("[IA] Analisis completado exitosamente.");
    } catch (err) {
      console.error("[IA] Error al generar análisis de IA:", err);
      setError(`Error en la generación de IA: ${err.message}. Revise logs.`);
    } finally {
      setCargandoIA(false);
    }
  };

  // FUNCIÓN: Generación Única con Historial (FASE 5: Regeneración)
  const regenerarSeccion = async (sectionType, historyArray) => {
    // 1. Validaciones Iniciales
    if (
      !datosFinales ||
      !datosFinales.query ||
      !datosFinales.consolidated_content
    ) {
      setError(
        "Error: Contenido consolidado o query no disponible. Ejecuta el scraping y la generación inicial de IA."
      );
      return;
    }

    console.log(
      `[IA - REGENERACIÓN] Iniciando regeneración de la sección: ${sectionType}`
    );

    setCargandoIA(true);
    setSeccionRegenerando(sectionType);
    setError(null);

    const textoConsolidado = datosFinales.consolidated_content;
    const consulta = datosFinales.query;
    const currentKeywords = datosFinales.final_keywords || [];

    // 2. Preparación de los datos de la solicitud base
    const requestData = {
      query: consulta,
      consolidated_content: textoConsolidado,
      keywords: currentKeywords,
      section_type: sectionType,
      previous_content: historyArray,
      idioma: initialParams.idioma || "es",
      acento: initialParams.acento || "neutral",
      tono: initialParams.tono || "profesional",
      tecnica: initialParams.tecnica || "SEO",
      regenerate_data: undefined,
    };

    // 3. Lógica de Manejo Específico para 'structure_section'
    if (sectionType === "structure_section") {
      const fullStructure =
        datosFinales.final_structure_object?.structure_markdown ||
        tablaEstructuraFinal;

      if (!selectedSectionForRegen || !fullStructure) {
        setError(
          "Error interno: Faltan datos de la sección de estructura para regenerar."
        );
        setSeccionRegenerando(null);
        setCargandoIA(false);
        return;
      }

      // El prompt personalizado es el texto del textarea si es diferente al texto original de la sección
      const customPrompt =
        regenTextareaValue !== selectedSectionForRegen.text
          ? regenTextareaValue
          : null;

      requestData.regenerate_data = {
        section_text: selectedSectionForRegen.text,
        full_structure_markdown: fullStructure,
        new_prompt: customPrompt,
      };

      delete requestData.previous_content;
    }
    // 4. Fin Lógica de Manejo Específico

    try {
      // 5. Llamada a la API
      const response = await fetch(URL_API_IA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(
          `Error en la llamada de regeneración: ${response.statusText}`
        );
      }

      const result = await response.json();
      const regeneratedContent = result?.regenerated_content;

      if (!regeneratedContent) {
        throw new Error("Respuesta de IA vacía o formato incorrecto.");
      }

      console.log(
        `[IA - REGENERACIÓN] Nuevo contenido para ${sectionType}:`,
        regeneratedContent
      );

      // 6. Actualización de Estados y Historial
      switch (sectionType) {
        case "search_intent":
          setDatosFinales((prev) => ({
            ...prev,
            search_intent: regeneratedContent,
          }));
          setHistorialIntencion((prev) => [...prev, regeneratedContent]);
          break;
        case "introduction":
          setDatosFinales((prev) => ({
            ...prev,
            final_structure_object: {
              ...prev.final_structure_object,
              introduction: regeneratedContent,
            },
          }));
          break;
        case "conclusion_cta":
          setDatosFinales((prev) => ({
            ...prev,
            final_structure_object: {
              ...prev.final_structure_object,
              conclusion_cta: regeneratedContent,
            },
          }));
          break;
        case "structure_section": // Manejo de la actualización de estructura
          const fullStructure =
            datosFinales.final_structure_object?.structure_markdown ||
            tablaEstructuraFinal;

          if (
            !selectedSectionForRegen ||
            !fullStructure ||
            !regeneratedContent
          ) {
            setError(
              "Error interno: Faltan datos para la regeneración de estructura."
            );
            setSeccionRegenerando(null);
            setCargandoIA(false);
            return;
          }

          // --- Sustitución directa de línea ---
          const level = selectedSectionForRegen.level.toUpperCase(); // H2, H3
          const enumeration = selectedSectionForRegen.enumeration; // 1.0, 1.1

          // 1. RegEx para encontrar la línea exacta a reemplazar (usando nivel y enumeración).
          // La expresión reemplaza los puntos de la enumeración con '\.' para evitar errores RegEx.
          const targetRegex = new RegExp(
            `^\\[${level}\\s*-\\s*${enumeration.replace(
              /\./g,
              "\\."
            )}\\]\\s*(.*)$`,
            "m" // 'm' para modo multilínea, buscando desde el inicio de la línea
          );

          // 2. Ejecutar la sustitución: reemplaza la línea antigua (que coincide con RegEx) con el nuevo texto de la IA.
          const newStructureString = fullStructure.replace(
            targetRegex,
            regeneratedContent
          );

          if (newStructureString === fullStructure) {
            console.error(
              "ERROR CRÍTICO (REGEN): Falló la sustitución de la línea. Revise el formato devuelto por la IA."
            );
            setError(
              "Error: La IA regeneró el contenido, pero la línea antigua no pudo ser reemplazada."
            );
            break;
          }

          // 3. Actualización de Estados: Esto forzará el re-renderizado.
          setTablaEstructuraFinal(newStructureString); // <--- ESTO ACTUALIZA LA VISTA
          setDatosFinales((prev) => ({
            ...prev,
            final_structure_object: {
              ...(prev?.final_structure_object || {}),
              structure_markdown: newStructureString,
            },
          }));

          // Deselecciona el elemento después de la regeneración exitosa
          setSelectedSectionForRegen(null);
          setRegenTextareaValue("");
          break;
        case "keywords":
        case "titles":
          setError(`La regeneración de ${sectionType} está deshabilitada.`);
          console.warn(
            `[IA - REGENERACIÓN] Intento de regeneración de ${sectionType} deshabilitado.`
          );
          break;
        default:
          console.error("Tipo de sección no manejado:", sectionType);
      }
    } catch (err) {
      console.error(
        `[IA - REGENERACIÓN] Error al regenerar ${sectionType}:`,
        err
      );
      setError(`Error al regenerar ${sectionType}: ${err.message}`);
    } finally {
      setSeccionRegenerando(null);
      setCargandoIA(false);
    }
  };

  // =======================================================================
  // 5. COMPONENTE StructureRenderer
  // =======================================================================

  // FUNCIÓN DE RENDERIZADO PARA INTERACCION
  const StructureRenderer = ({ structure, onSelect, selectedSection }) => {
    if (!structure || structure.length === 0) {
      return (
        <p className="text-gray-400 italic p-3">
          Estructura no disponible para renderizar.
        </p>
      );
    }

    return (
      // Usamos una clase única para el contenedor de la lista
      <ul className="structure-list">
        {structure.map((item) => (
          <li
            key={item.id}
            // Usamos clases específicas para la jerarquía y la selección
            className={`
            structure-item
            ${item.level === "h2" ? "structure-item-h2" : "structure-item-h3"}
            ${selectedSection?.id === item.id ? "structure-item-selected" : ""}
          `}
            onClick={() => onSelect(item)}
            title={`Haga click para editar o regenerar este ${item.level.toUpperCase()}`}
          >
            {/* Ícono para distinguir H2 y H3 visualmente */}
            <span className="structure-icon-wrapper">
              {item.level === "h2" ? (
                <i className="uil uil-align-left-h structure-icon-h2"></i>
              ) : (
                <i className="uil uil-corner-down-right structure-icon-h3"></i>
              )}
            </span>
            {item.text}
          </li>
        ))}
      </ul>
    );
  };

  // =======================================================================
  // 6. VARIABLES DE RENDERIZACIÓN (Derivación de Estado)
  // =======================================================================

  // Variables para simplificar el render (manteniendo tus nombres)
  const intencionFinal = datosFinales?.search_intent;
  const estructuraFinalCruda = datosFinales?.final_structure;
  const objetoEstructuraFinal = datosFinales?.final_structure_object;
  const introduccionFinal = objetoEstructuraFinal?.introduction;
  const conclusionFinal = objetoEstructuraFinal?.conclusion_cta;
  const estructuraMarkdown =
    objetoEstructuraFinal?.structure_markdown || tablaEstructuraFinal;

  // Condición para mostrar el botón de la FASE 4 (Análisis IA Manual)
  const contenidoDisponible =
    contenidoConsolidado && datosFinales && !objetoEstructuraFinal;

  // Condición para mostrar los resultados generados (FASE 4 completada)
  const resultadosDisponibles =
    objetoEstructuraFinal &&
    (introduccionFinal ||
      estructuraMarkdown ||
      conclusionFinal ||
      intencionFinal);

  // =======================================================================
  // 7. RENDER (JSX)
  // =======================================================================

  return (
    <>
      <div className="blog-generation-page">
        {/* Header */}
        <header className="navbar">
          <a href="/dashboard_blog" className="btn">
            Volver al Dashboard
          </a>
          <h1>Generación de Blog con Análisis SEO Final</h1>
        </header>

        {/* Sección de Input */}
        <section className="preconfig">
          <h2>Ingresa URLs (mínimo 3)</h2>
          <textarea
            ref={referenciaUrls}
            className="auto-expand"
            placeholder="[Query Principal/Título base]&#10;https://example1.com&#10;https://example2.com&#10;https://example3.com"
            rows={5}
            disabled={cargandoScraping}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <label htmlFor="usar-ia-checkbox" style={{ fontWeight: "bold" }}>
              <input
                type="checkbox"
                id="usar-ia-checkbox"
                checked={usarIA}
                onChange={(e) => setUsarIA(e.target.checked)}
                disabled={cargandoScraping}
                style={{ marginRight: "10px" }}
              />
              Usar Resúmenes de IA por Bloque (FASE 3)
            </label>
          </div>
          {/* Botón de Ejecución/Cancelación */}
          <button
            onClick={cargandoScraping ? cancelarScraping : ejecutarScraping}
            className={`btn-generate ${cargandoScraping ? "btn-cancel" : ""}`}
            disabled={!referenciaUrls.current?.value && !cargandoScraping}
          >
            {cargandoScraping ? "Cancelar Scraping" : "Iniciar Scraping "}
          </button>
        </section>

        {/* Mensaje de Error (En el mismo estilo) */}
        {error && <div className="error-message">{error}</div>}

        {/* ========================================================= */}
        {/* --- SECCIÓN: TARJETAS DE CONFIGURACIÓN INICIAL (INPUTS) --- */}
        {/* ========================================================= */}
        <div className="config-cards-wrapper">
          {/* Card 1: Temas y Keywords */}
          <section className="analysis-result info-card">
            <h2
              className="analysis-title"
              style={{
                borderBottomColor: "#20c997",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onClick={() => toggleCardVisibility("temasKeywords")}
            >
              <div>
                <i className="uil uil-tag-alt"></i> Temas y Keywords
              </div>
              <i
                className={`uil ${
                  cardVisibility.temasKeywords
                    ? "uil-angle-up"
                    : "uil-angle-down"
                }`}
              ></i>
            </h2>
            {cardVisibility.temasKeywords && (
              <div className="analysis-detail">
                <span className="analysis-title">Título Base:</span>
                <p>{initialParams.titulo || "N/A"}</p>
                <span className="analysis-title">Keyword Principal:</span>
                <p>{initialParams.keywordPrincipal || "N/A"}</p>
                <span className="analysis-title">Keywords Secundarias:</span>
                <p className="keywords-output">
                  {initialParams.keywords || "N/A"}
                </p>
              </div>
            )}
          </section>

          {/* Card 2: Estilo y Tono */}
          <section className="analysis-result info-card">
            <h2
              className="analysis-title"
              style={{
                borderBottomColor: "#20c997",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onClick={() => toggleCardVisibility("estiloTono")}
            >
              <div>
                <i className="uil uil-palette"></i> Estilo y Tono
              </div>
              <i
                className={`uil ${
                  cardVisibility.estiloTono ? "uil-angle-up" : "uil-angle-down"
                }`}
              ></i>
            </h2>
            {cardVisibility.estiloTono && (
              <div className="analysis-detail">
                <span className="analysis-title">Tono:</span>
                <p>{initialParams.tono || "N/A"}</p>
                <span className="analysis-title">Acento:</span>
                <p>{initialParams.acento || "N/A"}</p>
                <span className="analysis-title">Técnica:</span>
                <p>{initialParams.tecnica || "N/A"}</p>
              </div>
            )}
          </section>

          {/* Card 3: Metadatos/Contexto */}
          <section className="analysis-result info-card">
            <h2
              className="analysis-title"
              style={{
                borderBottomColor: "#00eba7",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onClick={() => toggleCardVisibility("contexto")}
            >
              <div>
                <i className="uil uil-globe"></i> Contexto
              </div>
              <i
                className={`uil ${
                  cardVisibility.contexto ? "uil-angle-up" : "uil-angle-down"
                }`}
              ></i>
            </h2>
            {cardVisibility.contexto && (
              <div className="analysis-detail">
                <span className="analysis-title">Idioma:</span>
                <p>{initialParams.idioma || "N/A"}</p>
                <span className="analysis-title">Categoría:</span>
                <p>{initialParams.categoria || "N/A"}</p>
              </div>
            )}
          </section>
        </div>

        {/* Contenedores Principales (Izquierda y Derecha) */}
        <div className="generadores-container">
          {/* ========================================================= */}
          {/* >> COLUMNA IZQUIERDA: Intención, Intro, Conclusión, JSON <<< */}
          {/* ========================================================= */}
          <div className="generadores-izquierda">
            {/* ---------------------------------------------------- */}
            {/* --- BOTÓN DE ANÁLISIS IA MANUAL (FASE 4) --- */}
            {/* ---------------------------------------------------- */}
            {contenidoDisponible && (
              <section className="analysis-result fade-in">
                <h2 className="analysis-title">Análisis de Estructura</h2>
                <p className="result-text">
                  Contenido consolidado del scraping listo. Ejecuta el análisis
                  final de la IA para generar la Intención, Introducción,
                  Estructura y Conclusión.
                </p>
                <button
                  onClick={generarAnalisisIA}
                  className="btn-generate"
                  disabled={cargandoIA}
                >
                  {cargandoIA
                    ? "Generando Análisis IA..."
                    : "Generar Análisis IA"}
                </button>
              </section>
            )}

            {/* ---------------------------------------------------- */}
            {/* --- 3. EDITOR / REGENERACIÓN DE TÍTULOS (FASE 5) --- */}
            {/* ---------------------------------------------------- */}
            <section className="analysis-result fade-in">
              {selectedSectionForRegen ? (
                <>
                  {/* Panel de Regeneración ¿) */}
                  <h2 className="analysis-title">
                    Editar/Regenerar Sección: "{selectedSectionForRegen.text}" (
                    {selectedSectionForRegen.level.toUpperCase()})
                  </h2>
                  <p className="result-text">
                    Edita el texto directamente para guardarlo, o proporciona
                    instrucciones para la regeneración con IA.
                  </p>

                  {/* Input para edición directa / prompt */}
                  <textarea
                    className="auto-expand"
                    rows="4"
                    placeholder="Edita el título o escribe nuevas instrucciones para la IA (ej: 'Hazlo más enfocado en el factor costo')."
                    value={regenTextareaValue}
                    onChange={(e) => setRegenTextareaValue(e.target.value)}
                  />

                  {/* Botones de acción: Guardar Edición (Local) y Regenerar (IA) */}
                  <div className="idea-buttons">
                    <button
                      onClick={handleGuardarCambiosTitulo}
                      className="btn-generate"
                    >
                      <i className="uil uil-save"></i> Guardar Edición Local
                    </button>

                    <button
                      onClick={() => regenerarSeccion("structure_section")}
                      disabled={cargandoIA || seccionRegenerando}
                      className="btn-generate"
                      style={{ flexGrow: 1 }}
                    >
                      {seccionRegenerando === "structure_section"
                        ? `Regenerando ${selectedSectionForRegen.level.toUpperCase()}...`
                        : `Regenerar ${selectedSectionForRegen.level.toUpperCase()} por IA`}
                    </button>
                  </div>

                  {/* Botón para deseleccionar */}
                  <button
                    onClick={() => setSelectedSectionForRegen(null)}
                    className="btn-generate btn-cancel"
                    style={{ flexGrow: 1 }}
                  >
                    <i className="uil uil-times"></i> Cancelar Edición
                  </button>
                </>
              ) : (
                // Panel de Regeneración INACTIVO (Placeholder)
                <div className="analysis-result">
                  <h2 className="analysis-title">
                    Panel de Edición y Regeneración de Ideas
                  </h2>
                  <p className="text-gray-500 result-text">
                    Selecciona un **título (H2)** o **subtítulo (H3)** de la
                    estructura de la derecha para **editarlo** o **regenerarlo**
                    individualmente.
                  </p>
                </div>
              )}
            </section>

            {/* ---------------------------------------------------- */}
            {/* --- RESULTADOS DE ANÁLISIS IA --- */}
            {/* ---------------------------------------------------- */}
            {resultadosDisponibles && (
              <>
                {/* 1. Intención de Búsqueda */}
                <section className="analysis-result">
                  <h2 className="analysis-title">Intención de Búsqueda</h2>
                  <p className="result-text">{intencionFinal}</p>
                  <div className="idea-buttons">
                    <button
                      onClick={() =>
                        regenerarSeccion("search_intent", historialIntencion)
                      }
                      className="btn-generate"
                      disabled={seccionRegenerando || cargandoIA}
                    >
                      {seccionRegenerando === "search_intent"
                        ? "Regenerando..."
                        : "Regenerar Intención (IA)"}
                    </button>
                  </div>
                </section>

                {/* 2. Introducción */}
                <section className="analysis-result">
                  <h2 className="analysis-title">Introducción</h2>
                  <p className="result-text pre-formatted-content">
                    {introduccionFinal}
                  </p>
                  <div className="idea-buttons">
                    <button
                      onClick={() =>
                        regenerarSeccion("introduction", [introduccionFinal])
                      }
                      className="btn-generate"
                      disabled={seccionRegenerando || cargandoIA}
                    >
                      {seccionRegenerando === "introduction"
                        ? "Regenerando..."
                        : "Regenerar Introducción (IA)"}
                    </button>
                  </div>
                </section>

                {/* 3. Conclusión y CTA */}
                <section className="analysis-result">
                  <h2 className="analysis-title">Conclusión y CTA</h2>
                  <p className="result-text pre-formatted-content">
                    {conclusionFinal}
                  </p>
                  <div className="idea-buttons">
                    <button
                      onClick={() =>
                        regenerarSeccion("conclusion_cta", [conclusionFinal])
                      }
                      className="btn-generate"
                      disabled={seccionRegenerando || cargandoIA}
                    >
                      {seccionRegenerando === "conclusion_cta"
                        ? "Regenerando..."
                        : "Regenerar Conclusión (IA)"}
                    </button>
                  </div>
                </section>

                {/* 4. JSON crudo */}
                <section
                  className="analysis-result"
                  style={{ marginTop: "20px" }}
                >
                  <h2 className="analysis-title" style={{ color: "#f75c5c" }}>
                    Sugerencia de Estructura de Blog FINAL (Raw JSON)
                  </h2>
                  {estructuraFinalCruda ? (
                    <pre className="structure-pre">{estructuraFinalCruda}</pre>
                  ) : (
                    <p>
                      El output completo y crudo de la Estructura (JSON) se
                      mostrará aquí.
                    </p>
                  )}
                </section>
              </>
            )}
          </div>

          {/* ========================================================= */}
          {/* >>> COLUMNA DERECHA: PREVISUALIZACIÓN DE ESTRUCTURA FINAL <<< */}
          {/* ========================================================= */}
          <div className="generadores-derecha">
            <h2 className="text-center">Estructura de Blog</h2>
            <section className="idea-generator">
              <p className="text-sm text-gray-500 mb-2">
                *Esta sección muestra el esquema principal de los H2/H3 generado
                por la IA. **Seleccione un título para editarlo.***
              </p>
              {tablaEstructuraFinal ? (
                // Uso del componente interactivo StructureRenderer
                <StructureRenderer
                  structure={parseMarkdownStructure(tablaEstructuraFinal)}
                  onSelect={handleSectionSelect}
                  selectedSection={selectedSectionForRegen}
                />
              ) : (
                // Mantiene el placeholder
                <pre className="structure-pre terminal-content">
                  Esperando la generación del Análisis IA (FASE 4)...
                </pre>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default GeneracionBlog;
