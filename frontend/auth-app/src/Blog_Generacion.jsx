import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import "@iconscout/unicons/css/line.css";
import "./css/styles_generacion.css";
import apiService from "./services/apiService";

const GeneracionBlog = () => {
  // =======================================================================
  // 0. HOOKS PRINCIPALES Y DE NAVEGACIÓN (INICIO ABSOLUTO)
  // =======================================================================
  const { blogId } = useParams(); // Obtiene el ID de la ruta /blog/edit/:blogId
  const navigate = useNavigate(); // Hook para redireccionar si es necesario

  const authToken = useMemo(() => localStorage.getItem("token"), []);
  // =======================================================================
  // // 1. REFERENCIAS DE ELEMENTOS Y CONTROL (useRef)
  // // =======================================================================

  const referenciaUrls = useRef(null);
  const referenciaControladorAborto = useRef(null);
  // =======================================================================
  // // 2. ESTADOS DE DATOS PRINCIPALES Y RESULTADOS (useState)
  // // =======================================================================
  const [datosFinales, setDatosFinales] = useState(null); // <-- Fuente de verdad
  const [tablaEstructuraFinal, setTablaEstructuraFinal] = useState(null);
  const [contenidoConsolidado, setContenidoConsolidado] = useState(null);
  const [estimatedWordCount, setEstimatedWordCount] = useState(null);
  const [, setTotalGeneratedWords] = useState(0);
  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [isEditingStructure, setIsEditingStructure] = useState(true); // *** Nota: Aquí se declara formData si solo contiene los campos editables que SÍ se modificarán. // Si todos los campos de generación (title, categoria, keywords, etc.) son fijos, // este estado ya no tiene sentido para esos campos. Si lo necesitas para campos // *diferentes* (como la estructura o contenido), déjalo. Si no hay formulario de edición, // puedes eliminarlo. Dejaré la declaración comentada por si la requieres más adelante. // const [formData, setFormData] = useState({ ... campos editables ... }); // --- FEEDBACK PARA GUARDADO ---
  const [localBlogId, setLocalBlogId] = useState(null); // ID del proyecto (aquí se cargará el blogId de la BD)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // -----------------------------------------------------------------------
  // // ESTADOS AÑADIDOS PARA CARGA DE DATOS DESDE EL BACKEND
  // // -----------------------------------------------------------------------

  const [, setLoadingBlog] = useState(true); // Control de carga inicial
  const [, setFetchError] = useState(null); // Control de error de carga

  useEffect(() => {
    // Evita la ejecución si no hay un ID de blog
    if (!blogId) return;

    const loadBlogData = async () => {
      setLoadingBlog(true); // Inicia la carga
      setFetchError(null); // Limpia errores previos

      try {
        // 1. Llamar a la API con el ID
        const data = await apiService.getBlogById(blogId);

        if (data) {
          // 2. Guardar el objeto Blog de la BD en el estado principal
          setDatosFinales(data);
          if (data.estructura_blog_json) {
            setTablaEstructuraFinal(data.estructura_blog_json);
          }
          if (data.consolidated_content) {
            setContenidoConsolidado(data.consolidated_content);
          } // Opcional: setLocalBlogId
          setLocalBlogId(data.id);
        } else {
          setFetchError("No se pudieron cargar los datos del blog.");
        }
      } catch (error) {
        console.error("Error al cargar los datos del blog:", error);
        setFetchError("Hubo un error en la comunicación con la API.");
      } finally {
        // 4. Finaliza la carga
        setLoadingBlog(false);
      }
    };

    loadBlogData();
  }, [blogId, navigate]);
  // =======================================================================
  // // 3. CONSTANTES Y DATOS INICIALES
  // // =======================================================================
  // //--- URLs de la API del backend ---

  const URL_API_SCRAPING = "http://192.168.1.129:8000/scraping/stream";
  const URL_API_IA = "http://192.168.1.129:8000/ai/generate_structure";
  const URL_API_BASE_BLOGS = "http://192.168.1.129:8000/blogs/";
  const URL_API_IA_COMPLETO =
    "http://192.168.1.129:8000/ai/generate_full_content"; // ----------------------------------------------------------------------- // ESTADO DEL FORMULARIO INICIAL (ELIMINADO o MOVIDO) // ----------------------------------------------------------------------- // ELIMINAMOS la declaración de formData y initialParams si solo contenían los // parámetros fijos (title, categoria, keywords, etc.) que se cargan. // --- Título de la vista ---

  const mainTitle = datosFinales?.title || "Generación de Blog"; // <-- ¡Lee directo de datosFinales!
  // =======================================================================
  // 4. ESTADOS DE CARGA Y CONTROL DE FLUJO GLOBAL
  // =======================================================================
  const [cargandoScraping, setCargandoScraping] = useState(false);
  const [cargandoIA, setCargandoIA] = useState(false);
  const [error, setError] = useState(null);
  const [usarIA, setUsarIA] = useState(true);
  const [cancelacionSolicitada, setCancelacionSolicitada] = useState(false);
  const [toast, setToast] = useState(null);

  // =======================================================================
  // 5. ESTADOS DE INTERFAZ DE USUARIO (UI) Y OPCIONES DE CONTENIDO
  // =======================================================================
  const [cardVisibility, setCardVisibility] = useState({
    temasKeywords: true,
    estiloTono: true,
    contexto: true,
  });
  const [wordLimit, setWordLimit] = useState(300);
  const [contentType, setContentType] = useState("ia_libre");

  // =======================================================================
  // 6. ESTADOS PARA EL FLUJO MANUAL Y REGENERACIÓN POR SECCIÓN
  // =======================================================================
  const [selectedSectionForRegen, setSelectedSectionForRegen] = useState(null);
  const [regenTextareaValue, setRegenTextareaValue] = useState("");
  const [seccionRegenerando, setSeccionRegenerando] = useState(null);
  const [sectionContentValue, setSectionContentValue] = useState("");

  // =======================================================================
  // 7. FUNCIONES DE UTILIDAD Y LÓGICA DE DATOS
  //    (Toast, Markdown Parser/Writer, Toggle de UI)
  // =======================================================================

  //Muestra una notificación temporal.
  const showToast = (message, type = "info") => {
    setToast({ message, type });

    // Ocultar el toast después de 3 segundos
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // 2. Función para marcar que algo ha cambiado (activa el botón de guardar)
  const markAsChanged = useCallback(() => {
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  }, [hasUnsavedChanges]);

  // 3. Lógica principal de Guardado de la estructura (POST/PUT)

  const handleSaveProject = useCallback(async () => {
    if (isSaving || !localBlogId) {
      if (!localBlogId) {
        showToast(
          "No se puede guardar: el artículo no ha sido creado (falta ID).",
          "error"
        );
      }
      return;
    }

    if (!tablaEstructuraFinal) {
      showToast("No hay estructura que guardar.", "warning");
      return;
    }

    setIsSaving(true);
    const payload = {
      estructura_blog_json: tablaEstructuraFinal,
    };
    const URL_API_SAVE = `${URL_API_BASE_BLOGS}${localBlogId}`;

    try {
      const response = await fetch(URL_API_SAVE, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // ... (Lógica de manejo de error que genera errorMessage)
        const errorText = await response.text();
        let errorMessage = `Error ${response.status}: Falló la actualización del blog.`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage =
              errorJson.detail[0].msg || JSON.stringify(errorJson.detail);
          } else {
            errorMessage = JSON.stringify(errorJson);
          }
        } catch {}
        throw new Error(errorMessage);
      }

      showToast("Guardado exitoso. Estructura actualizada.", "success");
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error al guardar la estructura:", error);
      showToast(`Error de guardado: ${error.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  }, [
    localBlogId,
    tablaEstructuraFinal,
    isSaving,
    setHasUnsavedChanges,
    authToken,
    URL_API_BASE_BLOGS,
  ]);

  // Visibilidad de tarjetas en el front
  const toggleCardVisibility = (cardName) => {
    setCardVisibility((prev) => ({
      ...prev,
      [cardName]: !prev[cardName],
    }));
  };

  // Convierte la estructura de objeto anidada de vuelta a una cadena de Markdown
  const convertStructureToMarkdown = (structure) => {
    let markdownLines = [];
    let h2Counter = 0;

    structure.forEach((item) => {
      const isH1 = item.level === "h1";

      if (isH1) {
        // --- LÓGICA DE H1 --- (Título Principal/Introducción)
        const h1Line = `[H1 - ${item.enumeration}] ${item.text.trim()}`;
        markdownLines.push(h1Line);

        // AGREGAR BLOQUE DE CONTENIDO H1
        if (item.content && item.content.trim()) {
          markdownLines.push("\n[CONTENIDO]");
          markdownLines.push(item.content.trim());
          markdownLines.push(""); // Línea vacía para separación visual
        }
        return;
      }

      // --- 1. LÓGICA DE H2 (y sus H3s) ---
      // Si no es H1, lo contamos para la numeración 1, 2, 3...
      h2Counter++;
      const h2Enumeration = h2Counter.toString();
      const h2Line = `[H2 - ${h2Enumeration}] ${item.text.trim()}`;
      markdownLines.push(h2Line);

      // 1.1. Agregar Multimedia si existe en H2
      if (item.multimedia && item.multimediaDescription) {
        markdownLines.push(
          `[MULTIMEDIA: ${
            item.multimedia
          } | ${item.multimediaDescription.trim()}]`
        );
      }

      // 1.2. AGREGAR BLOQUE DE CONTENIDO H2
      if (item.content && item.content.trim()) {
        markdownLines.push("\n[CONTENIDO]");
        markdownLines.push(item.content.trim());
        markdownLines.push("");
      }

      // --- 2. LÓGICA DE H3 ---
      let h3Counter = 0;
      item.children.forEach((h3Item) => {
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
          markdownLines.push("");
        }
      });

      // 3. Separador final para bloques H2
      if (markdownLines[markdownLines.length - 1] !== "") {
        markdownLines.push("");
      }
    });

    return markdownLines.join("\n").trim();
  };

  //Funcion para el conteo de palabras por seccion de H
  const contarPalabras = (texto) => {
    if (!texto) return 0;

    // 1. Limpieza de marcadores de estructura:
    let textoLimpio = texto
      .replace(/\[H[2-4]\s*-\s*[0-9.]+\]\s*|\[MULTIMEDIA:.*\]/g, "")
      .replace(/(\*\*|__|\*|_)/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return textoLimpio.split(" ").filter((palabra) => palabra.length > 0)
      .length;
  };

  // Funcion para parsear el Markdown de estructura H2/H3 a un objeto anidado para renderizar
  const parseMarkdownStructure = (markdown) => {
    if (!markdown) return [];

    let finalStructureString = markdown;
    let jsonContentMap = null;

    try {
      const parsedJson = JSON.parse(markdown);
      if (parsedJson.full_structure_markdown) {
        finalStructureString = parsedJson.full_structure_markdown;
      } else if (
        typeof parsedJson === "object" &&
        !Array.isArray(parsedJson) &&
        Object.keys(parsedJson).length > 0
      ) {
        jsonContentMap = parsedJson;
      }
    } catch (e) {
      // Si falla, asumimos que es Markdown plano y continuamos.
    }
    if (jsonContentMap) {
      const contentLines = [];
      for (const [key, value] of Object.entries(jsonContentMap)) {
        // Solo procesamos si el valor del contenido no está vacío
        if (value && value.trim().length > 0) {
          // 1. La clave del JSON se convierte en el encabezado de estructura: [H3 - 2.1] El Poblado
          contentLines.push(key.trim());
          // 2. Insertamos la etiqueta de contenido que el parser espera: [CONTENIDO]
          contentLines.push("[CONTENIDO]");
          // 3. Insertamos el valor, reemplazando doble salto de línea (separador de párrafos en JSON) por un solo \n
          // para que el parser lo acumule correctamente línea por línea.
          contentLines.push(value.replace(/\n\n/g, "\n"));
        }
      }
      // Reemplazamos el string JSON original por la estructura reconstruida en Markdown
      finalStructureString = contentLines.join("\n");
    }
    const lines = finalStructureString.split("\n");
    const structure = [];
    let lastH2 = null;
    let itemActual = null;
    let isProcessingStructure = false;

    const structuredRegex = /^\[(H\d+)\s*-\s*([\d.]*)[\]>]\s*(.*)/i;
    const separateMediaRegex =
      /^\[MULTIMEDIA:\s*(VIDEO|FOTO|MAPA|GRAFICO)\s*\|\s*(.*?)\]\s*$/i;
    const contentStartRegex = /^(?:\[CONTENIDO\]\s*|CONTENIDO:\s*)(.*)$/i;

    let leyendoContenido = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (
        !isProcessingStructure &&
        (trimmedLine.toLowerCase().startsWith("http") || trimmedLine === "")
      ) {
        continue;
      }

      const matchStructured = trimmedLine.match(structuredRegex);
      const matchMedia = trimmedLine.match(separateMediaRegex);
      const matchContentStart = trimmedLine.match(contentStartRegex);

      if (matchStructured) {
        isProcessingStructure = true;
        leyendoContenido = false;

        const level = matchStructured[1].toLowerCase();
        const enumeration = matchStructured[2];
        const text = matchStructured[3].trim();

        const newItem = {
          level,
          enumeration,
          text,
          multimedia: null,
          multimediaDescription: null,
          content: null,
          children: [],
          uniqueId: `${level}-${enumeration}`,
        };

        // Lógica de inserción del H1, H2, H3
        if (level === "h1") {
          structure.push(newItem);
          lastH2 = null;
          itemActual = newItem;
        } else if (level === "h2") {
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
        leyendoContenido = false;
        itemActual.multimedia = matchMedia[1].toUpperCase();
        itemActual.multimediaDescription = matchMedia[2].trim();
      } else if (matchContentStart && itemActual) {
        leyendoContenido = true;
        const capturedContent = matchContentStart[1].trim();
        itemActual.content = capturedContent;
      } else if (leyendoContenido && itemActual) {
        itemActual.content += (itemActual.content ? "\n" : "") + line;
      }
    }

    // Limpieza de contenido
    structure.forEach((item) => {
      if (item.content) item.content = item.content.trim();
      item.children.forEach((child) => {
        if (child.content) child.content = child.content.trim();
      });
    });

    if (structure.length > 0) {
      let currentH2Index = 1;

      if (structure[0].level === "h1") {
        const h1 = structure[0];
        h1.enumeration = "";
        h1.uniqueId = `h1-title`;
      }

      for (let i = 0; i < structure.length; i++) {
        const item = structure[i];

        if (item.level === "h2") {
          const h2 = item;

          const newH2Enumeration = `${currentH2Index}`;

          h2.enumeration = newH2Enumeration;
          h2.uniqueId = `h2-${newH2Enumeration}`;

          if (h2.children && h2.children.length > 0) {
            let currentH3MinorIndex = 1;
            h2.children.forEach((h3) => {
              const newH3Enumeration = `${newH2Enumeration}.${currentH3MinorIndex}`;

              h3.enumeration = newH3Enumeration;
              h3.uniqueId = `h3-${newH3Enumeration}`;

              currentH3MinorIndex++;
            });
          }
          currentH2Index++;
        }
      }
    }

    return structure;
  };

  const recalcularPalabrasGeneradas = (estructura) => {
    let conteo = 0;
    estructura.forEach((h2) => {
      // Suma del título H2
      conteo += contarPalabras(h2.text);

      // Suma del contenido H2
      if (h2.content) conteo += contarPalabras(h2.content);

      h2.children.forEach((h3) => {
        // Suma del título H3
        conteo += contarPalabras(h3.text);

        // Suma del contenido H3
        if (h3.content) conteo += contarPalabras(h3.content);
      });
    });
    return conteo;
  };

  //Cuenta el total de h2 y h3 en la estructura
  const contarTotalSubsecciones = (estructura) => {
    let conteo = 0;
    estructura.forEach((item) => {
      if (item.level === "h1") {
        conteo++; // Contar el H1
      } else if (item.level === "h2") {
        conteo++; // Contar el H2
        conteo += item.children.length; // Sumar todos los H3s hijos
      }
    });
    return conteo;
  };

  const recalcularSubseccionesGeneradas = (estructura, contarPalabras) => {
    let conteo = 0;
    estructura.forEach((item) => {
      // Contar H1 si tiene contenido
      if (
        item.level === "h1" &&
        item.content &&
        contarPalabras(item.content) > 0
      ) {
        conteo++;
      } else if (item.level === "h2") {
        // Contar H2 si tiene contenido
        if (item.content && contarPalabras(item.content) > 0) conteo++;

        // Contar H3s si tienen contenido
        item.children.forEach((h3) => {
          if (h3.content && contarPalabras(h3.content) > 0) conteo++;
        });
      }
    });
    return conteo;
  };

  const renderBlogContent = (structure) => {
    if (!structure || structure.length === 0) {
      return (
        <div className="blog-view-placeholder">
          <p>Aún no hay estructura o contenido generado para mostrar.</p>
        </div>
      );
    }

    return (
      <div className="blog-document-window">
        {structure.map((item) => {
          // 1. MANEJO DEL H1 (Título y Contenido/Introducción)
          if (item.level === "h1") {
            return (
              <React.Fragment key={item.uniqueId || "h1-main"}>
                {/* TÍTULO H1: No tiene enumeración */}
                <h1 className="blog-title">{item.text}</h1>

                {/* CONTENIDO DEL H1 (INTRODUCCIÓN) */}
                {item.content && (
                  <div className="content-block intro-content">
                    {item.content
                      .split("\n")
                      .map((paragraph, index) =>
                        paragraph.trim() ? (
                          <p key={`h1-p-${index}`}>{paragraph}</p>
                        ) : null
                      )}
                  </div>
                )}
              </React.Fragment>
            );
          }

          // 2. MANEJO DE H2 (Sección Principal y sus hijos H3)
          const h2Item = item;

          return (
            <React.Fragment key={h2Item.uniqueId}>
              {/* H2 - Título de la Sección Principal */}
              <h2 className="section-h2">{h2Item.text}</h2>

              {/* Contenido del H2 (Cuerpo del H2) */}
              {h2Item.content && (
                <div className="content-block">
                  {h2Item.content
                    .split("\n")
                    .map((paragraph, index) =>
                      paragraph.trim() ? (
                        <p key={`h2-p-${h2Item.uniqueId}-${index}`}>
                          {paragraph}
                        </p>
                      ) : null
                    )}
                </div>
              )}

              {/* H3 - Subsecciones (Bucle anidado) */}
              {h2Item.children &&
                h2Item.children.map((h3Item) => (
                  <React.Fragment key={h3Item.uniqueId}>
                    {/* H3 - Título de la Subsección */}
                    <h3 className="subsection-h3">{h3Item.text}</h3>

                    {/* Contenido del H3 */}
                    {h3Item.content && (
                      <div className="content-block">
                        {h3Item.content
                          .split("\n")
                          .map((paragraph, index) =>
                            paragraph.trim() ? (
                              <p key={`h3-p-${h3Item.uniqueId}-${index}`}>
                                {paragraph}
                              </p>
                            ) : null
                          )}
                      </div>
                    )}
                  </React.Fragment>
                ))}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // =======================================================================
  // CÁLCULOS DE ESTRUCTURA Y CONTEO
  // =======================================================================

  // 2. Crear una NUEVA estructura inyectando 'wordCount'
  const structureWithCount = useMemo(() => {
    // 1. Convertir el string de la API (tablaEstructuraFinal) a la estructura Array/JSON
    const structureArray = parseMarkdownStructure(tablaEstructuraFinal);

    // Guard Clause: Si no hay estructura o el parsing falló, retorna un array vacío.
    if (!structureArray || structureArray.length === 0) {
      return [];
    }

    // 2. Aplicar la lógica de mapeo directamente al resultado del parsing
    // (Ahora 'structureArray' es el array que antes se llamaba 'structureToRender')
    return structureArray.map((item) => ({
      ...item,
      wordCount: contarPalabras(item.content || ""),
      children: item.children
        ? item.children.map((h3) => ({
            ...h3,
            wordCount: contarPalabras(h3.content || ""),
          }))
        : [],
    }));
  }, [tablaEstructuraFinal]);

  // 3. Usar tu función existente para calcular el total
  const totalWordsGenerated = recalcularPalabrasGeneradas(structureWithCount);

  const remainingWords = estimatedWordCount
    ? estimatedWordCount - totalWordsGenerated
    : 0;
  // ==============================================================================================================================================
  // 8. FUNCIONES DE MANEJO DE ESTRUCTURA Y EDICIÓN LOCAL
  //    (Selección, Guardar Título/Contenido, Mover, Eliminar, Agregar)
  // ==============================================================================================================================================

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
      showToast("ERROR CRÍTICO: Falló la sustitución..", "error");
    } else {
      setTablaEstructuraFinal(newStructureString);
      markAsChanged();
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
    const nuevoMarkdown = convertStructureToMarkdown(nuevaEstructura);

    // 3.1. Calcular el nuevo total de palabras de TODA la estructura con la función mejorada
    const nuevoTotalPalabras = recalcularPalabrasGeneradas(nuevaEstructura);

    // 3.2. ACTUALIZAR EL ESTADO GLOBAL DE PALABRAS GENERADAS
    setTotalGeneratedWords(nuevoTotalPalabras);

    // 3.3. Notificación de límite de palabras
    if (estimatedWordCount && estimatedWordCount > 0) {
      if (nuevoTotalPalabras > estimatedWordCount) {
        const exceso = nuevoTotalPalabras - estimatedWordCount;
        // Aviso de excedente de límite
        showToast(
          ` ADVERTENCIA: Has excedido la longitud estimada de ${estimatedWordCount.toLocaleString()} palabras por ${exceso.toLocaleString()}.`,
          "warning"
        );
      }
    }

    // 4. ACTUALIZAR EL ESTADO PRINCIPAL
    setTablaEstructuraFinal(nuevoMarkdown);
    markAsChanged();

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

  //  Cancelar Edición de Contenido
  const cancelarEdicionContenido = () => {
    // 1. Limpieza de UI
    setSelectedSectionForRegen(null);
    setSectionContentValue("");
    setRegenTextareaValue("");
    setTitleSuggestions([]);

    // 2. Notificación
    showToast("Edición de contenido cancelada.", "info");
  };

  // Mueve una sección (H2 con hijos o H3) dentro de la estructura anidada.
  const handleMoveSection = (sectionToMove, direction) => {
    const currentStructure = parseMarkdownStructure(tablaEstructuraFinal);
    let newStructure = [...currentStructure];

    const isH2 = sectionToMove.level === "h2";

    if (isH2) {
      // LÓGICA DE MOVIMIENTO DE H2 (Mueve toda la sección, incluyendo hijos)
      const currentIndex = newStructure.findIndex(
        (item) => item.uniqueId === sectionToMove.uniqueId
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
      const h3CurrentId = sectionToMove.uniqueId;

      const currentIndex = h3Children.findIndex(
        (item) => item.uniqueId === h3CurrentId
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
    markAsChanged();
  };

  //Maneja acciones de Mover y Eliminar, mostrando un toast de confirmación
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
      // 1. ELIMINAR H2: Simplemente filtramos el array principal para excluir el H2.
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
    markAsChanged();
    setSelectedSectionForRegen(null);
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
      enumeration: "0",
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
    markAsChanged();

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

    // 4. Encontrar el H2 padre en el array principal.
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
    markAsChanged();

    // Opcional: Deseleccionar la sección o seleccionar la nueva.
    // setSelectedSectionForRegen(newH3);

    showToast(
      "Subsección H3 agregada. Se ha re-enumerado la estructura.",
      "success"
    );
  };

  const cancelarGeneracionCompleta = () => {
    if (referenciaControladorAborto.current) {
      // La bandera cancelacionSolicitada ya existe y se usa en generarContenidoCompleto
      setCancelacionSolicitada(true);

      // Aborta la petición fetch actual si está en curso (dentro del bucle for)
      referenciaControladorAborto.current.abort();

      showToast(
        "Se ha solicitado la cancelación del proceso completo. Esperando que termine la solicitud actual...",
        "warning"
      );
      console.log("Solicitud de cancelación enviada.");
    }
  };

  const handleToggleView = () => {
    setIsEditingStructure((prev) => !prev);
  };

  // ==============================================================================================================================================
  // 9. FUNCIONES DE PROCESO PRINCIPAL (Scraping y Cancelación)
  // ==============================================================================================================================================

  // --- Función Principal de Scraping ---
  const ejecutarScraping = async () => {
    // 1. Resetear estados al iniciar
    setCargandoScraping(true);
    setError(null);
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
    const urls = lineasConsulta.slice(1); // 👈 URLs que queremos guardar
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
    const title_base = datosFinales?.title || consulta;
    const categoria = datosFinales?.categoria || "";
    const idioma = datosFinales?.idioma || "";
    const tecnica = datosFinales?.tecnica || "";
    const acento = datosFinales?.acento || "";
    const tono = datosFinales?.tono || "";

    // 🆕 2.5. Definir URL de guardado y GUARDAR LAS URLS INICIALES (PUT request, no bloqueante)
    const URL_API_SAVE = `${URL_API_BASE_BLOGS}${blogId}`;

    if (urls.length > 0) {
      fetch(URL_API_SAVE, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          scraped_urls: urls, // El array de URLs del input
        }),
      })
        .then((res) => {
          if (!res.ok)
            console.warn(
              `[SCRAPING] Aviso: Falló el guardado de URLs con estado ${res.status}`
            );
          else console.log("[SCRAPING] URLs iniciales guardadas en el blog.");
        })
        .catch((err) => console.error("[SCRAPING] Error al enviar URLs:", err));
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
                setDatosFinales((prevDatos) => ({ ...prevDatos, ...parsed }));

                finalDataReceived = true;
                const consolidatedContent = parsed.consolidated_content || null; // Extraer contenido

                // 🆕 GUARDADO DEL CONTENIDO CONSOLIDADO (No bloqueante)
                if (consolidatedContent) {
                  fetch(URL_API_SAVE, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                      consolidated_content: consolidatedContent,
                    }),
                  })
                    .then((res) => {
                      if (!res.ok)
                        console.warn(
                          `[SCRAPING] Aviso: Falló el guardado de Contenido Consolidado con estado ${res.status}`
                        );
                      else
                        showToast("Contenido consolidado guardado.", "success");
                    })
                    .catch((err) =>
                      console.error(
                        "[SCRAPING] Error al enviar Contenido:",
                        err
                      )
                    );
                }

                setContenidoConsolidado(consolidatedContent); // Actualizar estado local

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

  // ==============================================================================================================================================
  // 10. FUNCIONES DE ANÁLISIS Y REGENERACIÓN DE IA
  // ==============================================================================================================================================

  // ---Funcion para la regeneracion de titulos (maneja la selección de la burbuja) ---
  const handleSelectNewTitle = async (newTitle) => {
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

    markAsChanged();
    console.log(`Título reemplazado por: ${newTitle}`);
  };

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
    const title_base = datosFinales?.title || consulta;
    const categoria = datosFinales?.categoria || "";
    const idioma = datosFinales?.idioma || "";
    const tecnica = datosFinales?.tecnica || "";
    const acento = datosFinales?.acento || "";
    const tono = datosFinales?.tono || "";

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

      const wordCount = final_structure_json?.estimated_word_count;
      if (wordCount) {
        // Aseguramos que sea un número entero
        setEstimatedWordCount(parseInt(wordCount, 10));
      } else {
        setEstimatedWordCount(null);
      }

      markAsChanged();
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
      setWordLimit(finalWordLimit);

      showToast(`Límite de palabras ajustado a ${finalWordLimit}.`, "warning");
    }

    setCargandoIA(true);
    setError(null);

    const levelDisplay = selectedSectionForRegen.level.toUpperCase();
    showToast(
      `Solicitando contenido para el ${levelDisplay} con límite de ${finalWordLimit} palabras...`,
      "info"
    );

    // --- GENERACIÓN DE CONTEXTO (Anti-Canibalismo) ---
    let contextData = "";
    const sectionId = selectedSectionForRegen.uniqueId; // ID de la sección objetivo
    const targetSection = selectedSectionForRegen; // Objeto de la sección objetivo

    // 1. Construir el contexto basado en el nivel (H2 vs H3)
    if (targetSection && sectionId) {
      const level = targetSection.level.toLowerCase();
      contextData = `Contexto del Articulo (NO REPITA O REDUNDE en las ideas listadas):`;

      if (level === "h2") {
        contextData += `\n--- Temas ya cubiertos (H2s hermanos): ---\n`;
        structureWithCount
          .filter((item) => item.level.toLowerCase() === "h2")
          .forEach((h2) => {
            // Usamos structureWithCount que tiene la estructura viva
            if (h2.uniqueId !== sectionId) {
              contextData += `- Título: "${h2.text}"`;
              if (h2.content) contextData += ` (Contenido ya generado)`;
              contextData += "\n";
            }
          });
      } else if (level === "h3") {
        const parentH2 = structureWithCount.find(
          (s) => s.children && s.children.some((c) => c.uniqueId === sectionId)
        );

        if (parentH2) {
          contextData += `\n--- Contexto de la sección principal (H2 Padre): ---\n`;
          contextData += `H2 Principal: "${parentH2.text}"`;
          if (parentH2.content)
            contextData += ` (Contenido del H2: ${parentH2.content.substring(
              0,
              50
            )}...)`;

          contextData += `\n--- Subtemas cubiertos (H3s hermanos): ---\n`;
          parentH2.children.forEach((h3) => {
            if (h3.uniqueId !== sectionId) {
              contextData += `- Subtítulo: "${h3.text}"`;
              if (h3.content) contextData += ` (Contenido ya generado)`;
              contextData += "\n";
            }
          });
        }
      }
    }

    // 2. Filtrar contexto vacío (solo enviar si es significativo)
    const finalContextData = contextData.length > 50 ? contextData : "";

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
        full_structure_markdown: tablaEstructuraFinal, // Esto ya incluye el H1 en el string
        word_limit: finalWordLimit,
        content_type: contentType,
        context_data: finalContextData,
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
        const nuevoMarkdown = convertStructureToMarkdown(nuevaEstructura);

        // 3.4. ACTUALIZAR EL ESTADO (¡Esto actualiza la vista del blog!)
        setTablaEstructuraFinal(nuevoMarkdown);

        // 3.5. Mostrar el contenido en el editor para revisión
        setSectionContentValue(nuevoContenido);

        showToast("Contenido generado por IA y aplicado al editor.", "success");
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

  // Generación Única con Historial
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
      idioma: datosFinales?.idioma || "",
      acento: datosFinales?.acento || "",
      tono: datosFinales?.tono || "",
      tecnica: datosFinales?.tecnica || "",
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

  const generarContenidoCompleto = async () => {
    // 1. Validaciones iniciales
    if (
      !tablaEstructuraFinal ||
      cargandoIA ||
      !contenidoConsolidado ||
      !datosFinales ||
      !estimatedWordCount
    ) {
      showToast("Error: Realice Analisis primero.", "error");
      return;
    }

    setCargandoIA(true);
    setCancelacionSolicitada(false);

    const controller = new AbortController();
    referenciaControladorAborto.current = controller;
    showToast(
      "Iniciando la generación de contenido COMPLETO, BLOQUE por BLOQUE...",
      "info"
    );

    // --- LÓGICA DE PRESUPUESTO DINÁMICO: INICIALIZACIÓN ---
    let estructuraAnidada = parseMarkdownStructure(tablaEstructuraFinal);
    let estructuraTemporal = estructuraAnidada;
    let generatedContentHistory = [];

    // 1. Variables Globales y Contadores Iniciales
    const palabrasObjetivo = estimatedWordCount;
    const totalSubsecciones = contarTotalSubsecciones(estructuraAnidada);

    let palabrasAcumuladas = recalcularPalabrasGeneradas(estructuraAnidada);
    let subseccionesGeneradas = recalcularSubseccionesGeneradas(
      estructuraAnidada,
      contarPalabras
    );
    // --- FIN INICIALIZACIÓN DE PRESUPUESTO ---

    // 3. Procesar CADA BLOQUE H2 secuencialmente
    for (const h2Block of estructuraAnidada) {
      if (cancelacionSolicitada) {
        break;
      }

      // Saltamos bloques ya generados
      const estaGenerado =
        h2Block.content && h2Block.children.every((h3) => h3.content);
      if (estaGenerado && contarPalabras(h2Block.content) > 0) {
        continue;
      }

      setSelectedSectionForRegen(h2Block);

      const blockTitle = h2Block.enumeration + ". " + h2Block.text;
      showToast(`Generando contenido para BLOQUE: ${blockTitle}`, "info", 4000);

      // Markdown para el H2 y sus H3 (sección a generar)
      const blockMarkdownToGenerate = [
        `## ${h2Block.enumeration}. ${h2Block.text}`,
        ...h2Block.children.map((h3) => `### ${h3.enumeration}. ${h3.text}`),
      ].join("\n");

      // Obtenemos el Markdown completo actualizado para el historial
      const fullStructureMarkdown =
        convertStructureToMarkdown(estructuraTemporal);

      // --- CÁLCULO DINÁMICO DEL PRESUPUESTO DEL BLOQUE ---

      let subseccionesEnBloqueActual = 0;
      if (!h2Block.content || contarPalabras(h2Block.content) === 0) {
        subseccionesEnBloqueActual = 1;
      }
      h2Block.children.forEach((h3) => {
        if (!h3.content || contarPalabras(h3.content) === 0) {
          subseccionesEnBloqueActual++;
        }
      });

      // Este es el valor clave para la fórmula de distribución de presupuesto
      const subseccionesPendientes = Math.max(
        1,
        totalSubsecciones - subseccionesGeneradas
      );

      // FÓRMULA: (Palabras Restantes / Subsecciones Pendientes) * Subsecciones en Bloque Actual
      const limitePalabrasBloqueCalculado = Math.ceil(
        ((palabrasObjetivo - palabrasAcumuladas) / subseccionesPendientes) *
          subseccionesEnBloqueActual
      );

      const limiteFinal = Math.max(100, limitePalabrasBloqueCalculado);

      // --- CONSTRUCCIÓN DEL PAYLOAD ---
      const payload = {
        query: datosFinales.query,
        consolidated_content: contenidoConsolidado,
        idioma: datosFinales.idioma,
        acento: datosFinales.acento,
        tono: datosFinales.tono,
        section_type: "full_block_generation",
        keywords: datosFinales.keywords || [],
        previous_content: generatedContentHistory,

        // CAMPOS DE PRESUPUESTO DINÁMICO enviados al backend
        palabras_acumuladas: palabrasAcumuladas,
        subsecciones_pendientes: subseccionesPendientes,
        limite_palabras_bloque: limiteFinal,

        regenerate_data: {
          section_title: blockTitle,
          section_level: "h2_block",
          section_text: blockMarkdownToGenerate,
          full_structure_markdown: fullStructureMarkdown,
          estimated_word_count: palabrasObjetivo || 0,
        },
      };

      try {
        const response = await fetch(URL_API_IA_COMPLETO, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        // Lógica de manejo de errores HTTP
        if (!response.ok) {
          let errorMessage = `Error HTTP ${response.status} (${response.statusText})`;
          try {
            const errorData = await response.json();
            if (errorData.detail) {
              errorMessage = JSON.stringify(errorData.detail);
            } else if (errorData.error) {
              errorMessage = errorData.error;
            } else {
              errorMessage = JSON.stringify(errorData);
            }
          } catch (jsonError) {
            const responseBody = await response.text();
            errorMessage = responseBody || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();

        if (result.success !== "True" || !result.generated_content) {
          throw new Error(
            `Respuesta de IA fallida o incompleta. Log: ${result.log || "N/A"}`
          );
        }

        // APLICACIÓN Y RENDERIZADO DEL CONTENIDO
        const rawContent =
          typeof result.generated_content === "string"
            ? result.generated_content
            : String(result.generated_content || "");

        let generatedContentMap;
        try {
          generatedContentMap = JSON.parse(rawContent.trim());
        } catch (e) {
          const cleanContent = rawContent.replace(/```json\s*|```/g, "").trim();
          generatedContentMap = JSON.parse(cleanContent);
        }

        //Mutar la estructura temporal con el contenido
        estructuraTemporal = estructuraTemporal.map((h2Padre) => {
          if (h2Padre.enumeration !== h2Block.enumeration) {
            return h2Padre;
          }

          let h2Actualizado = { ...h2Padre };

          // Actualizar el H2 principal
          const h2Key = `${h2Padre.enumeration}. ${h2Padre.text}`;
          if (generatedContentMap[h2Key]) {
            h2Actualizado.content = generatedContentMap[h2Key];
            generatedContentHistory.push(generatedContentMap[h2Key]);
          }

          // Actualizar todos sus H3
          h2Actualizado.children = h2Actualizado.children.map((h3) => {
            const h3Key = `${h3.enumeration}. ${h3.text}`;
            if (generatedContentMap[h3Key]) {
              generatedContentHistory.push(generatedContentMap[h3Key]);
              return { ...h3, content: generatedContentMap[h3Key] };
            }
            return h3;
          });

          return h2Actualizado;
        });

        // Actualizacion del estado completo
        const nuevoMarkdown = convertStructureToMarkdown(estructuraTemporal);
        setTablaEstructuraFinal(nuevoMarkdown);

        // --- ACTUALIZACIÓN DE CONTADORES PARA LA SIGUIENTE ITERACIÓN ---
        // Recalculamos el total con la nueva estructura
        palabrasAcumuladas = recalcularPalabrasGeneradas(estructuraTemporal);
        subseccionesGeneradas = recalcularSubseccionesGeneradas(
          estructuraTemporal,
          contarPalabras
        );

        // --- FIN ACTUALIZACIÓN DE CONTADORES ---

        showToast(
          `BLOQUE ${blockTitle} generado y aplicado completamente.`,
          "success"
        );
      } catch (error) {
        if (error.name === "AbortError") {
          console.log("Generación cancelada por el usuario.");
          break;
        }

        const errorMsg =
          error.message || "Error de red o conexión desconocido.";
        console.error(
          `Error al generar contenido para el BLOQUE ${blockTitle}:`,
          error
        );
        setError(`Error al generar contenido: ${errorMsg}`);
        showToast(`Error al solicitar contenido a la IA: ${errorMsg}`, "error");
        break;
      }
    }

    if (!cancelacionSolicitada) {
      referenciaControladorAborto.current = null;
    }
    setCargandoIA(false);
    setSelectedSectionForRegen(null);
    showToast(" Proceso de generación completa finalizado.", "info");
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
        {structure.map((item) => {
          const isH1 = item.level === "h1"; // Identificador para H1
          const isH2 = item.level === "h2";

          //  Si es H1, lo renderizamos de forma simplificada y sin anidación.
          if (isH1) {
            return (
              <li
                key={item.uniqueId || item.enumeration}
                className={`
                  structure-item structure-item-h1 // Clase específica para el H1
                  ${
                    selectedSection?.uniqueId === item.uniqueId
                      ? "structure-item-selected"
                      : ""
                  }
                `}
                title="H1 (Título Principal). Haga click para editar."
              >
                <div className="structure-content-wrapper">
                  {/* Área que maneja la selección al hacer click en el texto */}
                  <div
                    className="structure-text-area"
                    onClick={(e) => onSelect(item, e)}
                    style={{ flexGrow: 1, cursor: "pointer" }}
                  >
                    {/* 1. Ícono para H1 */}
                    <span className="structure-icon-wrapper">
                      <i className="uil uil-heading structure-icon-h1"></i>{" "}
                      {/* Icono distintivo para H1 */}
                    </span>
                    {/* 2. Enumeración y Texto del encabezado */}
                    <span
                      style={{
                        fontWeight: "bolder",
                        marginRight: "8px",
                        fontSize: "1.1em",
                      }}
                    >
                      {item.enumeration}
                    </span>
                    {item.text}
                    {/* Contador de palabras por sección (Si el H1 tiene contenido) */}
                    {item.wordCount !== null && item.wordCount > 0 && (
                      <span
                        className="section-word-count"
                        style={{
                          marginLeft: "8px",
                          color: "#6c757d",
                          fontWeight: "normal",
                          fontStyle: "italic",
                        }}
                      >
                        ({item.wordCount} palabras)
                      </span>
                    )}
                  </div>

                  {/* os botones de acción se OMITEN aquí para el H1 */}
                  <div className="structure-buttons-group">
                    {/* Opcional: Se pueden poner botones de solo info, pero NO de mover/eliminar */}
                  </div>
                </div>
                {/* Omitimos recursividad y previsualización de contenido/multimedia dentro del H1 por ser el título */}
              </li>
            );
          }

          // Lógica para H2 y H3 (Continúa el flujo normal)

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
                  {/* Contador de palabras por sección */}
                  {item.wordCount !== null && item.wordCount > 0 && (
                    <span
                      className="section-word-count"
                      style={{
                        marginLeft: "8px",
                        color: "#6c757d",
                        fontWeight: "normal",
                        fontStyle: "italic",
                      }}
                    >
                      ({item.wordCount} palabras)
                    </span>
                  )}
                </div>

                {/* GRUPO DE BOTONES DE ACCIÓN (Mover/Eliminar) - SOLO PARA H2/H3 */}
                <div className="structure-buttons-group">
                  {/* Mover Arriba */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction("move", item, "UP");
                    }}
                    className="btn-move-up"
                    title="Mover Arriba"
                  >
                    <i className="uil uil-arrow-up"></i>
                  </button>
                  {/* Mover Abajo */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction("move", item, "DOWN");
                    }}
                    className="btn-move-down"
                    title="Mover Abajo"
                  >
                    <i className="uil uil-arrow-down"></i>
                  </button>
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

              {/* Bloque de previsualización del CONTENIDO */}
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

              {/* RECURSIVIDAD para H3s ANIDADA dentro del <li> de H2. */}
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
  // 6. ToastNotification
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
          <a href="/dashboard_blog" className="btn-generate-image">
            Volver al Dashboard
          </a>
          <h1>Generación de Blog</h1>

          {/* --- BOTÓN DE GUARDAR ESTRUCTURA --- */}
          <button
            className={`btn-download ${
              hasUnsavedChanges ? "btn-active-save" : ""
            }`}
            onClick={handleSaveProject} // Llama a la función con el useCallback
            // Deshabilitado si: no hay ID O no hay estructura (objeto/null) O está guardando O no hay cambios pendientes
            disabled={
              !localBlogId ||
              !tablaEstructuraFinal ||
              isSaving ||
              !hasUnsavedChanges
            }
            title={
              !localBlogId
                ? "Cree primero el artículo base para poder guardar la estructura."
                : !tablaEstructuraFinal
                ? "Genere la estructura antes de guardar."
                : "Guardar la estructura actual del blog."
            }
          >
            {isSaving ? (
              <>
                <i className="uil uil-spinner uil-spin"></i> Guardando...
              </>
            ) : (
              <>
                <i className="uil uil-save"></i> Guardar Estructura
              </>
            )}
          </button>
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

        <section className="config-panel-unified analysis-result info-card">
          <h2
            className="analysis-title"
            style={{
              borderBottomColor: "#1A2E44", // Color corporativo oscuro
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            onClick={() => toggleCardVisibility("preconfiguracionUnificada")} // Usar una clave única
          >
            <div>
              <i className="uil uil-setting"></i> Preconfiguraciones
            </div>
            <i
              className={`uil ${
                cardVisibility.preconfiguracionUnificada
                  ? "uil-angle-up"
                  : "uil-angle-down"
              }`}
            ></i>
          </h2>

          {cardVisibility.preconfiguracionUnificada && (
            <div className="analysis-detail config-unified-content">
              {/* GRUPO 1: Título y Keywords (Items que ocupan todo el ancho) */}
              <div className="config-group config-group-wide">
                {/* Título Base: Etiqueta y valor en una misma fila en escritorio */}
                <div className="config-item-row">
                  <span className="analysis-title config-label">
                    <i className="uil uil-tag-alt"></i> Título Base:
                  </span>
                  <p className="main-title-output config-value config-value-break">
                    {datosFinales?.title || "N/A"}
                  </p>
                </div>

                {/* Keywords: Etiqueta y chips en una misma fila en escritorio */}
                <div className="config-item-row">
                  <span className="analysis-title config-label">
                    <i className="uil uil-key-skeleton"></i> Keywords
                    Secundarias:
                  </span>
                  <div className="keywords-tags config-value config-chips-container">
                    {(datosFinales?.keywords || "")
                      .split(",")
                      .map((keyword, index) =>
                        keyword.trim() ? (
                          <span key={index} className="keyword-chip">
                            {keyword.trim()}
                          </span>
                        ) : null
                      )}
                    {!datosFinales?.keywords && (
                      <span className="data-chip missing">N/A</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contenedor Flex/Grid para Grupos 2 y 3: Estilo/Tono y Contexto (Lado a lado en escritorio) */}
              <div className="config-group-columns-container">
                {/* GRUPO 2: Estilo y Tono */}
                <div className="config-group config-group-column-item">
                  <span className="analysis-title">
                    <i className="uil uil-palette"></i> Estilo y Tono:
                  </span>
                  <div className="data-chip-container config-chips-container">
                    <span className="data-chip primary">
                      Tono: <strong>{datosFinales?.tono || "N/A"}</strong>
                    </span>
                    <span className="data-chip secondary">
                      Acento: <strong>{datosFinales?.acento || "N/A"}</strong>
                    </span>
                    <span className="data-chip tertiary">
                      Técnica: <strong>{datosFinales?.tecnica || "N/A"}</strong>
                    </span>
                  </div>
                </div>

                {/* GRUPO 3: Metadatos/Contexto */}
                <div className="config-group config-group-column-item">
                  <span className="analysis-title">
                    <i className="uil uil-globe"></i> Contexto:
                  </span>
                  <div className="data-chip-container config-chips-container">
                    <span className="data-chip context-lang">
                      Idioma: <strong>{datosFinales?.idioma || "N/A"}</strong>
                    </span>
                    <span className="data-chip context-project">
                      Proyecto:{" "}
                      <strong>{datosFinales?.categoria || "N/A"}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Contenedores Principales (Izquierda y Derecha) */}
        <div className="generadores-container">
          {/* ========================================================= */}
          {/* COLUMNA IZQUIERDA: Edición de Título, Análisis IA  */}
          {/* ========================================================= */}
          <div className="generadores-izquierda">
            {/* ---------------------------------------------------- */}
            {/* --- BOTÓN DE ANÁLISIS IA MANUAL  --- */}
            {/* ---------------------------------------------------- */}
            {contenidoDisponible && !tablaEstructuraFinal && (
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

                  {/* 3. Botones de Acción */}
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
                    className="btn-regenerar"
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
                {/*Botón de Cancelar Edición de Contenido */}
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
          {/*  COLUMNA DERECHA: PREVISUALIZACIÓN DE ESTRUCTURA FINAL */}
          {/* ========================================================= */}
          <div className="generadores-derecha">
            {/* BOTÓN REGENERAR ESTRUCTURA */}
            {(resultadosDisponibles || tablaEstructuraFinal) && (
              <div
                style={{
                  marginBottom: "15px",
                  display: "flex",
                  gap: "10px", // Espacio entre los botones
                }}
              >
                {/* BOTÓN DE CANCELAR (Visible solo mientras cargandoIA es TRUE) */}
                {cargandoIA ? (
                  <button
                    onClick={cancelarGeneracionCompleta}
                    className="btn-regenerar"
                  >
                    <i className="uil uil-times-circle"></i> Cancelar Generación
                  </button>
                ) : (
                  <>
                    {/* 1. Volver a Generar Estructura (IA) */}
                    <button
                      onClick={generarAnalisisIA}
                      className="btn-estructura"
                      disabled={!datosFinales}
                    >
                      Volver a Generar Estructura (IA)
                    </button>

                    {/* 2. Generar Contenido COMPLETO */}
                    <button
                      onClick={generarContenidoCompleto}
                      className="btn-contenido"
                      disabled={!tablaEstructuraFinal}
                    >
                      Generar Contenido COMPLETO
                    </button>
                  </>
                )}
              </div>
            )}
            <section className="idea-generator">
              {/* ========================================================= */}
              {/*  SECCIÓN DE TÍTULO Y BOTÓN DE ALTERNANCIA */}
              {/* ========================================================= */}
              <h2 className="card-title structure-title-with-toggle">
                {/* Título Dinámico */}
                {isEditingStructure ? (
                  <>
                    <i className="uil uil-sitemap"></i> Estructura del Blog
                  </>
                ) : (
                  <>
                    <i className="uil uil-file-alt"></i> Vista de Documento
                  </>
                )}

                {/* Botón de Alternancia */}
                <button
                  className="toggle-view-button"
                  onClick={handleToggleView}
                  title={
                    isEditingStructure
                      ? "Ver como Documento"
                      : "Volver a la Estructura Editable"
                  }
                >
                  <i
                    className={`uil ${
                      isEditingStructure ? "uil-eye" : "uil-sitemap"
                    }`}
                  ></i>
                </button>
              </h2>

              {/* Mover la tarjeta con el body/contenido DENTRO de la lógica condicional */}
              {isEditingStructure ? (
                <div className="card-body">
                  {/* Título Principal del Blog (H1) */}
                  <h1
                    className="text-center"
                    style={{ marginBottom: "25px", fontSize: "2rem" }}
                  >
                    {mainTitle}
                  </h1>

                  {/* CONTENEDOR DE BOTONES DE AÑADIR (H2/H3) */}
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
                    <button
                      onClick={agregarSeccionH2}
                      className="btn-add-h2"
                      disabled={!tablaEstructuraFinal}
                    >
                      <i className="uil uil-plus-circle"></i> Agregar Sección H2
                    </button>

                    {/* Botón para Añadir H3 */}
                    <button
                      onClick={agregarSubseccionH3}
                      className="btn-add-h3"
                      disabled={
                        !selectedSectionForRegen || !tablaEstructuraFinal
                      }
                    >
                      <i className="uil uil-plus-circle"></i> Agregar Subsección
                      H3
                    </button>
                  </div>

                  {/* INDICADORES DE PALABRAS */}
                  {estimatedWordCount && (
                    <span className="info-badge">
                      <i className="uil uil-ruler-combined"></i> Longitud
                      Estimada:{" "}
                      <strong>{estimatedWordCount.toLocaleString()}</strong>{" "}
                    </span>
                  )}

                  {totalWordsGenerated > 0 && (
                    <span className="count-badge generated">
                      <i className="uil uil-pen"></i>Generadas:
                      <strong>
                        {totalWordsGenerated.toLocaleString()}
                      </strong>{" "}
                    </span>
                  )}

                  {/* Indicador de Palabras Restantes */}
                  {estimatedWordCount && (
                    <span
                      className={`count-badge remaining ${
                        remainingWords < 0 ? "exceeded" : ""
                      }`}
                    >
                      <i className="uil uil-process"></i>Restante:
                      <strong>{remainingWords.toLocaleString()}</strong>{" "}
                    </span>
                  )}

                  {/* RENDERIZADO DE LA ESTRUCTURA EDITABLE */}
                  {tablaEstructuraFinal ? (
                    <StructureRenderer
                      structure={structureWithCount}
                      onSelect={handleSectionSelect}
                      onAction={handleSectionAction}
                      selectedSection={selectedSectionForRegen}
                    />
                  ) : (
                    // Placeholder
                    <pre className="structure-pre terminal-content">
                      Esperando la generación del Análisis...
                    </pre>
                  )}
                </div>
              ) : (
                // VISTA TIPO WORD
                <div className="blog-view-toggle-container">
                  {/* Contenido principal del blog: Renderiza la estructura dinámica */}
                  {renderBlogContent(structureWithCount)}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default GeneracionBlog;
