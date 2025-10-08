import React, { useState, useRef } from "react";
import "./css/styles_generacion.css";

// Componente principal para la generación y análisis de blog
const GeneracionBlog = () => {
  // Referencias para el campo de texto de URLs/Query y el controlador de la petición
  const referenciaUrls = useRef(null);
  const referenciaControladorAborto = useRef(null);

  // --- Estados de Datos y Control ---
  const [datosFinales, setDatosFinales] = useState(null);
  const [cargandoScraping, setCargandoScraping] = useState(false);
  const [error, setError] = useState(null);
  const [logScraping, setLogScraping] = useState([]);
  const [usarIA, setUsarIA] = useState(true);

  // Resultados parseados para la vista
  const [titulosFinales, setTitulosFinales] = useState([]);
  const [tablaEstructuraFinal, setTablaEstructuraFinal] = useState("");

  // ESTADOS DE HISTORIAL para la funcionalidad de regeneración
  const [historialIntencion, setHistorialIntencion] = useState([]);
  const [historialKeywords, setHistorialKeywords] = useState([]);
  const [historialTitulos, setHistorialTitulos] = useState([]);

  // ESTADOS CLAVE para el flujo manual (FASE 4: Análisis IA)
  const [contenidoConsolidado, setContenidoConsolidado] = useState(null);
  const [cargandoIA, setCargandoIA] = useState(false);
  // -------------------------

  // Estado que indica qué sección se está regenerando (para deshabilitar botones)
  const [seccionRegenerando, setSeccionRegenerando] = useState(null);

  // URLs de la API del backend
  const URL_API_SCRAPING = "http://192.168.1.129:8000/scraping/stream";
  const URL_API_IA = "http://192.168.1.129:8000/ai/generate_structure";

  // --- Función para Cancelar la Ejecución del Scraping ---
  const cancelarScraping = () => {
    if (referenciaControladorAborto.current) {
      referenciaControladorAborto.current.abort();
      setCargandoScraping(false);
      setError("Ejecución de scraping cancelada por el usuario.");
      referenciaControladorAborto.current = null;
    }
  };

  // --- Función Principal de Scraping (FASE 1-3) ---
  const ejecutarScraping = async () => {
    // 1. Resetear estados al iniciar
    setCargandoScraping(true);
    setError(null);
    setDatosFinales(null);
    setLogScraping([]);
    setTitulosFinales([]);
    setTablaEstructuraFinal("");
    setContenidoConsolidado(null);
    // Limpiar el historial al iniciar un nuevo scraping
    setHistorialIntencion([]);
    setHistorialKeywords([]);
    setHistorialTitulos([]);

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
      return;
    }

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
          // Indicamos al backend que detenga la generación después de la consolidación (FASE 3)
          run_intent_keywords: false,
          run_structure: false,
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

                // Guardar el contenido consolidado para la FASE 4 manual
                setContenidoConsolidado(parsed.consolidated_content || null);

                // Actualizar logs y finalizar el stream
                if (parsed.log && Array.isArray(parsed.log)) {
                  setLogScraping((prevLog) => [
                    ...prevLog,
                    "--- Logs Detallados de Extracción (Backend) ---",
                    ...parsed.log,
                  ]);
                }

                setLogScraping((prevLog) => [
                  ...prevLog,
                  "FASE 3 COMPLETA. Contenido consolidado listo para Análisis IA manual.",
                ]);

                reader.cancel();
                setCargandoScraping(false);
                return;
              } catch (e) {
                console.error("Error parsing final JSON:", e);
              }
            } else {
              // Si no es 'final_data', se registra como un log de estado
              const timestamp = new Date().toLocaleTimeString();
              const logEntry = `[${timestamp}] ${dataLine}`;
              setLogScraping((prevLog) => [...prevLog, logEntry]);
            }
          }
        }
      }

      if (!datosFinales && !signal.aborted) {
        setError(
          "El proceso de scraping finalizó sin entregar el resultado de la IA."
        );
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error crítico:", err);
        setError(`Fallo la conexión con el backend: ${err.message}`);
      }
    } finally {
      setCargandoScraping(false);
      referenciaControladorAborto.current = null;
    }
  };

  // NUEVA FUNCIÓN: Generación Manual de Análisis IA (FASE 4)
  const generarAnalisisIA = async () => {
    if (!contenidoConsolidado || !datosFinales?.query) {
      setError(
        "Error: Contenido consolidado o query no disponible. Ejecuta el scraping primero."
      );
      return;
    }

    setCargandoIA(true);
    setError(null);

    const textoConsolidado = contenidoConsolidado;
    const consulta =
      datosFinales?.query || referenciaUrls.current.value.split("\n")[0].trim();

    try {
      // LLamada al endpoint de generación de estructura con el contenido consolidado
      const requestData = {
        query: consulta,
        consolidated_content: textoConsolidado,
        keywords: datosFinales?.final_keywords || [],
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
      const titlesArray = final_structure_json?.seo_titles || [];
      const structureMarkdown = final_structure_json?.structure_markdown || "";

      setTitulosFinales(titlesArray);
      setTablaEstructuraFinal(structureMarkdown);

      // 3. Inicializar historial con los resultados de la primera generación
      if (search_intent) setHistorialIntencion([search_intent]);
      if (final_keywords && final_keywords.length > 0)
        setHistorialKeywords(final_keywords);
      if (titlesArray.length > 0) setHistorialTitulos(titlesArray);

      // 4. Ocultar el botón al finalizar exitosamente
      setContenidoConsolidado(null);
    } catch (err) {
      console.error("Error al generar análisis de IA:", err);
      setError(`Error en la generación de IA: ${err.message}. Revise logs.`);
    } finally {
      setCargandoIA(false);
    }
  };

  // NUEVA FUNCIÓN: Generación Única con Historial (FASE 5: Regeneración)
  const regenerarSeccion = async (sectionType, historyArray) => {
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

    setSeccionRegenerando(sectionType);
    setError(null);

    const textoConsolidado = datosFinales.consolidated_content;
    const consulta = datosFinales.query;
    const currentKeywords = datosFinales.final_keywords || [];

    try {
      // LLamada al endpoint de estructura, especificando la sección y el historial previo
      const requestData = {
        query: consulta,
        consolidated_content: textoConsolidado,
        keywords: currentKeywords,
        section_type: sectionType, // Campo clave para regeneración
        previous_content: historyArray,
      };

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

      // --- Actualización de Estados y Historial ---
      switch (sectionType) {
        case "intent":
          setDatosFinales((prev) => ({
            ...prev,
            search_intent: regeneratedContent,
          }));
          setHistorialIntencion((prev) => [...prev, regeneratedContent]);
          break;
        case "keywords":
          // El backend devuelve una lista de strings
          setDatosFinales((prev) => ({
            ...prev,
            final_keywords: regeneratedContent,
          }));
          setHistorialKeywords((prev) => [...prev, ...regeneratedContent]);
          break;
        case "titles":
          // El backend devuelve una lista de strings
          setTitulosFinales(regeneratedContent);
          setHistorialTitulos((prev) => [...prev, ...regeneratedContent]);
          break;
        default:
          console.error("Tipo de sección no manejado:", sectionType);
      }
    } catch (err) {
      console.error(`Error al regenerar ${sectionType}:`, err);
      setError(`Error al regenerar ${sectionType}: ${err.message}`);
    } finally {
      setSeccionRegenerando(null);
    }
  };

  // Variables para simplificar el render
  const intencionFinal = datosFinales?.search_intent;
  const keywordsFinales = datosFinales?.final_keywords || [];
  const estructuraFinalCruda = datosFinales?.final_structure;
  const objetoEstructuraFinal = datosFinales?.final_structure_object;

  // Condición para mostrar el botón de la FASE 4 (Análisis IA Manual)
  const contenidoDisponible =
    contenidoConsolidado &&
    datosFinales &&
    intencionFinal?.includes("Pendiente");

  // Condición para mostrar los resultados generados (FASE 4 completada)
  const resultadosDisponibles =
    titulosFinales.length > 0 || tablaEstructuraFinal;

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
          <h2>Ingresa URLs Competidoras (mínimo 3)</h2>
          <textarea
            ref={referenciaUrls}
            className="auto-expand"
            placeholder="https://example1.com&#10;https://example2.com&#10;https://example3.com"
            rows={3}
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
            {cargandoScraping
              ? "Cancelar Scraping"
              : "1. Ejecutar Scraping y Consolidación de Contenido"}
          </button>
        </section>

        {/* Mensaje de Error */}
        {error && (
          <section
            className="preconfig"
            style={{ border: "2px solid #ef4444" }}
          >
            <h2 className="text-red-600">Error del Proceso</h2>
            <div className="log-error">{error}</div>
          </section>
        )}

        {/* Contenedor principal de resultados */}
        <div className="generadores-container">
          {/* Columna Izquierda - Resultados Consolidados FINALES */}
          <div className="generadores-izquierda">
            {/* Sección para el Botón de Generación de IA Manual (FASE 4) */}
            {contenidoDisponible && (
              <section
                className="preconfig"
                style={{ border: "2px solid #00c853", marginTop: "20px" }}
              >
                <h2 style={{ color: "#00c853" }}>
                  2. Generación Manual de Análisis Final (FASE 4)
                </h2>
                <p>
                  El contenido ha sido consolidado y está listo para ser
                  analizado por la IA.
                </p>
                <button
                  onClick={generarAnalisisIA}
                  className="btn-generate"
                  disabled={cargandoIA || contenidoDisponible === false}
                  style={{ backgroundColor: "#00c853" }}
                >
                  {cargandoIA
                    ? "Generando Análisis IA..."
                    : "Generar Títulos, Subtítulos e Intención IA"}
                </button>
              </section>
            )}

            {/* Secciones Separadas: Análisis Final de Contenido (Añadir Botón de Regeneración) */}
            {resultadosDisponibles && objetoEstructuraFinal && (
              <>
                {/* 1. Intención de Búsqueda */}
                <section
                  className="preconfig analysis-section"
                  style={{ border: "2px solid #007bff", marginTop: "20px" }}
                >
                  <h2 style={{ color: "#007bff", marginBottom: "10px" }}>
                    Intención de Búsqueda
                  </h2>
                  <div>
                    <p>{intencionFinal || "No disponible"}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Historial: {historialIntencion.length} versiones
                    </p>
                  </div>
                </section>

                {/* 2. Keywords Principales */}
                <section
                  className="preconfig analysis-section"
                  style={{ border: "2px solid #ffc107", marginTop: "20px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <h2 style={{ color: "#ffc107" }}>Keywords Principales</h2>
                    <button
                      className="btn-regenerate"
                      onClick={() =>
                        regenerarSeccion("keywords", historialKeywords)
                      }
                      disabled={
                        seccionRegenerando ||
                        !keywordsFinales.length ||
                        cargandoIA
                      }
                      style={{
                        padding: "5px 10px",
                        fontSize: "0.85rem",
                        backgroundColor: "#ffc107",
                        color: "black",
                        borderRadius: "4px",
                      }}
                    >
                      {seccionRegenerando === "keywords"
                        ? "Regenerando..."
                        : "Regenerar"}
                    </button>
                  </div>
                  <div>
                    <div>
                      {keywordsFinales.map((kw, index) => (
                        <span key={index} className="keyword-tag">
                          {kw}
                        </span>
                      ))}
                      {!keywordsFinales.length && "No disponibles"}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Total de Keywords generadas: {historialKeywords.length}
                    </p>
                  </div>
                </section>

                {/* 3. Títulos SEO Sugeridos */}
                <section
                  className="preconfig analysis-section"
                  style={{ border: "2px solid #17a2b8", marginTop: "20px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <h2 style={{ color: "#17a2b8" }}>Títulos SEO Sugeridos</h2>
                    <button
                      className="btn-regenerate"
                      onClick={() =>
                        regenerarSeccion("titles", historialTitulos)
                      }
                      disabled={
                        seccionRegenerando ||
                        !titulosFinales.length ||
                        cargandoIA
                      }
                      style={{
                        padding: "5px 10px",
                        fontSize: "0.85rem",
                        backgroundColor: "#17a2b8",
                        color: "white",
                        borderRadius: "4px",
                      }}
                    >
                      {seccionRegenerando === "titles"
                        ? "Regenerando..."
                        : "Regenerar"}
                    </button>
                  </div>
                  <div>
                    <ul>
                      {titulosFinales.length > 0 ? (
                        titulosFinales.map((title, index) => (
                          <li key={index} style={{ marginBottom: "5px" }}>
                            <strong>{index + 1}.</strong> {title.trim()}
                          </li>
                        ))
                      ) : (
                        <li>No disponibles</li>
                      )}
                    </ul>
                    <p className="text-sm text-gray-500 mt-2">
                      Total de Títulos generados: {historialTitulos.length}
                    </p>
                  </div>
                </section>

                {/* 4. Introducción Generada */}
                <section
                  className="preconfig analysis-section"
                  style={{ border: "2px solid #28a745", marginTop: "20px" }}
                >
                  <h2 style={{ color: "#28a745", textAlign: "center" }}>
                    Introducción
                  </h2>
                  <div>
                    <p>
                      {objetoEstructuraFinal.introduction || "No disponible"}
                    </p>
                  </div>
                </section>

                {/* 5. Estructura Detallada  */}
                <section
                  className="preconfig analysis-section"
                  style={{ border: "2px solid #6f42c1", marginTop: "20px" }}
                >
                  <h2 style={{ color: "#6f42c1", textAlign: "center" }}>
                    Estructura de Cuerpo (Markdown H2/H3)
                  </h2>
                  <div className="analysis-group">
                    <label className="input-label analysis-title">
                      Estructura Detallada:
                    </label>
                    <pre
                      className="structure-pre analysis-content"
                      style={{ border: "1px solid #ccc" }}
                    >
                      {tablaEstructuraFinal || "No disponible"}
                    </pre>
                  </div>
                </section>

                {/* 6. Conclusión y CTA */}
                <section
                  className="preconfig analysis-section"
                  style={{ border: "2px solid #dc3545", marginTop: "20px" }}
                >
                  <h2 style={{ color: "#dc3545", textAlign: "center" }}>
                    Conclusión y CTA
                  </h2>
                  <div>
                    <label>Conclusión y Llamada a la Acción:</label>
                    <p className="structure-pre info-block analysis-content">
                      {objetoEstructuraFinal.conclusion_cta || "No disponible"}
                    </p>
                  </div>
                </section>
              </>
            )}

            {/* Sugerencia de Estructura de Blog FINAL (Raw) */}
            <section
              className="visual-generator"
              style={{ flexGrow: 1, marginTop: "20px" }}
            >
              <h2 style={{ color: "#f75c5c" }}>
                Sugerencia de Estructura de Blog FINAL (Raw JSON)
              </h2>
              {estructuraFinalCruda ? (
                <pre className="structure-pre">{estructuraFinalCruda}</pre>
              ) : (
                <p>
                  El output completo y crudo de la Estructura (JSON) se mostrará
                  aquí.
                </p>
              )}
            </section>
          </div>

          {/* Columna Derecha - LOGS de Procesamiento (Debug) */}
          <div className="generadores-derecha">
            <h2 className="text-center">Logs Detallados del Backend (Debug)</h2>
            <section className="idea-generator">
              <p className="text-sm text-gray-500 mb-2">
                *Esta sección es para el equipo de desarrollo, muestra el
                tratamiento de datos y el flujo de scraping.*
              </p>
              <pre
                className="structure-pre"
                style={{
                  maxHeight: "80vh",
                  overflowY: "scroll",
                  fontSize: "0.75rem",
                }}
              >
                {logScraping.length > 0
                  ? logScraping.join("\n")
                  : "Esperando datos del backend..."}
              </pre>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default GeneracionBlog;
