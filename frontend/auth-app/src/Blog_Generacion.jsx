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
import { useCurrentUser } from "./hooks/useApi.js";
import { isAdminUser, isEditorUser } from "./utils/roles";

// --- IMPORTACIONES TIPTAP ---
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";

// Añade esta pequeña función arriba en tu componente
const stripHtml = (html) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const MenuBar = ({ editor }) => {
  const [showPopover, setShowPopover] = useState(false);
  if (!editor) return null;

  return (
    <div className="tiptap-toolbar">
      {/* --- FORMATO DE TEXTO --- */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive("bold") ? "is-active" : ""}
        title="Negrita"
      >
        <i className="uil uil-bold"></i>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive("italic") ? "is-active" : ""}
        title="Itálica"
      >
        <i className="uil uil-italic"></i>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={editor.isActive("underline") ? "is-active" : ""}
        title="Subrayar"
      >
        <i className="uil uil-underline"></i>
      </button>

      <div style={{ position: "relative", display: "inline-block" }}>
        <button
          type="button"
          onClick={() => setShowPopover(!showPopover)}
          className={editor.isActive("link") ? "is-active" : ""}
        >
          <i className="uil uil-link"></i>
        </button>

        {/* SI EL BOTÓN SE ACTIVA, MOSTRAMOS EL POPOVER JUSTO DEBAJO */}
        {showPopover && (
          <div
            style={{ position: "absolute", top: "100%", left: 0, zIndex: 999 }}
          >
            <LinkPopover editor={editor} />
          </div>
        )}
      </div>

      {/* Botón para quitar el link rápidamente si ya existe uno */}
      {editor.isActive("link") && (
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetLink().run()}
          title="Quitar Enlace"
        >
          <i className="uil uil-link-broken"></i>
        </button>
      )}

      <div className="toolbar-separator"></div>

      {/* --- COLORES --- */}
      <input
        type="color"
        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        value={editor.getAttributes("textStyle").color || "#000000"}
        title="Color de texto"
      />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={editor.isActive("highlight") ? "is-active" : ""}
        title="Resaltar"
      >
        <i className="uil uil-edit-alt"></i>
      </button>

      <div className="toolbar-separator"></div>

      {/* --- ALINEACIÓN --- */}
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        className={editor.isActive({ textAlign: "left" }) ? "is-active" : ""}
      >
        <i className="uil uil-align-left"></i>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        className={editor.isActive({ textAlign: "center" }) ? "is-active" : ""}
      >
        <i className="uil uil-align-center"></i>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        className={editor.isActive({ textAlign: "justify" }) ? "is-active" : ""}
      >
        <i className="uil uil-align-justify"></i>
      </button>

      <div className="toolbar-separator"></div>

      {/* --- LISTAS Y TABLAS --- */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive("bulletList") ? "is-active" : ""}
      >
        <i className="uil uil-list-ul"></i>
      </button>

      {/* Solo mostramos el botón de insertar si NO estamos dentro de una tabla */}
      {!editor.isActive("table") && (
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          title="Insertar Tabla"
        >
          <i className="uil uil-table"></i>
        </button>
      )}

      {/* --- MENÚ DINÁMICO: Solo visible dentro de una tabla --- */}
      {editor.isActive("table") && (
        <>
          <div className="toolbar-separator color-sep"></div>

          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="Añadir Columna"
          >
            <i className="uil uil-columns"></i>+
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="Eliminar Columna"
          >
            <i className="uil uil-columns"></i>-
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="Añadir Fila"
          >
            <i className="uil uil-layers"></i>+
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="Eliminar Fila"
          >
            <i className="uil uil-layers"></i>-
          </button>

          {/* COLOR DE FONDO DE CELDA (Requiere customTableCell en useEditor) */}
          <div className="cell-color-wrapper" title="Fondo de celda">
            <i className="uil uil-paint-tool"></i>
            <input
              type="color"
              onInput={(e) => {
                const color = e.target.value;
                // Comando directo al nodo seleccionado
                editor
                  .chain()
                  .focus()
                  .updateAttributes("tableCell", { backgroundColor: color })
                  .run();
              }}
              // Esto asegura que el input muestre el color actual de la celda
              value={
                editor.getAttributes("tableCell").backgroundColor || "#ffffff"
              }
            />
          </div>

          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="btn-delete-table"
            title="Eliminar toda la tabla"
          >
            <i className="uil uil-trash-alt"></i>
          </button>
        </>
      )}

      <div className="toolbar-separator"></div>

      {/* --- UTILIDADES --- */}
      <button
        type="button"
        onClick={() =>
          editor.chain().focus().unsetAllMarks().clearNodes().run()
        }
        title="Borrar formato"
      >
        <i className="uil uil-sync-slash"></i>
      </button>
    </div>
  );
};

