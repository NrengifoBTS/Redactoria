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
  const [TotalGeneratedWords, setTotalGeneratedWords] = useState(0);
  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [isEditingStructure, setIsEditingStructure] = useState(true);
  const [localBlogId, setLocalBlogId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [blogStatus, setBlogStatus] = useState("");
  const [blogPriority, setBlogPriority] = useState("");
  const [, setTempContentUpdate] = useState(null);
  const [listaUrls, setListaUrls] = useState(["", "", ""]);
  const [estadosUrls, setEstadosUrls] = useState({});

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

          // ============================================================
          // MODIFICACIÓN PARA RENDERIZAR URLS EN INPUTS INDIVIDUALES
          // ============================================================
          if (data.urls) {
            // Si aún usas la referencia para algo, la mantenemos
            if (referenciaUrls.current) {
              referenciaUrls.current.value = data.urls;
            }

            // Convertimos el string de la BD en un array para los inputs
            const urlsArray = data.urls
              .split("\n")
              .map((u) => u.trim())
              .filter((u) => u !== "");

            if (urlsArray.length > 0) {
              setListaUrls(urlsArray);

              // Marcamos como 'exito' (check verde) porque ya existen en la BD
              const estadosIniciales = {};
              urlsArray.forEach((_, index) => {
                estadosIniciales[index] = "exito";
              });
              setEstadosUrls(estadosIniciales);
            }
          }
          // ============================================================

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
  const [usarIA] = useState(true);
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
  const guardarArticulo = useCallback(async () => {
    if (isSaving || !localBlogId) return;

    setIsSaving(true);
    try {
      const payload = {
        estructura_blog_json: tablaEstructuraFinal,
        estado: blogStatus,
        prioridad: blogPriority,
        estimated_word_count: TotalGeneratedWords,
      };

      // CAMBIO CLAVE: Usar updateBlog en lugar de .put
      // El servicio ya se encarga de la ruta interna.
      await apiService.updateBlog(localBlogId, payload);

      setHasUnsavedChanges(false);
      setEstimatedWordCount(TotalGeneratedWords);

      if (typeof showToast === "function") {
        showToast("¡Proyecto guardado con éxito!", "success");
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      showToast("Error al conectar con el servidor.", "error");
    } finally {
      setIsSaving(false);
    }
  }, [
    localBlogId,
    tablaEstructuraFinal,
    blogStatus,
    blogPriority,
    TotalGeneratedWords,
    isSaving,
  ]);

  // Visibilidad de tarjetas en el front
  const tarjetasInformacion = (cardName) => {
    setCardVisibility((prev) => ({
      ...prev,
      [cardName]: !prev[cardName],
    }));
  };

  // Funcion de descarga de documento Word desde la API
  const descargarArticuloDocs = async () => {
    try {
      console.log("Descargando Word desde la BD...");

      const downloadUrl = `${URL_API_IA_DOWNLOAD}/${blogId}`;

      const response = await fetch(downloadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error:", response.status, errorText);

        try {
          const errorJson = JSON.parse(errorText);
          alert(`Error ${response.status}: ${errorJson.detail || errorText}`);
        } catch {
          alert(`Error ${response.status}: ${errorText.substring(0, 200)}`);
        }
        return;
      }

      // Verificar que sea DOCX
      const contentType = response.headers.get("Content-Type");
      const isDocx = contentType?.includes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );

      if (!isDocx) {
        alert("Error: El servidor no devolvió un archivo Word válido.");
        return;
      }

      // Descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const fileName = `${datosFinales?.title || "blog"}.docx`;

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // Limpiar
      setTimeout(() => {
        a.remove();
        window.URL.revokeObjectURL(url);
      }, 100);

      showToast("Documento Word descargado", "success");
    } catch (error) {
      console.error("Error en descarga:", error);
      alert("Error de conexión con el servidor.");
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
  const contarPalabras = useCallback((texto) => {
    if (!texto || typeof texto !== "string") return 0;
    const temporalDiv = document.createElement("div");
    temporalDiv.innerHTML = texto;
    let textoPlano = (temporalDiv.textContent || temporalDiv.innerText || "")
      .replace(/\s+/g, " ")
      .trim();
    textoPlano = textoPlano
      .replace(/\[H[2-4]\s*-\s*[0-9.]+\]\s*|\[MULTIMEDIA:.*\]/g, "")
      .replace(/(\*\*|__|\*|_)/g, "");
    const palabras = textoPlano.split(" ").filter((p) => p.length > 0);
    return palabras.length;
  }, []);

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
      /^\[MULTIMEDIA:\s*(VIDEO|FOTO|MAPA|GRAFICO|IMAGEN)\s*\|\s*(.*?)\]\s*$/i;
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
    if (!estructura || !Array.isArray(estructura)) return 0;

    const procesarItem = (item) => {
      // 1. Contar palabras del título (text)
      conteo += contarPalabras(item.text || "");

      // 2. Contar palabras del contenido (content)
      if (item.content) {
        conteo += contarPalabras(item.content);
      }

      // 3. Procesar hijos si existen
      if (item.children && item.children.length > 0) {
        item.children.forEach(procesarItem);
      }
    };

    estructura.forEach(procesarItem);
    console.log("📊 Conteo Total Realizado:", conteo);
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

  const recalcularSubseccionesGeneradas = (estructura) => {
    let conteo = 0;
    if (!Array.isArray(estructura)) return 0;

    estructura.forEach((item) => {
      // Verificar item principal (H1, H2, etc)
      const tieneContenidoPrincipal =
        item.content && contarPalabras(item.content) > 0;
      if (tieneContenidoPrincipal) {
        conteo++;
      }

      // Verificar subsecciones (H3)
      if (item.children && Array.isArray(item.children)) {
        item.children.forEach((h3) => {
          if (h3.content && contarPalabras(h3.content) > 0) {
            conteo++;
          }
        });
      }
    });
    return conteo;
  };

  const renderizarContenidoDelBlog = (structure) => {
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

  // 1. La estructura se mantiene igual (useMemo)
  const structureWithCount = useMemo(() => {
    const structureArray = parseMarkdownStructure(tablaEstructuraFinal);
    if (!structureArray || structureArray.length === 0) return [];

    const processLevel = (item) => ({
      ...item,
      wordCount: contarPalabras(item.content || ""),
      children: item.children ? item.children.map(processLevel) : [],
    });

    return structureArray.map(processLevel);
  }, [tablaEstructuraFinal]);

  // 2. EN LUGAR DE CREAR UNA CONSTANTE, USA EL SETTER DEL ESTADO
  // Aprovechamos el useMemo o un useEffect que ya tengas para actualizar el valor
  useEffect(() => {
    const total = recalcularPalabrasGeneradas(structureWithCount);
    // ACTUALIZAMOS TU ESTADO (El que usas en el botón de guardar)
    setTotalGeneratedWords(total);
  }, [structureWithCount]);
  // ==============================================================================================================================================
  // 8. FUNCIONES DE MANEJO DE ESTRUCTURA Y EDICIÓN LOCAL
  //    (Selección, Guardar Título/Contenido, Mover, Eliminar, Agregar)
  // ==============================================================================================================================================

  const cambiarEstado = (e) => {
    setBlogStatus(e.target.value);
    markAsChanged();
  };

  const cambiarPrioridad = (e) => {
    setBlogPriority(e.target.value);
    markAsChanged();
  };

  // Función para actualizar una URL específica
  const manejarCambioUrl = (index, valor) => {
    const nuevasUrls = [...listaUrls];
    nuevasUrls[index] = valor;
    setListaUrls(nuevasUrls);
  };

  // Función para añadir un nuevo campo de input
  const agregarCampoUrl = () => {
    setListaUrls([...listaUrls, ""]);
  };

  // Función para eliminar un campo si es necesario
  const eliminarCampoUrl = (index) => {
    if (listaUrls.length > 3) {
      // Mantener el mínimo de 3
      setListaUrls(listaUrls.filter((_, i) => i !== index));
    }
  };

  // Funcion que Maneja la selección del título en el StructureRenderer
  const seleccionarSeccionEdicion = (section, event) => {
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

  const guardarCambiosTitulo = () => {
    // 1. Validaciones
    const isValueEmpty =
      !regenTextareaValue || regenTextareaValue === "<p><br></p>";
    if (!selectedSectionForRegen || isValueEmpty) {
      showToast("ERROR: El título está vacío.", "error");
      return;
    }

    const newTitle = regenTextareaValue;
    const { level, enumeration } = selectedSectionForRegen;

    // 2. USAMOS TU PARSER (Igual que en guardarContenidoLocal)
    // Esto asegura que estemos trabajando con el objeto real
    let nuevaEstructura = parseMarkdownStructure(tablaEstructuraFinal);

    // 3. Localizamos el item usando tu lógica de IDs
    const idH2 = enumeration.split(".")[0];

    let encontrado = false;

    if (level.toLowerCase() === "h1") {
      const h1Item = nuevaEstructura.find(
        (item) => item.level.toLowerCase() === "h1"
      );
      if (h1Item) {
        h1Item.text = newTitle;
        encontrado = true;
      }
    } else {
      const h2Padre = nuevaEstructura.find((item) => item.enumeration === idH2);
      if (h2Padre) {
        if (level.toLowerCase() === "h2") {
          h2Padre.text = newTitle;
          encontrado = true;
        } else if (level.toLowerCase() === "h3") {
          const h3Objetivo = h2Padre.children.find(
            (item) => item.enumeration === enumeration
          );
          if (h3Objetivo) {
            h3Objetivo.text = newTitle;
            encontrado = true;
          }
        }
      }
    }

    if (!encontrado) {
      showToast(
        "ERROR CRÍTICO: No se pudo localizar la sección en la estructura.",
        "error"
      );
      return;
    }

    // 4. USAMOS TU CONVERSOR (La clave del éxito)
    // Esto regenera el string de tablaEstructuraFinal exactamente como el sistema espera
    const nuevoMarkdown = convertStructureToMarkdown(nuevaEstructura);

    setTablaEstructuraFinal(nuevoMarkdown);
    markAsChanged();

    // 5. Actualizamos estados de UI
    setSelectedSectionForRegen((prevSection) => ({
      ...prevSection,
      text: newTitle,
    }));

    setRegenTextareaValue(newTitle);
    showToast("Edición local del título guardada exitosamente.", "success");
  };

  //Funcion para guardar el contenido de los titulos o subtitulos
  const guardarContenidoLocal = (fieldToUpdate, newValue) => {
    if (!selectedSectionForRegen) {
      showToast(
        "ERROR: No hay una sección seleccionada para guardar el contenido.",
        "error"
      );
      return;
    }

    // 1. Preparar valor
    const valueToSave = newValue ?? "";
    const propertyToUpdate = fieldToUpdate === "title" ? "text" : "content";

    // 2. Obtener estructura actual
    let nuevaEstructura = parseMarkdownStructure(tablaEstructuraFinal);
    const { level, enumeration } = selectedSectionForRegen;

    // 3. Localizar e inyectar el contenido (Tu lógica original de búsqueda)
    const idH2 = enumeration.split(".")[0];

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

    // 4. RECALCULO DE PALABRAS (Aquí está la clave)
    // Siempre recalculamos si se actualiza el contenido para que el Header se refresque
    if (fieldToUpdate === "content") {
      const nuevoTotalPalabras = recalcularPalabrasGeneradas(nuevaEstructura);
      // Usamos el nombre exacto de tu estado: setTotalGeneratedWords
      setTotalGeneratedWords(nuevoTotalPalabras);
    }

    // 5. Convertir a Markdown y actualizar estado principal
    const nuevoMarkdown = convertStructureToMarkdown(nuevaEstructura);
    setTablaEstructuraFinal(nuevoMarkdown);

    // 6. Persistencia y Limpieza
    if (typeof markAsChanged === "function") markAsChanged();

    setSelectedSectionForRegen(null);
    setSectionContentValue("");
    setRegenTextareaValue("");

    // Solo si definiste este estado antes
    if (typeof setTempContentUpdate === "function") {
      setTempContentUpdate(null);
    }

    const fieldName = fieldToUpdate === "title" ? "Título" : "Contenido";
    showToast(
      `${fieldName} guardado localmente y conteo actualizado.`,
      "success"
    );
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
  const moverSeccion = (sectionToMove, direction) => {
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

    apiService.logBlogEdit(
      blogId, // El ID del blog actual
      currentStructure, // Estructura vieja
      newStructure, // Estructura nueva
      {
        action: "reorder_section",
        section_id: sectionToMove.uniqueId,
        direction: direction,
        level: sectionToMove.level,
      }
    );

    // 4. Opcional: Persistir el cambio en la tabla principal del blog
    // Esto asegura que si el usuario refresca, el orden se mantiene
    apiService.updateBlog(blogId, { estructura_blog_json: newStructure });
  };

  //Maneja acciones de Mover y Eliminar, mostrando un toast de confirmación
  const gestionarAccionDeSeccion = (action, section, direction = null) => {
    switch (action) {
      case "move":
        moverSeccion(section, direction);
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

  const limpiarTodoElContenido = () => {
    // 1. Confirmación de seguridad
    if (
      !window.confirm(
        "¿Estás seguro de borrar TODO el contenido? Los títulos se mantendrán."
      )
    ) {
      return;
    }

    // 2. Parsear la estructura actual (que es un string Markdown) a un Array de objetos
    // Nota: Asegúrate de que parseMarkdownStructure esté disponible en tu scope
    const structure = parseMarkdownStructure(tablaEstructuraFinal);

    // 3. Recorrer y limpiar la propiedad 'content' de cada nodo
    const cleanedStructure = structure.map((item) => {
      // Limpiar contenido del nivel superior (H1 o H2)
      const newItem = { ...item, content: "" };

      // Limpiar contenido de los hijos (H3) si existen
      if (newItem.children && newItem.children.length > 0) {
        newItem.children = newItem.children.map((child) => ({
          ...child,
          content: "",
        }));
      }
      return newItem;
    }); // Cierre del map principal

    // 4. Convertir el objeto limpio de nuevo a string Markdown
    const newMarkdown = convertStructureToMarkdown(cleanedStructure);

    // 5. Actualizar los estados del componente
    setTablaEstructuraFinal(newMarkdown);

    // Si usas el sistema de "cambios pendientes" de tu archivo:
    if (typeof markAsChanged === "function") {
      markAsChanged();
    }

    alert("Contenido borrado exitosamente.");
  };

  const vistaEditable = () => {
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
    setEstadosUrls({}); // Limpiamos los estados de las URLs anteriores

    console.clear();
    console.log("[SCRAPING] Iniciando nueva ejecución de scraping...");

    const controller = new AbortController();
    referenciaControladorAborto.current = controller;
    const signal = controller.signal;

    // 2. Procesar URLs desde el estado listaUrls (los inputs individuales)
    const urlsLimpias = listaUrls
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    // Preparamos los datos para el envío y guardado
    const urlsParaBackend = urlsLimpias.map((u) => ({ url: u }));
    const rawInputParaDB = urlsLimpias.join("\n"); // Se guarda como string separado por saltos de línea
    const numResultados = urlsLimpias.length;

    // Validación: Mínimo 3 URLs
    if (numResultados < 3) {
      const msg = "Por favor, ingresa al menos 3 URLs válidas.";
      setError(msg);
      setCargandoScraping(false);
      referenciaControladorAborto.current = null;
      return;
    }

    // Extracción de parámetros de datosFinales (del useEffect o previos)
    const title_base = datosFinales?.title || "Análisis de URLs";
    const categoria = datosFinales?.categoria || "";
    const idioma = datosFinales?.idioma || "";
    const tecnica = datosFinales?.tecnica || "";
    const acento = datosFinales?.acento || "";
    const tono = datosFinales?.tono || "";

    const URL_API_SAVE = `${URL_API_BASE_BLOGS}${blogId}`;

    // =======================================================================
    // PASO 1: GUARDAR EL TEXTO RAW EN LA DB (Sincroniza los inputs con la BD)
    // =======================================================================
    try {
      const responseSave = await fetch(URL_API_SAVE, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ urls: rawInputParaDB }), // Guardamos el string unido por \n
        signal: signal,
      });

      if (!responseSave.ok) {
        const errorText = await responseSave.text();
        throw new Error(`Falló el guardado de URLs: ${errorText}`);
      }
      console.log("[SCRAPING] URLs guardadas en el blog exitosamente.");
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("[SCRAPING] Error al guardar URLs:", error);
        setError(`Fallo al guardar las URLs: ${error.message}`);
        if (typeof showToast === "function")
          showToast("Error al guardar URLs.", "error");
      }
      setCargandoScraping(false);
      referenciaControladorAborto.current = null;
      return;
    }

    // =======================================================================
    // PASO 2: EJECUTAR SCRAPING CON MANEJO DE ESTADOS POR URL
    // =======================================================================
    try {
      const finalScrapingUrl = `${URL_API_SCRAPING}/${blogId}`;

      const response = await fetch(finalScrapingUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "",
          urls: urlsParaBackend, // Enviamos el array de objetos {url: '...'}
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
          `Error HTTP: ${response.status} - Verifica el backend.`
        );
      }

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

            // 1. Detectar inicio de análisis por URL
            if (dataLine.includes("Procesando URL")) {
              const match = dataLine.match(/URL (\d+) de/);
              if (match) {
                const index = parseInt(match[1]) - 1;
                setEstadosUrls((prev) => ({ ...prev, [index]: "analizando" }));
              }
            }

            // 2. Detectar éxito de la URL
            if (
              dataLine.includes("✔️ URL") &&
              dataLine.includes("completada")
            ) {
              const match = dataLine.match(/URL (\d+) completada/);
              if (match) {
                const index = parseInt(match[1]) - 1;
                setEstadosUrls((prev) => ({ ...prev, [index]: "exito" }));
              }
            }

            // 3. Detectar errores
            if (
              dataLine.includes("Contenido nulo") ||
              dataLine.includes("Fallo estructural")
            ) {
              const match = dataLine.match(/URL (\d+)/);
              if (match) {
                const index = parseInt(match[1]) - 1;
                setEstadosUrls((prev) => ({ ...prev, [index]: "error" }));
              }
            }

            // --- MANEJO DE DATA FINAL ---
            if (currentEvent === "final_data") {
              try {
                const parsed = JSON.parse(dataLine);
                setDatosFinales((prevDatos) => ({ ...prevDatos, ...parsed }));

                const consolidatedContent = parsed.consolidated_content || null;

                // Si el backend generó una estructura, la guardamos también
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
                  }).catch((err) =>
                    console.error("Error guardando consolidado:", err)
                  );
                }

                setContenidoConsolidado(consolidatedContent);
                reader.cancel();
                setCargandoScraping(false);
                return;
              } catch (e) {
                console.error("[SCRAPING] Error parsing final JSON:", e);
              }
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("[SCRAPING] Error crítico:", err);
        setError(`Fallo la conexión: ${err.message}`);
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
  const actualizarTituloDeSeccion = (newTitle) => {
    if (
      !selectedSectionForRegen ||
      selectedSectionForRegen.level === "content"
    ) {
      showToast("Selección inválida para reemplazar título.", "error");
      return;
    }

    const estructuraActual = parseMarkdownStructure(tablaEstructuraFinal);
    let nuevaEstructura = [...estructuraActual];
    let found = false;

    const { level, enumeration } = selectedSectionForRegen;

    // Casos H1 y H2: Nivel raíz
    if (level === "h1" || level === "h2") {
      const index = nuevaEstructura.findIndex(
        (item) => item.level === level && item.enumeration === enumeration
      );

      if (index !== -1) {
        nuevaEstructura[index].text = newTitle;
        found = true;
      }
    }
    // Caso H3: Corregido para buscar al padre por enumeración, no por objeto .parent
    else if (level === "h3") {
      // Extraemos el ID del H2 (ej: de "2.1" obtenemos "2")
      const parentEnumeration = enumeration.split(".")[0];

      // Buscamos el H2 padre en la raíz [cite: 122]
      const h2Padre = nuevaEstructura.find(
        (item) => item.level === "h2" && item.enumeration === parentEnumeration
      );

      if (h2Padre && h2Padre.children) {
        // Buscamos el H3 dentro de los hijos del H2 encontrado [cite: 124]
        const h3Index = h2Padre.children.findIndex(
          (child) => child.level === "h3" && child.enumeration === enumeration
        );

        if (h3Index !== -1) {
          h2Padre.children[h3Index].text = newTitle;
          found = true;
        }
      }
    }

    if (!found) {
      console.error(
        `[FALLO] No se encontró: [${level.toUpperCase()} - ${enumeration}].`
      );
      showToast(
        "Error al reemplazar el título. No se encontró la sección.",
        "error"
      );
      return;
    }

    // Convertir y actualizar estados [cite: 135-137]
    const nuevoMarkdown = convertStructureToMarkdown(nuevaEstructura);
    setTablaEstructuraFinal(nuevoMarkdown);
    markAsChanged();
    setRegenTextareaValue(newTitle);

    // Actualizar la referencia de la sección seleccionada para que la UI refleje el cambio
    setSelectedSectionForRegen((prev) => ({ ...prev, text: newTitle }));

    showToast("Título actualizado con éxito.", "success");
  };

  //Funcion para la generacion de la estructura (H1, H2, H3)
  const generarEsquemaDelArticulo = useCallback(async () => {
    // 1. VALIDACIONES PREVIAS
    const idDelBlog = blogId;
    if (!datosFinales || !idDelBlog) {
      setError("Error: Faltan datos base o el ID del blog.");
      return;
    }

    const urlContent =
      referenciaUrls.current?.value.split("\n")[0].trim() || "";
    const consulta = (
      datosFinales?.title ||
      datosFinales?.query ||
      urlContent
    ).trim();

    if (consulta.length === 0) {
      setError("El tema principal está vacío.");
      return;
    }

    setCargandoIA(true);
    setError(null);

    try {
      // 2. LLAMADA AL ENDPOINT DE GENERACIÓN
      const response = await fetch(URL_API_IA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: consulta,
          blog_id: idDelBlog,
          title_base: consulta,
          categoria: datosFinales?.categoria || "",
          idioma: datosFinales?.idioma || "",
          tecnica: datosFinales?.tecnica || "",
          acento: datosFinales?.acento || "",
          tono: datosFinales?.tono || "",
        }),
      });

      if (!response.ok)
        throw new Error(`Error en la IA: ${response.statusText}`);

      const result = await response.json();
      const structureRaw = result.results || result.structure_markdown || "";

      // 3. LIMPIEZA DE TÍTULOS (Quitar Multimedia y SEO)
      // Esta regex elimina las líneas que empiezan por [MULTIMEDIA o RECOMENDACIÓN
      const soloTitulos = structureRaw
        .split("\n")
        .filter(
          (line) =>
            line.trim() !== "" &&
            !line.includes("[MULTIMEDIA") &&
            !line.includes("RECOMENDACIÓN SEO")
        )
        .join("\n");

      // 4. ACTUALIZACIÓN DE UI (Mantenemos la original con multimedia para el usuario)
      setTablaEstructuraFinal(structureRaw);
      setDatosFinales((prev) => ({
        ...prev,
        final_structure_object: result,
      }));

      // 5. GUARDADO EN LOGS (EVITANDO DUPLICADOS Y LIMPIANDO)
      try {
        await apiService.logInitialAI(
          idDelBlog,
          result.log?.id || datosFinales?.scraping_id || null,
          soloTitulos // Guardamos solo la lista de títulos numerados
        );
        console.log("✓ Log actualizado sin duplicados y solo títulos.");
      } catch (logErr) {
        console.error("Error al registrar log de IA:", logErr);
      }

      markAsChanged();
      showToast("✨ Estructura sincronizada correctamente.", "success");
    } catch (err) {
      console.error("[IA] Error:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setCargandoIA(false);
    }
  }, [blogId, datosFinales, URL_API_IA, markAsChanged, showToast]);

  // GENERACION DE CONTENIDO PARA SECCIÓN ESPECÍFICA
  const generarContenidoSeccion = async () => {
    if (!selectedSectionForRegen) {
      showToast(
        "ERROR: Faltan datos clave (Sección o Contenido Consolidado).",
        "error"
      );
      return;
    }

    setCargandoIA(true);
    setError(null);

    // --- GENERACIÓN DE CONTEXTO ---
    let contextData = "";
    const sectionId = selectedSectionForRegen.uniqueId;
    const targetSection = selectedSectionForRegen;

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

    const finalContextData = contextData.length > 50 ? contextData : "";
    const blogId = datosFinales.id;

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

      if (result.generated_content) {
        const nuevoContenido = result.generated_content.trim();

        // 1. Actualizar estados de UI
        setSectionContentValue(nuevoContenido);
        setTempContentUpdate({
          uniqueId: selectedSectionForRegen.uniqueId,
          newContent: nuevoContenido,
        });

        // 2. RECALCULAR CONTEO (Fuente de Verdad)
        // Importante: parsear la estructura de la tabla actual
        let estructuraActual = parseMarkdownStructure(tablaEstructuraFinal);

        const inyectarContenido = (items) => {
          return items.map((item) => {
            // Clonamos el item para no mutar el original
            let nuevoItem = { ...item };

            if (nuevoItem.uniqueId === selectedSectionForRegen.uniqueId) {
              nuevoItem.content = nuevoContenido;
            }

            if (nuevoItem.children && nuevoItem.children.length > 0) {
              nuevoItem.children = inyectarContenido(nuevoItem.children);
            }

            return nuevoItem;
          });
        };

        const estructuraConNuevoContenido = inyectarContenido(estructuraActual);

        // 3. Ejecutar el conteo sobre la estructura simulada
        const totalPalabras = recalcularPalabrasGeneradas(
          estructuraConNuevoContenido
        );

        // Asegúrate de que el nombre del estado sea exactamente el que usas en el componente
        setTotalGeneratedWords(totalPalabras);

        showToast(
          "Contenido generado con éxito. Revisa el contador en la parte superior.",
          "success"
        );
      } else {
        throw new Error("La IA no devolvió contenido válido.");
      }
    } catch (err) {
      console.error("Error al generar contenido con IA:", err);
      showToast(`Error: ${err.message}`, "error");
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
    const idDelBlog = blogId;

    if (!idDelBlog) {
      showToast("Error: No se encontró el ID del blog.", "error");
      return;
    }
    if (!tablaEstructuraFinal) {
      showToast("Error: La estructura está vacía.", "error");
      return;
    }

    setCargandoIA(true);
    setCancelacionSolicitada(false);

    const controller = new AbortController();
    referenciaControladorAborto.current = controller;

    // 1. Obtenemos la estructura base (solo títulos al inicio)
    let estructuraAnidada = parseMarkdownStructure(tablaEstructuraFinal);

    showToast("Iniciando generación de contenido...", "info");

    let estructuraTemporal = estructuraAnidada;
    let generatedContentHistory = [];
    const palabrasObjetivo = estimatedWordCount;
    const totalSubsecciones = contarTotalSubsecciones(estructuraAnidada);

    let palabrasAcumuladas = recalcularPalabrasGeneradas(estructuraAnidada);
    let subseccionesGeneradas = recalcularSubseccionesGeneradas(
      estructuraAnidada,
      contarPalabras
    );

    // 2. BUCLE DE GENERACIÓN
    for (const h2Block of estructuraAnidada) {
      if (cancelacionSolicitada) break;

      const estaGenerado =
        h2Block.content && h2Block.children.every((h3) => h3.content);
      if (estaGenerado && contarPalabras(h2Block.content) > 0) continue;

      setSelectedSectionForRegen(h2Block);

      const cleanH2Text = stripHtml(h2Block.text);
      const blockTitle = h2Block.enumeration + ". " + cleanH2Text;
      const blockMarkdownToGenerate = [
        `## ${h2Block.enumeration}. ${cleanH2Text}`,
        ...h2Block.children.map(
          (h3) => `### ${h3.enumeration}. ${stripHtml(h3.text)}`
        ),
      ].join("\n");

      const fullStructureMarkdown =
        convertStructureToMarkdown(estructuraTemporal);

      let subseccionesEnBloqueActual =
        !h2Block.content || contarPalabras(h2Block.content) === 0 ? 1 : 0;
      h2Block.children.forEach((h3) => {
        if (!h3.content || contarPalabras(h3.content) === 0)
          subseccionesEnBloqueActual++;
      });

      const subseccionesPendientes = Math.max(
        1,
        totalSubsecciones - subseccionesGeneradas
      );
      const limiteFinal = Math.max(
        100,
        Math.ceil(
          ((palabrasObjetivo - palabrasAcumuladas) / subseccionesPendientes) *
            subseccionesEnBloqueActual
        )
      );

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

        const result = await response.json();
        if (result.success !== "True") throw new Error("IA Error");

        const rawContent =
          typeof result.generated_content === "string"
            ? result.generated_content
            : String(result.generated_content || "");
        let generatedContentMap;
        try {
          generatedContentMap = JSON.parse(
            rawContent.trim().replace(/```json\s*|```/g, "")
          );
        } catch (e) {
          generatedContentMap = JSON.parse(rawContent.trim());
        }

        // ACTUALIZACIÓN DE LA ESTRUCTURA CON CONTENIDO
        estructuraTemporal = estructuraTemporal.map((h2Padre) => {
          if (h2Padre.enumeration !== h2Block.enumeration) return h2Padre;
          let h2Actualizado = { ...h2Padre };
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

        setTablaEstructuraFinal(convertStructureToMarkdown(estructuraTemporal));
        palabrasAcumuladas = recalcularPalabrasGeneradas(estructuraTemporal);
        subseccionesGeneradas = recalcularSubseccionesGeneradas(
          estructuraTemporal,
          contarPalabras
        );
      } catch (error) {
        if (error.name === "AbortError") break;
        console.error(error);
        break;
      }
    }

    // =======================================================================
    // 3. REGISTRO FINAL: AQUÍ ES DONDE SE GUARDA TODO
    // =======================================================================
    if (!cancelacionSolicitada) {
      try {
        // ESTO genera el string de títulos (solo títulos)
        const titulosLimpiosParaLog = estructuraTemporal
          .map((h2) => {
            const h2Text = `[H2 - ${h2.enumeration}] ${stripHtml(h2.text)}`;
            const h3Texts = h2.children
              .map((h3) => `   [H3 - ${h3.enumeration}] ${stripHtml(h3.text)}`)
              .join("\n");
            return h2Text + (h3Texts ? "\n" + h3Texts : "");
          })
          .join("\n");

        // LLAMADA AL SERVICIO
        // IMPORTANTE: titles_after recibe el string de títulos.
        // structure_after recibe el OBJETO estructuraTemporal (JSON con contenido).
        await apiService.logBlogStructureEdit(
          idDelBlog,
          titulosLimpiosParaLog, // Se guarda en titles_after (string)
          estructuraTemporal, // Se guarda en structure_after (JSON COMPLETO CON CONTENIDO)
          "content_finalized",
          {
            source: "generarContenidoCompleto",
            total_words: palabrasAcumuladas,
          }
        );
        console.log("✓ Estructura completa y títulos guardados.");
      } catch (finalLogErr) {
        console.error("Error al registrar log final:", finalLogErr);
      }
    }

    setCargandoIA(false);
    showToast("Generación finalizada.", "info");
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
              {(item.multimediaDescription || item.multimedia_description) && (
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
                      className={`uil ${
                        item.multimedia?.includes("VIDEO")
                          ? "uil-video"
                          : "uil-camera"
                      }`}
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
                    {item.multimediaDescription || item.multimedia_description}
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
                  onChange={cambiarEstado}
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
                  onChange={cambiarPrioridad}
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

          {listaUrls.map((url, index) => (
            <div key={index} className="url-container">
              <div className="url-input-group">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => manejarCambioUrl(index, e.target.value)}
                  placeholder={`https://ejemplo${index + 1}.com`}
                  className={`auto-expand ${estadosUrls[index]}`}
                  disabled={cargandoScraping}
                />

                {/* Botón X Mejorado */}
                <button
                  type="button"
                  className="btn-remove-url"
                  onClick={() => eliminarCampoUrl(index)}
                  disabled={cargandoScraping}
                  title="Eliminar URL"
                >
                  ✕
                </button>
              </div>

              {/* Etiqueta de Estado */}
              <div className="url-status-label">
                {estadosUrls[index] === "analizando" && (
                  <span className="status-text analyzing">
                    ⏳ Analizando contenido...
                  </span>
                )}
                {estadosUrls[index] === "exito" && (
                  <span className="status-text success">
                    ✅ Contenido Analizado
                  </span>
                )}
                {estadosUrls[index] === "error" && (
                  <span className="status-text error">
                    ⚠️ No se pudo analizar
                  </span>
                )}
                {!estadosUrls[index] && url.trim() !== "" && (
                  <span className="status-text pending">
                    ⚪ Esperando análisis
                  </span>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={agregarCampoUrl}
            disabled={cargandoScraping}
            className="btn-add-h2"
          >
            + Añadir otra URL
          </button>

          {/* Botón de Ejecución/Cancelación */}
          <button
            onClick={cargandoScraping ? cancelarScraping : ejecutarScraping}
            className={`btn-generate ${cargandoScraping ? "btn-cancel" : ""}`}
            // El botón se deshabilita si:
            // 1. No estamos cargando Y no hay al menos 3 URLs con texto.
            disabled={
              !cargandoScraping &&
              listaUrls.filter((url) => url.trim() !== "").length < 3
            }
          >
            {cargandoScraping ? "Cancelar Analizador" : "Analizar Google"}
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
            onClick={() => tarjetasInformacion("preconfiguracionUnificada")}
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
                  onClick={generarEsquemaDelArticulo}
                  className="btn-generate"
                  disabled={cargandoIA}
                >
                  {cargandoIA
                    ? "Generando Estructura Interna...."
                    : "Generar Estructura Final"}
                </button>
              </section>
            )}

            {/*BOTONES DE ACCIÓN PRINCIPALES*/}
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
                      onClick={generarEsquemaDelArticulo}
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
            {(resultadosDisponibles || tablaEstructuraFinal) && (
              <div
                style={{
                  marginBottom: "15px",
                  display: "flex",
                  gap: "10px",
                }}
              >
                {/* 3. Borrar Todo el Contenido */}
                <button
                  onClick={limpiarTodoElContenido}
                  className="btn-download "
                  title="Borrar contenido de todas las secciones"
                  style={{ flex: 1, backgroundColor: "#e74c3c" }} // <--- Esto hace que se expanda equitativamente
                >
                  <i className="uil uil-trash-alt"></i> Borrar Todo el Contenido
                </button>

                {/* --- BOTÓN DE GUARDAR ESTRUCTURA --- */}
                <button
                  className={`btn-download ${
                    hasUnsavedChanges &&
                    !isSaving &&
                    localBlogId &&
                    tablaEstructuraFinal
                      ? "btn-active-save"
                      : "btn-disabled"
                  }`}
                  onClick={guardarArticulo}
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
                  style={{ flex: 1 }} // <--- Esto hace que se expanda equitativamente
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
              </div>
            )}

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
                disabled={!selectedSectionForRegen || !tablaEstructuraFinal}
              >
                <i className="uil uil-plus-circle"></i> Agregar Subsección H3
              </button>
            </div>

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
                            [{ color: [] }],
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
                              onClick={() =>
                                actualizarTituloDeSeccion(suggestion)
                              }
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
                      onClick={guardarCambiosTitulo}
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
                        [{ color: [] }],
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
                    onClick={generarContenidoSeccion}
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
                  onClick={vistaEditable}
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

                  {/* INDICADORES DE PALABRAS */}

                  {TotalGeneratedWords > 0 && (
                    <span className="count-badge generated">
                      <i className="uil uil-pen"></i>Generadas:
                      <strong>
                        {TotalGeneratedWords.toLocaleString()}
                      </strong>{" "}
                    </span>
                  )}

                  {/* RENDERIZADO DE LA ESTRUCTURA EDITABLE */}
                  {tablaEstructuraFinal ? (
                    <StructureRenderer
                      structure={structureWithCount}
                      onSelect={seleccionarSeccionEdicion}
                      onAction={gestionarAccionDeSeccion}
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
                  <button
                    onClick={descargarArticuloDocs}
                    className="btn-download"
                  >
                    <i className=" uil-file-download"></i> Descargar Word
                  </button>
                  {/* Contenido principal del blog: Renderiza la estructura dinámica */}
                  {renderizarContenidoDelBlog(structureWithCount)}
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
