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

  //--- URLs de la API del backend ---
  const URL_API_SCRAPING = "http://192.168.1.129:8000/scraping/stream";
  const URL_API_IA = "http://192.168.1.129:8000/ai/generate_structure";

  // --- Estados de Datos y Control ---
  const [datosFinales, setDatosFinales] = useState(null);
  const [cargandoScraping, setCargandoScraping] = useState(false);
  const [error, setError] = useState(null);
  const [usarIA, setUsarIA] = useState(true);

  //--- Resultados parseados para la vista ---
  const [tablaEstructuraFinal, setTablaEstructuraFinal] = useState("");
  const mainTitle =
    initialParams.titulo || datosFinales?.query || "Generación de Blog";

  //--- Estados para el flujo manual ---
  const [contenidoConsolidado, setContenidoConsolidado] = useState(null);
  const [cargandoIA, setCargandoIA] = useState(false);
  const [seccionRegenerando, setSeccionRegenerando] = useState(null);
  const [selectedSectionForRegen, setSelectedSectionForRegen] = useState(null);
  const [regenTextareaValue, setRegenTextareaValue] = useState("");
  const [titleSuggestions, setTitleSuggestions] = useState([]);

  /**
   * Convierte la estructura de objeto anidada (H2 con H3 hijos) de vuelta a una cadena de Markdown.
   * La renumeración se realiza implícitamente durante la construcción.
   * @param {Array} structure - Array anidado de secciones.
   * @returns {string} La cadena de Markdown plana.
   */
  const convertStructureToMarkdown = (structure) => {
    let markdownLines = [];
    let h2Counter = 0;

    structure.forEach((h2Item) => {
      // 1. Reenumerar H2
      h2Counter++;
      const h2Enumeration = h2Counter.toString();

      // Construir línea H2
      const h2Line = `[H2 - ${h2Enumeration}] ${h2Item.text.trim()}`;
      markdownLines.push(h2Line);

      // 2. Agregar Multimedia si existe en H2
      if (h2Item.multimedia && h2Item.multimediaDescription) {
        markdownLines.push(
          `[MULTIMEDIA: ${
            h2Item.multimedia
          } | ${h2Item.multimediaDescription.trim()}]`
        );
      }

      // 3. Procesar H3 hijos
      let h3Counter = 0;
      h2Item.children.forEach((h3Item) => {
        h3Counter++;
        const h3Enumeration = `${h2Enumeration}.${h3Counter}`;

        // Construir línea H3
        const h3Line = `[H3 - ${h3Enumeration}] ${h3Item.text.trim()}`;
        markdownLines.push(h3Line);

        // 4. Agregar Multimedia si existe en H3
        if (h3Item.multimedia && h3Item.multimediaDescription) {
          markdownLines.push(
            `[MULTIMEDIA: ${
              h3Item.multimedia
            } | ${h3Item.multimediaDescription.trim()}]`
          );
        }
      });
    });

    return markdownLines.join("\n").trim();
  };

  // ==============================================================================================================================================
  // 3. FUNCIONES DE MANEJO DE PROCESOS (Scraping, Cancelación, Utilidades)
  // ==============================================================================================================================================

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

    let finalStructureString = markdown;

    try {
      const jsonObject = JSON.parse(markdown);
      if (jsonObject && jsonObject.structure_markdown) {
        finalStructureString = jsonObject.structure_markdown;
      }
    } catch (e) {
      // Si falla (porque ya es un string plano), no hacemos NADA.
      // Esto corrige el bug al evitar el console.error/warning.
    }

    // Dividimos por saltos de línea para procesar encabezados y multimedia por separado
    const lines = finalStructureString.split("\n");
    const structure = []; // Array principal (solo H2s)
    let lastH2 = null; // Para rastrear el H2 padre actual

    // 1. RegEx para capturar ENCABEZADOS: [H{N} - X.Y] Título del Encabezado
    const structuredRegex = /^\[(H\d+)\s*-\s*(\d+\.?\d*)]\s*(.*)/i;

    // 2. RegEx para capturar la línea de MULTIMEDIA
    const separateMediaRegex =
      /^\[MULTIMEDIA:\s*(VIDEO|FOTO|MAPA|GRAFICO)\s*\|\s*(.*?)\]\s*$/i;

    for (const line of lines) {
      const trimmedLine = line.trim();
      const matchStructured = trimmedLine.match(structuredRegex);
      const matchMedia = trimmedLine.match(separateMediaRegex);

      if (matchStructured) {
        // Es una línea de encabezado (H2, H3). Crea un nuevo elemento.
        const level = matchStructured[1].toLowerCase();
        const enumeration = matchStructured[2];
        const text = matchStructured[3].trim();
        const newItem = {
          id: enumeration, // ID base (usaremos un ID más robusto para H3 después)
          text: text, // <-- SÓLO TEXTO PURO (Soluciona duplicación)
          level: level,
          enumeration: enumeration,
          multimedia: null,
          multimediaDescription: null,
        };

        if (level === "h2") {
          newItem.children = []; // Inicializar array de hijos para H2
          structure.push(newItem);
          lastH2 = newItem; // Establecer este H2 como el padre actual
        } else if (level === "h3" && lastH2) {
          // Es un H3 y tenemos un H2 padre. Lo añadimos a los hijos.
          newItem.id = `${lastH2.enumeration}-${enumeration}`; // ID robusto (e.g., "1-1.1")
          lastH2.children.push(newItem);
        }
      } else if (matchMedia) {
        // Es una línea de multimedia. Adjunta al ÚLTIMO encabezado creado.
        const multimediaType = matchMedia[1].toUpperCase();
        const multimediaDescription = matchMedia[2].trim();

        let itemToAttach = null;

        if (lastH2) {
          // Adjuntar al último H3 si existe, o al H2 si no hay H3.
          const lastH3 = lastH2.children[lastH2.children.length - 1];
          itemToAttach = lastH3 || lastH2;
        } else if (structure.length > 0) {
          itemToAttach = structure[structure.length - 1];
        }

        if (itemToAttach) {
          itemToAttach.multimedia = multimediaType;
          itemToAttach.multimediaDescription = multimediaDescription;
        }
      }
    }
    return structure;
  };

  // Funcion que Maneja la selección del título en el StructureRenderer
  const handleSectionSelect = (section) => {
    // Establece la sección seleccionada para activar el panel de edición
    setSelectedSectionForRegen(section);

    let textToEdit = section.text;

    // 1. Crear una expresión regular para encontrar el prefijo [H2 - X] o [H3 - X.Y]
    // Usamos el nivel y la enumeración específicos para ser precisos.
    const enumeration = section.enumeration.replace(/\./g, "\\."); // Escapar puntos

    // Este patrón busca: [H2 - X] o [H3 - X.Y] al inicio de la línea.
    const prefixRegex = new RegExp(
      `^\\s*\\[${section.level.toUpperCase()}\\s*-\\s*${enumeration}\\]\\s*`,
      "i"
    );

    // 2. Obtener la línea de Markdown completa de la sección
    // Esto es necesario para manejar la línea de multimedia.
    const lines = tablaEstructuraFinal.split("\n");
    let fullSectionLine = "";

    // Encontrar la línea que contiene el prefijo
    for (const line of lines) {
      if (line.match(prefixRegex)) {
        fullSectionLine = line;
        break;
      }
    }

    // 3. Obtener el texto del título PURO (eliminando el prefijo)
    // Usamos la línea completa que encontramos y le quitamos el prefijo
    if (fullSectionLine) {
      // Reemplaza el prefijo (ej: "[H2 - 1] ") por nada, dejando solo el título
      textToEdit = fullSectionLine.replace(prefixRegex, "").trim();
    }

    // 5. Establecer el texto de edición sin el número de sección
    setRegenTextareaValue(textToEdit);

    // Limpiar sugerencias antiguas
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

  /**
   * Mueve una sección (H2 con hijos o H3) dentro de la estructura anidada.
   * @param {Object} sectionToMove - La sección (H2 o H3) a mover.
   * @param {string} direction - 'UP' o 'DOWN'.
   */
  const handleMoveSection = (sectionToMove, direction) => {
    const currentStructure = parseMarkdownStructure(tablaEstructuraFinal);
    let newStructure = [...currentStructure];

    const isH2 = sectionToMove.level === "h2";

    if (isH2) {
      // LÓGICA DE MOVIMIENTO DE H2 (Mueve toda la sección, incluyendo hijos)
      const currentIndex = newStructure.findIndex(
        (item) => item.id === sectionToMove.id
      );
      if (currentIndex === -1) return;

      let newIndex = currentIndex;
      if (direction === "UP" && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (
        direction === "DOWN" &&
        currentIndex < newStructure.length - 1
      ) {
        newIndex = currentIndex + 1;
      } else {
        return;
      }

      // Intercambiar posiciones
      const [movedItem] = newStructure.splice(currentIndex, 1);
      newStructure.splice(newIndex, 0, movedItem);
    } else {
      // LÓGICA DE MOVIMIENTO DE H3 (Mueve solo dentro de su padre H2)
      const h2IdMatch = sectionToMove.enumeration.split(".")[0];
      const parentH2 = newStructure.find(
        (item) => item.enumeration === h2IdMatch
      );

      if (!parentH2) return;

      const h3Children = parentH2.children;
      const h3CurrentId = sectionToMove.id;

      const currentIndex = h3Children.findIndex(
        (item) => item.id === h3CurrentId
      );
      if (currentIndex === -1) return;

      let newIndex = currentIndex;
      if (direction === "UP" && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (direction === "DOWN" && currentIndex < h3Children.length - 1) {
        newIndex = currentIndex + 1;
      } else {
        return;
      }

      // Intercambiar posiciones
      const [movedItem] = h3Children.splice(currentIndex, 1);
      h3Children.splice(newIndex, 0, movedItem);

      parentH2.children = [...h3Children];
    }

    // 3. Convertir la nueva estructura de vuelta a Markdown y actualizar el estado
    const newMarkdown = convertStructureToMarkdown(newStructure);
    setTablaEstructuraFinal(newMarkdown);
  };

  // ---Funcion para eliminar una seccion
  const eliminarSeccion = (sectionToDelete) => {
    if (!sectionToDelete || !tablaEstructuraFinal) {
      return;
    }

    const { level, id, enumeration } = sectionToDelete;
    let newStructure = parseMarkdownStructure(tablaEstructuraFinal);

    if (selectedSectionForRegen?.id === id) {
      setSelectedSectionForRegen(null);
      setRegenTextareaValue("");
      setTitleSuggestions([]);
    }

    if (level === "h2") {
      // Caso H2: Borra toda la sección (H2 + H3 hijos)
      newStructure = newStructure.filter((item) => item.id !== id);
    } else if (level === "h3") {
      // Caso H3: Borra solo el H3 de su H2 padre
      const h2IdMatch = enumeration.split(".")[0];
      const parentH2 = newStructure.find(
        (item) => item.enumeration === h2IdMatch
      );

      if (parentH2) {
        // Filtra los hijos, eliminando el H3 con el ID coincidente
        parentH2.children = parentH2.children.filter((item) => item.id !== id);
      }
    }

    // 2. Convertir la estructura anidada modificada de vuelta a Markdown
    // La función de conversión se encarga de reenumerar implícitamente
    const newMarkdown = convertStructureToMarkdown(newStructure);

    // 3. Actualizar estado
    setTablaEstructuraFinal(newMarkdown);

    console.log(
      `[ELIMINACIÓN] Sección ${level.toUpperCase()} ${enumeration} eliminada y estructura reenumerada.`
    );
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

    setSelectedSectionForRegen((prevSection) => ({
      ...prevSection,
      text: newTitle,
    }));

    // Poner el nuevo título completo en el textarea para edición continua
    setRegenTextareaValue(newTitle);

    console.log(`[IA - REEMPLAZO] Título reemplazado por: ${newTitle}`);
  };

  // ==============================================================================================================================================
  // 4. FUNCIONES DE ANÁLISIS Y REGENERACIÓN DE IA
  // ==============================================================================================================================================

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

  // FUNCIÓN: Generación Única con Historial
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
  const StructureRenderer = ({
    structure,
    onSelect,
    selectedSection,
    onDelete,
    onMove,
  }) => {
    if (!structure || structure.length === 0) {
      return (
        <p className="text-gray-400 italic p-3">
          Estructura no disponible para renderizar.
        </p>
      );
    }

    return (
      // clase única para el contenedor de la lista
      <ul className="structure-list">
        {structure.map((item, index) => {
          const isH2 = item.level === "h2";

          return (
            <React.Fragment key={item.id}>
              <li
                // clases específicas para la jerarquía y la selección
                className={`
                  structure-item
                  ${isH2 ? "structure-item-h2" : "structure-item-h3"}
                  ${
                    selectedSection?.id === item.id
                      ? "structure-item-selected"
                      : ""
                  }
                `}
                title={`Haga click en el texto para editar o regenerar este ${item.level.toUpperCase()}`}
              >
                <div className="structure-content-wrapper">
                  {/* Contenedor que maneja la selección (click en el texto) */}
                  <div
                    className="structure-text-area"
                    onClick={() => onSelect(item)}
                    style={{ flexGrow: 1, cursor: "pointer" }}
                  >
                    {/* 1. Ícono para distinguir H2 y H3 visualmente */}
                    <span className="structure-icon-wrapper">
                      {isH2 ? (
                        <i className="uil uil-align-left-h structure-icon-h2"></i>
                      ) : (
                        <i className="uil uil-corner-down-right structure-icon-h3"></i>
                      )}
                    </span>
                    {/* 2. Enumeración y Texto del encabezado (AQUÍ ESTABA EL ERROR) */}
                    <span style={{ fontWeight: "bold", marginRight: "8px" }}>
                      {item.enumeration}
                    </span>
                    {item.text}
                  </div>
                  <div className="structure-buttons-group">
                    {/* 3. BOTONES DE MOVIMIENTO (NUEVOS) */}
                    <button
                      className="btn-move-structure"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMove(item, "UP");
                      }}
                      title={`Mover ${item.level.toUpperCase()} hacia arriba`}
                    >
                      <i className="uil uil-arrow-up"></i>
                    </button>
                    <button
                      className="btn-move-structure"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMove(item, "DOWN");
                      }}
                      title={`Mover ${item.level.toUpperCase()} hacia abajo`}
                    >
                      <i className="uil uil-arrow-down"></i>
                    </button>

                    {/* 4. Botón de ELIMINAR */}
                    <button
                      className="btn-delete-structure"
                      onClick={(e) => {
                        e.stopPropagation(); // Evita que se active el onSelect del área de texto
                        onDelete(item); // Llama a la función de eliminación
                      }}
                      title={`Eliminar este ${item.level.toUpperCase()} y su contenido anidado`}
                      style={{
                        marginLeft: "10px",
                        padding: "5px 8px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        flexShrink: 0, // Evita que el botón se comprima
                      }}
                    >
                      <i className="uil uil-trash-alt"></i>
                    </button>
                  </div>
                </div>

                {/* 5. Bloque de recomendación SEO (DIV) en línea SEPARADA */}
                {item.multimediaDescription && (
                  <div
                    className="multimedia-recommendation-seo"
                    style={{
                      marginTop: "10px",
                      padding: "8px 12px",
                      borderLeft: "4px solid #f29727",
                      backgroundColor: "#fff8f0",
                      fontSize: "0.9em",
                      color: "#333",
                    }}
                  >
                    <i
                      className="uil uil-search-alt"
                      style={{ marginRight: "8px", color: "#f29727" }}
                    ></i>
                    <strong>RECOMENDACIÓN SEO ({item.multimedia}):</strong>{" "}
                    {item.multimediaDescription}
                  </div>
                )}
              </li>

              {/* 6. RECURSIVIDAD para renderizar H3s */}
              {isH2 && item.children && item.children.length > 0 && (
                <div style={{ marginLeft: "25px" }}>
                  <StructureRenderer
                    structure={item.children} // Llamada recursiva con el array de hijos
                    onSelect={onSelect}
                    selectedSection={selectedSection}
                    onDelete={onDelete}
                    onMove={onMove}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
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
                  onDelete={eliminarSeccion}
                  onMove={handleMoveSection}
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
