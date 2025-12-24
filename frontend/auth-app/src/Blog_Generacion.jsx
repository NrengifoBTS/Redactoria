import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import "@iconscout/unicons/css/line.css";
import apiService from "./services/apiService";
import "./css/blog_Generacion.css";

// Importaciones para el editor de texto enriquecido
import ReactDOM from "react-dom";
import ReactQuill, { Quill } from "react-quill-new"; // Importamos desde la nueva librería
import "react-quill-new/dist/quill.snow.css"; // Los estilos también cambian de ruta

// --- PARCHE DE COMPATIBILIDAD REACT 19 ---
if (typeof window !== "undefined" && !ReactDOM.findDOMNode) {
  ReactDOM.findDOMNode = (instance) => {
    if (instance instanceof HTMLElement) return instance;
    return null;
  };
}

// Configuración de fuentes
const Font = Quill.import("formats/font");
Font.whitelist = ["sans-serif", "serif", "monospace"];
Quill.register(Font, true);

// Añade esta pequeña función arriba en tu componente
const stripHtml = (html) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const GeneracionBlog = () => {
  // =======================================================================
  // 0. HOOKS PRINCIPALES Y DE NAVEGACIÓN (INICIO ABSOLUTO)
  // =======================================================================
  const { blogId } = useParams(); // Obtiene el ID de la ruta /blog/edit/:blogId
  const navigate = useNavigate(); // Hook para redireccionar si es necesario

  const authToken = useMemo(() => localStorage.getItem("token"), []);
  // =======================================================================
  // 1. REFERENCIAS DE ELEMENTOS Y CONTROL (useRef)
  // =======================================================================
  const referenciaUrls = useRef(null);
  const referenciaControladorAborto = useRef(null);
  // =======================================================================
  // // 2. ESTADOS DE DATOS PRINCIPALES Y RESULTADOS (useState)
  // // =======================================================================
  const [datosFinales, setDatosFinales] = useState(null);
  const [tablaEstructuraFinal, setTablaEstructuraFinal] = useState("");
  const [contenidoConsolidado, setContenidoConsolidado] = useState(null);
  const [estimatedWordCount, setEstimatedWordCount] = useState(null);
  const [, setTotalGeneratedWords] = useState(0);
  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [isEditingStructure, setIsEditingStructure] = useState(true);
  const [localBlogId, setLocalBlogId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [blogStatus, setBlogStatus] = useState("");
  const [blogPriority, setBlogPriority] = useState("");
  const [tempContentUpdate, setTempContentUpdate] = useState(null);

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

          if (data.estimated_word_count) {
            setEstimatedWordCount(data.estimated_word_count);
          }
          if (data.estructura_blog_json) {
            setTablaEstructuraFinal(data.estructura_blog_json);
          }
          if (data.consolidated_content) {
            setContenidoConsolidado(data.consolidated_content);
          }
          if (data.estado) {
            setBlogStatus(data.estado);
          }
          if (data.prioridad) {
            setBlogPriority(data.prioridad);
          }
          if (data.urls && referenciaUrls.current) {
            referenciaUrls.current.value = data.urls;
          }
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
  const URL_CONTENIDO_SECCION = "http://192.168.1.129:8000/ai/generate_content";
  const URL_API_IA = "http://192.168.1.129:8000/ai/generate_structure";
  const URL_API_BASE_BLOGS = "http://192.168.1.129:8000/blogs/";
  const URL_API_IA_COMPLETO =
    "http://192.168.1.129:8000/ai/generate_full_content";

  const URL_API_IA_DOWNLOAD = "http://192.168.1.129:8000/ai/download_blog_doc";

  const URL_API_IA_REGEN = "http://192.168.1.129:8000/ai/regenerate_titles";

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
    setIsSaving(true);

    const payload = {
      estructura_blog_json: tablaEstructuraFinal,
      estado: blogStatus,
      prioridad: blogPriority,
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
        // ... (Lógica de manejo de error existente)
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

      // Mensaje de éxito más genérico para incluir la actualización de estado/prioridad
      showToast("Guardado exitoso. Blog actualizado.", "success");
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
    blogStatus,
    blogPriority,
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

  const handleDownloadDocx = async () => {
    // 1. Validaciones Iniciales
    const structureToDownload = structureWithCount;
    console.log("Estructura para descargar:", structureToDownload);

    if (!structureToDownload || structureToDownload.length === 0) {
      alert(
        "La estructura del blog está vacía. No se puede descargar el Word."
      );
      return;
    }

    const downloadUrl = `${URL_API_IA_DOWNLOAD}/${blogId}`;

    try {
      // 2. Petición POST al Backend
      const response = await fetch(downloadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          structure_data: structureToDownload,
          title: datosFinales?.title || "Documento del Blog",
        }),
      });

      console.log(
        "Iniciando descarga del documento Word...",
        datosFinales?.title
      );

      // 3. Manejo de Errores HTTP y de Contenido
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error del Servidor:", response.status, errorText);
        alert(
          `Fallo al descargar (Error HTTP ${response.status}). Revisa el console log y los logs de FastAPI.`
        );
        return;
      }

      const contentType = response.headers.get("Content-Type");
      const isDocx = contentType?.includes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );

      if (!isDocx) {
        const responseText = await response.text();
        console.error(
          "Error de Contenido:",
          "El servidor devolvió un contenido inesperado, no un DOCX.",
          responseText.substring(0, 200) + "..."
        );
        alert("El servidor no envió un archivo Word válido.");
        return;
      }

      // 4. Procesamiento, Creación del Nombre de Archivo y Descarga

      const now = new Date();

      const dateString = now
        .toLocaleDateString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .replace(/\//g, "-");

      // Sufijo de Solo Fecha: Ahora solo incluye el guión bajo y la fecha
      const dateSuffix = `_${dateString}`;

      // ** B. Construir Nombre de Archivo **
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");

      // Nombre de archivo por defecto
      let fileName = `${
        datosFinales?.title || "Documento del Blog"
      }${dateSuffix}.docx`;

      // Si el servidor especificó un nombre de archivo, lo usamos y añadimos la fecha
      if (disposition && disposition.indexOf("filename=") !== -1) {
        let serverFileName = disposition
          .split("filename=")[1]
          .replace(/"/g, "");

        // Quitar ".docx" si existe para insertar el sufijo
        if (serverFileName.toLowerCase().endsWith(".docx")) {
          serverFileName = serverFileName.slice(0, -5);
        }

        // Reconstruir el nombre con el sufijo de fecha y la extensión
        fileName = `${serverFileName}${dateSuffix}.docx`;
      }

      // ** C. Iniciar Descarga **
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // 5. Limpieza
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error de red/petición:", error);
      alert(
        "Fallo en la comunicación con el servidor. ¿El servicio de FastAPI está corriendo?"
      );
    }
  };

  // Convierte la estructura de objeto anidada de vuelta a una cadena de Markdown
  const convertStructureToMarkdown = (structure) => {
    let markdownLines = [];
    let h2Counter = 0;

    structure.forEach((item) => {
      const isH1 = item.level === "h1";

      if (isH1) {
        // --- LÓGICA DE H1 ---
        // Usamos .trim() en el título porque suele ser una sola línea de texto/html
        const h1Line = `[H1 - ${item.enumeration}] ${item.text.trim()}`;
        markdownLines.push(h1Line);

        if (item.multimedia && item.multimediaDescription) {
          markdownLines.push(
            `[MULTIMEDIA: ${
              item.multimedia
            } | ${item.multimediaDescription.trim()}]`
          );
        }

        // AGREGAR BLOQUE DE CONTENIDO H1
        // CAMBIO CLAVE: No usamos .trim() en el contenido para preservar el HTML puro de Quill
        if (item.content) {
          markdownLines.push("[CONTENIDO]");
          markdownLines.push(item.content);
          markdownLines.push(""); // Línea vacía para separación visual
        }
        return;
      }

      // --- 1. LÓGICA DE H2 (y sus H3s) ---
      h2Counter++;
      const h2Enumeration = h2Counter.toString();
      const h2Line = `[H2 - ${h2Enumeration}] ${item.text.trim()}`;
      markdownLines.push(h2Line);

      if (item.multimedia && item.multimediaDescription) {
        markdownLines.push(
          `[MULTIMEDIA: ${
            item.multimedia
          } | ${item.multimediaDescription.trim()}]`
        );
      }

      // 1.2. AGREGAR BLOQUE DE CONTENIDO H2
      // CAMBIO CLAVE: Preservamos el contenido tal cual viene del editor
      if (item.content) {
        markdownLines.push("[CONTENIDO]");
        markdownLines.push(item.content);
        markdownLines.push("");
      }

      // --- 2. LÓGICA DE H3 ---
      let h3Counter = 0;
      if (item.children) {
        item.children.forEach((h3Item) => {
          h3Counter++;
          const h3Enumeration = `${h2Enumeration}.${h3Counter}`;

          const h3Line = `[H3 - ${h3Enumeration}] ${h3Item.text.trim()}`;
          markdownLines.push(h3Line);

          if (h3Item.multimedia && h3Item.multimediaDescription) {
            markdownLines.push(
              `[MULTIMEDIA: ${
                h3Item.multimedia
              } | ${h3Item.multimediaDescription.trim()}]`
            );
          }

          // 2.2. AGREGAR BLOQUE DE CONTENIDO H3
          if (h3Item.content) {
            markdownLines.push("[CONTENIDO]");
            markdownLines.push(h3Item.content);
            markdownLines.push("");
          }
        });
      }

      // 3. Separador final para bloques H2
      if (markdownLines[markdownLines.length - 1] !== "") {
        markdownLines.push("");
      }
    });

    // Al final unimos con un solo salto de línea
    return markdownLines.join("\n");
  };

  //Funcion para el conteo de palabras por seccion de H
  const contarPalabras = (texto) => {
    if (!texto) return 0;

    // 1. Limpieza de marcadores de estructura:
    let textoLimpio = texto
      .replace(/<[^>]*>/g, "") // Elimina etiquetas HTML
      .replace(/\[H[2-4]\s*-\s*[0-9.]+\]\s*|\[MULTIMEDIA:.*\]/g, "")
      .replace(/(\*\*|__|\*|_)/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return textoLimpio.split(" ").filter((palabra) => palabra.length > 0)
      .length;
  };

  // Funcion para parsear el Markdown de estructura H2/H3 a un objeto anidado para renderizar
  const parseMarkdownStructure = (markdown) => {
    // Si la entrada es nula o vacía, retorna un array vacío.
    if (!markdown) return [];

    let finalStructureString = markdown;
    let jsonContentMap = null;

    if (
      typeof markdown === "object" &&
      markdown !== null &&
      !Array.isArray(markdown)
    ) {
      if (
        markdown.structure_markdown &&
        typeof markdown.structure_markdown === "string"
      ) {
        finalStructureString = markdown.structure_markdown;
      } else {
        try {
          finalStructureString = JSON.stringify(markdown);
        } catch (e) {
          console.error(
            "La estructura recibida es un objeto no serializable:",
            markdown
          );
          return [];
        }
      }
    } else if (typeof finalStructureString !== "string") {
      console.error(
        "parseMarkdownStructure recibió un valor inesperado (no string ni object):",
        finalStructureString
      );
      finalStructureString = "";
    }

    try {
      // Intento de parsear JSON. finalStructureString es ahora un string (Markdown plano o un JSON anidado).
      const parsedJson = JSON.parse(finalStructureString);

      if (parsedJson.full_structure_markdown) {
        finalStructureString = parsedJson.full_structure_markdown;
      } else if (
        typeof parsedJson === "object" &&
        !Array.isArray(parsedJson) &&
        Object.keys(parsedJson).length > 0
      ) {
        // Este bloque maneja el caso donde el JSON es el contenido con las claves como encabezados.
        jsonContentMap = parsedJson;
      }
    } catch (e) {
      // Si falla, finalStructureString se mantiene como el Markdown plano original.
    }

    // 2. Reconstrucción de la estructura si se detectó un mapa JSON (Para contenido completo)
    if (jsonContentMap) {
      const contentLines = [];
      for (const [key, value] of Object.entries(jsonContentMap)) {
        if (value && typeof value === "string" && value.trim().length > 0) {
          // 1. La clave del JSON se convierte en el encabezado de estructura: [H3 - 2.1] El Poblado
          contentLines.push(key.trim());
          // 2. Insertamos la etiqueta de contenido que el parser espera: [CONTENIDO]
          contentLines.push("[CONTENIDO]");
          // 3. Insertamos el valor, reemplazando doble salto de línea (separador de párrafos en JSON) por un solo \n
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

    // El resto de la lógica de parsing de Markdown se mantiene intacta
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
        h1.enumeration = "0";
        h1.uniqueId = `h1-${h1.enumeration}`;
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
    // 1. Si no hay estructura, mostrar placeholder
    if (!structure || structure.length === 0) {
      return (
        <div className="blog-view-placeholder">
          <p>Aún no hay estructura o contenido generado para mostrar.</p>
        </div>
      );
    }

    // Función auxiliar para verificar si un string HTML tiene contenido real
    const hasActualContent = (html) => {
      if (!html) return false;
      const plainText = html
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, "")
        .trim();
      return plainText.length > 0;
    };

    return (
      <div className="blog-document-window" style={{ overflowX: "hidden" }}>
        {structure.map((item) => {
          // Solo procesamos el item si tiene texto en el título o tiene contenido
          const hasTitle = hasActualContent(item.text);
          const hasBody = hasActualContent(item.content);
          const hasChildren = item.children && item.children.length > 0;

          if (!hasTitle && !hasBody && !hasChildren) return null;

          // --- MANEJO DEL H1 ---
          if (item.level === "h1") {
            return (
              <React.Fragment key={item.uniqueId || "h1-main"}>
                {hasTitle && (
                  <h1
                    className="blog-title"
                    dangerouslySetInnerHTML={{ __html: item.text }}
                  />
                )}
                {hasBody && (
                  <div
                    className="content-block intro-content ql-editor"
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                )}
              </React.Fragment>
            );
          }

          // --- MANEJO DE H2 Y SUS HIJOS (H3) ---
          return (
            <React.Fragment key={item.uniqueId}>
              {hasTitle && (
                <h2
                  className="section-h2"
                  dangerouslySetInnerHTML={{ __html: item.text }}
                />
              )}
              {hasBody && (
                <div
                  className="content-block ql-editor"
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />
              )}

              {/* Renderizar hijos (H3) solo si existen y tienen contenido */}
              {item.children?.map((h3Item) => {
                const hasH3Title = hasActualContent(h3Item.text);
                const hasH3Body = hasActualContent(h3Item.content);

                if (!hasH3Title && !hasH3Body) return null;

                return (
                  <React.Fragment key={h3Item.uniqueId}>
                    {hasH3Title && (
                      <h3
                        className="subsection-h3"
                        dangerouslySetInnerHTML={{ __html: h3Item.text }}
                      />
                    )}
                    {hasH3Body && (
                      <div
                        className="content-block ql-editor"
                        dangerouslySetInnerHTML={{ __html: h3Item.content }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
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
    // 1. Convertir el string de la API a Array/JSON (Tu lógica original)
    const structureArray = parseMarkdownStructure(tablaEstructuraFinal);

    if (!structureArray || structureArray.length === 0) {
      return [];
    }

    // 2. Función interna para procesar cualquier nivel (H1, H2, H3...)
    // Esto asegura que NADA se pierda, incluyendo multimediaDescription
    const processLevel = (item) => {
      return {
        ...item, // Mantiene text, level, multimedia, multimediaDescription, etc.
        wordCount: contarPalabras(item.content || ""),
        // Si tiene hijos, los procesamos con esta misma función (recursividad)
        children: item.children ? item.children.map(processLevel) : [],
      };
    };

    // 3. Aplicamos el proceso a toda la estructura
    return structureArray.map(processLevel);
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

  const handleStatusChange = (e) => {
    setBlogStatus(e.target.value);
    markAsChanged();
  };

  const handlePriorityChange = (e) => {
    setBlogPriority(e.target.value);
    markAsChanged();
  };

  const urlsAlreadySaved = useMemo(() => {
    return !!datosFinales?.urls && datosFinales.urls.trim().length > 0;
  }, [datosFinales]);

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
    let contentToEdit = "";

    // === INICIO DE LA MODIFICACIÓN PARA INCLUIR H1 ===
    if (level === "h1") {
      // Si la sección seleccionada es el H1, buscamos su contenido directamente.
      const h1Item = fullStructureObject.find((item) => item.level === "h1");
      contentToEdit = h1Item?.content || "";
    } else {
      // Lógica existente para H2 y H3
      const idH2 = enumeration.split(".")[0];
      const h2Padre = fullStructureObject.find(
        (item) => item.enumeration === idH2
      );

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
    }
    // === FIN DE LA MODIFICACIÓN ===

    setSectionContentValue(contentToEdit);
  };

  const handleGuardarCambiosTitulo = () => {
    // 1. Validaciones (Quill puede devolver <p><br></p> si está vacío)
    const isValueEmpty =
      !regenTextareaValue || regenTextareaValue === "<p><br></p>";

    if (!selectedSectionForRegen || isValueEmpty) {
      showToast("ERROR: El título está vacío.", "error");
      return;
    }

    // IMPORTANTE: No usamos .trim() aquí para no romper posibles espacios de etiquetas HTML
    const newTitle = regenTextareaValue;
    const level = selectedSectionForRegen.level.toUpperCase();
    const enumeration = selectedSectionForRegen.enumeration;
    const currentMarkdown = tablaEstructuraFinal;

    const escapedEnumeration = enumeration.replace(/\./g, "\\.");

    // Regex para capturar la línea del título
    const targetRegex = new RegExp(
      `^\\s*\\[${level}\\s*-\\s*${escapedEnumeration}\\]\\s*(.*)$`,
      "m"
    );

    // Construimos la línea manteniendo el HTML que viene de Quill
    const newFullLine = `[${level} - ${enumeration}] ${newTitle}`;

    const newStructureString = currentMarkdown.replace(
      targetRegex,
      newFullLine
    );

    if (newStructureString === currentMarkdown) {
      showToast("ERROR CRÍTICO: Falló la sustitución.", "error");
    } else {
      setTablaEstructuraFinal(newStructureString);
      markAsChanged();

      setSelectedSectionForRegen((prevSection) => ({
        ...prevSection,
        text: newTitle, // Aquí ahora va el HTML (ej: <strong>Texto</strong>)
      }));

      setRegenTextareaValue(newTitle);
      showToast("Edición local del título guardada exitosamente.", "success");
    }
  };

  //Funcion para guardar el contenido de los titulos o subtitulos
  // Mantengo tu nombre y parámetros originales
  const guardarContenidoLocal = (fieldToUpdate, newValue) => {
    if (!selectedSectionForRegen) {
      showToast(
        "ERROR: No hay una sección seleccionada para guardar el contenido.",
        "error"
      );
      return;
    }

    // CAMBIO: Eliminamos el .trim() agresivo para no romper el HTML de Quill
    // Si newValue es nulo, usamos string vacío.
    const valueToSave = newValue ?? "";

    const propertyToUpdate = fieldToUpdate === "title" ? "text" : "content";
    let nuevaEstructura = parseMarkdownStructure(tablaEstructuraFinal);
    const { level, enumeration } = selectedSectionForRegen;

    // Localizamos el item (Mantenemos tu lógica de búsqueda)
    const idH2 = enumeration.split(".")[0];

    // Manejo especial para H1 (que no suele estar dentro de un H2 padre en tu parser)
    if (level === "h1") {
      const h1Item = nuevaEstructura.find((item) => item.level === "h1");
      if (h1Item) h1Item[propertyToUpdate] = valueToSave;
    } else {
      const h2Padre = nuevaEstructura.find((item) => item.enumeration === idH2);
      if (h2Padre) {
        if (level === "h2") {
          h2Padre[propertyToUpdate] = valueToSave;
        } else if (level === "h3") {
          const h3Objetivo = h2Padre.children.find(
            (item) => item.enumeration === enumeration
          );
          if (h3Objetivo) h3Objetivo[propertyToUpdate] = valueToSave;
        }
      }
    }

    if (fieldToUpdate === "content") {
      const nuevoTotalPalabras = recalcularPalabrasGeneradas(nuevaEstructura);
      setTotalGeneratedWords(nuevoTotalPalabras);
    }

    // 5. Convertir de vuelta (Aquí es donde se pierden los estilos si no se tiene cuidado)
    const nuevoMarkdown = convertStructureToMarkdown(nuevaEstructura);

    setTablaEstructuraFinal(nuevoMarkdown);
    markAsChanged();

    // Limpieza de UI
    setSelectedSectionForRegen(null);
    setSectionContentValue("");
    setRegenTextareaValue("");
    if (setTempContentUpdate) setTempContentUpdate(null);

    const fieldName = fieldToUpdate === "title" ? "Título" : "Contenido";
    showToast(`${fieldName} guardado localmente.`, "success");
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

    const isH2 = sectionToMove.level === "h2" || sectionToMove.level === "h1";

    if (isH2) {
      const currentIndex = newStructure.findIndex(
        (item) => item.uniqueId === sectionToMove.uniqueId
      );
      if (currentIndex === -1) return;
      if (currentIndex === 0) {
        return;
      }
      // ====================================================================

      let newIndex = currentIndex;
      if (direction === "UP" && currentIndex > 0) {
        if (currentIndex - 1 === 0) {
          return;
        }
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
    const rawInput = referenciaUrls.current?.value; // 🆕 Obtener el texto crudo completo

    const lineasConsulta = rawInput
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const consulta = lineasConsulta[0];
    const urls = lineasConsulta.slice(1); // URLs array para la API de scraping
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

    // Definir URL de guardado
    const URL_API_SAVE = `${URL_API_BASE_BLOGS}${blogId}`;

    // =======================================================================
    // 🆕 PASO 1: GUARDAR EL TEXTO RAW DEL INPUT (QUERY + URLs) EN LA DB
    // (Ahora es un bloque await/try-catch para asegurar la persistencia)
    // =======================================================================
    try {
      if (!rawInput) {
        throw new Error("El campo de URLs/Consulta no puede estar vacío.");
      }

      // El payload envía el valor completo del textarea con la clave 'urls'
      const savePayload = {
        urls: rawInput, // <-- CLAVE: 'urls' (coincide con la BD)
      };

      const responseSave = await fetch(URL_API_SAVE, {
        // Usamos await para que sea sincrónico
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(savePayload),
        signal: signal,
      });

      if (!responseSave.ok) {
        const errorText = await responseSave.text();
        throw new Error(
          `Falló el guardado de URLs con estado ${responseSave.status}. Respuesta: ${errorText}`
        );
      }

      console.log(
        "[SCRAPING] URLs y consulta guardadas en el blog exitosamente."
      );
    } catch (error) {
      // Manejo de errores de guardado
      if (error.name !== "AbortError") {
        console.error("[SCRAPING] Error al guardar URLs:", error);
        setError(`Fallo al guardar las URLs: ${error.message}`);
        // Usar showToast que está disponible en su código original
        // Se asume que showToast está disponible en el scope
        showToast("Error al guardar URLs. Proceso cancelado.", "error");
      }
      setCargandoScraping(false);
      referenciaControladorAborto.current = null;
      return; // Detener si falla el guardado
    }

    // =======================================================================
    // 🆕 PASO 2: EJECUTAR LA LÓGICA DE SCRAPING EXISTENTE (Solo si el guardado fue exitoso)
    // =======================================================================
    try {
      const finalScrapingUrl = `${URL_API_SCRAPING}/${blogId}`;

      const response = await fetch(finalScrapingUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: consulta,
          urls, // Aquí aún enviamos el array de URLs a la API de scraping, lo cual es correcto
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
                const consolidatedContent = parsed.consolidated_content || null;

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

                setContenidoConsolidado(consolidatedContent);

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
  const handleSelectNewTitle = (newTitle) => {
    // Verificar que la sección esté seleccionada y tenga la información clave
    if (
      !selectedSectionForRegen ||
      selectedSectionForRegen.level === "content"
    ) {
      // Manejar el caso de que se intente regenerar contenido no titulable
      showToast("Selección inválida para reemplazar título.", "error");
      return;
    }

    // 1. Parsear el Markdown actual a un objeto JavaScript
    const estructuraActual = parseMarkdownStructure(tablaEstructuraFinal);
    let nuevaEstructura = [...estructuraActual];
    let found = false;

    // Obtener los identificadores clave de la sección a reemplazar
    const { level, enumeration } = selectedSectionForRegen;

    // 2. Encontrar y actualizar el objeto en la estructura (usando level y enumeration)

    // Casos H1 y H2: Se encuentran en el nivel raíz de la estructura.
    if (level === "h1" || level === "h2") {
      const index = nuevaEstructura.findIndex(
        // Utilizamos el nivel y el número de enumeración para encontrar la coincidencia.
        (item) => item.level === level && item.enumeration === enumeration
      );

      if (index !== -1) {
        nuevaEstructura[index].text = newTitle;
        found = true;
      }
    }
    // Caso H3: Se encuentra anidado (como hijo) dentro de un H2.
    else if (level === "h3" && selectedSectionForRegen.parent) {
      // Asumiendo que selectedSectionForRegen.parent contiene el 'enumeration' del H2 padre.
      const parentEnumeration = selectedSectionForRegen.parent.enumeration;

      // Primero, encontrar el H2 padre
      const h2Item = nuevaEstructura.find(
        (item) => item.level === "h2" && item.enumeration === parentEnumeration
      );

      if (h2Item) {
        // Luego, encontrar el H3 dentro de los hijos del H2
        const h3Index = h2Item.children.findIndex(
          (item) => item.level === "h3" && item.enumeration === enumeration
        );
        if (h3Index !== -1) {
          h2Item.children[h3Index].text = newTitle;
          found = true;
        }
      }
    }

    if (!found) {
      // El error ocurrirá aquí si la sección fue movida, eliminada o el parseo es incorrecto.
      console.error(
        `[IA - REEMPLAZO FALLIDO] No se encontró la sección para la enumeración: [${level.toUpperCase()} - ${enumeration}].`
      );
      showToast(
        "Error al reemplazar el título. No se encontró la sección en la estructura actual.",
        "error"
      );
      return;
    }

    // 3. Convertir la estructura de objeto modificada de nuevo a Markdown
    const nuevoMarkdown = convertStructureToMarkdown(nuevaEstructura);

    // 4. Actualizar estados
    setTablaEstructuraFinal(nuevoMarkdown);
    markAsChanged(); // Asumiendo que tiene una función para marcar el cambio
    setTitleSuggestions([]);
    setRegenTextareaValue(newTitle);
    showToast("Título actualizado con éxito.", "success");
  };

  //Funcion para la generacion de la estructura (H1, H2, H3)
  const generarAnalisisIA = useCallback(async () => {
    // 1. OBTENCIÓN DE DATOS CLAVE
    const idDelBlog = blogId;

    // --- VALIDACIÓN DE LA FUENTE DE DATOS ---
    if (!datosFinales) {
      setError(
        "Error: Los datos del proyecto (datosFinales) no han sido cargados correctamente."
      );
      return;
    }

    if (!idDelBlog) {
      setError(
        "Error: blogId o contenido consolidado no disponible. Se necesita una fuente de datos."
      );
      return;
    }

    // 2. CONSTRUCCIÓN DE LA CONSULTA
    const urlContent =
      referenciaUrls.current?.value.split("\n")[0].trim() || "";

    const topic = datosFinales?.title || datosFinales?.query || urlContent;
    const consulta = topic.trim(); // Tema final para la IA

    // 3. VALIDACIÓN FINAL DE LA CONSULTA: Es obligatorio para la IA.
    if (consulta.length === 0) {
      setError(
        "Error: El campo 'Título' (tema principal) está vacío. La IA necesita un tema para generar la estructura."
      );
      setCargandoIA(false);
      return;
    }

    console.log(
      `Iniciando generación de Análisis de Estructura para título: ${consulta}...`
    );

    setCargandoIA(true);
    setError(null);

    const textoConsolidado = idDelBlog ? undefined : contenidoConsolidado;
    const title_base = consulta;
    const categoria = datosFinales?.categoria || "";
    const idioma = datosFinales?.idioma || "";
    const tecnica = datosFinales?.tecnica || "";
    const acento = datosFinales?.acento || "";
    const tono = datosFinales?.tono || "";

    try {
      // LLamada al endpoint de generación de estructura
      const requestData = {
        query: consulta,
        blog_id: idDelBlog,
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
        const errorData = await response.json();
        throw new Error(
          errorData.detail ||
            `Error en la llamada a la IA: ${response.statusText}`
        );
      }

      const result = await response.json();

      // 1. Desestructurar y actualizar el estado principal
      const { structure_markdown } = result;

      setDatosFinales((prev) => ({
        ...prev,
        final_structure_object: result,
      }));

      // 2. Asignar resultados para el render de componentes separados
      const structureMarkdown = structure_markdown || "";

      setTablaEstructuraFinal(structureMarkdown);

      const wordCount = result?.estimated_word_count;
      if (wordCount) {
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
  });

  // GENERACION DE CONTENIDO PARA SECCIÓN ESPECÍFICA
  const generarContenidoIA = async () => {
    if (!selectedSectionForRegen) {
      showToast(
        "ERROR: Faltan datos clave (Sección o Contenido Consolidado).",
        "error"
      );
      return;
    }

    setCargandoIA(true);
    setError(null);

    // --- GENERACIÓN DE CONTEXTO  ---
    let contextData = "";
    const sectionId = selectedSectionForRegen.uniqueId;
    const targetSection = selectedSectionForRegen;

    // 1. Construir el contexto basado en el nivel (H2 vs H3) - Lógica de Contexto Mantenida
    if (targetSection && sectionId) {
      const level = targetSection.level.toLowerCase();
      contextData = `Contexto del Articulo (NO REPITA O REDUNDE en las ideas listadas):`;

      if (level === "h2") {
        contextData += `\n--- Temas ya cubiertos (H2s hermanos): ---\n`;
        structureWithCount
          .filter((item) => item.level.toLowerCase() === "h2")
          .forEach((h2) => {
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

    // 2. Filtrar contexto vacío
    const finalContextData = contextData.length > 50 ? contextData : "";
    const blogId = datosFinales.id;

    // --- CONSTRUCCIÓN DEL PAYLOAD ---
    let payload = {
      query: datosFinales.query,
      blog_id: blogId,
      consolidated_content: datosFinales.contenidoConsolidado,
      keywords: datosFinales.keywords || [],
      idioma: datosFinales.idioma,
      acento: datosFinales.acento,
      tono: datosFinales.tono,
      tecnica: datosFinales.tecnica,
      section_type: "content_generation",

      regenerate_data: {
        section_title: selectedSectionForRegen.text,
        section_level: selectedSectionForRegen.level,
        full_structure_markdown: tablaEstructuraFinal,
        context_data: finalContextData,
        required_keywords: selectedSectionForRegen.keywords || [],
        content_type: contentType,
      },
    };

    try {
      // 1. LLAMADA A LA API
      const response = await fetch(URL_CONTENIDO_SECCION, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error HTTP: ${response.status}`);
      }

      const result = await response.json();

      // 2. PROCESAMIENTO E INTEGRACIÓN DEL RESULTADO
      if (result.generated_content) {
        const nuevoContenido = result.generated_content.trim();

        // 2.1. Actualizar el editor para la vista previa
        setSectionContentValue(nuevoContenido);

        // 2.2. Aplicar el contenido al estado TEMPORAL para la vista de la estructura
        setTempContentUpdate({
          uniqueId: selectedSectionForRegen.uniqueId,
          newContent: nuevoContenido,
        });

        showToast(
          "Contenido generado y listo para revisión. Presiona 'Guardar Contenido Local' para aplicarlo.",
          "info"
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

  // Generación Única con Historial
  const regenerarSeccion = async (sectionType, historyArray) => {
    if (!datosFinales || !datosFinales.title || !datosFinales.id) {
      setError(
        "Error: Título principal o ID del blog no disponibles. Necesarios para la consulta."
      );
      return;
    }
    console.log(
      `[IA - REGENERACIÓN] Iniciando regeneración de la sección: ${sectionType}`
    );
    setCargandoIA(true);
    setSeccionRegenerando(sectionType);
    setError(null);

    const consulta = datosFinales.title;
    const blogId = datosFinales.id;
    const requestData = {
      query: consulta,
      blog_id: blogId,
      section_type: sectionType,
      previous_content: historyArray,
      idioma: datosFinales?.idioma || "",
      acento: datosFinales?.acento || "",
      tono: datosFinales?.tono || "",
      tecnica: datosFinales?.tecnica || "",
      regenerate_data: undefined,
    };

    if (sectionType === "structure_section") {
      const fullStructure =
        datosFinales.final_structure_object?.structure_markdown ||
        tablaEstructuraFinal;
      if (!selectedSectionForRegen || !fullStructure) {
        setError("Error interno: Faltan datos de la sección de estructura.");
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
      const response = await fetch(URL_API_IA_REGEN, {
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
      let generatedContent = null;
      if (
        !Array.isArray(regeneratedSuggestions) ||
        regeneratedSuggestions.length === 0
      ) {
        // 1. Extraer el contenido del mensaje (que es una CADENA JSON anidada)
        const aiMessageContent = result?.choices?.[0]?.message?.content;

        if (aiMessageContent) {
          try {
            // 2. Parsear la cadena JSON anidada
            const parsedContent = JSON.parse(aiMessageContent);

            if (
              sectionType === "structure_section" &&
              parsedContent.structure_markdown
            ) {
              generatedContent = null;
            } else if (
              parsedContent.suggestions &&
              Array.isArray(parsedContent.suggestions)
            ) {
              // Si la IA, en algún momento, comienza a devolver un array de 'suggestions', lo tomamos.
              regeneratedSuggestions = parsedContent.suggestions;
              generatedContent = null;
            } else if (
              parsedContent.regenerated_suggestions &&
              Array.isArray(parsedContent.regenerated_suggestions)
            ) {
              // Comprobación por si el backend serializa la respuesta de forma errónea
              regeneratedSuggestions = parsedContent.regenerated_suggestions;
              generatedContent = null;
            } else {
              // Fallback: Usamos el contenido crudo como sugerencia si no hay formato conocido
              generatedContent = aiMessageContent;
            }
          } catch (e) {
            // Fallback si el contenido no es un JSON válido
            console.warn(
              "El contenido de la IA no pudo ser parseado como JSON. Tratando como texto plano.",
              e
            );
            generatedContent = aiMessageContent;
          }
        }
      } // 4. Normalizar la respuesta: Si se extrajo un string, se envuelve en un array de sugerencias
      if (generatedContent && generatedContent.length > 0) {
        // Solo si no es un array ya
        if (!Array.isArray(generatedContent)) {
          regeneratedSuggestions = [generatedContent];
        }
      } // 5. Validación final: Si todavía está vacío, lanzamos el error

      if (
        !Array.isArray(regeneratedSuggestions) ||
        regeneratedSuggestions.length === 0
      ) {
        throw new Error(
          "Respuesta de IA vacía o formato de resultado no reconocido (Se esperaban 3 títulos)."
        );
      }

      console.log(
        `[IA - REGENERACIÓN] Sugerencias recibidas para ${sectionType}:`,
        regeneratedSuggestions
      ); // 6. Actualización de Estados y Historial

      switch (sectionType) {
        case "structure_section": {
          // Aquí se asigna el resultado (el array de títulos)
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
        default: // Manejo de caso por defecto para evitar warning
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

  // Funncion generacion de contenido completo

  const generarContenidoCompleto = async () => {
    // 1. OBTENCIÓN DE ID DEL BLOG Y VALIDACIONES INICIALES
    const idDelBlog = blogId;

    if (!idDelBlog) {
      showToast(
        "Error: No se encontró el ID del blog. No se puede generar contenido en modo edición.",
        "error"
      );
      return;
    }
    if (!tablaEstructuraFinal) {
      showToast(
        "Error: La estructura está vacía. Genere el análisis primero.",
        "error"
      );
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

    // --- LÓGICA DE PRESUPUESTO DINÁMICO ---
    let estructuraAnidada = parseMarkdownStructure(tablaEstructuraFinal);
    let estructuraTemporal = estructuraAnidada;
    let generatedContentHistory = [];

    const palabrasObjetivo = estimatedWordCount;
    const totalSubsecciones = contarTotalSubsecciones(estructuraAnidada);

    let palabrasAcumuladas = recalcularPalabrasGeneradas(estructuraAnidada);
    let subseccionesGeneradas = recalcularSubseccionesGeneradas(
      estructuraAnidada,
      contarPalabras
    );

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

      // --- LIMPIEZA DE TEXTOS PARA EL PAYLOAD ---
      // Limpiamos el texto del H2 de etiquetas HTML
      const cleanH2Text = stripHtml(h2Block.text);
      const blockTitle = h2Block.enumeration + ". " + cleanH2Text;

      showToast(`Generando contenido para BLOQUE: ${blockTitle}`, "info", 4000);

      // Markdown limpio para el backend (evita enviar <p> o &nbsp;)
      const blockMarkdownToGenerate = [
        `## ${h2Block.enumeration}. ${cleanH2Text}`,
        ...h2Block.children.map(
          (h3) => `### ${h3.enumeration}. ${stripHtml(h3.text)}`
        ),
      ].join("\n");

      const fullStructureMarkdown =
        convertStructureToMarkdown(estructuraTemporal);

      // --- CÁLCULO DINÁMICO DEL PRESUPUESTO ---
      let subseccionesEnBloqueActual = 0;
      if (!h2Block.content || contarPalabras(h2Block.content) === 0) {
        subseccionesEnBloqueActual = 1;
      }
      h2Block.children.forEach((h3) => {
        if (!h3.content || contarPalabras(h3.content) === 0) {
          subseccionesEnBloqueActual++;
        }
      });

      const subseccionesPendientes = Math.max(
        1,
        totalSubsecciones - subseccionesGeneradas
      );
      const limitePalabrasBloqueCalculado = Math.ceil(
        ((palabrasObjetivo - palabrasAcumuladas) / subseccionesPendientes) *
          subseccionesEnBloqueActual
      );
      const limiteFinal = Math.max(100, limitePalabrasBloqueCalculado);

      // --- CONSTRUCCIÓN DEL PAYLOAD (CON TEXTOS LIMPIOS) ---
      const payload = {
        blog_id: idDelBlog,
        query: datosFinales?.query,
        consolidated_content: contenidoConsolidado,
        keywords: datosFinales?.keywords || [],
        idioma: datosFinales?.idioma,
        acento: datosFinales?.acento,
        tono: datosFinales?.tono,
        section_type: "full_block_generation",
        previous_content: generatedContentHistory,
        palabras_acumuladas: palabrasAcumuladas,
        subsecciones_pendientes: subseccionesPendientes,
        limite_palabras_bloque: limiteFinal,
        regenerate_data: {
          section_title: blockTitle, // Texto plano
          section_level: "h2_block",
          section_text: blockMarkdownToGenerate, // Markdown plano
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

        if (!response.ok) {
          let errorMessage = `Error HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage =
              errorData.detail || errorData.error || JSON.stringify(errorData);
          } catch (e) {
            errorMessage = await response.text();
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();

        if (result.success !== "True" || !result.generated_content) {
          throw new Error(
            `Respuesta de IA fallida. Log: ${result.log || "N/A"}`
          );
        }

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

        // --- ACTUALIZACIÓN DE ESTRUCTURA CON MAPEO LIMPIO ---
        estructuraTemporal = estructuraTemporal.map((h2Padre) => {
          if (h2Padre.enumeration !== h2Block.enumeration) return h2Padre;

          let h2Actualizado = { ...h2Padre };

          // Buscamos en el JSON usando la misma lógica de texto limpio
          const h2Key = `${h2Padre.enumeration}. ${stripHtml(h2Padre.text)}`;
          if (generatedContentMap[h2Key]) {
            h2Actualizado.content = generatedContentMap[h2Key];
            generatedContentHistory.push(generatedContentMap[h2Key]);
          }

          h2Actualizado.children = h2Actualizado.children.map((h3) => {
            const h3Key = `${h3.enumeration}. ${stripHtml(h3.text)}`;
            if (generatedContentMap[h3Key]) {
              generatedContentHistory.push(generatedContentMap[h3Key]);
              return { ...h3, content: generatedContentMap[h3Key] };
            }
            return h3;
          });

          return h2Actualizado;
        });

        const nuevoMarkdown = convertStructureToMarkdown(estructuraTemporal);
        setTablaEstructuraFinal(nuevoMarkdown);
        setHasUnsavedChanges(true);

        palabrasAcumuladas = recalcularPalabrasGeneradas(estructuraTemporal);
        subseccionesGeneradas = recalcularSubseccionesGeneradas(
          estructuraTemporal,
          contarPalabras
        );

        showToast(`BLOQUE ${blockTitle} generado correctamente.`, "success");
      } catch (error) {
        if (error.name === "AbortError") break;
        const errorMsg = error.message || "Error desconocido.";
        console.error(`Error en BLOQUE ${blockTitle}:`, error);
        setError(`Error: ${errorMsg}`);
        showToast(`Error: ${errorMsg}`, "error");
        break;
      }
    }

    if (!cancelacionSolicitada) referenciaControladorAborto.current = null;
    setCargandoIA(false);
    setSelectedSectionForRegen(null);
    showToast("Proceso de generación finalizado.", "info");
  };

  // =======================================================================
  // 5. COMPONENTE StructureRenderer
  // =======================================================================

  // FUNCIÓN DE RENDERIZADO PARA INTERACCIÓN (CORREGIDA)
  const StructureRenderer = ({
    structure,
    onSelect,
    selectedSection,
    onAction,
  }) => {
    if (!structure || structure.length === 0) return null;

    /**
     * Determina si una sección tiene algo que mostrar (Texto, Contenido, SEO o Hijos).
     * El H1 siempre se retorna true para asegurar que el título principal nunca desaparezca.
     */
    const hasContentToShow = (item) => {
      if (item.level === "h1") return true;

      const textVal =
        item.text
          ?.replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, "")
          .trim() || "";
      const contentVal =
        item.content
          ?.replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, "")
          .trim() || "";
      const hasSEO =
        !!item.multimediaDescription &&
        item.multimediaDescription.trim() !== "";
      const hasChildren = item.children && item.children.length > 0;

      return (
        textVal.length > 0 || contentVal.length > 0 || hasSEO || hasChildren
      );
    };

    return (
      <ul className="structure-list">
        {structure.map((item) => {
          // Si no hay nada que mostrar en este nodo, saltamos al siguiente
          if (!hasContentToShow(item)) return null;

          const isSelected = selectedSection?.uniqueId === item.uniqueId;
          const isH1 = item.level === "h1";

          return (
            <li
              key={item.uniqueId || item.enumeration}
              className={`structure-item structure-item-${item.level} ${
                isSelected ? "structure-item-selected" : ""
              }`}
            >
              {/* 1. ENCABEZADO: Icono + Título + Botones */}
              <div className="structure-content-wrapper">
                <div
                  className="structure-text-area"
                  onClick={(e) => onSelect(item, e)}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    flexGrow: 1,
                  }}
                >
                  <span className="structure-icon-wrapper">
                    <i
                      className={`uil ${
                        isH1
                          ? "uil-heading"
                          : item.level === "h2"
                          ? "uil-align-left-h"
                          : "uil-corner-down-right"
                      }`}
                    ></i>
                  </span>

                  <span style={{ fontWeight: "bold", marginRight: "8px" }}>
                    {item.enumeration}
                  </span>

                  {/* Título de la sección (Soporta HTML de Quill) */}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: item.text || "Sin título",
                    }}
                  />

                  {item.wordCount > 0 && (
                    <span
                      style={{
                        marginLeft: "8px",
                        color: "#6c757d",
                        fontSize: "0.85em",
                        fontStyle: "italic",
                      }}
                    >
                      ({item.wordCount} palabras)
                    </span>
                  )}
                </div>

                {/* Botones de acción: Solo visibles para H2 y H3 para no romper la raíz */}
                {!isH1 && (
                  <div className="structure-buttons-group">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction("move", item, "UP");
                      }}
                      title="Mover Arriba"
                    >
                      <i className="uil uil-arrow-up"></i>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction("move", item, "DOWN");
                      }}
                      title="Mover Abajo"
                    >
                      <i className="uil uil-arrow-down"></i>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction("delete", item);
                      }}
                      title="Eliminar"
                    >
                      <i className="uil uil-trash-alt"></i>
                    </button>
                  </div>
                )}
              </div>

              {/* 2. PREVISUALIZACIÓN DE CONTENIDO (Visible en H1, H2, H3) */}
              {item.content &&
                item.content.replace(/<[^>]*>/g, "").trim().length > 0 && (
                  <div
                    className="content-preview-block"
                    style={{
                      marginTop: "10px",
                      padding: "8px 12px",
                      borderLeft: "4px solid #10a2f4",
                      backgroundColor: "#f0f8ff",
                      fontSize: "0.9em",
                      borderRadius: "0 4px 4px 0",
                    }}
                  >
                    <strong
                      style={{
                        color: "#007bff",
                        fontSize: "0.75rem",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      CONTENIDO:
                    </strong>
                    <div
                      style={{ color: "#333", lineHeight: "1.4" }}
                      dangerouslySetInnerHTML={{
                        __html:
                          item.content.trim().substring(0, 160) +
                          (item.content.length > 160 ? "..." : ""),
                      }}
                    />
                  </div>
                )}

              {/* 3. RECOMENDACIÓN SEO / MULTIMEDIA (Visible en H1, H2, H3) */}
              {item.multimediaDescription && (
                <div
                  className="multimedia-recommendation-seo"
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    borderLeft: "4px solid #f29727",
                    backgroundColor: "#fff8f0",
                    borderRadius: "0 4px 4px 0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "4px",
                    }}
                  >
                    <i
                      className="uil uil-camera"
                      style={{ color: "#f29727", fontSize: "1.1rem" }}
                    ></i>
                    <strong
                      style={{
                        color: "#855d10",
                        fontSize: "0.8rem",
                        textTransform: "uppercase",
                      }}
                    >
                      RECOMENDACIÓN SEO ({item.multimedia || "MULTIMEDIA"}):
                    </strong>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      color: "#555",
                      lineHeight: "1.5",
                    }}
                  >
                    {item.multimediaDescription}
                  </p>
                </div>
              )}

              {/* 4. RECURSIVIDAD: Renderiza los hijos (H3 dentro de H2, etc.) */}
              {item.children && item.children.length > 0 && (
                <div
                  className="structure-children-container"
                  style={{ marginLeft: "25px", marginTop: "10px" }}
                >
                  <StructureRenderer
                    structure={item.children}
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
            onClick={handleSaveProject}
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2>Ingresa URLs (mínimo 3)</h2>

            {/* Contenedor de los selectores: usa gap para separarlos */}
            <div style={{ display: "flex", gap: "25px" }}>
              {/* 1. Selector de Estado del Blog */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <label
                  htmlFor="blog-status"
                  style={{
                    marginRight: "10px",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  Estado:
                </label>
                <select
                  id="blog-status"
                  value={blogStatus}
                  onChange={handleStatusChange}
                  disabled={cargandoScraping}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid #aaa",
                    backgroundColor: "white",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                    minWidth: "160px",
                    cursor: "pointer",
                  }}
                >
                  {/* Es CRÍTICO que el VALUE coincida con el dato que la BD devuelve/espera */}
                  <option value="draft">Borrador</option>
                  <option value="generated">Estructura Generada</option>
                  <option value="review">En Revisión</option>
                  <option value="approved">Aprobado</option>
                  <option value="published">Publicado</option>
                </select>
              </div>
              {/* 2. Selector de Prioridad del Blog */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <label
                  htmlFor="blog-priority"
                  style={{
                    marginRight: "10px",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  Prioridad:
                </label>
                <select
                  id="blog-priority"
                  value={blogPriority}
                  onChange={handlePriorityChange}
                  disabled={cargandoScraping}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid #aaa",
                    backgroundColor: "white",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                    minWidth: "100px",
                    cursor: "pointer",
                  }}
                >
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>
            </div>
          </div>
          {/* ========================================================= */}
          {/* FIN DEL NUEVO CONTENEDOR DE ENCABEZADO */}
          {/* ========================================================= */}

          <input
            ref={referenciaUrls}
            className="auto-expand"
            placeholder="&#10;https://example1.com&#10;https://example2.com&#10;https://example3.com"
            rows={5}
            disabled={cargandoScraping}
          />

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
              borderBottomColor: "#1A2E44",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            onClick={() => toggleCardVisibility("preconfiguracionUnificada")}
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

              {/* Contenedor Flex/Grid para Grupos 2 y 3: Estilo/Tono y Contexto*/}
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
            {/* --- EDITOR / REGENERACIÓN DE TÍTULOS  --- */}
            {/* ---------------------------------------------------- */}
            <section className="analysis-result fade-in">
              {/* Condición maestra: solo se muestra si hay una sección seleccionada. */}
              {selectedSectionForRegen ? (
                <>
                  {/* 1. Encabezado del Panel de Edición */}
                  <h2 className="analysis-title">
                    Editar/Regenerar Sección: "
                    {stripHtml(selectedSectionForRegen.text)}" (
                    {selectedSectionForRegen.level.toUpperCase()})
                  </h2>
                  <p className="result-text">
                    Edita el texto directamente para guardarlo, o proporciona
                    instrucciones para la regeneración con IA.
                  </p>

                  {/* 2. CONTENEDOR FLEX PRINCIPAL: Textarea y Sugerencias*/}
                  <div
                    className={`
          regen-input-area 
          ${titleSuggestions.length > 0 ? "has-suggestions-flex" : ""}
        `}
                  >
                    {/* Edición Directa / Prompt */}

                    <div
                      className="quill-editor-wrapper"
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        overflow: "hidden",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                      }}
                    >
                      <ReactQuill
                        theme="snow"
                        value={regenTextareaValue || ""}
                        onChange={(content) => setRegenTextareaValue(content)}
                        placeholder="Edita el título o selecciona uno nuevo."
                        modules={{
                          toolbar: [
                            [{ font: [] }, { size: [] }],
                            ["bold", "italic", "underline", "strike"],
                            [{ color: [] }, { background: [] }],
                            [{ list: "ordered" }, { list: "bullet" }],
                            ["clean"],
                          ],
                        }}
                        // Estilo más bajo ya que es un título, no necesita 300px
                        style={{ height: "120px", marginBottom: "45px" }}
                      />
                    </div>

                    {/* Panel de Sugerencias Generadas*/}
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

                  {/* Botones de Acción */}
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
                      className="btn-generate btn-regenerar "
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
                      setTitleSuggestions([]);
                    }}
                    className="btn btn-cancel"
                    style={{ marginTop: "10px", width: "100%", height: "45px" }}
                  >
                    <i className="uil uil-times"></i> Cancelar Edición
                  </button>
                </>
              ) : (
                // Panel de Regeneración INACTIVO
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
            {/* --- EDITOR / GENERACIÓN DE CONTENIDO DE SECCIÓN --- */}
            {/* ---------------------------------------------------- */}
            {selectedSectionForRegen && (
              <section
                className="analysis-result fade-in"
                style={{ marginTop: "20px" }}
              >
                <h2 className="analysis-title">
                  {/* Aplicamos stripHtml aquí para que no se vean los <p> ni <span> */}
                  Editar Contenido: "{stripHtml(selectedSectionForRegen.text)}"
                  ({selectedSectionForRegen.level.toUpperCase()})
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
                  className="quill-editor-wrapper"
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    overflow: "hidden",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  <ReactQuill
                    theme="snow"
                    value={sectionContentValue || ""}
                    onChange={(content) => setSectionContentValue(content)}
                    disabled={cargandoIA}
                    modules={{
                      toolbar: [
                        [{ font: [] }, { size: [] }],
                        ["bold", "italic", "underline", "strike"],
                        [{ color: [] }, { background: [] }],
                        [{ list: "ordered" }, { list: "bullet" }],
                        ["clean"],
                      ],
                    }}
                    style={{ height: "300px", marginBottom: "40px" }} // Margen inferior para que no tape los botones
                  />
                </div>

                <div className="idea-buttons">
                  <button
                    onClick={() =>
                      guardarContenidoLocal("content", sectionContentValue)
                    }
                    className="btn-generate"
                    style={{ flexGrow: 1 }}
                    disabled={cargandoIA}
                  >
                    <i className="uil uil-save"></i> Guardar Contenido Local
                  </button>
                  <button
                    onClick={generarContenidoIA}
                    className="btn btn-generate "
                    style={{ flexGrow: 1 }}
                    disabled={cargandoIA}
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
                  className="btn btn-cancel"
                  style={{ marginTop: "10px", width: "100%", height: "45px" }}
                  disabled={cargandoIA}
                >
                  <i className="uil uil-times"></i> Cancelar Edición
                </button>
              </section>
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
                  gap: "10px",
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
                  <button onClick={handleDownloadDocx} className="btn-download">
                    <i className=" uil-file-download"></i> Descargar Word
                  </button>
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
