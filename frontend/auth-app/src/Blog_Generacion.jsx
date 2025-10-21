import React, { useState, useRef } from "react";
import "@iconscout/unicons/css/line.css";
import "./css/styles_generacion.css";

const GeneracionBlog = ({ initialParams = {}, onBackToDashboard }) => {
  // =======================================================================
  // 1. REFERENCIAS DE ELEMENTOS (useRef)
  // =======================================================================
  const referenciaUrls = useRef(null);
  const referenciaControladorAborto = useRef(null);
  const finalContentRef = useRef(null);

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
  const [selectedSectionForRegen, setSelectedSectionForRegen] = useState(null);
  const [regenTextareaValue, setRegenTextareaValue] = useState("");
  const [seccionRegenerando, setSeccionRegenerando] = useState(null); // <-- Define 'setSeccionRegenerando'
  const [titleSuggestions, setTitleSuggestions] = useState([]);

  // --- ESTADOS para CONTENIDO ---
  const [sectionContentValue, setSectionContentValue] = useState("");
  const [wordLimit, setWordLimit] = useState(300);
  const [contentType, setContentType] = useState("ia_libre");

  // --- Estado para la Notificación Toast ---
  const [toast, setToast] = useState(null);

  // Estados para el modal de hipervínculo
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkSelection, setLinkSelection] = useState(null);
  const [linkUrl, setLinkUrl] = useState("");

  /**
   * Muestra una notificación temporal.
   * @param {string} message - El mensaje a mostrar.
   * @param {string} type - Tipo: 'success', 'error', 'info', 'warning'.
   */
  const showToast = (message, type = "info") => {
    setToast({ message, type });

    // Ocultar el toast después de 3 segundos
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

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
      // --- 1. LÓGICA DE H2 ---
      h2Counter++;
      const h2Enumeration = h2Counter.toString();
      const h2Line = `[H2 - ${h2Enumeration}] ${h2Item.text.trim()}`;
      markdownLines.push(h2Line);

      // 1.1. Agregar Multimedia si existe en H2
      if (h2Item.multimedia && h2Item.multimediaDescription) {
        markdownLines.push(
          `[MULTIMEDIA: ${
            h2Item.multimedia
          } | ${h2Item.multimediaDescription.trim()}]`
        );
      }

      // 1.2. AGREGAR BLOQUE DE CONTENIDO H2 (¡La clave para la persistencia!)
      if (h2Item.content && h2Item.content.trim()) {
        // Se usa \n para asegurar que [CONTENIDO] quede en una línea nueva separada
        markdownLines.push("\n[CONTENIDO]");
        // Añadimos el contenido limpio (el texto en sí)
        markdownLines.push(h2Item.content.trim());
        markdownLines.push(""); // Línea vacía para separación visual
      }

      // --- 2. LÓGICA DE H3 ---
      let h3Counter = 0;
      h2Item.children.forEach((h3Item) => {
        h3Counter++;
        const h3Enumeration = `${h2Enumeration}.${h3Counter}`;

        const h3Line = `[H3 - ${h3Enumeration}] ${h3Item.text.trim()}`;
        markdownLines.push(h3Line);

        // 2.1. Agregar Multimedia si existe en H3
        if (h3Item.multimedia && h3Item.multimediaDescription) {
          markdownLines.push(
            `[MULTIMEDIA: ${
              h3Item.multimedia
            } | ${h3Item.multimediaDescription.trim()}]`
          );
        }

        // 2.2. AGREGAR BLOQUE DE CONTENIDO H3
        if (h3Item.content && h3Item.content.trim()) {
          markdownLines.push("\n[CONTENIDO]");
          markdownLines.push(h3Item.content.trim());
          markdownLines.push(""); // Línea vacía para separación
        }
      });

      // 3. Separador final para bloques H2
      // Añadir una línea vacía final (si no hay ya una)
      if (markdownLines[markdownLines.length - 1] !== "") {
        markdownLines.push("");
      }
    });

    // Eliminamos cualquier línea vacía al inicio o al final del resultado
    return markdownLines.join("\n").trim();
  };

  const renderFinalBlogHtml = (structure) => {
    let html = `<h1>${mainTitle}</h1>`;

    structure.forEach((h2Item) => {
      // H2 Title: Renderiza como H2 (Editable)
      html += `<h2 data-level="${h2Item.enumeration}">${
        h2Item.enumeration
      }. ${h2Item.text.trim()}</h2>`;

      // H2 Content
      if (h2Item.content && h2Item.content.trim()) {
        // Reemplazar saltos de línea por párrafos (<p>) para una mejor edición y estructura
        const contentHtml = h2Item.content
          .trim()
          .split("\n")
          .map((line) => `<p>${line}</p>`)
          .join("");
        html += `<div class="content-block h2-content">${contentHtml}</div>`;
      }

      // H3 Children
      h2Item.children.forEach((h3Item) => {
        // H3 Title: Renderiza como H3 (Editable)
        html += `<h3 data-level="${h3Item.enumeration}">${
          h3Item.enumeration
        }. ${h3Item.text.trim()}</h3>`;

        // H3 Content
        if (h3Item.content && h3Item.content.trim()) {
          const contentHtml = h3Item.content
            .trim()
            .split("\n")
            .map((line) => `<p>${line}</p>`)
            .join("");
          html += `<div class="content-block h3-content">${contentHtml}</div>`;
        }
      });
    });

    return `<div id="final-blog-content">${html}</div>`;
  };

  // ==============================================================================================================================================
  // 3. FUNCIONES DE MANEJO DE PROCESOS (Scraping, Cancelación, Utilidades, Agregar)
  // ==============================================================================================================================================

  const handleContentMouseUp = () => {
    // Solo permitir edición si el contenido final existe.
    if (!tablaEstructuraFinal) return;

    const selection = window.getSelection();
    const selectedText = selection.toString();

    // 1. Verificar si hay una selección de texto y si el cursor está dentro del contenedor editable
    if (
      selectedText.length > 0 &&
      finalContentRef.current &&
      finalContentRef.current.contains(selection.anchorNode)
    ) {
      // 2. Guardar el objeto Range de la selección
      setLinkSelection(selection.getRangeAt(0));
      setLinkUrl(""); // Resetear URL
      setIsLinkModalOpen(true); // Abrir el modal
    } else {
      // Si no hay selección, asegurar que el modal se cierre
      setIsLinkModalOpen(false);
      setLinkSelection(null);
      setLinkUrl("");
    }
  };

  // Función para insertar el hipervínculo usando la selección guardada
  const insertLink = () => {
    if (linkSelection && linkUrl) {
      // 1. Restaura la selección guardada
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(linkSelection);

      // 2. Ejecuta el comando de inserción de enlace (document.execCommand es la forma más simple en este contexto)
      const normalizedUrl = linkUrl.startsWith("http")
        ? linkUrl
        : `https://${linkUrl}`;
      document.execCommand("createLink", false, normalizedUrl);

      // 3. Limpieza y notificación
      setIsLinkModalOpen(false);
      setLinkUrl("");
      setLinkSelection(null);
      showToast("Hipervínculo insertado exitosamente.", "success");

      // Opcional: Aquí deberías leer el HTML actualizado del finalContentRef.current.innerHTML
      // y guardarlo en el estado de tu blog (si aplicas persistencia del contenido editado)
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

    // Asumimos pre-procesamiento de JSON si aplica...
    let finalStructureString = markdown;
    try {
      const parsedJson = JSON.parse(markdown);
      if (parsedJson.full_structure_markdown) {
        finalStructureString = parsedJson.full_structure_markdown;
      }
    } catch (e) {
      // No es JSON, asumimos que es Markdown plano.
    }

    const lines = finalStructureString.split("\n");
    const structure = [];
    let lastH2 = null;
    let itemActual = null; // Referencia al H2 o H3 actual para adjuntar propiedades

    // 1. RegEx para capturar ENCABEZADOS: [H{N} - X.Y] Título del Encabezado
    const structuredRegex = /^\[(H\d+)\s*-\s*([\d.]*)[\]>]\s*(.*)/i; // 2. RegEx para capturar la línea de MULTIMEDIA
    const separateMediaRegex =
      /^\[MULTIMEDIA:\s*(VIDEO|FOTO|MAPA|GRAFICO)\s*\|\s*(.*?)\]\s*$/i;
    // 3. RegEx para el marcador de CONTENIDO
    const contentStartRegex = /^\[CONTENIDO\]\s*$/i;

    // Variable de estado para la lectura multilínea
    let leyendoContenido = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      const matchStructured = trimmedLine.match(structuredRegex);
      const matchMedia = trimmedLine.match(separateMediaRegex);
      const matchContentStart = trimmedLine.match(contentStartRegex);

      if (matchStructured) {
        // --- 1. ENCABEZADO (H2/H3) ---
        leyendoContenido = false; // Detener lectura de contenido anterior

        const level = matchStructured[1].toLowerCase();
        const enumeration = matchStructured[2];
        const text = matchStructured[3].trim();
        const newItem = {
          level,
          enumeration,
          text,
          multimedia: null,
          multimediaDescription: null,
          content: null, // <--- CLAVE: Inicializar la propiedad content
          children: [],
          uniqueId: `${level}-${enumeration}`,
        };

        if (level === "h2") {
          structure.push(newItem);
          lastH2 = newItem;
          itemActual = newItem;
        } else if (level === "h3" && lastH2) {
          lastH2.children.push(newItem);
          itemActual = newItem;
        } else {
          itemActual = null;
        }
      } else if (matchMedia && itemActual) {
        // --- 2. MULTIMEDIA ---
        leyendoContenido = false; // Detener lectura de contenido
        itemActual.multimedia = matchMedia[1].toUpperCase();
        itemActual.multimediaDescription = matchMedia[2].trim();
      } else if (matchContentStart && itemActual) {
        // --- 3. INICIO DE BLOQUE DE CONTENIDO ---
        leyendoContenido = true;
        itemActual.content = ""; // Inicializar la propiedad para acumular el texto
      } else if (leyendoContenido && itemActual) {
        // --- 4. LEYENDO CONTENIDO MULTILÍNEA ---
        // Acumular la línea completa (sin trim) para preservar formato/espacios.
        // Añadimos un salto de línea antes, excepto si es la primera línea que se agrega.
        itemActual.content +=
          (itemActual.content.length > 0 ? "\n" : "") + line;
      }
      // Si la línea es vacía o no coincide con un marcador, simplemente se omite.
    }

    // Limpieza final de contenido: eliminar saltos de línea y espacios en blanco al inicio/final
    structure.forEach((h2) => {
      if (h2.content) h2.content = h2.content.trim();
      h2.children.forEach((h3) => {
        if (h3.content) h3.content = h3.content.trim();
      });
    });

    return structure;
  };

  // Funcion que Maneja la selección del título en el StructureRenderer
  const handleSectionSelect = (section, event) => {
    // 1. Establece la sección seleccionada para activar el panel de edición
    setSelectedSectionForRegen(section);

    // 2. Establecer el texto de edición (Título)
    setRegenTextareaValue(section.text);

    // 3. Establecer el texto de contenido (Contenido)
    // Se busca el contenido en el Markdown para asegurar la persistencia.
    const fullStructureObject = parseMarkdownStructure(tablaEstructuraFinal);
    const { level, enumeration } = section;
    const idH2 = enumeration.split(".")[0];
    const h2Padre = fullStructureObject.find(
      (item) => item.enumeration === idH2
    );
    let contentToEdit = "";

    if (h2Padre) {
      if (level === "h2") {
        contentToEdit = h2Padre.content || "";
      } else if (level === "h3") {
        const h3Objetivo = h2Padre.children.find(
          (item) => item.enumeration === enumeration
        );
        contentToEdit = h3Objetivo?.content || "";
      }
    }
    setSectionContentValue(contentToEdit);
  };

  // Funcion para guardar los titulos
  const handleGuardarCambiosTitulo = () => {
    // 1. Validaciones
    if (!selectedSectionForRegen || !regenTextareaValue) {
      showToast(
        "ERROR: No se ha seleccionado una sección o el nuevo título está vacío.",
        "error"
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
      showToast(
        "ERROR CRÍTICO: Falló la sustitución. La RegEx no encontró el título con los marcadores de nivel.",
        "error"
      );
    } else {
      setTablaEstructuraFinal(newStructureString);
      setSelectedSectionForRegen((prevSection) => ({
        ...prevSection,
        text: newTitle,
      }));

      setRegenTextareaValue(newTitle);
      showToast(" Edición local del título guardada exitosamente.", "success");
    }
  };

  //Funcion para guardar el contenido de los titulos o subtitulos
  const guardarContenidoLocal = () => {
    if (!selectedSectionForRegen) {
      showToast(
        "ERROR: No hay una sección seleccionada para guardar el contenido.",
        "error"
      );
      return;
    }

    const nuevoContenido = sectionContentValue.trim();

    // 1. Obtener la estructura actual como objeto
    let nuevaEstructura = parseMarkdownStructure(tablaEstructuraFinal);
    const { level, enumeration } = selectedSectionForRegen;

    // 2. Encontrar y actualizar el objeto en el array anidado
    const idH2 = enumeration.split(".")[0];
    const h2Padre = nuevaEstructura.find((item) => item.enumeration === idH2);

    if (h2Padre) {
      if (level === "h2") {
        h2Padre.content = nuevoContenido;
      } else if (level === "h3") {
        const h3Objetivo = h2Padre.children.find(
          (item) => item.enumeration === enumeration
        );
        if (h3Objetivo) {
          h3Objetivo.content = nuevoContenido;
        }
      }
    }

    // 3. Convertir la estructura modificada de vuelta a Markdown
    // USA EL NOMBRE REAL DE TU FUNCIÓN DE ESCRITURA
    const nuevoMarkdown = convertStructureToMarkdown(nuevaEstructura);

    // 4. ACTUALIZAR EL ESTADO PRINCIPAL (¡Esto fuerza la actualización de la vista!)
    setTablaEstructuraFinal(nuevoMarkdown);

    // 5. Limpieza de UI
    setSelectedSectionForRegen(null);
    setSectionContentValue("");
    setRegenTextareaValue("");

    if (!nuevoContenido) {
      showToast("Contenido de la sección borrado localmente.", "success");
    } else {
      showToast(
        " Contenido de la sección guardado localmente y actualizado.",
        "success"
      );
    }
  };

  // NUEVA FUNCIÓN: Cancelar Edición de Contenido
  const cancelarEdicionContenido = () => {
    // 1. Limpieza de UI
    setSelectedSectionForRegen(null);
    setSectionContentValue("");
    setRegenTextareaValue("");
    setTitleSuggestions([]);

    // 2. Notificación
    showToast("Edición de contenido cancelada.", "info");
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
      // 🔑 CORRECCIÓN: Usar uniqueId en lugar de id (ya que id no se genera)
      const currentIndex = newStructure.findIndex(
        // (item) => item.id === sectionToMove.id // ANTERIOR
        (item) => item.uniqueId === sectionToMove.uniqueId // CORREGIDO
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
      // 🔑 CORRECCIÓN: Usar uniqueId en lugar de id
      // const h3CurrentId = sectionToMove.id; // ANTERIOR
      const h3CurrentId = sectionToMove.uniqueId; // CORREGIDO

      // 🔑 CORRECCIÓN: Usar uniqueId en lugar de id
      const currentIndex = h3Children.findIndex(
        // (item) => item.id === h3CurrentId // ANTERIOR
        (item) => item.uniqueId === h3CurrentId // CORREGIDO
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

  /**
   * Maneja acciones de Mover y Eliminar, mostrando un toast de confirmación.
   */
  const handleSectionAction = (action, section, direction = null) => {
    switch (action) {
      case "move":
        handleMoveSection(section, direction);
        showToast(
          `Sección ${section.enumeration} movida ${
            direction === "UP" ? "hacia arriba" : "hacia abajo"
          } correctamente.`,
          "info"
        );
        break;
      case "delete":
        // Usar window.confirm para acciones destructivas
        if (
          window.confirm(
            ` ¿Estás seguro de que quieres ELIMINAR la sección ${section.enumeration}: "${section.text}" y todas sus subsecciones?`
          )
        ) {
          eliminarSeccion(section);
          showToast(
            `Sección ${section.enumeration} eliminada correctamente.`,
            "success"
          );
        }
        break;
      default:
        console.warn("Acción de sección no reconocida:", action);
    }
  };

  // ---Funcion para eliminar una seccion
  const eliminarSeccion = (sectionToDelete) => {
    // Validar si hay algo para eliminar
    if (!sectionToDelete || !tablaEstructuraFinal) {
      showToast("Error: No hay sección seleccionada para eliminar.", "error");
      return;
    }

    // Convertir el Markdown a la estructura de objetos para manipularla
    let parsedStructure = parseMarkdownStructure(tablaEstructuraFinal);
    let newStructure = [];
    const targetId = sectionToDelete.uniqueId;
    const level = sectionToDelete.level;

    if (level === "h2") {
      // 1.  ELIMINAR H2: Simplemente filtramos el array principal para excluir el H2.
      // Esto elimina automáticamente todos los H3 que estaban anidados dentro.
      newStructure = parsedStructure.filter(
        (item) => item.uniqueId !== targetId
      );
    } else if (level === "h3") {
      // 2. ELIMINAR H3: Debemos encontrar el H2 padre y filtrar solo sus hijos.

      // 2a. Obtener la enumeración del H2 padre (Ej: si H3 es "1.2", el padre es "1").
      const parentH2Enumeration = sectionToDelete.enumeration.split(".")[0];

      // 2b. Mapear la estructura para encontrar y modificar SOLO el H2 padre
      newStructure = parsedStructure.map((h2Item) => {
        if (h2Item.enumeration === parentH2Enumeration) {
          // Hemos encontrado el H2 padre:

          // Filtramos su array de hijos para EXCLUIR el H3 que coincide con el ID.
          const newChildren = h2Item.children.filter(
            (h3Item) => h3Item.uniqueId !== targetId
          );

          // Retornamos un NUEVO objeto H2 (inmutabilidad) con los hijos filtrados
          return { ...h2Item, children: newChildren };
        }

        // Si no es el H2 padre, lo dejamos sin cambios.
        return h2Item;
      });
    } else {
      showToast("Nivel de sección no reconocido para eliminación.", "error");
      return;
    }

    // 3. Actualizar el estado
    const newMarkdown = convertStructureToMarkdown(newStructure);
    setTablaEstructuraFinal(newMarkdown);
    setSelectedSectionForRegen(null); // Limpiar la selección
    showToast(
      `Sección eliminada correctamente. La estructura ha sido re-enumerada.`,
      "success"
    );
  };

  // --- Funcion para agregar secciones de H2
  const agregarSeccionH2 = () => {
    // 1. Obtener la estructura actual (Array Anidado)
    const estructuraActual = parseMarkdownStructure(tablaEstructuraFinal);

    // 2. Crear un ID y un texto temporal. La numeración real se corrige en convertStructureToMarkdown.
    const nuevoIdH2 = `nuevo-${Date.now()}`;
    const nuevoTextoH2 = "Nuevo Título de Sección (H2)";

    // 3. Crear el objeto de la nueva sección H2
    const nuevoElementoH2 = {
      id: nuevoIdH2,
      text: nuevoTextoH2,
      level: "h2",
      enumeration: "0", // Temporal
      multimedia: null,
      multimediaDescription: null,
      children: [], // Es un H2, debe tener un array de hijos
    };

    // 4. Agregar el nuevo H2 al final del array principal
    const nuevaEstructura = [...estructuraActual, nuevoElementoH2];

    // 5. Convertir la nueva estructura anidada de vuelta a Markdown y actualizar el estado.
    // ESTA FUNCIÓN SE ENCARGA DE REENUMERAR todo correctamente.
    const nuevoMarkdown = convertStructureToMarkdown(nuevaEstructura);
    setTablaEstructuraFinal(nuevoMarkdown);

    showToast(
      " Sección H2 añadida exitosamente al final de la estructura.",
      "success"
    );
  };

  // --- Funcion para agregar subsecciones de H3 en el H2
  const agregarSubseccionH3 = () => {
    // 1. Validar la selección
    if (!selectedSectionForRegen || !tablaEstructuraFinal) {
      showToast(
        "ERROR: Debe seleccionar una sección H2 o H3 para añadir un subtítulo.",
        "error"
      );
      return;
    }

    // 2. Obtener la estructura actual como objeto
    let nuevaEstructura = parseMarkdownStructure(tablaEstructuraFinal);
    const { enumeration } = selectedSectionForRegen;

    // 3. Determinar la enumeración del padre H2.
    // Si la enumeración es "1" o "2", idH2Padre es "1" o "2".
    // Si la enumeración es "1.2", idH2Padre es "1".
    const idH2Padre = enumeration.split(".")[0];

    // 4. 🔎 Encontrar el H2 padre en el array principal.
    const h2Padre = nuevaEstructura.find(
      (item) => item.enumeration === idH2Padre
    );

    if (!h2Padre) {
      showToast(
        "ERROR: No se pudo encontrar la sección H2 padre para agregar el H3.",
        "error"
      );
      return;
    }

    // 5. Crear el nuevo H3
    const newH3 = {
      level: "h3",
      uniqueId: `h3-${Date.now()}`, // ID Único
      text: "Nueva Subsección H3",
      multimedia: null,
      multimediaDescription: null,
      content: null,
    };

    // 6. Insertar el nuevo H3 en la lista de hijos del H2 padre
    // La función convertStructureToMarkdown se encargará de re-enumerar
    h2Padre.children.push(newH3);

    // 7. Convertir la estructura modificada de vuelta a Markdown y actualizar el estado
    const nuevoMarkdown = convertStructureToMarkdown(nuevaEstructura);
    setTablaEstructuraFinal(nuevoMarkdown);

    // Opcional: Deseleccionar la sección o seleccionar la nueva.
    // setSelectedSectionForRegen(newH3);

    showToast(
      "Subsección H3 agregada. Se ha re-enumerado la estructura.",
      "success"
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
    const numResultados = urls.length > 0 ? urls.length : 3;

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

      showToast("✨ Estructura generada por IA exitosamente.", "success");
    } catch (err) {
      console.error("[IA] Error al generar análisis de IA:", err);
      setError(`Error en la generación de IA: ${err.message}. Revise logs.`);
    } finally {
      setCargandoIA(false);
    }
  };

  // Funcion generacion de contenido
  const generarContenidoIA = async () => {
    // Aseguramos que haya una sección seleccionada y el contenido consolidado para la IA
    if (!selectedSectionForRegen || !contenidoConsolidado) {
      showToast(
        "ERROR: Faltan datos clave (Sección o Contenido Consolidado).",
        "error"
      );
      return;
    }

    // Validar límite de palabras
    const finalWordLimit = Math.min(Math.max(wordLimit, 100), 1000);
    if (wordLimit !== finalWordLimit) {
      setWordLimit(finalWordLimit); // Corregir el estado si estaba fuera de rango
      showToast(`Límite de palabras ajustado a ${finalWordLimit}.`, "warning");
    }

    setCargandoIA(true);
    setError(null);

    const levelDisplay = selectedSectionForRegen.level.toUpperCase();
    showToast(
      `Solicitando contenido para el ${levelDisplay} con límite de ${finalWordLimit} palabras...`,
      "info"
    );

    // 1. CONSTRUCCIÓN DEL PAYLOAD PARA EL BACKEND
    const payload = {
      // Campos requeridos por AIAnalysisRequest
      query: datosFinales.query,
      consolidated_content: contenidoConsolidado,
      keywords: datosFinales.keywords || [],
      idioma: datosFinales.idioma,
      acento: datosFinales.acento,
      tono: datosFinales.tono,

      // Tipo de sección que activa la delegación en el backend
      section_type: "content_generation",

      // --- Aqui se envian los datos para la regeneracion de contenido  ---
      regenerate_data: {
        section_title: selectedSectionForRegen.text,
        section_level: selectedSectionForRegen.level,
        full_structure_markdown: tablaEstructuraFinal,
        word_limit: finalWordLimit,
        content_type: contentType,
      },
    };

    try {
      // 2. LLAMADA A LA API
      const response = await fetch(URL_API_IA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error HTTP: ${response.status}`);
      }

      const result = await response.json();

      // 3. PROCESAMIENTO E INTEGRACIÓN DEL RESULTADO
      if (result.generated_content) {
        const nuevoContenido = result.generated_content.trim();
        const { level, enumeration } = selectedSectionForRegen;

        // 3.1. Obtener la estructura actual (Objeto)
        // USAMOS parseMarkdownStructure para leer el Markdown existente
        let nuevaEstructura = parseMarkdownStructure(tablaEstructuraFinal);

        // 3.2. Encontrar y actualizar la sección con el nuevo contenido
        const idH2 = enumeration.split(".")[0];
        const h2Padre = nuevaEstructura.find(
          (item) => item.enumeration === idH2
        );

        if (h2Padre) {
          if (level === "h2") {
            h2Padre.content = nuevoContenido;
          } else if (level === "h3") {
            const h3Objetivo = h2Padre.children.find(
              (item) => item.enumeration === enumeration
            );
            if (h3Objetivo) {
              h3Objetivo.content = nuevoContenido;
            }
          }
        }

        // 3.3. Convertir la estructura modificada de vuelta a Markdown
        // USAMOS convertStructureToMarkdown para escribir el nuevo Markdown
        const nuevoMarkdown = convertStructureToMarkdown(nuevaEstructura);

        // 3.4. ACTUALIZAR EL ESTADO (¡Esto actualiza la vista del blog!)
        setTablaEstructuraFinal(nuevoMarkdown);

        // 3.5. Mostrar el contenido en el editor para revisión
        setSectionContentValue(nuevoContenido);

        showToast(
          "✨ Contenido generado por IA y aplicado al editor.",
          "success"
        );
      } else {
        throw new Error(
          "Respuesta de IA inesperada. No se encontró el contenido."
        );
      }
    } catch (err) {
      console.error("Error al generar contenido con IA:", err);
      setError(`Error al generar contenido: ${err.message}`);
      showToast(
        ` Error al solicitar contenido a la IA: ${err.message}`,
        "error"
      );
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
    onAction, // Prop unificado para acciones (move/delete)
  }) => {
    if (!structure || structure.length === 0) {
      return (
        <p className="text-gray-400 italic p-3">
          Estructura no disponible para renderizar.
        </p>
      );
    }

    return (
      // La lista principal <ul>
      <ul className="structure-list">
        {structure.map((item, index) => {
          const isH2 = item.level === "h2";

          // --- LÓGICA DE VISIBILIDAD PARA EL NIVEL ACTUAL (H2s o H3s si se llama recursivamente) ---
          const totalSiblings = structure.length;
          const canMoveUp = index > 0;
          const canMoveDown = index < totalSiblings - 1;

          // Retorna el <li> que contiene todos los elementos de la sección
          return (
            <li
              key={item.uniqueId || item.enumeration}
              className={`
                            structure-item
                            ${isH2 ? "structure-item-h2" : "structure-item-h3"}
                            ${
                              selectedSection?.uniqueId === item.uniqueId
                                ? "structure-item-selected"
                                : ""
                            }
                        `}
              title={`Haga click en el texto para editar este ${item.level.toUpperCase()}`}
            >
              {/* CONTENEDOR PRINCIPAL DEL TEXTO Y BOTONES */}
              <div className="structure-content-wrapper">
                {/* Área que maneja la selección al hacer click en el texto */}
                <div
                  className="structure-text-area"
                  onClick={(e) => onSelect(item, e)}
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
                  {/* 2. Enumeración y Texto del encabezado */}
                  <span style={{ fontWeight: "bold", marginRight: "8px" }}>
                    {item.enumeration}
                  </span>
                  {item.text}
                </div>
                {/* GRUPO DE BOTONES DE ACCIÓN (Mover/Eliminar) */}
                <div className="structure-buttons-group">
                  {/* Botón Mover Arriba - CONDICIONAL para H2 */}
                  {canMoveUp && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction("move", item, "UP");
                      }}
                      title="Mover Arriba"
                    >
                      <i className="uil uil-arrow-up"></i>
                    </button>
                  )}
                  {/* Botón Mover Abajo - CONDICIONAL para H2 */}
                  {canMoveDown && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction("move", item, "DOWN");
                      }}
                      title="Mover Abajo"
                    >
                      <i className="uil uil-arrow-down"></i>
                    </button>
                  )}
                  {/* Eliminar */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction("delete", item);
                    }}
                    className="btn-delete-section"
                    title="Eliminar Sección"
                  >
                    <i className="uil uil-trash-alt"></i>
                  </button>
                </div>
              </div>

              {/* 📝 CORRECCIÓN VISUAL: Bloque de previsualización del CONTENIDO */}
              {item.content && item.content.trim() && (
                <div
                  className="content-preview-block"
                  style={{
                    marginTop: "10px",
                    padding: "8px 12px",
                    borderLeft: "4px solid #10a2f4", // Color distintivo
                    backgroundColor: "#f0f8ff",
                    fontSize: "0.9em",
                    color: "#333",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                  title="Contenido generado. Haga clic para editar."
                >
                  <i
                    className="uil uil-file-alt"
                    style={{ marginRight: "8px", color: "#10a2f4" }}
                  ></i>
                  <strong>CONTENIDO:</strong>{" "}
                  {item.content.trim().substring(0, 150)}
                  {item.content.trim().length > 150 ? "..." : ""}
                </div>
              )}

              {/* 5. Bloque de recomendación SEO (DIV) */}
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

              {/* 🚀 CORRECCIÓN ESTRUCTURA: RECURSIVIDAD para H3s ANIDADA dentro del <li> de H2. */}
              {isH2 && item.children && item.children.length > 0 && (
                <div style={{ marginLeft: "25px", marginTop: "10px" }}>
                  <StructureRenderer
                    structure={item.children} // Llama al componente con los hijos
                    onSelect={onSelect}
                    selectedSection={selectedSection}
                    onAction={onAction}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  // =======================================================================
  // 6. NUEVO COMPONENTE: ToastNotification
  // =======================================================================

  const ToastNotification = ({ toast }) => {
    if (!toast) return null;

    let toastClass = "";
    let icon = "uil-info-circle";

    switch (toast.type) {
      case "success":
        toastClass = "toast-success";
        icon = "uil-check-circle";
        break;
      case "error":
        toastClass = "toast-error";
        icon = "uil-times-circle";
        break;
      case "warning":
        toastClass = "toast-warning";
        icon = "uil-exclamation-triangle";
        break;
      default: // info
        toastClass = "toast-info";
        icon = "uil-info-circle";
        break;
    }

    return (
      <div className={`toast-notification ${toastClass}`}>
        <i className={`uil ${icon}`}></i>
        <span>{toast.message}</span>
      </div>
    );
  };

  // =======================================================================
  // 7. VARIABLES DE RENDERIZACIÓN (Derivación de Estado)
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
  // 8. RENDER (JSX)
  // =======================================================================

  return (
    <>
      <ToastNotification toast={toast} /> {/* Renderizar la notificación */}
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
          {/* Esta es la única sección consolidada */}
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
                <i className="uil uil-tag-alt"></i> Preconfiguracion
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
              // Esta <section> interna puede eliminarse o mantener su clase si no causa problemas.
              // Si la eliminas, el contenido subiría al <section className="analysis-result info-card"> principal.
              // Para simplificar, la dejaré como está en tu ejemplo, aunque tienes dos <section> anidadas.
              <section className="analysis-result">
                {/* ⚠️ ESTE ES EL NUEVO CONTENEDOR CON EL LAYOUT DE COLUMNAS */}
                <div className="config-detail-grid">
                  {/* Este div será la primera columna */}
                  <div className="analysis-detail">
                    <span className="analysis-title">Título Base:</span>
                    <p>{initialParams.titulo || "N/A"}</p>

                    <span className="analysis-title">
                      Keywords Secundarias:
                    </span>
                    <p className="keywords-output">
                      {initialParams.keywords || "N/A"}
                    </p>
                  </div>

                  {/* Este div será la segunda columna */}
                  <div className="analysis-detail">
                    <span className="analysis-title">Tono:</span>
                    <p>{initialParams.tono || "N/A"}</p>
                    <span className="analysis-title">Acento:</span>
                    <p>{initialParams.acento || "N/A"}</p>
                    <span className="analysis-title">Técnica:</span>
                    <p>{initialParams.tecnica || "N/A"}</p>
                  </div>

                  {/* Este div será la tercera columna */}
                  <div className="analysis-detail">
                    <span className="analysis-title">Idioma:</span>
                    <p>{initialParams.idioma || "N/A"}</p>
                    <span className="analysis-title">Proyecto:</span>
                    <p>{initialParams.categoria || "N/A"}</p>
                  </div>
                </div>{" "}
              </section>
            )}
          </section>
        </div>

        {/* Contenedores Principales (Izquierda y Derecha) */}
        <div className="generadores-container">
          {/* ========================================================= */}
          {/* >> COLUMNA IZQUIERDA: Edición de Título, Análisis IA <<< */}
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
            {/* --- 4. EDITOR / GENERACIÓN DE CONTENIDO DE SECCIÓN --- */}
            {/* ---------------------------------------------------- */}
            {selectedSectionForRegen && (
              <section
                className="analysis-result fade-in"
                style={{ marginTop: "20px" }}
              >
                <h2 className="analysis-title">
                  Editar Contenido: {selectedSectionForRegen.text} (
                  {selectedSectionForRegen.level.toUpperCase()})
                </h2>
                <p className="result-text">
                  Genera o edita el cuerpo de texto para la sección
                  seleccionada.
                </p>

                {/* NUEVO: Límite de Palabras */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "10px",
                    gap: "10px",
                  }}
                >
                  <label htmlFor="word-limit" style={{ fontWeight: "bold" }}>
                    Límite de Palabras (100-1000):
                  </label>
                  <input
                    id="word-limit"
                    type="number"
                    min="100"
                    max="1000"
                    value={wordLimit}
                    onChange={(e) =>
                      setWordLimit(parseInt(e.target.value) || 100)
                    }
                    disabled={cargandoIA}
                    style={{
                      width: "80px",
                      padding: "5px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                </div>
                {/* FIN NUEVO: Límite de Palabras */}
                {/* INICIO: Seleccion de formato */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "10px",
                    gap: "10px",
                  }}
                >
                  <label htmlFor="content-type" style={{ fontWeight: "bold" }}>
                    Tipo de Formato:
                  </label>
                  <select
                    id="content-type"
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    disabled={cargandoIA}
                    style={{
                      padding: "5px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      flexGrow: 1,
                    }}
                  >
                    <option value="ia_libre">
                      IA Libre (Estructura Creativa)
                    </option>

                    {/* Opciones Específicas */}
                    <option value="parrafo_narrativo">
                      Párrafos / Texto Narrativo
                    </option>
                    <option value="lista_pasos">
                      Lista de Pasos (Guía o Tutorial)
                    </option>
                    <option value="lista_caracteristicas">
                      Lista de Características/Ventajas/Desventajas
                    </option>
                    <option value="resumen_conciso">
                      Resumen Ejecutivo o Conclusión
                    </option>
                    <option value="definicion_detallada">
                      Definición o Concepto Profundo
                    </option>
                    <option value="casos_texto">
                      Casos de Uso o Ejemplos Ilustrativos
                    </option>
                    <option value="comparacion_corta">
                      Comparación Corta / Alternativas
                    </option>
                    <option value="analisis_critico">
                      Análisis Crítico / Proyección
                    </option>
                    <option value="pro_y_contra">
                      Pros y Contras / Vista Balanceada
                    </option>
                    <option value="datos_estadisticos">
                      Datos, Estadísticas y Tendencias
                    </option>
                    <option value="mito_vs_realidad">
                      Mito vs. Realidad / Desmentir Errores
                    </option>
                    <option value="linea_tiempo">
                      Línea de Tiempo / Evolución Histórica
                    </option>
                  </select>
                </div>
                {/* FIN : Seleccion de formato */}

                <div
                  className="regen-input-area"
                  style={{ marginBottom: "10px" }}
                >
                  <textarea
                    className="auto-expand"
                    rows="10"
                    placeholder="Edita o genera aquí el contenido detallado de la sección..."
                    value={sectionContentValue}
                    onChange={(e) => setSectionContentValue(e.target.value)}
                    disabled={cargandoIA}
                  />
                </div>

                <div className="idea-buttons">
                  <button
                    onClick={guardarContenidoLocal}
                    className="btn-generate"
                    style={{ flexGrow: 1 }}
                    disabled={cargandoIA}
                  >
                    <i className="uil uil-save"></i> Guardar Contenido Local
                  </button>
                  <button
                    onClick={generarContenidoIA}
                    className="btn-generate btn-regenerar"
                    style={{ flexGrow: 1 }}
                    disabled={cargandoIA || !contenidoConsolidado}
                  >
                    {cargandoIA && (
                      <i
                        className="uil uil-spinner uil-spin"
                        style={{ marginRight: "5px" }}
                      ></i>
                    )}
                    {cargandoIA
                      ? "Generando Contenido..."
                      : "Generar Contenido (IA)"}
                  </button>
                </div>
                {/* NUEVO: Botón de Cancelar Edición de Contenido */}
                <button
                  onClick={cancelarEdicionContenido}
                  className="btn-generate btn-cancel"
                  style={{ marginTop: "10px", width: "100%", height: "45px" }}
                  disabled={cargandoIA}
                >
                  <i className="uil uil-times"></i> Cancelar Edición
                </button>
              </section>
            )}

            {/* ---------------------------------------------------- */}
            {/* --- RESULTADOS DE ANÁLISIS IA (Bloque Vacio) --- */}
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
            {/* BOTÓN REGENERAR ESTRUCTURA */}
            {(resultadosDisponibles || tablaEstructuraFinal) && (
              <div style={{ marginBottom: "15px" }}>
                <button
                  onClick={generarAnalisisIA}
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
                {/* INICIO: CONTENEDOR DE BOTONES DE AÑADIR */}
                <div
                  className="add-section-controls"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "15px",
                    marginBottom: "25px",
                  }}
                >
                  {/* Botón para Añadir H2 */}
                  <button onClick={agregarSeccionH2} className="btn-add-h2">
                    <i className="uil uil-plus-circle"></i> Agregar Sección H2
                  </button>

                  {/* Botón para Añadir H3 */}
                  <button
                    onClick={agregarSubseccionH3}
                    className="btn-add-h3"
                    disabled={!selectedSectionForRegen || !tablaEstructuraFinal}
                  >
                    <i className="uil uil-plus-circle"></i> Agregar Subsección
                    H3
                  </button>
                </div>
                {/* FIN: CONTENEDOR DE BOTONES DE AÑADIR */}
              </div>
              {/* Componente MenuContextual Eliminado */}

              {tablaEstructuraFinal ? (
                <StructureRenderer
                  structure={parseMarkdownStructure(tablaEstructuraFinal)}
                  onSelect={handleSectionSelect}
                  onAction={handleSectionAction} // <-- Llamada unificada para mover y eliminar
                  selectedSection={selectedSectionForRegen}
                />
              ) : (
                // Mantiene el placeholder

                <pre className="structure-pre terminal-content">
                  Esperando la generación del Análisis...
                </pre>
              )}
            </section>

            {/* Placeholder de la estructura principal para contexto */}
            <div className="main-content">
              <div className="container-fluid">
                {/* =======================================================================
              FINAL: SECCIÓN DE VISUALIZACIÓN Y EDICIÓN DEL BLOG CONSOLIDADO (NUEVA)
              ======================================================================= */}
                <section
                  className="final-blog-view-container"
                  style={{
                    margin: "20px 0",
                    padding: "10px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "8px",
                  }}
                >
                  <h2>Vista Final del Blog (Editable)</h2>
                  <p>
                    Selecciona cualquier parte del texto o título y **suelta el
                    mouse** para insertar un hipervínculo.
                  </p>

                  <div
                    ref={finalContentRef}
                    className="final-content-editor-area"
                    // CLAVE: Atributo para hacer el contenido editable
                    contentEditable={tablaEstructuraFinal ? "true" : "false"}
                    onMouseUp={handleContentMouseUp} // Detector de selección de texto
                    // Renderiza el contenido final usando la función creada
                    dangerouslySetInnerHTML={{
                      __html: tablaEstructuraFinal
                        ? renderFinalBlogHtml(
                            parseMarkdownStructure(tablaEstructuraFinal)
                          )
                        : "<p>Ejecuta el análisis IA para generar la estructura y el contenido.</p>",
                    }}
                    style={{
                      border: "1px solid #ddd",
                      padding: "20px",
                      borderRadius: "5px",
                      minHeight: "400px",
                      marginTop: "10px",
                      lineHeight: "1.6",
                      cursor: tablaEstructuraFinal ? "text" : "default",
                      opacity: tablaEstructuraFinal ? 1 : 0.9,
                      backgroundColor: tablaEstructuraFinal ? "#fff" : "#eee",
                      overflowY: "auto",
                      // Estilos para los elementos hijos dentro del contentEditable
                      WebkitUserModify: "read-write-plaintext-only", // Sugerencia para navegadores basados en WebKit
                    }}
                  />
                </section>
              </div>
            </div>

            {/* =======================================================================
          MODAL/INPUT PARA INSERCIÓN DE HIPERVÍNCULO (NUEVO)
          ======================================================================= */}
            {isLinkModalOpen && linkSelection && (
              <div
                style={{
                  position: "fixed",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  background: "white",
                  padding: "25px",
                  border: "1px solid #007bff",
                  boxShadow: "0 4px 20px rgba(0, 123, 255, 0.3)",
                  zIndex: 9999,
                  borderRadius: "8px",
                }}
                className="link-insert-modal"
              >
                <h4>🔗 Insertar Hipervínculo</h4>
                <p style={{ marginBottom: "15px", fontSize: "0.9em" }}>
                  Texto seleccionado:{" "}
                  <strong>
                    "{linkSelection.toString().substring(0, 30)}..."
                  </strong>
                </p>
                <input
                  type="url"
                  placeholder="URL (ej: https://ejemplo.com)"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    marginBottom: "15px",
                    boxSizing: "border-box",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                  }}
                >
                  <button
                    onClick={() => {
                      setIsLinkModalOpen(false);
                      setLinkUrl("");
                      setLinkSelection(null);
                    }}
                    style={{
                      background: "#f4f4f4",
                      color: "#333",
                      border: "1px solid #ccc",
                      padding: "8px 15px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={insertLink}
                    disabled={!linkUrl}
                    style={{
                      background: "#007bff",
                      color: "white",
                      border: "none",
                      padding: "8px 15px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Insertar Enlace
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default GeneracionBlog;