const LinkPopover = ({ editor }) => {
  const [url, setUrl] = useState("");

  // Sincronizar el input con el link actual del editor
  const linkHref = editor?.getAttributes("link").href;
  useEffect(() => {
    if (editor) {
      setUrl(linkHref || "");
    }
  }, [editor, linkHref]);

  if (!editor) return null;

  const applyLink = () => {
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setUrl("");
  };

  return (
    <div className="tiptap-popover-card">
      <div className="tiptap-input-group">
        <input
          className="tiptap-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Pegar enlace..."
          onKeyDown={(e) => e.key === "Enter" && applyLink()}
        />
        <button
          onClick={applyLink}
          className="tiptap-button-check"
          title="Aplicar"
        >
          <i className="uil uil-check"></i>
        </button>
        <button
          onClick={removeLink}
          className="tiptap-button-trash"
          title="Eliminar"
        >
          <i className="uil uil-trash-alt"></i>
        </button>
      </div>
    </div>
  );
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
  const [revisandoIA, setRevisandoIA] = useState(false);
  const [, setErroresRevisionIA] = useState([]);

  const { user: currentUser } = useCurrentUser();

  const [isDarkMode, setIsDarkMode] = useState(false);

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
  const URL_API_SCRAPING = "http://192.168.1.129:8080/scraping/stream";
  const URL_CONTENIDO_SECCION = "http://192.168.1.129:8080/ai/generate_content";
  const URL_API_IA = "http://192.168.1.129:8080/ai/generate_structure";
  const URL_API_BASE_BLOGS = "http://192.168.1.129:8080/blogs/";
  const URL_API_IA_COMPLETO =
    "http://192.168.1.129:8080/ai/generate_full_content";

  const URL_API_IA_DOWNLOAD = "http://192.168.1.129:8080/ai/download_blog_doc";

  const URL_API_IA_REGEN = "http://192.168.1.129:8080/ai/regenerate_titles";

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
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };
  useEffect(() => {
    if (isDarkMode) {
      document.body.style.backgroundColor = "#0f172a";
      document.body.classList.add("dark-mode-active"); // Opcional por si quieres usar clases en el body
    } else {
      document.body.style.backgroundColor = "#f8fafc";
      document.body.classList.remove("dark-mode-active");
    }
  }, [isDarkMode]); // Se ejecuta cada vez que cambies el switch

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
  // ESTADOS PARA PREGUNTAS FRECUENTES
  // =======================================================================
  const [faqKeyword, setFaqKeyword] = useState("");
  const [, setGoogleFaqs] = useState([]);
  const [loadingFaqs, setLoadingFaqs] = useState(false);

  // CORRECCIÓN: Usar datosFinales que es tu estado real
  useEffect(() => {
    // Verificamos que datosFinales tenga el título y que faqKeyword esté vacío
    // para no borrar lo que el usuario escriba manualmente después
    if (datosFinales?.title && !faqKeyword) {
      setFaqKeyword(datosFinales.title);
    }
  }, [datosFinales, faqKeyword]);

  // -----------------------------------------------------------------------
  // EDITORES DE TEXTO ENRIQUECIDO CON TIPTAP
  // -----------------------------------------------------------------------
  // Define esto fuera del componente o arriba para no repetir código
  const customTableCell = TableCell.extend({
    addAttributes() {
      return {
        // Mantenemos los atributos originales (colspan, rowspan, etc.)
        ...this.parent?.(),
        backgroundColor: {
          default: null,
          // Al leer el HTML, buscamos el color en el estilo
          parseHTML: (element) => element.style.backgroundColor || null,
          // Al generar el HTML, forzamos el atributo style
          renderHTML: (attributes) => {
            if (!attributes.backgroundColor) {
              return {};
            }
            return {
              style: `background-color: ${attributes.backgroundColor}; border: 1px solid #ced4da;`,
            };
          },
        },
      };
    },
  });

  // Editor para el TÍTULO
  const editorTitulo = useEditor(
    {
      extensions: [
        StarterKit,
        TextStyle,
        Color.configure({ types: [TextStyle.name, "listing"] }),
        FontFamily,
        Underline,
        Link,
        Table.configure({
          resizable: true,
          allowTableNodeSelection: true,
          lastColumnResizable: true,
        }),
        Image.configure({
          inline: true,
          allowBase64: true,
        }),
        TableRow,
        TableHeader,
        customTableCell,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: ["heading", "paragraph", "tableCell"] }),
        Placeholder.configure({ placeholder: "Escribe aquí..." }),
      ],
      content: regenTextareaValue,
      // --- ESTA ES LA PARTE CLAVE PARA PEGAR IMÁGENES ---
      editorProps: {
        handlePaste: (view, event) => {
          const items = (
            event.clipboardData || event.originalEvent.clipboardData
          ).items;
          for (const item of items) {
            if (item.type.indexOf("image") === 0) {
              const blob = item.getAsFile();
              const reader = new FileReader();
              reader.onload = (e) => {
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({
                      src: e.target.result,
                    }),
                  ),
                );
              };
              reader.readAsDataURL(blob);
              return true; // Impedimos el pegado por defecto para manejarlo nosotros
            }
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => setRegenTextareaValue(editor.getHTML()),
    },
    [regenTextareaValue],
  ); // Recomendado añadir dependencia si el contenido inicial cambia

  // Editor para el CONTENIDO
  const editorContenido = useEditor(
    {
      extensions: [
        StarterKit,
        TextStyle,
        Color.configure({ types: [TextStyle.name, "listing"] }),
        FontFamily,
        Underline,
        Link,
        Table.configure({ resizable: true, allowTableNodeSelection: true }),
        Image.configure({
          inline: true,
          allowBase64: true,
        }),
        TableRow,
        TableHeader,
        customTableCell,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: ["heading", "paragraph", "tableCell"] }),
        Placeholder.configure({ placeholder: "Escribe aquí..." }),
      ],
      content: sectionContentValue,
      // --- MISMA LÓGICA DE PEGADO AQUÍ ---
      editorProps: {
        handlePaste: (view, event) => {
          const items = (
            event.clipboardData || event.originalEvent.clipboardData
          ).items;
          for (const item of items) {
            if (item.type.indexOf("image") === 0) {
              const blob = item.getAsFile();
              const reader = new FileReader();
              reader.onload = (e) => {
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({
                      src: e.target.result,
                    }),
                  ),
                );
              };
              reader.readAsDataURL(blob);
              return true;
            }
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => setSectionContentValue(editor.getHTML()),
    },
    [sectionContentValue],
  );

  // Sincronizar TipTap cuando el estado de React cambie (por carga de API o IA)
  useEffect(() => {
    if (editorTitulo && regenTextareaValue !== editorTitulo.getHTML()) {
      editorTitulo.commands.setContent(regenTextareaValue || "");
    }
  }, [regenTextareaValue, editorTitulo]);

  useEffect(() => {
    if (editorContenido && sectionContentValue !== editorContenido.getHTML()) {
      editorContenido.commands.setContent(sectionContentValue || "");
    }
  }, [sectionContentValue, editorContenido]);
  // -----------------------------------------------------------------------
  // FIN EDITOR DE TEXTO
  // -----------------------------------------------------------------------

  const copiarContenidoAlPortapapeles = async () => {
    if (!structureWithCount || structureWithCount.length === 0) return;

    // 1. Construimos el HTML (Incluyendo H4)
    let htmlContenido = `<html><body style="font-family: Arial, sans-serif; line-height: 1.6;">`;

    structureWithCount.forEach((item) => {
      // H1, H2
      if (item.text) {
        const tag = item.level || "h2";
        htmlContenido += `<${tag}>${item.text}</${tag}>`;
      }
      if (item.content) htmlContenido += `<div>${item.content}</div>`;

      // Hijos (H3)
      if (item.children && item.children.length > 0) {
        item.children.forEach((child) => {
          if (child.text) htmlContenido += `<h3>${child.text}</h3>`;
          if (child.content) htmlContenido += `<div>${child.content}</div>`;

          // NUEVO: Procesar H4 (Nietos)
          if (child.children && child.children.length > 0) {
            child.children.forEach((grandChild) => {
              if (grandChild.text)
                htmlContenido += `<h4>${grandChild.text}</h4>`;
              if (grandChild.content)
                htmlContenido += `<div>${grandChild.content}</div>`;
            });
          }
        });
      }
    });
    htmlContenido += `</body></html>`;

    // 2. Intentar copiado moderno (Solo funciona en HTTPS)
    if (navigator.clipboard && window.isSecureContext && window.ClipboardItem) {
      try {
        const textoPlano = htmlContenido
          .replace(/<[^>]*>/g, "")
          .replace(/\n\s*\n/g, "\n\n");
        const blobHtml = new Blob([htmlContenido], { type: "text/html" });
        const blobText = new Blob([textoPlano], { type: "text/plain" });

        const data = [
          new ClipboardItem({
            "text/html": blobHtml,
            "text/plain": blobText,
          }),
        ];

        await navigator.clipboard.write(data);
        showToast("Contenido copiado con formato", "success");
        return; // Éxito
      } catch (err) {
        console.warn("Clipboard API falló, intentando fallback...", err);
      }
    }

    // 3. FALLBACK PARA HTTP (Mantiene el formato HTML al pegar en Word/Google Docs)
    try {
      const handler = (e) => {
        e.clipboardData.setData("text/html", htmlContenido);
        e.clipboardData.setData(
          "text/plain",
          htmlContenido.replace(/<[^>]*>/g, ""),
        );
        e.preventDefault();
      };

      document.addEventListener("copy", handler);
      const textArea = document.createElement("textarea");
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const exito = document.execCommand("copy");
      document.removeEventListener("copy", handler);
      document.body.removeChild(textArea);

      if (exito) {
        showToast("Copiado con formato (Modo HTTP)", "success");
      } else {
        throw new Error("Fallback falló");
      }
    } catch (err) {
      console.error("Error final al copiar:", err);
      showToast("No se pudo copiar el contenido", "error");
    }
  };

  // =======================================================================
  // 7. FUNCIONES DE UTILIDAD Y LÓGICA DE DATOS
  //    (Toast, Markdown Parser/Writer, Toggle de UI)
  // =======================================================================

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  // 2. Función para marcar que algo ha cambiado (activa el botón de guardar)
  const markAsChanged = useCallback(() => {
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  }, [hasUnsavedChanges]);

  // ───────────────────────────────────────────────────────────────────────
  // REVISIÓN ORTOGRÁFICA POR IA (OpenAI)
  // ───────────────────────────────────────────────────────────────────────

  // Inserta <mark class="ia-spell-error"> alrededor de cada palabra/expresión
  // detectada como error ortográfico, sin alterar las marcas de estructura
  // del Markdown ([H1 - 0.0], [CONTENIDO], [MULTIMEDIA: ...]).
  const aplicarResaltadoErrores = useCallback((markdown, errores) => {
    if (!markdown || !errores?.length) return markdown;

    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const esPalabraSimple = (s) => /^[\wÁÉÍÓÚÜÑáéíóúüñ\-']+$/u.test(s);

    let resultado = markdown;
    for (const err of errores) {
      const wrong = err.wrong || "";
      const correct = err.correct || "";
      const reason = err.reason || "ortografía";
      if (!wrong || wrong === correct) continue;

      const titleAttr = `Sugerencia: ${correct} (${reason})`
        .replace(/"/g, "&quot;");
      const replacement =
        `<mark class="ia-spell-error" data-correct="${correct.replace(/"/g, "&quot;")}" ` +
        `title="${titleAttr}">${wrong}</mark>`;

      // Si es palabra simple usamos word boundaries; si lleva espacios o
      // signos, hacemos match literal.
      const pattern = esPalabraSimple(wrong)
        ? new RegExp(`(?<![\\wÁÉÍÓÚÜÑáéíóúüñ])${escapeRegex(wrong)}(?![\\wÁÉÍÓÚÜÑáéíóúüñ])`, "g")
        : new RegExp(escapeRegex(wrong), "g");

      // Evitamos volver a envolver una ocurrencia ya marcada.
      resultado = resultado.replace(pattern, (match, offset, full) => {
        const before = full.slice(Math.max(0, offset - 40), offset);
        if (/<mark class="ia-spell-error"[^>]*>[^<]*$/.test(before)) {
          return match;
        }
        return replacement;
      });
    }
    return resultado;
  }, []);

  // Handler del botón "Revisar con IA"
  const revisarConIA = useCallback(async () => {
    if (!localBlogId || !tablaEstructuraFinal || revisandoIA) return;
    setRevisandoIA(true);
    try {
      const data = await apiService.reviewBlogWithAI(localBlogId);
      const errores = Array.isArray(data?.errors) ? data.errors : [];

      if (errores.length === 0) {
        showToast("Revisión completada: no se detectaron errores ortográficos.", "success");
      } else {
        const nuevoMarkdown = aplicarResaltadoErrores(tablaEstructuraFinal, errores);
        setTablaEstructuraFinal(nuevoMarkdown);
        setErroresRevisionIA(errores);
        markAsChanged();
        showToast(
          `Revisión completada: ${errores.length} ${errores.length === 1 ? "error detectado" : "errores detectados"} y resaltados en amarillo.`,
          "success"
        );
      }

      // Pasar el blog a estado "Revisado con IA"
      setBlogStatus("reviewed_ai");
      try {
        await apiService.updateBlog(localBlogId, {
          estado: "reviewed_ai",
          estructura_blog_json:
            errores.length > 0
              ? aplicarResaltadoErrores(tablaEstructuraFinal, errores)
              : tablaEstructuraFinal,
        });
      } catch (persistErr) {
        console.error("No se pudo persistir el nuevo estado:", persistErr);
      }
    } catch (error) {
      console.error("Error en revisión IA:", error);
      showToast(
        `Error al revisar con IA: ${error?.message || "intenta nuevamente."}`,
        "error"
      );
    } finally {
      setRevisandoIA(false);
    }
  }, [
    localBlogId,
    tablaEstructuraFinal,
    revisandoIA,
    aplicarResaltadoErrores,
    markAsChanged,
    showToast,
  ]);

  // 3. Lógica principal de Guardado de la estructura (POST/PUT)
  const guardarArticulo = useCallback(async () => {
    if (isSaving || !localBlogId) return;

    setIsSaving(true);
    try {
      // 1. Guardado persistente en la tabla BLOGS
      const payload = {
        estructura_blog_json: tablaEstructuraFinal,
        estado: blogStatus,
        prioridad: blogPriority,
        estimated_word_count: TotalGeneratedWords,
      };

      await apiService.updateBlog(localBlogId, payload);

      // =======================================================================
      // 2. NUEVO: REGISTRO EN blog_structure_logs (columna structure_after)
      // =======================================================================
      try {
        // Convertimos el Markdown de la tabla a Objeto JSON para el log
        const estructuraParaLog = parseMarkdownStructure(tablaEstructuraFinal);

        // Generamos el string de títulos para la columna titles_after
        const h1Titulo = datosFinales?.title || "Título del Blog";
        const titulosLog =
          `[H1 - 0.0] ${h1Titulo}\n` +
          estructuraParaLog
            .map((h2) => {
              const h2Enum = h2.enumeration.toString().includes(".")
                ? h2.enumeration
                : `${h2.enumeration}.0`;
              return (
                `[H2 - ${h2Enum}] ${stripHtml(h2.text)}\n` +
                h2.children
                  .map((h3) => `[H3 - ${h3.enumeration}] ${stripHtml(h3.text)}`)
                  .join("\n")
              );
            })
            .join("\n");

        // Enviamos al log de estructura
        await apiService.logBlogStructureEdit(
          localBlogId,
          titulosLog, // titles_after
          estructuraParaLog, // structure_after (El JSON con contenido)
          "manual_save", // action_type
          { info: "Guardado manual desde el botón Guardar" }, // context
        );

        console.log("✓ Cambio registrado en el historial de estructura.");
      } catch (logErr) {
        // Solo logeamos el error, no detenemos el éxito del guardado principal
        console.error("Error al registrar log de estructura:", logErr);
      }
      // =======================================================================

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
    datosFinales,
    showToast,
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
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
        const h1Line = `[H1 - ${item.enumeration}] ${item.text.trim()}`;
        markdownLines.push(h1Line);

        if (item.multimedia && item.multimediaDescription) {
          markdownLines.push(
            `[MULTIMEDIA: ${item.multimedia} | ${item.multimediaDescription.trim()}]`,
          );
        }

        if (item.content) {
          markdownLines.push("[CONTENIDO]");
          markdownLines.push(item.content);
          markdownLines.push("");
        }
        return;
      }

      // --- 1. LÓGICA DE H2 ---
      h2Counter++;
      const h2Enumeration = h2Counter.toString();
      const h2Line = `[H2 - ${h2Enumeration}] ${item.text.trim()}`;
      markdownLines.push(h2Line);

      if (item.multimedia && item.multimediaDescription) {
        markdownLines.push(
          `[MULTIMEDIA: ${item.multimedia} | ${item.multimediaDescription.trim()}]`,
        );
      }

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
              `[MULTIMEDIA: ${h3Item.multimedia} | ${h3Item.multimediaDescription.trim()}]`,
            );
          }

          if (h3Item.content) {
            markdownLines.push("[CONTENIDO]");
            markdownLines.push(h3Item.content);
            markdownLines.push("");
          }

          // --- 3. NUEVA LÓGICA DE H4 (Hijos del H3) ---
          let h4Counter = 0;
          if (h3Item.children && h3Item.children.length > 0) {
            h3Item.children.forEach((h4Item) => {
              h4Counter++;
              const h4Enumeration = `${h3Enumeration}.${h4Counter}`;

              const h4Line = `[H4 - ${h4Enumeration}] ${h4Item.text.trim()}`;
              markdownLines.push(h4Line);

              if (h4Item.multimedia && h4Item.multimediaDescription) {
                markdownLines.push(
                  `[MULTIMEDIA: ${h4Item.multimedia} | ${h4Item.multimediaDescription.trim()}]`,
                );
              }

              if (h4Item.content) {
                markdownLines.push("[CONTENIDO]");
                markdownLines.push(h4Item.content);
                markdownLines.push("");
              }
            });
          }
        });
      }

      // Separador final para bloques H2
      if (markdownLines[markdownLines.length - 1] !== "") {
        markdownLines.push("");
      }
    });

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
            markdown,
          );
          return [];
        }
      }
    } else if (typeof finalStructureString !== "string") {
      console.error(
        "parseMarkdownStructure recibió un valor inesperado (no string ni object):",
        finalStructureString,
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
    let lastH3 = null;
    let itemActual = null;
    let isProcessingStructure = false;

    // El resto de la lógica de parsing de Markdown se mantiene intacta
    const structuredRegex = /^\[(H\d+)\s*-\s*([\d.]*)[\]>]\s*(.*)/i;
    const separateMediaRegex =
      /^\[MULTIMEDIA:\s*(VIDEO|FOTO|MAPA|GRAFICO|IMAGEN|IMAGE)\s*\|\s*(.*?)\]\s*$/i;
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
          lastH3 = null; // Resetear al cambiar de nivel superior
          itemActual = newItem;
        } else if (level === "h2") {
          structure.push(newItem);
          lastH2 = newItem;
          lastH3 = null; // Resetear
          itemActual = newItem;
        } else if (level === "h3" && lastH2) {
          lastH2.children.push(newItem);
          lastH3 = newItem; // <--- ¡ESTO FALTABA! Sin esto, el H4 no sabe dónde entrar
          itemActual = newItem;
        } else if (level === "h4" && lastH3) {
          lastH3.children.push(newItem);
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
        itemActual.content = matchContentStart[1].trim();
      } else if (leyendoContenido && itemActual) {
        itemActual.content += (itemActual.content ? "\n" : "") + line;
      }
    }

    // Limpieza de contenido
    structure.forEach((item) => {
      if (item.content) item.content = item.content.trim();
      item.children?.forEach((h3) => {
        if (h3.content) h3.content = h3.content.trim();
        // Añadir limpieza para H4
        h3.children?.forEach((h4) => {
          if (h4.content) h4.content = h4.content.trim();
        });
      });
    });

    if (structure.length > 0) {
      let currentH2Index = 1;

      structure.forEach((item) => {
        // Limpieza y Enumeración H1
        if (item.level === "h1") {
          item.enumeration = "0";
          item.uniqueId = `h1-0`;
          if (item.content) item.content = item.content.trim();
        }

        // Limpieza y Enumeración H2
        if (item.level === "h2") {
          const h2Enum = `${currentH2Index}`;
          item.enumeration = h2Enum;
          item.uniqueId = `h2-${h2Enum}`;
          if (item.content) item.content = item.content.trim();

          if (item.children) {
            let currentH3Index = 1;
            item.children.forEach((h3) => {
              const h3Enum = `${h2Enum}.${currentH3Index}`;
              h3.enumeration = h3Enum;
              h3.uniqueId = `h3-${h3Enum}`;
              if (h3.content) h3.content = h3.content.trim();

              // NUEVO: Enumeración H4
              if (h3.children) {
                let currentH4Index = 1;
                h3.children.forEach((h4) => {
                  const h4Enum = `${h3Enum}.${currentH4Index}`;
                  h4.enumeration = h4Enum;
                  h4.uniqueId = `h4-${h4Enum}`;
                  if (h4.content) h4.content = h4.content.trim();
                  currentH4Index++;
                });
              }
              currentH3Index++;
            });
          }
          currentH2Index++;
        }
      });
    }

    return structure;
  };

  const recalcularPalabrasGeneradas = useCallback((estructura) => {
    let conteo = 0;
    if (!estructura || !Array.isArray(estructura)) return 0;

    const procesarItem = (item) => {
      conteo += contarPalabras(item.text || "");
      if (item.content) {
        conteo += contarPalabras(item.content);
      }
      if (item.children && item.children.length > 0) {
        item.children.forEach(procesarItem);
      }
    };

    estructura.forEach(procesarItem);
    console.log("📊 Conteo Total Realizado:", conteo);
    return conteo;
  }, [contarPalabras]);

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
    if (!structure || structure.length === 0) {
      return (
        <div className="blog-view-placeholder">
          <p>Aún no hay estructura o contenido generado para mostrar.</p>
        </div>
      );
    }

    const hasActualContent = (html) => {
      if (!html) return false;
      const plainText = html
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, "")
        .trim();
      return plainText.length > 0;
    };

    return (
      <div className="tiptap-render">
        {structure.map((item) => {
          const hasTitle = hasActualContent(item.text);
          const hasBody = hasActualContent(item.content);
          const hasChildren = item.children && item.children.length > 0;

          // Si el bloque principal (H1/H2) está vacío y no tiene hijos, no renderizamos nada
          if (!hasTitle && !hasBody && !hasChildren) return null;

          return (
            <React.Fragment key={item.uniqueId}>
              {/* --- RENDER H1 o H2 --- */}
              {hasTitle && (
                <div
                  className={item.level === "h1" ? "blog-title" : "section-h2"}
                  dangerouslySetInnerHTML={{ __html: item.text }}
                />
              )}
              {hasBody && (
                <div
                  className="content-block"
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />
              )}

              {/* --- RENDER H3 (Hijos del H2) --- */}
              {item.children?.map((h3Item) => {
                const hasH3Title = hasActualContent(h3Item.text);
                const hasH3Body = hasActualContent(h3Item.content);
                const hasH4Children =
                  h3Item.children && h3Item.children.length > 0;

                if (!hasH3Title && !hasH3Body && !hasH4Children) return null;

                return (
                  <React.Fragment key={h3Item.uniqueId}>
                    {hasH3Title && (
                      <div
                        className="subsection-h3"
                        dangerouslySetInnerHTML={{ __html: h3Item.text }}
                      />
                    )}
                    {hasH3Body && (
                      <div
                        className="content-block"
                        dangerouslySetInnerHTML={{ __html: h3Item.content }}
                      />
                    )}

                    {/* --- RENDER H4 (Hijos del H3) --- */}
                    {h3Item.children?.map((h4Item) => (
                      <React.Fragment key={h4Item.uniqueId}>
                        {hasActualContent(h4Item.text) && (
                          <div
                            className="subsection-h4"
                            dangerouslySetInnerHTML={{ __html: h4Item.text }}
                          />
                        )}
                        {hasActualContent(h4Item.content) && (
                          <div
                            className="content-block"
                            dangerouslySetInnerHTML={{ __html: h4Item.content }}
                          />
                        )}
                      </React.Fragment>
                    ))}
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
  }, [tablaEstructuraFinal, contarPalabras]);

  // 2. EN LUGAR DE CREAR UNA CONSTANTE, USA EL SETTER DEL ESTADO
  // Aprovechamos el useMemo o un useEffect que ya tengas para actualizar el valor
  useEffect(() => {
    const total = recalcularPalabrasGeneradas(structureWithCount);
    // ACTUALIZAMOS TU ESTADO (El que usas en el botón de guardar)
    setTotalGeneratedWords(total);
  }, [structureWithCount, recalcularPalabrasGeneradas]);
  // ==============================================================================================================================================
  // 8. FUNCIONES DE MANEJO DE ESTRUCTURA Y EDICIÓN LOCAL
  //    (Selección, Guardar Título/Contenido, Mover, Eliminar, Agregar)
  // ==============================================================================================================================================

  // Función para actualizar una URL específica
  const manejarCambioUrl = (index, valor) => {
    const nuevasUrls = [...listaUrls];
    nuevasUrls[index] = valor;
    setListaUrls(nuevasUrls);
  };

  // Función para añadir un nuevo campo de input
  const agregarCampoUrl = () => {
    // Solo permite agregar si hay menos de 5 elementos
    if (listaUrls.length < 5) {
      setListaUrls([...listaUrls, ""]);
    } else {
      alert("Solo puedes agregar un máximo de 5 URLs"); // Opcional
    }
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
    setSelectedSectionForRegen(section);
    setRegenTextareaValue(section.text);

    const fullStructureObject = parseMarkdownStructure(tablaEstructuraFinal);
    const { level, enumeration } = section;
    let contentToEdit = "";

    if (level === "h1") {
      const h1Item = fullStructureObject.find((item) => item.level === "h1");
      contentToEdit = h1Item?.content || "";
    } else {
      const parts = enumeration.split(".");
      const idH2 = parts[0];
      const h2Padre = fullStructureObject.find(
        (item) => item.enumeration === idH2,
      );

      if (h2Padre) {
        if (level === "h2") {
          contentToEdit = h2Padre.content || "";
        } else if (level === "h3") {
          const h3Objetivo = h2Padre.children?.find(
            (item) => item.enumeration === enumeration,
          );
          contentToEdit = h3Objetivo?.content || "";
        }
        // NUEVA LÓGICA PARA H4
        else if (level === "h4") {
          const idH3 = `${parts[0]}.${parts[1]}`;
          const h3Padre = h2Padre.children?.find(
            (item) => item.enumeration === idH3,
          );
          const h4Objetivo = h3Padre?.children?.find(
            (item) => item.enumeration === enumeration,
          );
          contentToEdit = h4Objetivo?.content || "";
        }
      }
    }
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

    // 2. Parseamos la estructura actual
    let nuevaEstructura = parseMarkdownStructure(tablaEstructuraFinal);

    // 3. Lógica de localización con soporte para H4
    const parts = enumeration.split(".");
    const idH2 = parts[0];
    let encontrado = false;

    const levelLower = level.toLowerCase();

    if (levelLower === "h1") {
      const h1Item = nuevaEstructura.find(
        (item) => item.level.toLowerCase() === "h1",
      );
      if (h1Item) {
        h1Item.text = newTitle;
        encontrado = true;
      }
    } else {
      // Buscamos el H2 padre (es la base para H2, H3 y H4)
      const h2Padre = nuevaEstructura.find((item) => item.enumeration === idH2);

      if (h2Padre) {
        if (levelLower === "h2") {
          h2Padre.text = newTitle;
          encontrado = true;
        } else if (levelLower === "h3") {
          const h3Objetivo = h2Padre.children?.find(
            (item) => item.enumeration === enumeration,
          );
          if (h3Objetivo) {
            h3Objetivo.text = newTitle;
            encontrado = true;
          }
        }
        // NUEVA LÓGICA PARA H4
        else if (levelLower === "h4") {
          const idH3 = `${parts[0]}.${parts[1]}`;
          const h3Padre = h2Padre.children?.find(
            (item) => item.enumeration === idH3,
          );
          const h4Objetivo = h3Padre?.children?.find(
            (item) => item.enumeration === enumeration,
          );
          if (h4Objetivo) {
            h4Objetivo.text = newTitle;
            encontrado = true;
          }
        }
      }
    }

    if (!encontrado) {
      showToast(
        "ERROR CRÍTICO: No se pudo localizar la sección en la estructura.",
        "error",
      );
      return;
    }

    // 4. Convertimos de vuelta a Markdown y actualizamos estado
    const nuevoMarkdown = convertStructureToMarkdown(nuevaEstructura);
    setTablaEstructuraFinal(nuevoMarkdown);

    if (typeof markAsChanged === "function") markAsChanged();

    setHasUnsavedChanges(true);

    // 5. Actualizamos estados de UI para reflejar el cambio inmediato
    setSelectedSectionForRegen((prevSection) => ({
      ...prevSection,
      text: newTitle,
    }));

    setRegenTextareaValue(newTitle);
    showToast("Edición local del título guardada exitosamente.", "success");
  };

  //Funcion para guardar el contenido de los titulos o subtitulos
  const guardarContenidoLocal = (fieldToUpdate, newValue) => {
    if (!selectedSectionForRegen) return;

    const valueToSave = newValue ?? "";
    const propertyToUpdate = fieldToUpdate === "title" ? "text" : "content";
    let nuevaEstructura = parseMarkdownStructure(tablaEstructuraFinal);
    const { level, enumeration } = selectedSectionForRegen;
    const parts = enumeration.split(".");
    const idH2 = parts[0];

    if (level === "h1") {
      const h1Item = nuevaEstructura.find((item) => item.level === "h1");
      if (h1Item) h1Item[propertyToUpdate] = valueToSave;
    } else {
      const h2Padre = nuevaEstructura.find((item) => item.enumeration === idH2);
      if (h2Padre) {
        if (level === "h2") {
          h2Padre[propertyToUpdate] = valueToSave;
        } else if (level === "h3") {
          const h3Objetivo = h2Padre.children?.find(
            (item) => item.enumeration === enumeration,
          );
          if (h3Objetivo) h3Objetivo[propertyToUpdate] = valueToSave;
        }
        // NUEVA LÓGICA PARA H4
        else if (level === "h4") {
          const idH3 = `${parts[0]}.${parts[1]}`;
          const h3Padre = h2Padre.children?.find(
            (item) => item.enumeration === idH3,
          );
          const h4Objetivo = h3Padre?.children?.find(
            (item) => item.enumeration === enumeration,
          );
          if (h4Objetivo) h4Objetivo[propertyToUpdate] = valueToSave;
        }
      }
    }

    // Recalcular palabras y guardar
    if (fieldToUpdate === "content") {
      setTotalGeneratedWords(recalcularPalabrasGeneradas(nuevaEstructura));
    }
    setTablaEstructuraFinal(convertStructureToMarkdown(nuevaEstructura));
    setHasUnsavedChanges(true);
    setSelectedSectionForRegen(null);
    showToast("Guardado exitosamente", "success");
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

    const level = sectionToMove.level.toLowerCase();
    const parts = sectionToMove.enumeration.split(".");

    // --- CASO 1: MOVER H1 o H2 (Nivel Raíz) ---
    if (level === "h1" || level === "h2") {
      const currentIndex = newStructure.findIndex(
        (item) => item.uniqueId === sectionToMove.uniqueId,
      );
      if (currentIndex === -1 || currentIndex === 0) return; // No mover H1 o si no se encuentra

      let newIndex = currentIndex;
      if (direction === "UP" && currentIndex > 1) {
        // > 1 para no saltar por encima del H1 (index 0)
        newIndex = currentIndex - 1;
      } else if (
        direction === "DOWN" &&
        currentIndex < newStructure.length - 1
      ) {
        newIndex = currentIndex + 1;
      } else {
        return;
      }

      const [movedItem] = newStructure.splice(currentIndex, 1);
      newStructure.splice(newIndex, 0, movedItem);
    }

    // --- CASO 2: MOVER H3 (Hijo de H2) ---
    else if (level === "h3") {
      const parentH2 = newStructure.find(
        (item) => item.enumeration === parts[0],
      );
      if (!parentH2 || !parentH2.children) return;

      const currentIndex = parentH2.children.findIndex(
        (item) => item.uniqueId === sectionToMove.uniqueId,
      );
      if (currentIndex === -1) return;

      let newIndex = currentIndex;
      if (direction === "UP" && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (
        direction === "DOWN" &&
        currentIndex < parentH2.children.length - 1
      ) {
        newIndex = currentIndex + 1;
      } else {
        return;
      }

      const [movedItem] = parentH2.children.splice(currentIndex, 1);
      parentH2.children.splice(newIndex, 0, movedItem);
    }

    // --- CASO 3: MOVER H4 (Hijo de H3) ---
    else if (level === "h4") {
      const idH2 = parts[0];
      const idH3 = `${parts[0]}.${parts[1]}`;

      const h2Padre = newStructure.find((item) => item.enumeration === idH2);
      const h3Padre = h2Padre?.children?.find(
        (item) => item.enumeration === idH3,
      );

      if (!h3Padre || !h3Padre.children) return;

      const currentIndex = h3Padre.children.findIndex(
        (item) => item.uniqueId === sectionToMove.uniqueId,
      );
      if (currentIndex === -1) return;

      let newIndex = currentIndex;
      if (direction === "UP" && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (
        direction === "DOWN" &&
        currentIndex < h3Padre.children.length - 1
      ) {
        newIndex = currentIndex + 1;
      } else {
        return;
      }

      const [movedItem] = h3Padre.children.splice(currentIndex, 1);
      h3Padre.children.splice(newIndex, 0, movedItem);
    }

    // ACTUALIZACIÓN DE ESTADOS
    const newMarkdown = convertStructureToMarkdown(newStructure);
    setTablaEstructuraFinal(newMarkdown);
    markAsChanged();
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
          "info",
        );
        break;
      case "delete":
        // Usar window.confirm para acciones destructivas
        if (
          window.confirm(
            ` ¿Estás seguro de que quieres ELIMINAR la sección ${section.enumeration}: "${section.text}" y todas sus subsecciones?`,
          )
        ) {
          eliminarSeccion(section);
          showToast(
            `Sección ${section.enumeration} eliminada correctamente.`,
            "success",
          );
        }
        break;
      default:
        console.warn("Acción de sección no reconocida:", action);
    }
  };

  // --- Funcion para eliminar una seccion
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
    const level = sectionToDelete.level.toLowerCase();
    const parts = sectionToDelete.enumeration.split(".");

    if (level === "h1" || level === "h2") {
      // 1. ELIMINAR H1/H2: Filtramos el array principal.
      // Si es H2, elimina automáticamente sus hijos H3 y nietos H4.
      newStructure = parsedStructure.filter(
        (item) => item.uniqueId !== targetId,
      );
    } else if (level === "h3") {
      // 2. ELIMINAR H3: Buscamos el H2 padre y filtramos sus hijos.
      const parentH2Enum = parts[0];

      newStructure = parsedStructure.map((h2Item) => {
        if (h2Item.enumeration === parentH2Enum && h2Item.children) {
          const newChildren = h2Item.children.filter(
            (h3Item) => h3Item.uniqueId !== targetId,
          );
          return { ...h2Item, children: newChildren };
        }
        return h2Item;
      });
    } else if (level === "h4") {
      // 3. ELIMINAR H4: Buscamos el H2 (abuelo) y luego el H3 (padre).
      const parentH2Enum = parts[0];
      const parentH3Enum = `${parts[0]}.${parts[1]}`;

      newStructure = parsedStructure.map((h2Item) => {
        // Si es el H2 que contiene al H3 padre
        if (h2Item.enumeration === parentH2Enum && h2Item.children) {
          const updatedH3Children = h2Item.children.map((h3Item) => {
            // Si es el H3 padre del H4 que queremos borrar
            if (h3Item.enumeration === parentH3Enum && h3Item.children) {
              const newH4Children = h3Item.children.filter(
                (h4Item) => h4Item.uniqueId !== targetId,
              );
              return { ...h3Item, children: newH4Children };
            }
            return h3Item;
          });
          return { ...h2Item, children: updatedH3Children };
        }
        return h2Item;
      });
    } else {
      showToast("Nivel de sección no reconocido para eliminación.", "error");
      return;
    }

    // 4. Actualizar el estado y re-enumerar
    // Tu función convertStructureToMarkdown se encargará de arreglar los números (ej: si borras el 2.2, el 2.3 pasa a ser 2.2)
    const newMarkdown = convertStructureToMarkdown(newStructure);
    setTablaEstructuraFinal(newMarkdown);

    if (typeof markAsChanged === "function") markAsChanged();

    setSelectedSectionForRegen(null);
    showToast(
      `Sección ${level.toUpperCase()} eliminada correctamente.`,
      "success",
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
      "success",
    );
  };

  // --- Funcion para agregar subsecciones de H3 en el H2
  const agregarSubseccionH3 = () => {
    // 1. Validar la selección
    if (!selectedSectionForRegen || !tablaEstructuraFinal) {
      showToast(
        "ERROR: Debe seleccionar una sección H2 o H3 para añadir un subtítulo.",
        "error",
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
      (item) => item.enumeration === idH2Padre,
    );

    if (!h2Padre) {
      showToast(
        "ERROR: No se pudo encontrar la sección H2 padre para agregar el H3.",
        "error",
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
      "success",
    );
  };

  const agregarSubseccionH4 = () => {
    // 1. Validar selección
    if (!selectedSectionForRegen || !tablaEstructuraFinal) {
      showToast(
        "ERROR: Seleccione una subsección H3 para añadir un H4.",
        "error",
      );
      return;
    }

    let nuevaEstructura = parseMarkdownStructure(tablaEstructuraFinal);
    const { enumeration } = selectedSectionForRegen;
    const partes = enumeration.split(".");

    if (partes.length < 2) {
      showToast(
        "ERROR: Los H4 solo pueden ir dentro de secciones H3.",
        "error",
      );
      return;
    }

    // El ID del padre H2 es el primer número, el del H3 es "X.Y"
    const idH2Padre = partes[0];
    const idH3Padre = `${partes[0]}.${partes[1]}`;

    // 2. Buscar el H2
    const h2Padre = nuevaEstructura.find(
      (item) => item.enumeration === idH2Padre,
    );
    if (!h2Padre) return;

    // 3. Buscar el H3 dentro de ese H2
    const h3Padre = h2Padre.children?.find(
      (child) => child.enumeration === idH3Padre,
    );

    if (!h3Padre) {
      showToast("ERROR: No se encontró la sección H3 padre.", "error");
      return;
    }

    // 4. Crear el nuevo H4
    const newH4 = {
      level: "h4",
      uniqueId: `h4-${Date.now()}`,
      text: "Nueva Sub-subsección H4",
      multimedia: null,
      multimediaDescription: null,
      content: null,
      children: [], // Por si en el futuro quieres H5
    };

    // 5. Insertar
    if (!h3Padre.children) h3Padre.children = [];
    h3Padre.children.push(newH4);

    // 6. Actualizar
    const nuevoMarkdown = convertStructureToMarkdown(nuevaEstructura);
    setTablaEstructuraFinal(nuevoMarkdown);
    markAsChanged();

    showToast("Subsección H4 agregada correctamente.", "success");
  };

  const cancelarGeneracionCompleta = () => {
    if (referenciaControladorAborto.current) {
      // La bandera cancelacionSolicitada ya existe y se usa en generarContenidoCompleto
      setCancelacionSolicitada(true);

      // Aborta la petición fetch actual si está en curso (dentro del bucle for)
      referenciaControladorAborto.current.abort();

      showToast(
        "Se ha solicitado la cancelación del proceso completo. Esperando que termine la solicitud actual...",
        "warning",
      );
      console.log("Solicitud de cancelación enviada.");
    }
  };

  const limpiarTodoElContenido = () => {
    // 1. Confirmación de seguridad
    if (
      !window.confirm(
        "¿Estás seguro de borrar TODO el contenido? Los títulos se mantendrán.",
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
          `Error HTTP: ${response.status} - Verifica el backend.`,
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
                    console.error("Error guardando consolidado:", err),
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
    if (!selectedSectionForRegen) return;

    const estructuraActual = parseMarkdownStructure(tablaEstructuraFinal);
    const { level, enumeration } = selectedSectionForRegen;
    const parts = enumeration.split(".");
    let found = false;

    if (level === "h1" || level === "h2") {
      const item = estructuraActual.find(
        (i) => i.level === level && i.enumeration === enumeration,
      );
      if (item) {
        item.text = newTitle;
        found = true;
      }
    } else if (level === "h3") {
      const h2Padre = estructuraActual.find(
        (i) => i.level === "h2" && i.enumeration === parts[0],
      );
      const h3 = h2Padre?.children?.find((c) => c.enumeration === enumeration);
      if (h3) {
        h3.text = newTitle;
        found = true;
      }
    }
    // NUEVA LÓGICA PARA H4
    else if (level === "h4") {
      const h2Padre = estructuraActual.find(
        (i) => i.level === "h2" && i.enumeration === parts[0],
      );
      const h3Padre = h2Padre?.children?.find(
        (c) => c.enumeration === `${parts[0]}.${parts[1]}`,
      );
      const h4 = h3Padre?.children?.find((c) => c.enumeration === enumeration);
      if (h4) {
        h4.text = newTitle;
        found = true;
      }
    }

    if (found) {
      setTablaEstructuraFinal(convertStructureToMarkdown(estructuraActual));
      setSelectedSectionForRegen((prev) => ({ ...prev, text: newTitle }));
      setRegenTextareaValue(newTitle);
      showToast("Título actualizado", "success");
    }
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
      // 2. LLAMADA AL ENDPOINT DE GENERACIÓN (Tu IA actual)
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

      // 3. LIMPIEZA DE TÍTULOS (Quitar Multimedia y SEO para el log)
      const soloTitulos = structureRaw
        .split("\n")
        .filter(
          (line) =>
            line.trim() !== "" &&
            !line.includes("[MULTIMEDIA") &&
            !line.includes("RECOMENDACIÓN SEO"),
        )
        .join("\n");

      // 4. ACTUALIZACIÓN DE UI
      setTablaEstructuraFinal(structureRaw);
      setDatosFinales((prev) => ({
        ...prev,
        final_structure_object: result,
      }));

      // 5. GUARDADO EN LOGS E INCREMENTO DE CONTEO
      // Cada vez que se ejecute esta línea, el backend sumará +1 a 'generation_counts'
      try {
        await apiService.logInitialAI(idDelBlog, null, soloTitulos);
        console.log("✓ Log registrado y contador incrementado en BD.");
      } catch (logErr) {
        console.error("Error al registrar log:", logErr);
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
        "error",
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
          (s) => s.children && s.children.some((c) => c.uniqueId === sectionId),
        );

        if (parentH2) {
          contextData += `\n--- Contexto de la sección principal (H2 Padre): ---\n`;
          contextData += `H2 Principal: "${parentH2.text}"`;
          if (parentH2.content)
            contextData += ` (Contenido del H2: ${parentH2.content.substring(
              0,
              50,
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

    // 1. Asegurar que las keywords globales sean un Array
    const cleanKeywords = Array.isArray(datosFinales?.keywords)
      ? datosFinales.keywords
      : typeof datosFinales?.keywords === "string"
        ? datosFinales.keywords
            .replace(/^Keywords:text\s*/i, "")
            .split(",")
            .map((k) => k.trim())
            .filter((k) => k)
        : [];

    const finalContextData = contextData.length > 50 ? contextData : "";
    const blogId = datosFinales.id;

    let payload = {
      query: datosFinales.query,
      blog_id: blogId,
      consolidated_content: datosFinales.contenidoConsolidado,
      keywords: cleanKeywords,
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
          estructuraConNuevoContenido,
        );

        // Asegúrate de que el nombre del estado sea exactamente el que usas en el componente
        setTotalGeneratedWords(totalPalabras);

        showToast(
          "Contenido generado con éxito. Revisa el contador en la parte superior.",
          "success",
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
        "Error: Título principal o ID del blog no disponibles. Necesarios para la consulta.",
      );
      return;
    }
    console.log(
      `[IA - REGENERACIÓN] Iniciando regeneración de la sección: ${sectionType}`,
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
          `Error en la llamada de regeneración: ${response.statusText}`,
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
              e,
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
          "Respuesta de IA vacía o formato de resultado no reconocido (Se esperaban 3 títulos).",
        );
      }

      console.log(
        `[IA - REGENERACIÓN] Sugerencias recibidas para ${sectionType}:`,
        regeneratedSuggestions,
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
            `[IA - REGENERACIÓN] Intento de regeneración de ${sectionType} deshabilitado.`,
          );
          break;
        default: // Manejo de caso por defecto para evitar warning
          console.warn(
            "Tipo de sección de regeneración no manejado:",
            sectionType,
          );
          break;
      }
    } catch (err) {
      console.error(
        `[IA - REGENERACIÓN] Error al regenerar ${sectionType}:`,
        err,
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

    // 1. VALIDACIONES INICIALES
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

    // Obtenemos la estructura base (títulos actuales)
    let estructuraAnidada = parseMarkdownStructure(tablaEstructuraFinal);

    // =======================================================================
    // PASO A: REGISTRO DE TÍTULOS (Formatos 0.0 y sin duplicados)
    // =======================================================================
    const h1Titulo = datosFinales?.title || "Título del Blog";
    const lineaH1 = `[H1 - 0.0] ${h1Titulo}`;

    // Filtramos la estructura para que el H1 no aparezca como un H2 repetido
    const cuerpoTitulos = estructuraAnidada
      .filter(
        (h2) => stripHtml(h2.text).toLowerCase() !== h1Titulo.toLowerCase(),
      )
      .map((h2) => {
        // Forzamos formato decimal X.0 si viene como entero
        const h2Enum = h2.enumeration.toString().includes(".")
          ? h2.enumeration
          : `${h2.enumeration}.0`;
        const h2Text = `[H2 - ${h2Enum}] ${stripHtml(h2.text)}`;
        const h3Texts = h2.children
          .map((h3) => `[H3 - ${h3.enumeration}] ${stripHtml(h3.text)}`)
          .join("\n");
        return h2Text + (h3Texts ? "\n" + h3Texts : "");
      })
      .join("\n");

    const titulosFinalesIdenticos = `${lineaH1}\n${cuerpoTitulos}`;

    // 1. Log en blog_structure_logs (titles_after)
    try {
      await apiService.logBlogStructureEdit(
        idDelBlog,
        titulosFinalesIdenticos,
        [],
        "start_content_generation",
      );
    } catch (err) {
      console.error("Error en log structure edit:", err);
    }

    // =======================================================================

    showToast("Iniciando generación de contenido...", "info");

    let estructuraTemporal = estructuraAnidada;
    let generatedContentHistory = [];
    const palabrasObjetivo = estimatedWordCount;
    const totalSubsecciones = contarTotalSubsecciones(estructuraAnidada);

    let palabrasAcumuladas = recalcularPalabrasGeneradas(estructuraAnidada);
    let subseccionesGeneradas = recalcularSubseccionesGeneradas(
      estructuraAnidada,
      contarPalabras,
    );

    // 2. BUCLE DE GENERACIÓN POR BLOQUES
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
          (h3) => `### ${h3.enumeration}. ${stripHtml(h3.text)}`,
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
        totalSubsecciones - subseccionesGeneradas,
      );
      const limiteFinal = Math.max(
        100,
        Math.ceil(
          ((palabrasObjetivo - palabrasAcumuladas) / subseccionesPendientes) *
            subseccionesEnBloqueActual,
        ),
      );

      // 1. Obtener las keywords (asumiendo que vienen en datosFinales.keywords)
      let rawKeywords = datosFinales?.keywords || "";

      // 2. Limpiar y convertir a Array
      let keywordsArray = [];

      if (Array.isArray(rawKeywords)) {
        // Si ya es un array, solo nos aseguramos de que sean strings
        keywordsArray = rawKeywords.map((k) => String(k));
      } else if (typeof rawKeywords === "string") {
        // Si es el string "Keywords:text barrio rosales...", lo limpiamos
        let cleanStr = rawKeywords.replace(/^Keywords:text\s*/i, ""); // Quita el prefijo si existe

        // Separamos por comas y limpiamos espacios en blanco
        keywordsArray = cleanStr
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k !== "");
      }

      try {
        const response = await fetch(URL_API_IA_COMPLETO, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blog_id: idDelBlog,
            query: datosFinales?.query,
            consolidated_content: contenidoConsolidado,
            keywords: keywordsArray,
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
          }),
          signal: controller.signal,
        });

        const result = await response.json();
        if (result.success !== "True") throw new Error("IA Error");

        const rawContent =
          typeof result.generated_content === "string"
            ? result.generated_content
            : String(result.generated_content || "");

        const generatedContentMap = JSON.parse(
          rawContent.trim().replace(/```json\s*|```/g, ""),
        );

        // Actualizamos estructura temporal
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

        // Actualizamos UI
        setTablaEstructuraFinal(convertStructureToMarkdown(estructuraTemporal));
        palabrasAcumuladas = recalcularPalabrasGeneradas(estructuraTemporal);
        subseccionesGeneradas = recalcularSubseccionesGeneradas(
          estructuraTemporal,
          contarPalabras,
        );
      } catch (error) {
        if (error.name === "AbortError") break;
        console.error(error);
        break;
      }
    }

    // =======================================================================
    // PASO C: PERSISTENCIA FINAL (Blogs y titles_before)
    // =======================================================================
    if (!cancelacionSolicitada) {
      try {
        const markdownFinalConContenido =
          convertStructureToMarkdown(estructuraTemporal);

        // 1. Guardar en tabla BLOGS (Para que no se borre al recargar)
        await apiService.updateBlog(idDelBlog, {
          estructura_blog_json: markdownFinalConContenido,
        });

        // 2. Guardar en blog_ai_generation_logs (Columna titles_before)
        // Usamos el mismo string que preparamos para el log de edición
        await apiService.logInitialAI(
          idDelBlog,
          null,
          titulosFinalesIdenticos,
          estructuraTemporal, // <--- Enviamos el JSON con contenido
        );

        console.log(
          "✓ Estructura persistida en Blogs y log Initial AI actualizado.",
        );
        showToast("¡Blog generado y guardado correctamente!", "success");
        markAsChanged();
      } catch (finalSaveErr) {
        console.error("Error al persistir blog final:", finalSaveErr);
      }
    }

    setCargandoIA(false);
    showToast("Generación finalizada.", "info");
  };

  const generarFaqsDesdeEstructura = async () => {
    setLoadingFaqs(true);
    try {
      // Función recursiva para aplanar toda la estructura y su contenido
      const extraerContenidoRecursivo = (items) => {
        return items
          .map((item) => {
            const textoLimpio = item.content ? stripHtml(item.content) : "";
            const seccion = `[${item.level.toUpperCase()}]: ${item.text}\nCONTENIDO: ${textoLimpio}`;
            const hijos =
              item.children && item.children.length > 0
                ? extraerContenidoRecursivo(item.children)
                : "";
            return `${seccion}\n${hijos}`;
          })
          .join("\n\n");
      };

      const textoEstructuraCompleta =
        extraerContenidoRecursivo(structureWithCount);

      // Llamada siguiendo tu lógica de apiService
      const data = await apiService.generateFaqsFromStructure(
        blogId,
        textoEstructuraCompleta,
        faqKeyword, // Esta variable ya la tienes en tu estado
      );

      if (data && data.faqs) {
        setGoogleFaqs(data.faqs);
      }
    } catch (error) {
      console.error("Error al generar FAQs:", error);
    } finally {
      setLoadingFaqs(false);
    }
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
              {/* 1. ENCABEZADO */}
              <div className="structure-content-wrapper">
                <div
                  className="structure-text-area"
                  onClick={(e) => onSelect(item, e)}
                >
                  <span className="structure-icon-wrapper">
                    <i
                      className={`uil ${
                        isH1
                          ? "uil-heading"
                          : item.level === "h2"
                            ? "uil-align-left-h"
                            : item.level === "h3"
                              ? "uil-corner-down-right"
                              : "uil-list-ui-alt"
                      }`}
                    ></i>
                  </span>

                  <span className="structure-enumeration">
                    {item.enumeration}
                  </span>

                  <span
                    className="structure-title-text"
                    dangerouslySetInnerHTML={{
                      __html: item.text || "Sin título",
                    }}
                  />

                  {item.wordCount > 0 && (
                    <span className="structure-word-count">
                      ({item.wordCount} palabras)
                    </span>
                  )}
                </div>

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

              {/* 2. PREVISUALIZACIÓN DE CONTENIDO */}
              {item.content &&
                item.content.replace(/<[^>]*>/g, "").trim().length > 0 && (
                  <div
                    className={`content-preview-block preview-level-${item.level}`}
                  >
                    <strong className="preview-content-label">
                      CONTENIDO {item.level.toUpperCase()}:
                    </strong>
                    <div
                      className="preview-content-text"
                      dangerouslySetInnerHTML={{
                        __html:
                          item.content.trim().substring(0, 160) +
                          (item.content.length > 160 ? "..." : ""),
                      }}
                    />
                  </div>
                )}

              {/* 3. RECOMENDACIÓN SEO */}
              {(item.multimediaDescription || item.multimedia_description) && (
                <div
                  className={`multimedia-recommendation-seo seo-level-${item.level}`}
                >
                  <div className="seo-recommendation-header">
                    <i
                      className={`uil ${item.multimedia?.includes("VIDEO") ? "uil-video" : "uil-camera"}`}
                    ></i>
                    <strong className="seo-recommendation-label">
                      RECOMENDACIÓN SEO:
                    </strong>
                  </div>
                  <p className="seo-recommendation-text">
                    {item.multimediaDescription || item.multimedia_description}
                  </p>
                </div>
              )}

              {/* 4. RECURSIVIDAD */}
              {item.children && item.children.length > 0 && (
                <div className="structure-children-container">
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
      <div
        className={`blog-generation-page ${isDarkMode ? "dark-mode" : "True"}`}
      >
        {/* Header */}
        <header className="navbar-custom">
          {/* Sección Izquierda: Título */}
          <div className="header-brand">
            <h1>
              Generación <span>Blogs</span>
            </h1>
            <p>Sistema de gestión de contenido</p>
          </div>

          {/* Sección Derecha: Nav y Usuario */}
          <div className="header-actions">
            <nav>
              <a href="/" className="nav-link nav-link-home">
                <i
                  className="uil uil-estate"
                  style={{ fontSize: "1.1rem" }}
                ></i>
                <span>Volver al Home</span>
              </a>
            </nav>

            <nav>
              <a href="/dashboard_blog" className="nav-link nav-link-dashboard">
                <i
                  className="uil uil-dashboard"
                  style={{ fontSize: "1.1rem" }}
                ></i>
                <span>Dashboard Blog</span>
              </a>
            </nav>

            {/* BOTÓN MODO OSCURO */}
            <button
              onClick={toggleDarkMode}
              className="btn-mode-toggle"
              title={
                isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"
              }
            >
              <i className={`uil ${isDarkMode ? "uil-sun" : "uil-moon"}`}></i>
            </button>

            {/* SECCIÓN DEL USUARIO */}
            {currentUser && (
              <div className="user-pill">
                <div className="user-avatar">
                  {currentUser.avatar ||
                    (currentUser.first_name || currentUser.last_name
                      ? `${(currentUser.first_name?.[0] || "").toUpperCase()}${(currentUser.last_name?.[0] || "").toUpperCase()}`
                      : (currentUser.email?.[0] || "").toUpperCase())}
                </div>

                <div className="user-info">
                  <span className="user-name">
                    {currentUser.name || currentUser.first_name}
                  </span>
                  <span className="user-role">
                    {isAdminUser(currentUser.id)
                      ? "Administrador"
                      : isEditorUser(currentUser.id)
                        ? "Editor"
                        : "Redactor"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        <section className="preconfig">
          {/* Encabezado con el botón de añadir integrado */}
          <div
            className="analysis-title"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "2px solid #e0e6ec",
              paddingBottom: "10px",
              marginBottom: "20px",
            }}
          >
            <h2 style={{ color: "#007bff", margin: 0, fontSize: "1.2rem" }}>
              Fuentes de Referencia
            </h2>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                className="status-text pending"
                style={{ fontSize: "0.8rem" }}
              >
                Añadir fuente
              </span>
              <button
                type="button"
                onClick={agregarCampoUrl}
                // Se deshabilita si está cargando O si ya hay 5 URLs
                disabled={cargandoScraping || listaUrls.length >= 5}
                className="btn-remove-url"
                style={{
                  background: listaUrls.length >= 5 ? "#f5f5f5" : "#e8f5e9", // Cambia color si está lleno
                  color: listaUrls.length >= 5 ? "#999" : "#28a745",
                  border: "1px solid #c8e6c9",
                  fontSize: "16px",
                  cursor: listaUrls.length >= 5 ? "not-allowed" : "pointer",
                }}
                title={
                  listaUrls.length >= 5 ? "Límite alcanzado" : "Añadir otra URL"
                }
              >
                +
              </button>
            </div>
          </div>

          <div className="config-cards-wrapper">
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

                <div className="url-status-label">
                  {estadosUrls[index] === "analizando" && (
                    <span className="status-text analyzing">
                      ⏳ Analizando...
                    </span>
                  )}
                  {estadosUrls[index] === "exito" && (
                    <span className="status-text success">✅ Analizado</span>
                  )}
                  {estadosUrls[index] === "error" && (
                    <span className="status-text error">⚠️ Error</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Botón de Acción Principal */}
          <div style={{ marginTop: "20px" }}>
            <button
              onClick={cargandoScraping ? cancelarScraping : ejecutarScraping}
              className={`btn-generate ${cargandoScraping ? "btn-cancel" : ""}`}
              disabled={
                !cargandoScraping &&
                listaUrls.filter((u) => u.trim() !== "").length < 3
              }
            >
              {cargandoScraping ? "Cancelar Analizador" : "Analizar Google"}
            </button>
          </div>
        </section>

        {/* Mensaje de Error  */}
        {error && <div className="error-message">{error}</div>}

        {/* ========================================================= */}
        {/* --- SECCIÓN: TARJETAS DE CONFIGURACIÓN INICIAL (INPUTS) --- */}
        {/* ========================================================= */}

        <section className="analysis-result info-card">
          <h2
            className="analysis-title collapsable-header"
            onClick={() => tarjetasInformacion("preconfiguracionUnificada")}
          >
            <div className="structure-buttons-group">
              <i className="uil uil-setting"></i>
              <span>Parámetros de Generación</span>
            </div>
            <i
              className={`uil ${cardVisibility.preconfiguracionUnificada ? "uil-angle-up" : "uil-angle-down"}`}
            ></i>
          </h2>

          {cardVisibility.preconfiguracionUnificada && (
            <div className="config-cards-wrapper">
              {/* Banner Superior */}
              <div className="project-header-group">
                <span className="status-text pending">TÍTULO DEL PROYECTO</span>
                <p className="project-display-title">
                  {datosFinales?.title || "Sin título definido"}
                </p>
              </div>

              {/* Grilla Inferior */}
              <div className="config-grid-layout">
                {/* Keywords */}
                <div className="log-card">
                  <span className="analysis-title">
                    <i className="uil uil-key-skeleton"></i> Keywords
                  </span>
                  <div className="keywords-flex-container">
                    {(datosFinales?.keywords || "").split(",").map(
                      (k, i) =>
                        k.trim() && (
                          <span key={i} className="keyword-tag">
                            {k.trim()}
                          </span>
                        ),
                    )}
                  </div>
                </div>

                {/* Regional */}
                <div className="log-card">
                  <span className="analysis-title">
                    <i className="uil uil-globe"></i> Regional
                  </span>
                  <div className="regional-config-list">
                    <div className="config-item">
                      <span className="label">Idioma:</span>
                      <span className="count-badge remaining">
                        {datosFinales?.idioma || "Español"}
                      </span>
                    </div>
                    <div className="config-item">
                      <span className="label">Categoría:</span>
                      <span className="count-badge total">
                        {datosFinales?.categoria || "General"}
                      </span>
                    </div>
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
                  className="btn-estructura"
                  title="Borrar contenido de todas las secciones"
                  style={{ flex: 1, backgroundColor: "#e74c3c" }} // <--- Esto hace que se expanda equitativamente
                >
                  <i className="uil uil-trash-alt"></i> Borrar Todo el Contenido
                </button>

                {/* --- BOTÓN DE GUARDAR ESTRUCTURA --- */}
                <button
                  className={`btn-estructura ${
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
                      <i className="uil uil-save"></i>Guardar Estructura
                    </>
                  )}
                </button>
              </div>
            )}

            {/* --- BOTÓN DE REVISIÓN ORTOGRÁFICA POR IA --- */}
            {(resultadosDisponibles || tablaEstructuraFinal) && (
              <div
                style={{
                  marginBottom: "15px",
                  display: "flex",
                  gap: "10px",
                }}
              >
                <button
                  onClick={revisarConIA}
                  className="btn-revisar-ia"
                  disabled={
                    !localBlogId || !tablaEstructuraFinal || revisandoIA || cargandoIA
                  }
                  title="La IA revisará el contenido y resaltará en amarillo los errores ortográficos detectados."
                  style={{ flex: 1 }}
                >
                  {revisandoIA ? (
                    <>
                      <i className="uil uil-spinner uil-spin"></i> Revisando con IA…
                    </>
                  ) : (
                    <>
                      <i className="uil uil-spell-check"></i> Revisar con IA
                    </>
                  )}
                </button>
              </div>
            )}

            {/* CONTENEDOR DE BOTONES DE AÑADIR (H2/H3/H4) */}
            <div className="add-section-controls">
              {/* Botón para Añadir H2 */}
              <button
                onClick={agregarSeccionH2}
                className="btn-add-h2"
                disabled={!tablaEstructuraFinal}
                title="Agregar una sección principal"
              >
                <i className="uil uil-plus-circle"></i> Agregar H2
              </button>

              {/* Botón para Añadir H3 */}
              <button
                onClick={agregarSubseccionH3}
                className="btn-add-h3"
                disabled={!selectedSectionForRegen || !tablaEstructuraFinal}
                title="Selecciona un H2 para agregar un H3"
              >
                <i className="uil uil-plus-circle"></i> Agregar H3
              </button>

              {/* Botón para Añadir H4 */}
              <button
                onClick={agregarSubseccionH4}
                className="btn-add-h4"
                disabled={
                  selectedSectionForRegen?.level?.toLowerCase() !== "h3"
                }
                title="Selecciona un H3 para agregar un H4"
              >
                <i className="uil uil-plus-circle"></i> Agregar H4
              </button>
            </div>

            {/* ---------------------------------------------------- */}
            {/* --- COMPONENTE DE PREGUNTAS FRECUENTES (IA)      --- */}
            {/* ---------------------------------------------------- */}
            {tablaEstructuraFinal && (
              <section
                className="analysis-result fade-in"
                style={{ marginTop: "20px" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "15px",
                  }}
                >
                  <h2 className="analysis-title">
                    Preguntas Frecuentes Sugeridas
                  </h2>
                  <button
                    className="btn-generate"
                    onClick={generarFaqsDesdeEstructura}
                    disabled={loadingFaqs}
                    style={{ width: "auto" }}
                  >
                    {loadingFaqs ? "Generando..." : "Generar con IA"}
                  </button>
                </div>
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

                    <div className="tiptap-container titulo-editor">
                      {/* Solo mostramos la barra si el editorTitulo existe y tiene sus comandos listos */}
                      {editorTitulo && <MenuBar editor={editorTitulo} />}
                      <EditorContent editor={editorTitulo} />
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
                  Editar Contenido: "{stripHtml(selectedSectionForRegen.text)}"
                  ({selectedSectionForRegen.level.toUpperCase()})
                </h2>
                <p className="result-text">
                  Selecciona el enfoque estratégico para esta sección del blog.
                </p>

                {/* SECCIÓN DEL SELECTOR OPTIMIZADA CON CLASES */}
                <div className="select-container">
                  <label htmlFor="content-type" className="select-label">
                    <i className="uil uil-setting"></i> ¿Qué quieres que haga la
                    IA en esta sección?
                  </label>
                  <select
                    id="content-type"
                    className="select-estrategia"
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    disabled={cargandoIA}
                  >
                    <optgroup label="TEXTO GENERAL">
                      <option value="parrafo_narrativo">
                        Escribir párrafos normales
                      </option>
                      <option value="ia_libre">
                        Darle libertad creativa a la IA
                      </option>
                    </optgroup>

                    <optgroup label="FORMATOS ESPECIALES">
                      <option value="guia_paso_a_paso">
                        Crear una guía paso a paso (1, 2, 3...)
                      </option>
                      <option value="lista_beneficios_valor">
                        Hacer una lista de puntos clave
                      </option>
                      <option value="comparativa_pros_contras">
                        Analizar pros y contras
                      </option>
                      <option value="faq_seccion">
                        Generar preguntas frecuentes (FAQ)
                      </option>
                      <option value="mito_vs_realidad">
                        Desmentir mitos o errores comunes
                      </option>
                    </optgroup>

                    <optgroup label="PARTES DEL ARTÍCULO">
                      <option value="introduccion_gancho">
                        Escribir una introducción interesante
                      </option>
                      <option value="definicion_seo">
                        Dar una definición clara y directa
                      </option>
                      <option value="resumen_tl_dr">
                        Hacer un resumen muy corto para leer rápido
                      </option>
                      <option value="conclusion_llamada_accion">
                        Escribir un cierre o conclusión
                      </option>
                    </optgroup>

                    <optgroup label="LISTAS (HTML)">
                      <option value="lista_pasos">
                        Guía Paso a Paso (Tutorial)
                      </option>
                      <option value="lista_puntos_clave">
                        Puntos Clave y Beneficios
                      </option>
                      <option value="lista_requisitos">
                        Lista de Requisitos Necesarios
                      </option>
                      <option value="lista_errores">
                        Errores Comunes y Advertencias
                      </option>
                      <option value="lista_faq">
                        Preguntas Frecuentes (FAQ)
                      </option>
                    </optgroup>

                    <optgroup label="TABLAS (HTML)">
                      <option value="tabla_tecnica">
                        Tabla de Datos Técnicos
                      </option>
                      <option value="tabla_pros_contras">
                        Tabla de Pros y Contras
                      </option>
                      <option value="tabla_glosario">
                        Tabla de Glosario / Conceptos
                      </option>
                      <option value="tabla_comparativa_antes_despues">
                        Tabla Antes vs. Después
                      </option>
                      <option value="tabla_recomendaciones">
                        Tabla de Recomendaciones
                      </option>
                    </optgroup>
                  </select>
                </div>

                <div className="tiptap-container contenido-editor">
                  {/* Toolbar completa con iconos para el contenido */}
                  <div className="tiptap-container contenido-editor">
                    <MenuBar editor={editorContenido} />
                    <EditorContent editor={editorContenido} />
                  </div>

                  {/* Área de edición de TipTap */}
                  <EditorContent editor={editorContenido} />
                </div>

                <div className="idea-buttons">
                  <button
                    onClick={() =>
                      guardarContenidoLocal("content", sectionContentValue)
                    }
                    className="btn-generate"
                    disabled={cargandoIA}
                  >
                    <i className="uil uil-save"></i> Guardar Contenido Local
                  </button>
                  <button
                    onClick={generarContenidoSeccion}
                    className="btn btn-generate"
                    disabled={cargandoIA}
                  >
                    {cargandoIA ? (
                      <>
                        <i className="uil uil-spinner uil-spin"></i>{" "}
                        Generando...
                      </>
                    ) : (
                      <>
                        <i className="uil uil-robot"></i>Generar Contenido (IA)
                      </>
                    )}
                  </button>
                </div>

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
                <div className="action-buttons-container">
                  {/* Botón de Alternancia de Vista */}
                  <button
                    className="btn-action-square"
                    onClick={vistaEditable}
                    title={
                      isEditingStructure
                        ? "Ver como Documento"
                        : "Volver a Estructura"
                    }
                  >
                    <i
                      className={`uil ${isEditingStructure ? "uil-eye" : "uil-sitemap"}`}
                    ></i>
                    <span>{isEditingStructure ? "Ver Doc" : "Estructura"}</span>
                  </button>

                  {/* Botón de Descarga */}
                  <button
                    className="btn-action-square btn-blue"
                    onClick={descargarArticuloDocs}
                    title="Descargar Word"
                  >
                    <i className="uil uil-file-download"></i>
                    <span>Descargar</span>
                  </button>

                  {/* Botón de Copiar */}
                  <button
                    className="btn-action-square btn-gray"
                    onClick={copiarContenidoAlPortapapeles}
                    title="Copiar al portapapeles"
                  >
                    <i className="uil uil-copy"></i>
                    <span>Copiar</span>
                  </button>
                </div>
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
                /* MODO DOCUMENTO: Sin padding interno de tarjeta para que la 'hoja' respire */
                <div className="blog-document-container">
                  {/* Esta es la 'Hoja Blanca' */}
                  <div className="blog-document-window">
                    {renderizarContenidoDelBlog(structureWithCount)}
                  </div>
                </div>
              )}
            </section>

            {/* BOTÓN FLOTANTE VOLVER AL INICIO */}
            <button
              className="btn-scroll-top"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              title="Volver al inicio"
            >
              <i className="uil uil-arrow-up"></i>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default GeneracionBlog;
