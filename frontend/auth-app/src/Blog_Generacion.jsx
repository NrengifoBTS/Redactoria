import React, { useState, useRef } from "react";
import "@iconscout/unicons/css/line.css";
import "./css/styles_generacion.css";

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
  const mainTitle =
    initialParams.titulo || datosFinales?.query || "Generación de Blog";

  // Estados para el flujo manual
  const [contenidoConsolidado, setContenidoConsolidado] = useState(null);
  const [cargandoIA, setCargandoIA] = useState(false);
  const [seccionRegenerando, setSeccionRegenerando] = useState(null);
  const [selectedSectionForRegen, setSelectedSectionForRegen] = useState(null);
  const [regenTextareaValue, setRegenTextareaValue] = useState("");
  const [titleSuggestions, setTitleSuggestions] = useState([]);

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

  // Funcion para parsear el Markdown de estructura H2/H3 a un objeto anidado para renderizar
  const parseMarkdownStructure = (markdown) => {
    if (!markdown) return [];

    const lines = markdown.split("\n");
    const structure = [];

    // RegEx para capturar: [H{N} - X.Y] Título
    // Grupo 1: H{N} (ej. H2)
    // Grupo 2: X.Y (ej. 1.0 o 2.1)
    // Grupo 3: Título (el resto de la línea)
    const structuredRegex = /^\[(H\d+)\s*-\s*(\d+\.?\d*)]\s*(.*)/i;

    const mediaRegex = /\s*\[MULTIMEDIA:\s*(VIDEO|FOTO|MAPA|GRAFICO)]\s*$/i;

    for (const line of lines) {
      const trimmedLine = line.trim();
      const matchStructured = trimmedLine.match(structuredRegex);

      if (matchStructured) {
        const level = matchStructured[1].toLowerCase(); // 'h2', 'h3', etc.
        const enumeration = matchStructured[2]; // '1.0', '1.1', etc. <-- ID ESTABLE
        let text = matchStructured[3].trim();

        // --- NUEVA LÓGICA DE EXTRACCIÓN MULTIMEDIA ---
        const mediaMatch = text.match(mediaRegex);
        let multimediaType = null;

        if (mediaMatch) {
          // Extraer solo el tipo (VIDEO, FOTO, etc.)
          multimediaType = mediaMatch[1].toUpperCase();
          // Eliminar el marcador completo del texto del título
          text = text.replace(mediaMatch[0], "").trim();
        }

        structure.push({
          id: enumeration,
          text: `${enumeration} ${text}`,
          level: level,
          children: [],
          enumeration: enumeration,
          multimedia: multimediaType, // AÑADIR EL NUEVO CAMPO
        });
      }
    }
    return structure;
  };

  // Funcion que Maneja la selección del título en el StructureRenderer
  const handleSectionSelect = (section) => {
    setSelectedSectionForRegen(section);
    setRegenTextareaValue(section.text);
    setTitleSuggestions([]);
  };

  const handleGuardarCambiosTitulo = () => {
    // 1. Validaciones
    if (!selectedSectionForRegen || !regenTextareaValue) {
      console.error(
        "ERROR: No se ha seleccionado una sección o el nuevo título está vacío."
      );
      return;
    }
    const newTitle = regenTextareaValue.trim();
    const level = selectedSectionForRegen.level.toUpperCase();
    const enumeration = selectedSectionForRegen.enumeration;
    const currentMarkdown = tablaEstructuraFinal;

    // 1. RegEx para encontrar la línea completa
    const escapedEnumeration = enumeration.replace(/\./g, "\\.");

    const targetRegex = new RegExp(
      `^\\s*\\[${level}\\s*-\\s*${escapedEnumeration}\\]\\s*(.*)$`,
      "m"
    );

    // 2. Construcción de la nueva línea completa
    const newFullLine = `[${level} - ${enumeration}] ${newTitle}`;

    // 3. Ejecutar el reemplazo (solo la primera coincidencia)
    const newStructureString = currentMarkdown.replace(
      targetRegex,
      newFullLine
    );

    // 4. Verificación y Actualización
    if (newStructureString === currentMarkdown) {
      console.error(
        "ERROR CRÍTICO: Falló la sustitución. La RegEx no encontró el título con los marcadores de nivel."
      );
    } else {
      setTablaEstructuraFinal(newStructureString);
      setSelectedSectionForRegen((prevSection) => ({
        ...prevSection,
        text: newTitle,
      }));

      setRegenTextareaValue(newTitle);

      console.log("Sustitución local exitosa.");
    }
  };

  // --- Función Principal de Scraping ---
  const ejecutarScraping = async () => {
    // 1. Resetear estados al iniciar
    setCargandoScraping(true);
    setError(null);
    setDatosFinales(null);
    setTablaEstructuraFinal("");
    setContenidoConsolidado(null);
    setSelectedSectionForRegen(null);
    setRegenTextareaValue("");
    setTitleSuggestions([]);

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
    const numResultados = urls.length > 0 ? urls.length : 3; //<--- En esta parte se debe cambiar para ver cuantas urls se van a usar

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
          urls,
          num_results: numResultados,
          use_ai: usarIA,
          run_intent_keywords: false,
          run_structure: false,
          title_base,
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
                  "[SCRAPING] FASE 3 COMPLETA. Contenido consolidado listo para Análisis IA manual."
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

  // ---Funcion para la regeneracion de titulos ---
  const handleSelectNewTitle = (newTitle) => {
    if (!selectedSectionForRegen || !tablaEstructuraFinal) return;

    // Obtener datos estables de la sección seleccionada
    const level = selectedSectionForRegen.level.toUpperCase();
    const enumeration = selectedSectionForRegen.enumeration;
    const currentMarkdown = tablaEstructuraFinal;

    // 1. Crear el patrón RegEx para reemplazar la línea completa usando la enumeración estable
    // Se escapa el punto (`.`) en la enumeración (ej. 2.2).
    const escapedEnumeration = enumeration.replace(/\./g, "\\.");

    // RegEx que apunta al prefijo de la línea usando el nivel y la enumeración
    const targetRegex = new RegExp(
      `^\\s*\\[${level}\\s*-\\s*${escapedEnumeration}\\]\\s*(.*)$`,
      "m" // Bandera 'm' para multilínea
    );

    // 2. Construcción de la nueva línea completa (prefijo + nuevo título de la burbuja)
    // newTitle NO incluye la enumeración (la burbuja solo tiene el texto)
    const newFullLine = `[${level} - ${enumeration}] ${newTitle}`;

    // 3. Ejecutar el reemplazo
    const newStructure = currentMarkdown.replace(targetRegex, newFullLine);

    // 4. Actualizar estados
    setTablaEstructuraFinal(newStructure);
    setTitleSuggestions([]);

    const newTitleWithEnumeration = `${enumeration} ${newTitle}`;

    setSelectedSectionForRegen((prevSection) => ({
      ...prevSection,
      text: newTitleWithEnumeration,
    }));

    // Poner el nuevo título completo en el textarea para edición continua
    setRegenTextareaValue(newTitleWithEnumeration);

    console.log(`[IA - REEMPLAZO] Título reemplazado por: ${newTitle}`);
  };

  // =======================================================================
  // 4. FUNCIONES DE ANÁLISIS Y REGENERACIÓN DE IA
  // =======================================================================

  // Funcion Generación de Análisis IA
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

    // Reutilizar parámetros de initialParams para la llamada a la IA
    const title_base = initialParams.titulo || consulta;
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
        title_base,
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
      const { final_structure_json } = result;

      setDatosFinales((prev) => ({
        ...prev,
        final_structure: JSON.stringify(final_structure_json, null, 2),
        final_structure_object: final_structure_json,
      }));

      // 2. Asignar resultados para el render de componentes separados
      const structureMarkdown = final_structure_json?.structure_markdown || "";

      setTablaEstructuraFinal(structureMarkdown);

      console.log("[IA] FASE 4 completada exitosamente.");
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

    // 2. Preparación de los datos de la solicitud base
    const requestData = {
      query: consulta,
      consolidated_content: textoConsolidado,
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

      const customPrompt =
        regenTextareaValue !== selectedSectionForRegen.text
          ? regenTextareaValue
          : null;

      requestData.regenerate_data = {
        section_text: selectedSectionForRegen.text,
        full_structure_markdown: fullStructure,
        new_prompt: customPrompt,
      };
    }

    try {
      // Llamada a la API
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

      let regeneratedSuggestions = result?.regenerated_suggestions;

      // Lógica de validación y fallback
      if (
        !Array.isArray(regeneratedSuggestions) ||
        regeneratedSuggestions.length === 0
      ) {
        const fallbackContent = result?.regenerated_content;
        if (fallbackContent) {
          console.warn(
            "[IA - REGENERACIÓN] Recibida respuesta de formato simple. Usando como sugerencia única."
          );
          regeneratedSuggestions = [fallbackContent];
        } else {
          throw new Error(
            "Respuesta de IA vacía o formato incorrecto (no hay sugerencias)."
          );
        }
      }

      console.log(
        `[IA - REGENERACIÓN] Sugerencias recibidas para ${sectionType}:`,
        regeneratedSuggestions
      );

      // 6. Actualización de Estados y Historial
      switch (sectionType) {
        case "structure_section": {
          setTitleSuggestions(regeneratedSuggestions);
          //setSelectedSectionForRegen(null);
          setRegenTextareaValue("");
          break;
        }
        case "titles":
          setError(`La regeneración de ${sectionType} está deshabilitada.`);
          console.warn(
            `[IA - REGENERACIÓN] Intento de regeneración de ${sectionType} deshabilitado.`
          );
          break;
        default:
          // Manejo de caso por defecto para evitar warning
          console.warn(
            "Tipo de sección de regeneración no manejado:",
            sectionType
          );
          break;
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
      //clase única para el contenedor de la lista
      <ul className="structure-list">
        {structure.map((item) => (
          <li
            key={item.id}
            // clases específicas para la jerarquía y la selección
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

  // Variables para simplificar el render
  const objetoEstructuraFinal = datosFinales?.final_structure_object;
  const estructuraMarkdown =
    objetoEstructuraFinal?.structure_markdown || tablaEstructuraFinal;

  // Condición para mostrar el botón de (Análisis IA Manual)
  const contenidoDisponible =
    contenidoConsolidado && datosFinales && !objetoEstructuraFinal;

  // Condición para mostrar los resultados generados
  const resultadosDisponibles = objetoEstructuraFinal && estructuraMarkdown;

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
              Usar Resúmenes de IA por Bloque
            </label>
          </div>
          {/* Botón de Ejecución/Cancelación */}
          <button
            onClick={cargandoScraping ? cancelarScraping : ejecutarScraping}
            className={`btn-generate ${cargandoScraping ? "btn-cancel" : ""}`}
            disabled={!referenciaUrls.current?.value && !cargandoScraping}
          >
            {cargandoScraping ? "Cancelar Analizador" : "Analizar Google "}
          </button>
        </section>

        {/* Mensaje de Error  */}
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
                <span className="analysis-title">Proyecto:</span>
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
                  Análisis Google completo, click al siguiente botón para genera
                  la estructura del Blog
                </p>
                <button
                  onClick={generarAnalisisIA}
                  className="btn-generate"
                  disabled={cargandoIA}
                >
                  {cargandoIA
                    ? "Generando Estructura Interna...."
                    : "Generar Estructura Final"}
                </button>
              </section>
            )}

            {/* ---------------------------------------------------- */}
            {/* --- 3. EDITOR / REGENERACIÓN DE TÍTULOS  --- */}
            {/* ---------------------------------------------------- */}
            <section className="analysis-result fade-in">
              {/* Condición maestra: solo se muestra si hay una sección seleccionada. */}
              {selectedSectionForRegen ? (
                <>
                  {/* 1. Encabezado del Panel de Edición */}
                  <h2 className="analysis-title">
                    Editar/Regenerar Sección: "{selectedSectionForRegen.text}" (
                    {selectedSectionForRegen.level.toUpperCase()})
                  </h2>
                  <p className="result-text">
                    Edita el texto directamente para guardarlo, o proporciona
                    instrucciones para la regeneración con IA.
                  </p>

                  {/* 2. CONTENEDOR FLEX PRINCIPAL: Textarea y Sugerencias lado a lado */}
                  <div
                    className={`
          regen-input-area 
          ${titleSuggestions.length > 0 ? "has-suggestions-flex" : ""}
        `}
                  >
                    {/* A. Textarea para Edición Directa / Prompt */}
                    <textarea
                      className="auto-expand"
                      rows="4"
                      placeholder="Edita el título o selecciona uno nuevo."
                      value={regenTextareaValue}
                      onChange={(e) => setRegenTextareaValue(e.target.value)}
                    />

                    {/* B. Panel de Sugerencias Generadas (Lateral) - Solo visible si hay sugerencias */}
                    {titleSuggestions.length > 0 && (
                      <div className="regen-side-panel">
                        <h3>Sugerencias de Título</h3>
                        {titleSuggestions.length > 0 &&
                          titleSuggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="suggestion-bubble"
                              onClick={() => handleSelectNewTitle(suggestion)}
                            >
                              {suggestion}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* 3. Botones de Acción (Se mantienen debajo de los elementos flex) */}
                  <div className="idea-buttons">
                    <button
                      onClick={handleGuardarCambiosTitulo}
                      className="btn-generate"
                      style={{ flexGrow: 1 }}
                    >
                      <i className="uil uil-save"></i> Guardar Edición Local
                    </button>

                    <button
                      onClick={() => regenerarSeccion("structure_section")}
                      disabled={cargandoIA || seccionRegenerando}
                      className="btn-generate btn-regenerar"
                      style={{ flexGrow: 1 }}
                    >
                      {seccionRegenerando === "structure_section"
                        ? `Regenerando ${selectedSectionForRegen.level.toUpperCase()}...`
                        : `Regenerar ${selectedSectionForRegen.level.toUpperCase()} por IA`}
                    </button>
                  </div>

                  {/* Botón de Cancelar Edición Principal */}
                  <button
                    onClick={() => {
                      setSelectedSectionForRegen(null);
                      setTitleSuggestions([]); // Limpia sugerencias al cancelar
                    }}
                    className="btn-generate btn-cancel"
                    style={{ marginTop: "10px", width: "100%", height: "45px" }}
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
                    Selecciona un título o subtítulo de la estructura de la
                    derecha para editarlo o regenerarlo individualmente.
                  </p>
                </div>
              )}
            </section>

            {/* ---------------------------------------------------- */}
            {/* --- RESULTADOS DE ANÁLISIS IA --- */}
            {/* ---------------------------------------------------- */}
            {resultadosDisponibles && (
              <>
                {/* AGREGAR AQUI GENERACIONES CON IA COMO TITULO,SUBTITULOS, INTRODUCCIONES Y DEMAS DE SER NECESARIO*/}
              </>
            )}
          </div>

          {/* ========================================================= */}
          {/* >>> COLUMNA DERECHA: PREVISUALIZACIÓN DE ESTRUCTURA FINAL <<< */}
          {/* ========================================================= */}
          <div className="generadores-derecha">
            {/* BOTÓN REGENERAR ESTRUCTURA (NUEVO) */}
            {/* Solo se muestra si ya tenemos resultados disponibles o la tabla está llena */}
            {(resultadosDisponibles || tablaEstructuraFinal) && (
              <div style={{ marginBottom: "15px" }}>
                <button
                  onClick={generarAnalisisIA} // Llama a la función que contacta a la IA
                  className="btn-regenerar"
                  disabled={cargandoIA || !datosFinales}
                  style={{ width: "100%" }}
                >
                  {cargandoIA
                    ? "Generando Nueva Estructura..."
                    : "Volver a Generar Estructura (IA)"}
                </button>
              </div>
            )}
            <h2 className="text-center">Estructura de Blog</h2>
            <section className="idea-generator">
              <div className="card-body">
                {/* NUEVO: Título Principal del Blog (H1) */}
                <h1
                  className="text-center"
                  style={{ marginBottom: "25px", fontSize: "2rem" }}
                >
                  {mainTitle}
                </h1>
              </div>
              {tablaEstructuraFinal ? (
                <StructureRenderer
                  structure={parseMarkdownStructure(tablaEstructuraFinal)}
                  onSelect={handleSectionSelect}
                  selectedSection={selectedSectionForRegen}
                />
              ) : (
                // Mantiene el placeholder

                <pre className="structure-pre terminal-content">
                  Esperando la generación del Análisis...
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
