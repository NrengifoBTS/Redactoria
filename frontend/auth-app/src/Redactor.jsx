import React, { useState, useRef, useEffect, useCallback } from "react";
import "./Redactor.css";
import { useParams, useNavigate } from "react-router-dom";
import {
  Save,
  Download,
  Upload,
  Plus,
  Trash2,
  Palette,
  Link,
  RotateCcw,
  Type,
  MessageSquare,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useApp } from "./context/AppContext";
import { getExcelTemplate, columnHeaders, tableConfig } from "./templateConfig";
import tableStyles, { getContainerStyle, getCellStyle } from "./tableStyles";
import { isAdminUser, isEditorUser } from "./utils/roles";
import apiService from "./services/apiService";
import { colorizeField } from "./utils/colorUtils";

// --- IMPORTACIONES TIPTAP  ---
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";

function AnnotationMarker({ cellKey, onClick }) {
  return (
    <span
      onClick={(e) => onClick(cellKey, e)}
      title="Ver anotaciones"
      style={{
        position: "absolute",
        top: 4,
        right: 4,
        background: "#f59e0b",
        color: "white",
        borderRadius: "50%",
        width: 18,
        height: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: "bold",
        cursor: "pointer",
        zIndex: 2,
      }}
    >
      📝
    </span>
  );
}

const AnnotationPanel = React.memo(
  function AnnotationPanel({
    showAnnotationPanel,
    annotationPanelPosition,
    annotations,
    currentAnnotationCell,
    closeAnnotationPanel,
    deleteAllAnnotations,
    deleteAnnotation,
    saveAnnotation,
    getColumnLabel,
  }) {
    // Estado local para el texto de la anotación
    const [localAnnotationText, setLocalAnnotationText] = useState("");
    const annotationTextareaRef = useRef(null);

    // Limpiar el texto cuando se abre/cierra el panel o cambia la celda
    useEffect(() => {
      if (showAnnotationPanel && annotationTextareaRef.current) {
        setLocalAnnotationText("");
        annotationTextareaRef.current.focus();
      }
    }, [showAnnotationPanel, currentAnnotationCell]);

    // Manejar cambios de texto sin debounce (directo)
    const handleAnnotationTextChange = useCallback((e) => {
      setLocalAnnotationText(e.target.value);
    }, []);

    // Función para guardar que incluye el texto local
    const handleSaveAnnotation = useCallback(() => {
      if (localAnnotationText.trim()) {
        saveAnnotation(localAnnotationText.trim());
        setLocalAnnotationText("");
      }
    }, [localAnnotationText, saveAnnotation]);

    // Manejar Enter para guardar
    const handleKeyPress = useCallback(
      (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handleSaveAnnotation();
        }
      },
      [handleSaveAnnotation],
    );

    if (!showAnnotationPanel) return null;

    const cellAnnotations = annotations[currentAnnotationCell] || [];

    return (
      <div
        data-annotation-panel
        style={{
          position: "fixed",
          left: annotationPanelPosition.x,
          top: annotationPanelPosition.y,
          zIndex: 1001,
          backgroundColor: "#fffbeb",
          border: "1px solid #f59e0b",
          borderRadius: "8px",
          padding: "16px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          minWidth: "300px",
          maxWidth: "450px",
          maxHeight: "600px",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
            paddingBottom: "8px",
            borderBottom: "1px solid #fbbf24",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: "600",
              color: "#92400e",
              wordWrap: "break-word",
              flex: 1,
              marginRight: "8px",
            }}
          >
            Anotaciones - Celda{" "}
            {currentAnnotationCell
              ?.split("-")
              .map((n, i) =>
                i === 0 ? parseInt(n) + 1 : getColumnLabel(parseInt(n)),
              )
              .reverse()
              .join("")}
            {cellAnnotations.length > 0 && (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "normal",
                  color: "#b45309",
                }}
              >
                {" "}
                ({cellAnnotations.length}{" "}
                {cellAnnotations.length === 1 ? "nota" : "notas"})
              </span>
            )}
          </h3>
          <button
            onClick={closeAnnotationPanel}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "18px",
              color: "#92400e",
              padding: "0",
              width: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Historial de anotaciones */}
        {cellAnnotations.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#92400e",
                marginBottom: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <span>📝 Historial de anotaciones:</span>
              {cellAnnotations.length > 1 && (
                <button
                  onClick={() => deleteAllAnnotations(currentAnnotationCell)}
                  style={{
                    fontSize: "10px",
                    padding: "2px 6px",
                    border: "1px solid #ef4444",
                    borderRadius: "3px",
                    backgroundColor: "#fff",
                    color: "#ef4444",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  title="Eliminar todas las anotaciones"
                >
                  Limpiar todo
                </button>
              )}
            </div>

            <div
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                overflowX: "hidden",
                border: "1px solid #fbbf24",
                borderRadius: "4px",
                backgroundColor: "#fef3c7",
              }}
            >
              {cellAnnotations
                .slice()
                .reverse()
                .map((annotation, index) => (
                  <div
                    key={annotation.id}
                    style={{
                      padding: "10px",
                      borderBottom:
                        index < cellAnnotations.length - 1
                          ? "1px solid #fbbf24"
                          : "none",
                      backgroundColor: index === 0 ? "#fef3c7" : "#fffbeb",
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                      hyphens: "auto",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "6px",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#92400e",
                          flex: 1,
                          minWidth: "0",
                          wordWrap: "break-word",
                        }}
                      >
                        <strong>{annotation.author}</strong> • {annotation.date}
                        {index === 0 && (
                          <span
                            style={{
                              marginLeft: "6px",
                              backgroundColor: "#f59e0b",
                              color: "white",
                              padding: "1px 4px",
                              borderRadius: "2px",
                              fontSize: "9px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            RECIENTE
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          deleteAnnotation(currentAnnotationCell, annotation.id)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#ef4444",
                          fontSize: "14px",
                          padding: "0",
                          width: "18px",
                          height: "18px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                        title="Eliminar esta anotación"
                      >
                        ×
                      </button>
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#78350f",
                        lineHeight: "1.5",
                        backgroundColor: "white",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #fbbf24",
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "pre-wrap",
                        hyphens: "auto",
                        minHeight: "20px",
                      }}
                    >
                      {annotation.text}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Nueva anotación */}
        <div style={{ marginBottom: "12px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "#92400e",
              marginBottom: "6px",
            }}
          >
            ✏️ Agregar nueva anotación:
          </div>
          <textarea
            ref={annotationTextareaRef}
            value={localAnnotationText}
            onChange={handleAnnotationTextChange}
            onKeyDown={handleKeyPress}
            placeholder="Escribe tu nueva anotación aquí... (Ctrl+Enter para guardar)"
            style={{
              width: "100%",
              minHeight: "80px",
              border: "1px solid #d97706",
              borderRadius: "4px",
              padding: "8px",
              fontSize: "13px",
              lineHeight: "1.5",
              resize: "vertical",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
              wordWrap: "break-word",
              overflowWrap: "break-word",
            }}
          />
        </div>

        {/* Botones */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={closeAnnotationPanel}
            style={{
              padding: "8px 12px",
              border: "1px solid #6b7280",
              borderRadius: "4px",
              backgroundColor: "#fff",
              color: "#6b7280",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveAnnotation}
            disabled={!localAnnotationText.trim()}
            style={{
              padding: "8px 12px",
              border: "none",
              borderRadius: "4px",
              backgroundColor: localAnnotationText.trim()
                ? "#f59e0b"
                : "#d1d5db",
              color: "white",
              fontSize: "12px",
              cursor: localAnnotationText.trim() ? "pointer" : "not-allowed",
              fontWeight: "500",
            }}
          >
            Agregar Nota
          </button>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Optimización: solo re-renderizar si cambian props importantes
    if (!nextProps.showAnnotationPanel && !prevProps.showAnnotationPanel) {
      return true; // No re-renderizar si ambos están cerrados
    }

    if (prevProps.showAnnotationPanel !== nextProps.showAnnotationPanel) {
      return false; // Re-renderizar si cambia la visibilidad
    }

    if (prevProps.currentAnnotationCell !== nextProps.currentAnnotationCell) {
      return false; // Re-renderizar si cambia la celda
    }

    // Solo comparar anotaciones de la celda actual
    const currentCell = nextProps.currentAnnotationCell;
    if (currentCell) {
      const prevCellAnnotations = prevProps.annotations[currentCell] || [];
      const nextCellAnnotations = nextProps.annotations[currentCell] || [];

      if (prevCellAnnotations.length !== nextCellAnnotations.length) {
        return false; // Re-renderizar si cambia el número de anotaciones
      }

      // Comparación rápida de IDs en lugar de JSON.stringify completo
      const prevIds = prevCellAnnotations.map((a) => a.id).join(",");
      const nextIds = nextCellAnnotations.map((a) => a.id).join(",");

      if (prevIds !== nextIds) {
        return false; // Re-renderizar si cambian las anotaciones
      }
    }

    // Comparar posición del panel
    if (
      prevProps.annotationPanelPosition.x !==
        nextProps.annotationPanelPosition.x ||
      prevProps.annotationPanelPosition.y !==
        nextProps.annotationPanelPosition.y
    ) {
      return false;
    }

    return true; // No re-renderizar en otros casos
  },
);

export { AnnotationPanel };

const TiptapCellEditor = ({
  content,
  onBlur,
  onCancel,
  onSelection,
  editorRef,
  editingContentRef, // <--- Asegúrate de que este nombre coincida exactamente
}) => {
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, Color],
    content: content,
    onSelectionUpdate: ({ editor }) => {
      onSelection();
    },
    editorProps: {
      attributes: {
        class: "cell-editor",
        style: `width: 100%; height: 100%; min-height: 40px; padding: 8px; border: 2px solid #3b82f6; outline: none; background-color: white;`,
      },
      handleKeyDown: (view, event) => {
        if (event.key === "Enter" && event.shiftKey) {
          event.preventDefault();
          // Validación de seguridad antes de asignar
          if (editingContentRef) {
            editingContentRef.current = view.dom.innerHTML;
          }
          onBlur();
          return true;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
    return () => {
      editorRef.current = null;
    };
  }, [editor, editorRef]);

  return (
    <div
      onBlurCapture={() => {
        // Aquí estaba el error. Añadimos validación:
        if (editor && editingContentRef) {
          editingContentRef.current = editor.getHTML();
        }
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <EditorContent editor={editor} />
    </div>
  );
};
// Componente de progreso para generación masiva
const BulkGenerationProgress = React.memo(function BulkGenerationProgress({
  isVisible,
  progress,
}) {
  if (!isVisible) return null;

  const percentage =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <>
      <div className="rd-backdrop" />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 2000,
          backgroundColor: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "28px 32px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.25)",
          minWidth: "420px",
          maxWidth: "520px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "18px",
          }}
        >
          <div className="rd-spinner-dark" />
          <h3
            style={{
              margin: 0,
              fontSize: "17px",
              fontWeight: "600",
              color: "#1f2937",
            }}
          >
            Generando contenido...
          </h3>
        </div>

        {/* Status message */}
        <p
          style={{
            margin: "0 0 18px 0",
            fontSize: "13px",
            color: "#6b7280",
            fontWeight: "500",
          }}
        >
          {progress.status}
        </p>

        {/* Progress bar */}
        <div
          style={{
            width: "100%",
            height: "10px",
            backgroundColor: "#f3f4f6",
            borderRadius: "6px",
            overflow: "hidden",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: "100%",
              background: "linear-gradient(90deg, #8b5cf6, #6366f1)",
              transition: "width 0.3s ease",
              borderRadius: "6px",
            }}
          />
        </div>

        {/* Counter */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#9ca3af",
            fontWeight: "500",
          }}
        >
          <span>
            {progress.current} de {progress.total}
          </span>
          <span>{Math.round(percentage)}%</span>
        </div>
      </div>
    </>
  );
});

export default function Redactor() {
  const { lpId } = useParams();
  const navigate = useNavigate();
  const {
    getLandingPageByProyectoId,
    loadLandingPageSections,
    loadLandingPageAnnotations,
    saveAnnotationToDB,
    deleteAnnotationFromDB,
    deleteAllAnnotationsFromCell,
    saveRedactorProgress,
    currentUser,
    loading: appLoading,
    templates,
    loadTemplates,
    getTemplateById,
  } = useApp();

  const [editingCell, setEditingCell] = useState(null);
  const [tableData, setTableData] = useState({});
  const tableDataRef = useRef({});
  useEffect(() => { tableDataRef.current = tableData; }, [tableData]);
  const [mergedCells, setMergedCells] = useState({});
  const [columnWidths, setColumnWidths] = useState({});
  const [blocksMetadata, setBlocksMetadata] = useState({});
  const [loadedTemplate, setLoadedTemplate] = useState(null); // Template cargado (activo o inactivo)

  const [currentLP, setCurrentLP] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit tracking states
  const [editStartTimes, setEditStartTimes] = useState({});
  const [editContextCache, setEditContextCache] = useState({});

  const cleanHtml = (html) => {
    if (!html || html.trim() === "") return "";

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    const cleanedHtml = tempDiv.innerHTML
      .replace(/<span[^>]*>\s*<\/span>/g, "")
      .replace(/<div[^>]*>\s*<\/div>/g, "")
      .replace(/<p[^>]*>\s*<\/p>/g, "")
      .replace(/<br\s*\/?>\s*<br\s*\/?>/g, "<br>")
      .replace(/(<br\s*\/?>){3,}/g, "<br><br>")
      .trim();

    return cleanedHtml;
  };

  const saveEditingCell = useCallback(() => {
    // 1. Verificamos si hay un editor de Tiptap activo o el ref de contenido
    if (editingCell && !isUpdatingContent.current) {
      setShowColorToolbar(false);
      setTextSelection(null);

      // 2. OBTENCIÓN DEL CONTENIDO:
      // Si tenemos la instancia de Tiptap, sacamos el HTML de ahí.
      // Si no (fallback), usamos el ref que veníamos llenando.
      let htmlContent = "";
      if (tiptapEditorRef.current) {
        htmlContent = tiptapEditorRef.current.getHTML();
      } else {
        htmlContent = editingContentRef.current;
      }

      const cleanedContent = cleanHtml(htmlContent);

      // Solo actualizar si el contenido realmente cambió
      const currentContent = tableData[editingCell]?.content || "";

      if (cleanedContent !== currentContent) {
        setTableData((prev) => ({
          ...prev,
          [editingCell]: {
            content: cleanedContent,
          },
        }));

        // --- INICIO LÓGICA DE LOGS (Mantenida igual) ---
        if (
          currentLP?.id &&
          currentLP?.proyecto_id &&
          editStartTimes[editingCell]
        ) {
          const editStartTime = editStartTimes[editingCell];
          const editContext = editContextCache[editingCell] || {};

          apiService
            .post("/logs/edit", {
              landing_page_id: currentLP.id,
              proyecto_id: currentLP.proyecto_id,
              cell_position: editingCell,
              content_before: currentContent,
              content_after: cleanedContent,
              edit_context: {
                block_type: editContext.block_type || "unknown",
                row: editContext.row,
                col: editContext.col,
              },
              edit_start_time: editStartTime,
              edit_end_time: new Date().toISOString(),
            })
            .then(() => {
              console.log(
                `[Edit Tracking] Logged edit for cell ${editingCell}`,
              );
            })
            .catch((error) => {
              console.warn("[Edit Tracking] Failed to log edit:", error);
            });

          setEditStartTimes((prev) => {
            const updated = { ...prev };
            delete updated[editingCell];
            return updated;
          });
          setEditContextCache((prev) => {
            const updated = { ...prev };
            delete updated[editingCell];
            return updated;
          });
        }
        // --- FIN LÓGICA DE LOGS ---
      }

      setEditingCell(null);
      editingContentRef.current = "";
      // Limpiamos el ref del editor al terminar
      tiptapEditorRef.current = null;
    }
  }, [
    editingCell,
    tableData,
    cleanHtml,
    currentLP,
    editStartTimes,
    editContextCache,
  ]);

  const getThemeFromTable = (tableData) => {
    const themeCellKey = "0-0";
    const themeCell = tableData[themeCellKey];
    return themeCell?.content || "";
  };

  const isMergeOrigin = (row, col) => {
    const cellKey = `${row}-${col}`;
    return !!mergedCells[cellKey];
  };

  const getTitleForIAGeneration = (selectedCell, block, tableData) => {
    const [row, col] = selectedCell.split("-").map(Number);

    if (
      block.type === "car_rental" ||
      block.type === "fleetcarrusel" ||
      block.type === "advicestipocarrusel" ||
      block.type === "deals"
    ) {
      const carTypes = []; // En este caso serían "tipos de consejos"
      if (block.contentMapping) {
        Object.entries(block.contentMapping).forEach(([field, cellKey]) => {
          if (field.startsWith("desc_") && field !== "desc") {
            const [respRow] = cellKey.split("-").map(Number);
            const typeRow = respRow - 1;
            const typeContent = tableData[`${typeRow}-3`]?.content || "";
            const fieldType = tableData[`${typeRow}-2`]?.content || "";

            if (
              typeContent &&
              typeContent.trim() !== "" &&
              (fieldType.includes("H3") || fieldType.includes("h3"))
            ) {
              carTypes.push(typeContent.trim());
            }
          }
        });
      }

      const blockTitle = tableData[`${block.titleRow}-3`]?.content || "";

      console.log("🚗 CAR_RENTAL/FLEET/ADVICES:", {
        blockType: block.type,
        itemsEncontrados: carTypes,
        totalItems: carTypes.length,
      });

      return {
        title: blockTitle,
        type: "car_rental_complete",
        faqQuestions: [],
        favCityQuestions: [],
        carTypes: carTypes,
      };
    }

    if (block.type === "fav_city" || block.type === "locationscarrusel") {
      const favCityQuestions = [];
      if (block.contentMapping) {
        Object.entries(block.contentMapping).forEach(([field, cellKey]) => {
          if (field.startsWith("desc_") && field !== "desc") {
            const [respRow] = cellKey.split("-").map(Number);
            const questionRow = respRow - 1;
            const questionContent =
              tableData[`${questionRow}-3`]?.content || "";

            if (questionContent && questionContent.trim() !== "") {
              favCityQuestions.push(questionContent.trim());
            }
          }
        });
      }

      const blockTitle = tableData[`${block.titleRow}-3`]?.content || "";

      return {
        title: blockTitle,
        type: "fav_city_complete",
        faqQuestions: [],
        favCityQuestions: favCityQuestions,
        carTypes: [],
      };
    }
    //
    if (block.type === "faqs" || block.type === "questions") {
      const faqQuestions = [];
      if (block.contentMapping) {
        Object.entries(block.contentMapping).forEach(([field, cellKey]) => {
          // Buscar tanto faq_ como desc_ (excluyendo desc principal)
          if (
            (field.startsWith("faq_") || field.startsWith("desc_")) &&
            field !== "desc"
          ) {
            const [respRow] = cellKey.split("-").map(Number);
            const questionRow = respRow - 1;
            const questionContent =
              tableData[`${questionRow}-3`]?.content || "";

            if (questionContent && questionContent.trim() !== "") {
              faqQuestions.push(questionContent.trim());
            }
          }
        });
      }

      // Si es la descripción principal del bloque (desc)
      if (row === block.descRow) {
        const h2Title = tableData[`${block.titleRow}-3`]?.content || "";
        return {
          title: h2Title,
          type: "h2_description",
          faqQuestions: faqQuestions,
          favCityQuestions: [],
          carTypes: [],
        };
      }

      // Para las respuestas FAQ individuales
      const questionRow = row - 1;
      const questionFieldType = tableData[`${questionRow}-2`]?.content || "";

      if (
        questionFieldType.includes("H3") &&
        questionFieldType.includes("FAQ")
      ) {
        const faqQuestion = tableData[`${questionRow}-3`]?.content || "";

        if (faqQuestion && faqQuestion.trim() !== "") {
          return {
            title: faqQuestion,
            type: "faq_answer",
            faqQuestions: faqQuestions,
            favCityQuestions: [],
            carTypes: [],
          };
        } else {
          return {
            title: "",
            type: "faq_answer_empty",
            faqQuestions: faqQuestions,
            favCityQuestions: [],
            carTypes: [],
          };
        }
      }
    }

    if (block.type === "rentacar") {
      const blockTitle = tableData[`${block.titleRow}-3`]?.content || "";

      console.log("🚗 RENTACAR:", {
        blockTitle: blockTitle,
        blockType: block.type,
      });

      return {
        title: blockTitle,
        type: "rentacar_block",
        faqQuestions: [],
        favCityQuestions: [],
        carTypes: [],
      };
    }

    if (block.type === "car_rental" || block.type === "fleetcarrusel") {
      const carTypes = [];
      if (block.contentMapping) {
        Object.entries(block.contentMapping).forEach(([field, cellKey]) => {
          if (field.startsWith("desc_") && field !== "desc") {
            const [respRow] = cellKey.split("-").map(Number);
            const typeRow = respRow - 1;
            const typeContent = tableData[`${typeRow}-3`]?.content || "";
            const fieldType = tableData[`${typeRow}-2`]?.content || "";

            // Busca H3 o h3 (case-insensitive)
            if (
              typeContent &&
              typeContent.trim() !== "" &&
              (fieldType.includes("H3") || fieldType.includes("h3"))
            ) {
              carTypes.push(typeContent.trim());
            }
          }
        });
      }

      // Si es la descripción principal del bloque
      if (row === block.descRow) {
        const h2Title = tableData[`${block.titleRow}-3`]?.content || "";
        return {
          title: h2Title,
          type: "h2_description",
          faqQuestions: [],
          favCityQuestions: [],
          carTypes: carTypes,
        };
      }

      // Para las respuestas individuales de tipos de autos
      const typeRow = row - 1;
      const typeFieldType = tableData[`${typeRow}-2`]?.content || "";

      if (typeFieldType.includes("H3")) {
        const carTypeTitle = tableData[`${typeRow}-3`]?.content || "";

        if (carTypeTitle && carTypeTitle.trim() !== "") {
          return {
            title: carTypeTitle,
            type: "car_type_answer",
            faqQuestions: [],
            favCityQuestions: [],
            carTypes: carTypes,
          };
        } else {
          return {
            title: "",
            type: "car_type_answer_empty",
            faqQuestions: [],
            favCityQuestions: [],
            carTypes: carTypes,
          };
        }
      }
    }

    // Para otros bloques, usar el título del bloque
    const defaultTitle = tableData[`${block.titleRow}-3`]?.content || "";
    return {
      title: defaultTitle,
      type: "default",
      faqQuestions: [],
    };
  };

  const isCellMerged = (row, col) => {
    return !!findMergeOrigin(row, col);
  };

  const getFavCityMissingDescInfo = (block, structuredContent = {}) => {
    if (!block || block.type !== "fav_city") {
      return { hasIssue: false, missingDescFields: [] };
    }

    const expectedDescFields = Object.keys(block.contentMapping || {}).filter(
      (field) => field.startsWith("desc_") && field !== "desc",
    );

    const missingDescFields = expectedDescFields.filter((field) => {
      const value = structuredContent[field];
      return value === undefined || String(value).trim() === "";
    });

    const hasAnyTitle = Object.keys(structuredContent).some((field) => {
      if (!field.startsWith("tit_")) {
        return false;
      }
      const value = structuredContent[field];
      return value !== undefined && String(value).trim() !== "";
    });

    return {
      hasIssue:
        hasAnyTitle &&
        expectedDescFields.length > 0 &&
        missingDescFields.length > 0,
      missingDescFields,
    };
  };

  const getBlockTitleContent = (blockInfo, tableData) => {
    if (!blockInfo) return "";

    const titleCellKey = `${blockInfo.titleRow}-3`;
    const titleCell = tableData[titleCellKey];
    return titleCell?.content || "";
  };

  const getDescriptionCellKey = (blockInfo) => {
    if (!blockInfo) return null;
    return `${blockInfo.descRow}-3`;
  };

  const getSpanishContent = (row, tableData) => {
    const spanishCellKey = `${row}-3`;
    const spanishCell = tableData[spanishCellKey];
    return spanishCell?.content || "";
  };

  const getBlockTypeFromNumber = (blockNumber) => {
    const blockMapping = {
      1: "quicksearch",
      2: "fleet",
      3: "agencies",
      4: "faqs",
      5: "car_rental",
      6: "fav_city",
      7: "fav_city",
    };

    return blockMapping[blockNumber] || "quicksearch";
  };

  const [isExporting, setIsExporting] = useState(false);

  const [columnHeaders, setColumnHeaders] = useState([
    "Página",
    "Bloque",
    "Comentarios para el equipo IT",
    "Español",
    "Inglés",
    "Portugués",
    "Revisado por / Fecha",
  ]);

  const [tableConfig, setTableConfig] = useState({
    numRows: 80,
    numCols: 7,
    defaultRowHeight: 40,
    defaultColumnWidth: 120,
  });

  // Función para exportar a Excel
  const exportToExcelWithTemplate = async () => {
    try {
      setIsExporting(true);

      // Obtener template actual
      const currentTemplate = getCurrentTemplate();
      if (!currentTemplate) {
        alert("No se pudo obtener la información del template actual");
        return;
      }

      // Preparar datos para exportación
      const exportData = {
        template_config: {
          blocks_metadata: blocksMetadata,
          columnHeaders: columnHeaders,
          columnWidths: columnWidths,
          mergedCells: mergedCells,
          tableConfig: tableConfig,
          templateData: getTemplateDataForExport(),
        },
        template_info: {
          id: currentTemplate.id,
          name: currentTemplate.name,
          description: currentTemplate.description,
          categoria: currentTemplate.categoria,
          proyecto: currentTemplate.proyecto,
          dominio: currentTemplate.dominio,
          is_active: currentTemplate.is_active,
        },
        cell_data: getCellDataFromTable(),
      };

      // Llamar al endpoint
      const API_BASE =
        process.env.REACT_APP_API_URL || "http://192.168.1.129:8080";
      const response = await fetch(`${API_BASE}/export/excel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || `Error en la exportación: ${response.status}`,
        );
      }

      // Crear blob y descargar archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentTemplate.name}_${currentTemplate.categoria}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error durante la exportación:", error);
      alert("Error al exportar el archivo: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Función auxiliar para obtener datos del template en formato correcto
  const getTemplateDataForExport = () => {
    const templateData = {};

    // Convertir tableData actual al formato esperado por el backend
    Object.keys(tableData).forEach((cellKey) => {
      const cellContent = tableData[cellKey];
      templateData[cellKey] = {
        value: cellContent.content || "",
        style: null,
        type: "text",
      };
    });

    return templateData;
  };

  // Función auxiliar para obtener datos actualizados de las celdas
  const getCellDataFromTable = () => {
    const cellData = {};

    // Recorrer todas las celdas del tableData actual
    Object.keys(tableData).forEach((cellKey) => {
      const cellContent = tableData[cellKey];
      if (cellContent && cellContent.content) {
        cellData[cellKey] = {
          value: cellContent.content || "",
          style: null,
          type: "text",
        };
      }
    });

    return cellData;
  };

  const callIAEndpoint = async (params) => {
    const {
      blockNumber,
      blockTitle,
      cellKey,
      tema,
      faqQuestions = [],
      favCityQuestions = [],
      carTypes = [],
      blockType,
      templateInfo,
    } = params;

    const apiPayload = {
      lpId: currentLP.id,
      blockNumber,
      blockTitle,
      tema,
      cellKey,
      faqQuestions,
      favCityQuestions,
      carTypes,
      blockType,
      templateInfo,
    };

    return await apiService.generateIAContent(apiPayload);
  };

  const callTranslationEndpoint = async (
    sourceContent,
    targetLanguage,
    cellKey,
    blockTitle,
    tema,
  ) => {
    return await apiService.translateContent(
      currentLP.id,
      sourceContent,
      targetLanguage,
      cellKey,
      blockTitle,
      tema,
    );
  };

  // Función para generar toda la fila en español (todos los bloques)
  const generateAllRowsSpanish = async () => {
    if (!blocksMetadata || Object.keys(blocksMetadata).length === 0) {
      alert("No se encontró información de bloques");
      return;
    }

    if (!currentLP?.title) {
      alert("No se encontró información de la landing page");
      return;
    }

    console.log("🚀 Iniciando generación de todos los bloques...");
    console.log("📦 Bloques disponibles:", blocksMetadata);

    const tema = currentLP.title;
    const currentTemplate = getCurrentTemplate();

    // Recopilar todas las celdas de todos los bloques
    const allBlocks = Object.entries(blocksMetadata).map(
      ([blockId, blockData]) => ({
        number: parseInt(blockId),
        name: blockData.name,
        type: blockData.type,
        contentMapping: blockData.contentMapping || {},
        titleRow: blockData.titleRow,
        descRow: blockData.descRow,
        startRow: blockData.startRow,
        endRow: blockData.endRow,
      }),
    );

    console.log("📋 Bloques procesados:", allBlocks);

    // Contar solo las celdas desc (no contar cada faq/fav_city individual)
    let totalBlocks = allBlocks.length;

    setIsBulkGenerating(true);
    setBulkProgress({
      current: 0,
      total: totalBlocks,
      status: "Iniciando generación...",
    });

    let currentBlockIndex = 0;

    // Procesar cada bloque
    for (const block of allBlocks) {
      currentBlockIndex++;

      console.log(
        `\n🔄 Procesando bloque ${currentBlockIndex}/${totalBlocks}:`,
        block.name,
      );

      setBulkProgress({
        current: currentBlockIndex,
        total: totalBlocks,
        status: `Generando bloque ${currentBlockIndex} de ${totalBlocks}: ${block.name}...`,
      });

      try {
        // Obtener la celda de descripción principal del bloque
        const descCellKey = `${block.descRow}-3`;

        console.log(`  📝 Celda desc: ${descCellKey}`);

        // Obtener información del título para este bloque
        const titleInfo = getTitleForIAGeneration(
          descCellKey,
          block,
          tableData,
        );
        // Si la celda H1/H2 está vacía (LP nuevo sin contenido), usa el título del LP
        const blockTitle = titleInfo.title || tema;

        console.log(`  📌 Título del bloque: "${blockTitle}"`);
        console.log(`  ❓ FAQs:`, titleInfo.faqQuestions);
        console.log(`  🏙️ Ciudades:`, titleInfo.favCityQuestions);
        console.log(`  🚗 Autos:`, titleInfo.carTypes);

        if (!blockTitle || blockTitle.trim() === "") {
          console.log(`  ⚠️ Saltando bloque ${block.name} - sin título`);
          continue;
        }

        const generatedContent = await callIAEndpoint({
          blockNumber: block.number,
          blockTitle: blockTitle,
          cellKey: descCellKey,
          tema: tema,
          faqQuestions: titleInfo.faqQuestions || [],
          favCityQuestions: titleInfo.favCityQuestions || [],
          carTypes: titleInfo.carTypes || [],
          blockType: block.type,
          templateInfo: currentTemplate,
        });

        console.log(`  ✅ Contenido generado:`, generatedContent);

        // Actualizar tableData con el contenido generado
        if (generatedContent?.structured_content) {
          const favCityDescCheck = getFavCityMissingDescInfo(
            block,
            generatedContent.structured_content,
          );
          if (favCityDescCheck.hasIssue) {
            console.warn(
              "⚠️ Favorite Cities sin descripciones en structured_content:",
              {
                blockNumber: block.number,
                missingDescFields: favCityDescCheck.missingDescFields,
                receivedKeys: Object.keys(generatedContent.structured_content),
              },
            );
          }

          const brand = currentTemplate?.proyecto || "mcr";
          const baseDesc = generatedContent.structured_content["desc"] || "";
          setTableData((prev) => {
            const updates = { ...prev };
            Object.entries(block.contentMapping).forEach(
              ([contentField, contentCellKey]) => {
                let contentValue =
                  generatedContent.structured_content[contentField];

                if (contentValue === undefined) {
                  if (contentField.startsWith("desc_")) {
                    const number = contentField.replace("desc_", "");
                    contentValue =
                      generatedContent.structured_content[`faq_${number}`];
                  } else if (contentField.startsWith("faq_")) {
                    const number = contentField.replace("faq_", "");
                    contentValue =
                      generatedContent.structured_content[`desc_${number}`];
                  }
                }

                if (contentValue !== undefined) {
                  console.log(
                    `    ➕ Actualizando ${contentCellKey} con campo ${contentField}`,
                  );
                  const colorized = colorizeField(
                    contentField,
                    contentValue,
                    brand,
                    baseDesc,
                  );
                  updates[contentCellKey] = { content: colorized };

                  // Para FAQ/Favorite Cities: actualizar el título H3 de la fila anterior
                  if (
                    contentField.startsWith("desc_") ||
                    contentField.startsWith("faq_")
                  ) {
                    const index = contentField
                      .replace("desc_", "")
                      .replace("faq_", "");
                    const titleValue =
                      generatedContent.structured_content[`q_${index}`] ||
                      generatedContent.structured_content[`tit_${index}`];
                    if (titleValue) {
                      const [respRow] = contentCellKey.split("-").map(Number);
                      const titleCellKey = `${respRow - 1}-3`;
                      updates[titleCellKey] = { content: titleValue };
                    }
                  }
                }
              },
            );
            // Título H1/H2: structured_content.titulo o tit → celda titleRow-3
            // Para fav_city/locationscarrusel el H2 siempre está en startRow
            const tituloGenerado =
              generatedContent.structured_content.titulo ||
              generatedContent.structured_content.tit;
            if (tituloGenerado) {
              const isFavCity =
                block.type === "fav_city" || block.type === "locationscarrusel";
              const h2Row = isFavCity ? block.startRow : block.titleRow;
              if (h2Row !== undefined) {
                const titleCellKey = `${h2Row}-3`;
                console.log(
                  `    ➕ Actualizando título ${titleCellKey} con: ${tituloGenerado}`,
                );
                updates[titleCellKey] = { content: tituloGenerado };
              }
            }
            return updates;
          });
        }

        // Pequeña pausa para que el usuario vea el progreso
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Error generando bloque ${block.name}:`, error);
        alert(`Error generando bloque ${block.name}: ${error.message}`);
      }
    }

    console.log("✅ Generación completada!");

    // auto-save silencioso tras generación masiva
    saveRedactorProgress(currentLP.id, tableDataRef.current, annotations)
      .catch(() => {});

    setBulkProgress({
      current: totalBlocks,
      total: totalBlocks,
      status: "¡Completado!",
    });
    setTimeout(() => {
      setIsBulkGenerating(false);
      setBulkProgress({ current: 0, total: 0, status: "" });
    }, 2000);
  };

  // Función para traducir todas las filas a inglés y portugués (todos los bloques)
  const translateAllRows = async () => {
    if (!blocksMetadata || Object.keys(blocksMetadata).length === 0) {
      alert("No se encontró información de bloques");
      return;
    }

    console.log("🌐 Iniciando traducción de todos los bloques...");

    const tema = currentLP.title;

    // Recopilar todas las celdas de todos los bloques
    const allBlocks = Object.entries(blocksMetadata).map(
      ([blockId, blockData]) => ({
        number: parseInt(blockId),
        name: blockData.name,
        type: blockData.type,
        startRow: blockData.startRow,
        endRow: blockData.endRow,
      }),
    );

    console.log("📋 Bloques a traducir:", allBlocks);

    // Recopilar TODAS las celdas de español (columna 3) en cada bloque
    const allSpanishCells = [];

    allBlocks.forEach((block) => {
      // Iterar por todas las filas del bloque
      for (let row = block.startRow; row <= block.endRow; row++) {
        const spanishCellKey = `${row}-3`;
        const spanishContent = tableData[spanishCellKey]?.content || "";

        // Solo agregar si tiene contenido
        if (spanishContent && spanishContent.trim() !== "") {
          allSpanishCells.push({
            cellKey: spanishCellKey,
            row: row,
            blockName: block.name,
            content: spanishContent,
          });
        }
      }
    });

    console.log(
      `📝 Total de celdas con contenido español: ${allSpanishCells.length}`,
    );

    const totalSteps = allSpanishCells.length * 2; // x2 para inglés y portugués
    let currentStep = 0;

    setIsBulkGenerating(true);
    setBulkProgress({
      current: 0,
      total: totalSteps,
      status: "Iniciando traducción...",
    });

    // Paso 1: Traducir todo a inglés
    console.log("\n🇬🇧 Fase 1: Traduciendo a inglés...");

    for (let i = 0; i < allSpanishCells.length; i++) {
      const cell = allSpanishCells[i];
      const englishCellKey = `${cell.row}-4`;
      currentStep++;

      setBulkProgress({
        current: currentStep,
        total: totalSteps,
        status: `[EN] [${cell.blockName}] Traduciendo ${i + 1} de ${allSpanishCells.length}...`,
      });

      console.log(
        `  🔄 [EN] Traduciendo celda ${cell.cellKey} -> ${englishCellKey}`,
      );

      try {
        const translatedContent = await callTranslationEndpoint(
          cell.content,
          "en",
          englishCellKey,
          null,
          tema,
        );

        if (translatedContent) {
          setTableData((prev) => ({
            ...prev,
            [englishCellKey]: { content: translatedContent },
          }));
          console.log(`    ✅ Traducido exitosamente`);
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error(
          `    ❌ Error traduciendo a inglés celda ${englishCellKey}:`,
          error,
        );
      }
    }

    // Paso 2: Traducir todo a portugués
    console.log("\n🇧🇷 Fase 2: Traduciendo a portugués...");

    for (let i = 0; i < allSpanishCells.length; i++) {
      const cell = allSpanishCells[i];
      const portugueseCellKey = `${cell.row}-5`;
      currentStep++;

      setBulkProgress({
        current: currentStep,
        total: totalSteps,
        status: `[PT] [${cell.blockName}] Traduciendo ${i + 1} de ${allSpanishCells.length}...`,
      });

      console.log(
        `  🔄 [PT] Traduciendo celda ${cell.cellKey} -> ${portugueseCellKey}`,
      );

      try {
        const translatedContent = await callTranslationEndpoint(
          cell.content,
          "pt",
          portugueseCellKey,
          null,
          tema,
        );

        if (translatedContent) {
          setTableData((prev) => ({
            ...prev,
            [portugueseCellKey]: { content: translatedContent },
          }));
          console.log(`    ✅ Traducido exitosamente`);
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error(
          `    ❌ Error traduciendo a portugués celda ${portugueseCellKey}:`,
          error,
        );
      }
    }

    console.log("✅ Traducción completada!");

    setBulkProgress({
      current: totalSteps,
      total: totalSteps,
      status: "¡Completado!",
    });
    setTimeout(() => {
      setIsBulkGenerating(false);
      setBulkProgress({ current: 0, total: 0, status: "" });
    }, 2000);
  };

  const getBlockFromRow = (row) => {
    console.log("🔍 getBlockFromRow - Analizando fila:", row);
    console.log("🔍 blocksMetadata disponible:", blocksMetadata);
    if (!blocksMetadata || Object.keys(blocksMetadata).length === 0) {
      return null;
    }

    for (const [blockId, blockData] of Object.entries(blocksMetadata)) {
      if (row >= blockData.startRow && row <= blockData.endRow) {
        return {
          name: blockData.name,
          number: parseInt(blockId),
          titleRow: blockData.titleRow,
          descRow: blockData.descRow,
          type: blockData.type,
          contentMapping: blockData.contentMapping || {},
        };
      }
    }
    return null;
  };

  // En el useEffect donde cargas el template:
  useEffect(() => {
    const loadLandingPage = async () => {
      setLoading(true);
      const lp = await getLandingPageByProyectoId(lpId);

      if (lp) {
        // Cargar secciones y anotaciones en paralelo
        const [existingSections, existingAnnotations] = await Promise.all([
          loadLandingPageSections(lp.id),
          loadLandingPageAnnotations(lp.id),
        ]);

        // Obtener el template completo
        const template = await apiService.getTemplateById(lp.template_id);

        // Guardar el template cargado (activo o inactivo) para usarlo en getCurrentTemplate
        setLoadedTemplate(template);

        // Extraer configuraciones del template
        if (template?.template_config?.blocks_metadata) {
          setBlocksMetadata(template.template_config.blocks_metadata);
        }
        console.log(
          "🔍 TEMPLATE blocks_metadata:",
          template?.template_config?.blocks_metadata,
        );
        console.log(
          "🔍 Bloque 5 específico:",
          template?.template_config?.blocks_metadata?.["5"],
        );

        if (template?.template_config?.mergedCells) {
          setMergedCells(template.template_config.mergedCells);
        }

        if (template?.template_config?.columnWidths) {
          setColumnWidths(template.template_config.columnWidths);
        }

        // NUEVAS CONFIGURACIONES PARA EXPORTACIÓN
        if (template?.template_config?.columnHeaders) {
          setColumnHeaders(template.template_config.columnHeaders);
        }

        if (template?.template_config?.tableConfig) {
          setTableConfig(template.template_config.tableConfig);
        }

        // Verificar qué campo tiene los datos
        const templateData = template?.template_config?.templateData || {};

        const mergedTableData = {};

        // Primero iterar sobre el templateData
        Object.keys(templateData).forEach((key) => {
          const templateCell = templateData[key];
          const existingCell = existingSections[key];

          // Columnas 1-2: etiquetas estructurales del template (H1, H2, etc.)
          // Columnas 3+: contenido generado por IA — vacío salvo celdas de disclaimer
          const [rowStr, colStr] = key.split("-");
          const col = parseInt(colStr);
          let fallback = "";
          if (col >= 3) {
            const labelCell = templateData[`${rowStr}-2`];
            const label = (labelCell?.text || "").toLowerCase();
            if (label.includes("disclaimer")) {
              fallback = templateCell?.text || "";
            }
          } else {
            fallback = templateCell?.text || "";
          }

          mergedTableData[key] = {
            content: existingCell ? existingCell.content : fallback,
          };
        });

        // Luego agregar cualquier celda guardada que no esté en templateData
        Object.keys(existingSections).forEach((key) => {
          if (!mergedTableData[key]) {
            mergedTableData[key] = {
              content: existingSections[key].content,
            };
          }
        });

        setTableData(mergedTableData);
        setAnnotations(existingAnnotations);
      }

      console.log("🔍 currentLP data:", lp);
      console.log("🔍 currentLP.name:", lp?.name);
      console.log("🔍 currentLP.title:", lp?.title);
      console.log("🔍 currentLP keys:", lp ? Object.keys(lp) : "null");
      setCurrentLP(lp);
      setLoading(false);
    };

    loadLandingPage();
  }, [lpId]);

  const [lastSaved, setLastSaved] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved");

  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);

  const [textSelection, setTextSelection] = useState(null);
  const [showColorToolbar, setShowColorToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });

  const [annotations, setAnnotations] = useState(() => {
    return currentLP?.annotations || {};
  });
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(false);
  const [annotationPanelPosition, setAnnotationPanelPosition] = useState({
    x: 0,
    y: 0,
  });
  const [currentAnnotationCell, setCurrentAnnotationCell] = useState(null);

  const [rowHeights, setRowHeights] = useState(() => {
    const heights = {};
    for (let i = 0; i < tableConfig.numRows; i++) {
      heights[i] = tableConfig.defaultRowHeight;
    }
    return heights;
  });

  const [isResizing, setIsResizing] = useState(false);
  const [resizeData, setResizeData] = useState(null);

  // Estados para generación masiva
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({
    current: 0,
    total: 0,
    status: "",
  });

  const inputRef = useRef(null);
  const tableRef = useRef(null);
  const annotationTextareaRef = useRef(null);
  const isUpdatingContent = useRef(false);

  const getColumnLabel = (index) => columnHeaders[index] || `Col ${index + 1}`;
  const numRows = tableConfig.numRows;
  const numCols = tableConfig.numCols;

  const editingContentRef = useRef("");
  const resizeTimeoutRef = useRef(null);

  const closeAnnotationPanel = () => {
    setShowAnnotationPanel(false);
    setCurrentAnnotationCell(null);
  };

  // Dentro de Redactor.jsx
  const saveProgress = async () => {
    if (!currentLP) return;

    setSaveStatus("saving");
    try {
      // 1. Guardar progreso normal
      await saveRedactorProgress(currentLP.id, tableData, annotations);

      // 2. Guardar log de entrenamiento (El backend buscará el resto)
      await apiService.saveTrainingData(currentLP, tableData);

      setLastSaved(new Date());
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Error al guardar:", error);
      setSaveStatus("error");
    }
  };

  // Auto-resize cuando se está editando
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      autoResizeTextarea(inputRef.current);
    }
  }, [editingCell]);

  // Manejar clicks fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showColorToolbar &&
        !event.target.closest("[data-color-toolbar]") &&
        !editingCell
      ) {
        setShowColorToolbar(false);
        setTextSelection(null);
      }

      if (
        showAnnotationPanel &&
        !event.target.closest("[data-annotation-panel]")
      ) {
        closeAnnotationPanel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      // AGREGAR ESTE CLEANUP
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [
    showColorToolbar,
    showAnnotationPanel,
    editingCell,
    closeAnnotationPanel,
  ]);

  // Redimensionamiento
  useEffect(() => {
    let throttleTimeout = null;

    const handleMouseMove = (e) => {
      if (!isResizing || !resizeData) return;

      // Throttle el mouse move para hacer el redimensionamiento menos sensible
      if (throttleTimeout) return;

      throttleTimeout = setTimeout(() => {
        const { type, index, startX, startY } = resizeData;

        if (type === "column") {
          const diff = e.clientX - startX;
          // Hacer el redimensionamiento menos sensible dividiendo por 2
          const adjustedDiff = Math.round(diff / 2);
          const currentWidth = columnWidths[index] || 120;
          const newWidth = Math.max(80, currentWidth + adjustedDiff); // Ancho mínimo 80px

          setColumnWidths((prev) => ({ ...prev, [index]: newWidth }));

          // Actualizar la posición de inicio para el siguiente cálculo
          setResizeData((prev) => ({ ...prev, startX: e.clientX }));
        } else if (type === "row") {
          const diff = e.clientY - startY;
          // Hacer el redimensionamiento menos sensible dividiendo por 2
          const adjustedDiff = Math.round(diff / 2);
          const currentHeight = rowHeights[index] || 40;
          const newHeight = Math.max(30, currentHeight + adjustedDiff); // Altura mínima 30px

          setRowHeights((prev) => ({ ...prev, [index]: newHeight }));

          // Actualizar la posición de inicio para el siguiente cálculo
          setResizeData((prev) => ({ ...prev, startY: e.clientY }));
        }

        throttleTimeout = null;
      }, 16); // ~60fps throttling
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeData(null);
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
        throttleTimeout = null;
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [isResizing, resizeData, columnWidths, rowHeights]);

  const extractPlainText = (html) => {
    if (!html || html.trim() === "") return "";

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return (tempDiv.textContent || tempDiv.innerText || "").trim();
  };

  const autoResizeTextarea = useCallback(
    (element) => {
      if (!element || !editingCell) return;

      // Throttle el resize para evitar llamadas excesivas
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        // Reset height to auto to get the actual content height
        element.style.height = "auto";

        // Calculate the actual content height
        const contentHeight = element.scrollHeight;
        const minHeight = 40; // Altura mínima
        const newHeight = Math.max(minHeight, contentHeight + 4);

        // Apply the new height
        element.style.height = newHeight + "px";

        // Update row height SOLO si hay un cambio significativo (más de 5px)
        const [row] = editingCell.split("-").map(Number);
        const currentRowHeight = rowHeights[row] || minHeight;

        // Permitir tanto crecimiento como reducción
        if (Math.abs(newHeight - currentRowHeight) > 5) {
          setRowHeights((prev) => ({
            ...prev,
            [row]: newHeight,
          }));
        }
      }, 100); // Throttle de 100ms
    },
    [editingCell, rowHeights],
  );

  const addOrEditAnnotation = (cellKey) => {
    if (!cellKey) return;

    setCurrentAnnotationCell(cellKey);

    const cellElement = document.querySelector(`[data-cell="${cellKey}"]`);
    if (cellElement) {
      const rect = cellElement.getBoundingClientRect();
      const panelWidth = 450;
      const panelHeight = 600;

      let x = rect.right + 10;
      let y = rect.top;

      // Ajustar posición si se sale de la pantalla
      if (x + panelWidth > window.innerWidth) {
        x = rect.left - panelWidth - 10;
      }

      if (y + panelHeight > window.innerHeight) {
        y = window.innerHeight - panelHeight - 10;
      }

      x = Math.max(10, x);
      y = Math.max(10, y);

      setAnnotationPanelPosition({ x, y });
    }

    setShowAnnotationPanel(true);
  };

  const saveAnnotationLocal = useCallback(
    async (textToSave) => {
      if (!currentAnnotationCell || !textToSave || !currentLP) {
        return;
      }

      try {
        const savedAnnotation = await saveAnnotationToDB(
          currentLP.id,
          currentAnnotationCell,
          textToSave,
        );

        setAnnotations((prev) => {
          const updated = {
            ...prev,
            [currentAnnotationCell]: [
              ...(prev[currentAnnotationCell] || []),
              savedAnnotation,
            ],
          };
          return updated;
        });

        closeAnnotationPanel();
      } catch (error) {
        console.error("Error guardando anotación:", error);
        alert("Error al guardar la anotación: " + error.message);
      }
    },
    [
      currentAnnotationCell,
      currentLP,
      saveAnnotationToDB,
      closeAnnotationPanel,
    ],
  );

  const deleteAnnotationLocal = useCallback(
    async (cellKey, annotationId) => {
      try {
        // Eliminar de BD
        await deleteAnnotationFromDB(annotationId);

        // Actualizar estado local
        setAnnotations((prev) => {
          const cellAnnotations = prev[cellKey] || [];
          const updatedAnnotations = cellAnnotations.filter(
            (ann) => ann.id !== annotationId,
          );

          if (updatedAnnotations.length === 0) {
            const newAnnotations = { ...prev };
            delete newAnnotations[cellKey];
            return newAnnotations;
          } else {
            return {
              ...prev,
              [cellKey]: updatedAnnotations,
            };
          }
        });
      } catch (error) {
        console.error("Error eliminando anotación:", error);
        alert("Error al eliminar la anotación: " + error.message);
      }
    },
    [deleteAnnotationFromDB],
  );

  const deleteAllAnnotations = useCallback(
    async (cellKey) => {
      try {
        // Eliminar de BD
        await deleteAllAnnotationsFromCell(currentLP.id, cellKey);

        // Actualizar estado local
        setAnnotations((prev) => {
          const newAnnotations = { ...prev };
          delete newAnnotations[cellKey];
          return newAnnotations;
        });

        closeAnnotationPanel();
      } catch (error) {
        console.error("Error al eliminar todas las anotaciones:", error);
        alert("Error al eliminar todas las anotaciones: " + error.message);
      }
    },
    [currentLP, deleteAllAnnotationsFromCell, closeAnnotationPanel],
  );

  const showAnnotation = (cellKey, event) => {
    event.stopPropagation();

    const cellAnnotations = annotations[cellKey];
    if (!cellAnnotations || cellAnnotations.length === 0) return;

    setCurrentAnnotationCell(cellKey);

    const panelWidth = 450;
    const panelHeight = 600;

    let x = event.clientX + 10;
    let y = event.clientY - 10;

    // Ajustar si se sale por la derecha
    if (x + panelWidth > window.innerWidth) {
      x = event.clientX - panelWidth - 10;
    }

    // Ajustar si se sale por abajo
    if (y + panelHeight > window.innerHeight) {
      y = window.innerHeight - panelHeight - 10;
    }

    // Asegurar que no se salga por arriba o izquierda
    x = Math.max(10, x);
    y = Math.max(10, y);

    setAnnotationPanelPosition({ x, y });
    setShowAnnotationPanel(true);
  };

  const clearAllContent = () => {
    if (
      !window.confirm(
        "¿Estás seguro de que quieres borrar todo el contenido de Español, Inglés y Portugués? Esta acción no se puede deshacer.",
      )
    )
      return;

    setEditingCell(null);
    setShowColorToolbar(false);
    setTextSelection(null);
    closeAnnotationPanel();
    setSelectedCell(null);
    setSelectedRange(null);

    setTableData((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        const col = parseInt(key.split("-")[1], 10);
        if (col === 3 || col === 4 || col === 5) {
          updated[key] = { ...updated[key], content: "" };
        }
      });
      return updated;
    });
  };

  const resetToTemplate = () => {
    setEditingCell(null);
    setShowColorToolbar(false);
    setTextSelection(null);
    closeAnnotationPanel();

    const template = getExcelTemplate();
    const richData = {};

    Object.keys(template.templateData).forEach((key) => {
      const text = template.templateData[key].text || "";
      richData[key] = {
        content: text,
      };
    });

    setTableData(richData);
    setMergedCells(template.mergedCells);
    setColumnWidths(template.columnWidths);
    setSelectedCell(null);
    setSelectedRange(null);
    setAnnotations({});

    const defaultHeights = {};
    for (let i = 0; i < tableConfig.numRows; i++) {
      defaultHeights[i] = tableConfig.defaultRowHeight;
    }
    setRowHeights(defaultHeights);
  };

  const applyColorToSelection = (color) => {
    if (tiptapEditorRef.current) {
      // Esto hace EXACTAMENTE lo mismo que tu función larga de 80 líneas
      // pero de forma segura para Tiptap.
      tiptapEditorRef.current.chain().focus().setColor(color).run();
      setShowColorToolbar(false);
      setTextSelection(null);
    }
  };

  // ✅ FUNCIÓN 1: Aplanar spans de color anidados
  const flattenColorSpans = (htmlString) => {
    if (!htmlString) return "";

    const temp = document.createElement("div");
    temp.innerHTML = htmlString;

    // Encontrar todos los spans con color
    const colorSpans = temp.querySelectorAll('span[style*="color"]');

    colorSpans.forEach((span) => {
      // Buscar spans hijos que también tengan color
      const childColorSpans = span.querySelectorAll('span[style*="color"]');

      if (childColorSpans.length > 0) {
        console.log("🔧 Aplanando span anidado");

        // Crear fragmento para reemplazar
        const fragment = document.createDocumentFragment();

        // Procesar cada nodo hijo
        Array.from(span.childNodes).forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
            // Texto directo - crear span con color del padre
            const newSpan = document.createElement("span");
            newSpan.style.color = span.style.color;
            newSpan.textContent = child.textContent;
            fragment.appendChild(newSpan);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            if (child.tagName === "SPAN" && child.style.color) {
              // Span hijo con color - usar su propio color
              const newSpan = document.createElement("span");
              newSpan.style.color = child.style.color;
              newSpan.textContent = child.textContent;
              fragment.appendChild(newSpan);
            } else {
              // Otro elemento - envolver en span con color del padre
              const newSpan = document.createElement("span");
              newSpan.style.color = span.style.color;
              newSpan.appendChild(child.cloneNode(true));
              fragment.appendChild(newSpan);
            }
          }
        });

        // Reemplazar el span original
        span.parentNode.replaceChild(fragment, span);
      }
    });

    return temp.innerHTML;
  };

  const tiptapEditorRef = useRef(null);

  const applyFormatToSelection = (format) => {
    if (tiptapEditorRef.current) {
      const editor = tiptapEditorRef.current;
      if (format === "bold") editor.chain().focus().toggleBold().run();
      if (format === "italic") editor.chain().focus().toggleItalic().run();
    } else {
      // Tu lógica vieja por si acaso
      document.execCommand(format, false, null);
    }
  };

  const cleanHTMLForBackend = (htmlString) => {
    if (!htmlString) return "";

    let cleaned = htmlString;

    // 1. Aplanar spans anidados
    cleaned = flattenColorSpans(cleaned);

    // 2. Remover tags de Office
    cleaned = cleaned.replace(/<o:p><\/o:p>/g, "");
    cleaned = cleaned.replace(/<o:p>/g, "");
    cleaned = cleaned.replace(/<\/o:p>/g, "");

    // 3. Remover class="MsoNormal"
    cleaned = cleaned.replace(/\sclass="MsoNormal"/g, "");

    // 4. Simplificar styles - mantener SOLO color
    cleaned = cleaned.replace(/<span style="([^"]*)"/g, (match, styles) => {
      const colorMatch = styles.match(/color:\s*rgb\([^)]+\)/);
      if (colorMatch) {
        return `<span style="${colorMatch[0]}"`;
      }
      return "<span"; // Sin estilos
    });

    // 5. Normalizar bold
    cleaned = cleaned.replace(/<b>/g, "<strong>");
    cleaned = cleaned.replace(/<\/b>/g, "</strong>");
    cleaned = cleaned.replace(/<b style="[^"]*">/g, "<strong>");

    // 6. Remover spans vacíos
    cleaned = cleaned.replace(/<span><\/span>/g, "");
    cleaned = cleaned.replace(/<span style="[^"]*"><\/span>/g, "");

    // 7. Remover saltos de línea excesivos
    cleaned = cleaned.replace(/\n\s*\n/g, "\n");

    console.log("🧹 HTML limpiado para backend");

    return cleaned.trim();
  };

  const validateHTMLForExport = (htmlString) => {
    const issues = [];

    // Detectar spans anidados con color
    const nestedPattern = /<span[^>]*color:[^>]*>[^<]*<span[^>]*color:/;
    if (nestedPattern.test(htmlString)) {
      issues.push("❌ Spans de color anidados");
    }

    // Detectar tags de Office
    if (htmlString.includes("<o:p>")) {
      issues.push("⚠️ Tags de Office (o:p)");
    }

    // Detectar styles innecesarios
    if (htmlString.includes("background-image: initial")) {
      issues.push("⚠️ Styles de background innecesarios");
    }

    if (issues.length > 0) {
      console.warn("⚠️ Issues detectados:", issues);
      return false;
    }

    console.log("✅ HTML válido");
    return true;
  };

  // Función para limpiar HTML legacy al cargar/guardar
  const cleanLegacyHTML = (html) => {
    if (!html) return html;

    const invalidTags = ["g", "mo", "alquila", "renta", "auto", "viaje"];
    let cleaned = html;

    invalidTags.forEach((tag) => {
      cleaned = cleaned.replace(
        new RegExp(`<${tag}(\\s[^>]*)?>`, "gi"),
        "<span>",
      );
      cleaned = cleaned.replace(new RegExp(`</${tag}>`, "gi"), "</span>");
    });

    cleaned = cleaned.replace(/\s+\w+=""/g, ""); // Limpiar atributos vacíos

    return cleaned;
  };

  // Úsala al obtener el valor de la celda
  const getCellValue = () => {
    if (!inputRef.current) return "";
    return cleanLegacyHTML(inputRef.current.innerHTML);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setShowColorToolbar(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Guardamos la selección para que tus funciones applyColor funcionen
    setTextSelection({
      range: range.cloneRange(),
      text: selection.toString(),
    });

    // Posicionamos la barra sobre la selección
    setToolbarPosition({
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY - 40, // 40px arriba del texto
    });

    setShowColorToolbar(true);
  };

  const handleCellDoubleClick = useCallback(
    (row, col) => {
      if (isCellMerged(row, col) && !isMergeOrigin(row, col)) return;

      const cellKey = `${row}-${col}`;

      if (editingCell === cellKey) return;

      if (editingCell && editingCell !== cellKey) {
        saveEditingCell();
      }

      setEditingCell(cellKey);

      const cellData = tableData[cellKey];
      const contentToEdit = cellData ? cleanHtml(cellData.content || "") : "";

      // Guardar contenido en ref para evitar re-renders
      editingContentRef.current = contentToEdit;

      setTimeout(() => {
        if (inputRef.current) {
          isUpdatingContent.current = true;
          inputRef.current.innerHTML = contentToEdit;
          inputRef.current.focus();
          autoResizeTextarea(inputRef.current);
          isUpdatingContent.current = false;
        }
      }, 10);

      setShowColorToolbar(false);
      setTextSelection(null);

      if (showAnnotationPanel) {
        closeAnnotationPanel();
      }
    },
    [
      editingCell,
      tableData,
      isCellMerged,
      isMergeOrigin,
      saveEditingCell,
      autoResizeTextarea,
      showAnnotationPanel,
      closeAnnotationPanel,
    ],
  );

  // Helper function to determine block type for a cell
  const getBlockTypeForCell = (row, col) => {
    const cellKey = `${row}-${col}`;

    // Search through blocksMetadata to find which block this cell belongs to
    for (const [blockId, blockData] of Object.entries(blocksMetadata)) {
      if (blockData.contentMapping) {
        const cellsInBlock = Object.values(blockData.contentMapping);
        if (cellsInBlock.includes(cellKey)) {
          return blockData.type || "unknown";
        }
      }
    }

    return "free_text"; // Default for cells not in a structured block
  };

  const handleCellClick = (row, col, isRangeSelect = false) => {
    const cellKey = `${row}-${col}`;

    if (editingCell === cellKey) return;

    if (isRangeSelect && selectedCell) {
      const [startRow, startCol] = selectedCell.split("-").map(Number);
      setSelectedRange({
        startRow: Math.min(startRow, row),
        endRow: Math.max(startRow, row),
        startCol: Math.min(startCol, col),
        endCol: Math.max(startCol, col),
      });
    } else {
      setSelectedCell(cellKey);
      setSelectedRange(null);

      // Capture edit start timestamp and context for tracking
      setEditStartTimes((prev) => ({
        ...prev,
        [cellKey]: new Date().toISOString(),
      }));

      // Capture edit context (adjacent cells, block type, etc.)
      const blockType = getBlockTypeForCell(row, col);
      setEditContextCache((prev) => ({
        ...prev,
        [cellKey]: {
          block_type: blockType,
          row,
          col,
          timestamp: new Date().toISOString(),
        },
      }));
    }

    if (editingCell && editingCell !== cellKey) {
      saveEditingCell();
    }

    setShowColorToolbar(false);
    setTextSelection(null);

    if (showAnnotationPanel) {
      closeAnnotationPanel();
    }
  };

  useEffect(() => {
    const loadTemplatesIfNeeded = async () => {
      if (templates.length === 0) {
        try {
          const result = await loadTemplates();
        } catch (error) {
          console.error("Error cargando templates:", error);
        }
      }
    };

    loadTemplatesIfNeeded();
  }, [templates.length, loadTemplates]);

  const mergeCells = () => {
    if (!selectedRange) return;

    const { startRow, endRow, startCol, endCol } = selectedRange;
    const mergeKey = `${startRow}-${startCol}`;

    setMergedCells((prev) => ({
      ...prev,
      [mergeKey]: {
        rowSpan: endRow - startRow + 1,
        colSpan: endCol - startCol + 1,
      },
    }));

    setSelectedRange(null);
  };

  const unmergeCells = () => {
    if (!selectedCell) return;

    const [row, col] = selectedCell.split("-").map(Number);
    const mergeKey = findMergeOrigin(row, col);

    if (mergeKey) {
      setMergedCells((prev) => {
        const newMerged = { ...prev };
        delete newMerged[mergeKey];
        return newMerged;
      });
    }
  };

  const getCurrentTemplate = () => {
    // Primero intentar usar el template cargado directamente (funciona con activos e inactivos)
    if (loadedTemplate) {
      return {
        id: loadedTemplate.id,
        name: loadedTemplate.name,
        description: loadedTemplate.description || "",
        categoria: loadedTemplate.categoria,
        proyecto: loadedTemplate.proyecto,
        dominio: loadedTemplate.dominio,
        is_active: loadedTemplate.is_active,
        template_config: loadedTemplate.template_config,
      };
    }

    // Fallback: buscar en la lista de templates activos
    if (currentLP?.template_id) {
      const template = getTemplateById(currentLP.template_id);

      if (template) {
        return {
          id: template.id,
          name: template.name,
          description: template.description || "",
          categoria: template.categoria,
          proyecto: template.proyecto,
          dominio: template.dominio,
          is_active: template.is_active,
          template_config: template.template_config,
        };
      } else {
        console.warn("Template no encontrado en lista de activos ni cargado");
      }
    }
    return null;
  };

  const findMergeOrigin = (row, col) => {
    for (const [mergeKey, span] of Object.entries(mergedCells)) {
      const [mergeRow, mergeCol] = mergeKey.split("-").map(Number);
      if (
        row >= mergeRow &&
        row < mergeRow + span.rowSpan &&
        col >= mergeCol &&
        col < mergeCol + span.colSpan
      ) {
        return mergeKey;
      }
    }
    return null;
  };

  const shouldSkipCell = (row, col) => {
    return isCellMerged(row, col) && !isMergeOrigin(row, col);
  };

  const handleMouseDown = (e, type, index) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeData({ type, index, startX: e.clientX, startY: e.clientY });
  };

  const handleKeyDown = (e, row, col) => {
    if (editingCell) {
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        saveEditingCell();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setEditingCell(null);
        setShowColorToolbar(false);
        setTextSelection(null);
      }
    } else {
      let newRow = row;
      let newCol = col;

      if (newRow !== row || newCol !== col) {
        handleCellClick(newRow, newCol, e.shiftKey);
        e.preventDefault();
      }
    }
  };

  const isCellInRange = (row, col) => {
    if (!selectedRange) return false;
    const { startRow, endRow, startCol, endCol } = selectedRange;
    return row >= startRow && row <= endRow && col >= startCol && col <= endCol;
  };
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
        }}
      >
        <div>Cargando landing page...</div>
      </div>
    );
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  if (!currentLP) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "0.75rem",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            textAlign: "center",
            maxWidth: "400px",
          }}
        >
          <AlertCircle
            size={48}
            style={{ color: "#ef4444", margin: "0 auto 1rem" }}
          />
          <h2 style={{ margin: "0 0 1rem 0", color: "#1e293b" }}>
            Landing Page no encontrada
          </h2>
          <p style={{ margin: "0 0 1.5rem 0", color: "#64748b" }}>
            La landing page con ID "{lpId}" no existe o no tienes permisos para
            editarla.
          </p>
          <button
            onClick={() => {
              const template = getCurrentTemplate();
              navigate(
                template?.proyecto
                  ? `/dashboard/${template.proyecto}`
                  : "/dashboard",
              );
            }}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rd-root" style={getContainerStyle(isResizing)}>
      {/* Rich Text Color Toolbar */}
      {showColorToolbar && (
        <div
          data-color-toolbar
          style={{
            position: "absolute",
            left: toolbarPosition.x,
            top: toolbarPosition.y,
            zIndex: 1000,
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "8px 12px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            whiteSpace: "nowrap",
          }}
        >
          {/* Botones de formato */}
          <button
            style={{
              padding: "4px 8px",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              backgroundColor: "white",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px",
              transition: "background-color 0.2s",
            }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              applyFormatToSelection("bold");
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#f3f4f6")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "white")}
            title="Negrilla"
          >
            B
          </button>

          <button
            style={{
              padding: "4px 8px",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              backgroundColor: "white",
              cursor: "pointer",
              fontStyle: "italic",
              fontSize: "14px",
              transition: "background-color 0.2s",
            }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              applyFormatToSelection("italic");
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#f3f4f6")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "white")}
            title="Cursiva"
          >
            I
          </button>

          {/* Separador */}
          <div
            style={{ width: "1px", height: "20px", backgroundColor: "#e5e7eb" }}
          ></div>

          {/* Icono y texto de colorear */}
          <Type size={16} />
          <span
            style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}
          >
            Colorear:
          </span>

          {/* Paleta de colores */}
          {[
            "#000000",
            "#E6484B",
            "#0583ff",
            "#150a44",
            "#00ffff",
            "#00eba7",
            "#209986",
            "#B45F1D",
            "#9900ff",
          ].map((color) => (
            <div
              key={color}
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: color,
                cursor: "pointer",
                border: "2px solid #fff",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.1s ease",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                applyColorToSelection(color);
              }}
              onMouseEnter={(e) => (e.target.style.transform = "scale(1.1)")}
              onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
              title={`Aplicar color ${color === "#000000" ? "negro" : color}`}
            >
              {color === "#000000" && (
                <span
                  style={{
                    color: "white",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  A
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Panel de Anotaciones */}
      <AnnotationPanel
        showAnnotationPanel={showAnnotationPanel}
        annotationPanelPosition={annotationPanelPosition}
        annotations={annotations}
        currentAnnotationCell={currentAnnotationCell}
        closeAnnotationPanel={closeAnnotationPanel}
        deleteAllAnnotations={deleteAllAnnotations}
        deleteAnnotation={deleteAnnotationLocal}
        saveAnnotation={saveAnnotationLocal}
        getColumnLabel={getColumnLabel}
      />

      {/* Indicador de progreso para generación masiva */}
      <BulkGenerationProgress
        isVisible={isBulkGenerating}
        progress={bulkProgress}
      />

      {/* Navbar */}
      <nav className="rd-navbar">
        <div style={tableStyles.navContent}>
          <div style={tableStyles.navLeft}>
            <button
              onClick={() => {
                const template = getCurrentTemplate();
                navigate(
                  template?.proyecto
                    ? `/dashboard/${template.proyecto}`
                    : "/dashboard",
                );
              }}
              className="rd-btn rd-btn-back"
              style={{ marginRight: "1rem" }}
              title="Volver al dashboard"
            >
              <ArrowLeft size={16} />
              Dashboard
            </button>

            <div>
              <h1 style={tableStyles.title}>{currentLP.name}</h1>
              <p
                style={{
                  margin: "0.25rem 0 0 0",
                  fontSize: "1.2rem",
                  color: "#000000",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span>{currentLP.title}</span>
                {lastSaved && (
                  <>
                    <span>•</span>
                    <span>Guardado: {lastSaved.toLocaleTimeString()}</span>
                  </>
                )}
              </p>
            </div>

            <div style={tableStyles.buttonGroup}>
              <button
                onClick={saveProgress}
                disabled={saveStatus === "saving"}
                className="rd-btn"
                style={{
                  backgroundColor:
                    saveStatus === "saved"
                      ? "#10b981"
                      : saveStatus === "error"
                        ? "#ef4444"
                        : saveStatus === "saving"
                          ? "#6b7280"
                          : "#3b82f6",
                  color: "white",
                  cursor: saveStatus === "saving" ? "not-allowed" : "pointer",
                }}
                title={
                  saveStatus === "saved"
                    ? "Progreso guardado"
                    : saveStatus === "error"
                      ? "Error al guardar"
                      : saveStatus === "saving"
                        ? "Guardando..."
                        : "Guardar progreso"
                }
              >
                {saveStatus === "saving" ? (
                  <>
                    <div className="rd-spinner" />
                    <span>Guardando...</span>
                  </>
                ) : saveStatus === "saved" ? (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Guardar</span>
                  </>
                ) : saveStatus === "error" ? (
                  <>
                    <AlertCircle size={15} />
                    <span>Error</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Guardar</span>
                  </>
                )}
              </button>

              {/* BOTÓN DE EXPORTACIÓN CON TEMPLATE */}
              <button
                onClick={exportToExcelWithTemplate}
                disabled={isExporting}
                className="rd-btn rd-btn-success"
                style={{ marginLeft: "0.5rem" }}
                title={isExporting ? "Exportando..." : "Exportar a Excel"}
              >
                {isExporting ? (
                  <>
                    <div className="rd-spinner" />
                    <span>Exportando...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Exportar Excel</span>
                  </>
                )}
              </button>

              {/* BOTÓN BORRAR TODO */}
              <button
                onClick={clearAllContent}
                className="rd-btn"
                style={{
                  marginLeft: "0.5rem",
                  backgroundColor: "#ef4444",
                  color: "white",
                }}
                title="Borrar todo el contenido"
              >
                <Trash2 size={16} />
                <span>Borrar Todo</span>
              </button>
            </div>
          </div>

          {currentUser && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                backgroundColor: "#f1f5f9",
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
              }}
            >
              <div
                style={{
                  width: "2rem",
                  height: "2rem",
                  backgroundColor: "#3b82f6",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                }}
              >
                {currentUser.avatar ||
                  (currentUser.first_name || currentUser.last_name
                    ? `${(currentUser.first_name?.[0] || "").toUpperCase()}${(
                        currentUser.last_name?.[0] || ""
                      ).toUpperCase()}`
                    : (currentUser.email?.[0] || "").toUpperCase())}
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#1e293b",
                  }}
                >
                  {currentUser.name}
                </p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                  {isAdminUser && isAdminUser(currentUser.id)
                    ? "Administrador"
                    : isEditorUser && isEditorUser(currentUser.id)
                      ? "Editor"
                      : "Visualizador"}
                </p>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Indicador de estado de guardado */}
      {saveStatus !== "idle" && (
        <div
          className="rd-toast"
          style={{
            position: "fixed",
            top: "76px",
            right: "20px",
            zIndex: 1000,
            backgroundColor:
              saveStatus === "saved"
                ? "#10b981"
                : saveStatus === "error"
                  ? "#ef4444"
                  : "#3b82f6",
            color: "white",
          }}
        >
          {saveStatus === "saving" && <div className="rd-spinner" />}
          {saveStatus === "saved" && <CheckCircle2 size={15} />}
          {saveStatus === "error" && <AlertCircle size={15} />}

          <span>
            {saveStatus === "saving" && "Guardando progreso..."}
            {saveStatus === "saved" && "Progreso guardado correctamente"}
            {saveStatus === "error" && "Error al guardar progreso"}
          </span>
        </div>
      )}

      {/* Barra de herramientas */}
      <div className="rd-toolbar">
        <div className="rd-toolbar-buttons">
          {/* Botón de IA - Solo para columna Español */}
          {(() => {
            if (!selectedCell || editingCell) return null;

            const [row, col] = selectedCell.split("-").map(Number);
            const isSpanishColumn = col === 3; // Columna de Español

            if (!isSpanishColumn) return null;

            const block = getBlockFromRow(row);
            if (!block) return null;

            return (
              <button
                className="rd-tbtn rd-tbtn-purple"
                onClick={async (event) => {
                  if (!selectedCell) return;

                  // Auto-retry logic: try up to 3 times
                  const MAX_RETRIES = 3;

                  try {
                    const tema = currentLP.title;
                    // Obtener el título correcto según el contexto
                    const titleInfo = getTitleForIAGeneration(
                      selectedCell,
                      block,
                      tableData,
                    );
                    // Si la celda de título está vacía (LP nuevo), usa el título del LP
                    const blockTitle = titleInfo.title || tema;
                    const currentTemplate = getCurrentTemplate();

                    if (!blockTitle || blockTitle.trim() === "") {
                      if (titleInfo.type === "faq_answer_empty") {
                        alert(
                          `No se puede generar respuesta FAQ porque no hay pregunta en la fila anterior. Por favor, agrega primero la pregunta en la celda H3 FAQ.`,
                        );
                        return;
                      }

                      alert(
                        `Para generar contenido con IA, primero debes agregar un título o pregunta.`,
                      );
                      return;
                    }

                    if (block.type === "car_rental") {
                      const carTypes = [];
                      if (block.contentMapping) {
                        Object.entries(block.contentMapping).forEach(
                          ([field, cellKey]) => {
                            if (field.startsWith("desc_") && field !== "desc") {
                              const [respRow] = cellKey.split("-").map(Number);
                              const typeRow = respRow - 1;
                              const typeContent =
                                tableData[`${typeRow}-3`]?.content || "";
                              if (typeContent && typeContent.trim() !== "") {
                                carTypes.push(typeContent.trim());
                              }
                            }
                          },
                        );
                      }
                    }

                    // Ya no exigimos títulos/preguntas manuales para FAQ/Favorite Cities.
                    // Si vienen vacíos, el backend autogenera q_i/tit_i y los devuelve.

                    // Mostrar estado de carga
                    const button = event.target.closest("button");
                    const originalHTML = button.innerHTML;
                    button.innerHTML =
                      '<div class="rd-spinner"></div><span>Generando...</span>';
                    button.disabled = true;

                    let generatedContent = null;
                    let lastError = null;

                    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                      try {
                        if (attempt > 1) {
                          button.innerHTML = `<div class="rd-spinner"></div><span>Reintentando... (${attempt}/${MAX_RETRIES})</span>`;
                        }

                        generatedContent = await callIAEndpoint({
                          blockNumber: block.number,
                          blockTitle: blockTitle,
                          cellKey: selectedCell,
                          tema: tema,
                          faqQuestions: titleInfo.faqQuestions || [],
                          favCityQuestions: titleInfo.favCityQuestions || [],
                          carTypes: titleInfo.carTypes || [],
                          blockType: block.type,
                          templateInfo: currentTemplate,
                        });

                        // Check if generation produced valid content
                        if (
                          !generatedContent ||
                          !generatedContent.structured_content ||
                          Object.keys(generatedContent.structured_content)
                            .length === 0
                        ) {
                          throw new Error("La IA no generó contenido válido");
                        }

                        // Success! Break out of retry loop
                        break;
                      } catch (error) {
                        lastError = error;
                        console.error(
                          `[Intento ${attempt}/${MAX_RETRIES}] Error generando contenido:`,
                          error,
                        );

                        // Log failure to backend for each attempt
                        if (currentLP?.id && selectedCell) {
                          apiService
                            .post("/logs/generation-failure", {
                              landing_page_id: currentLP.id,
                              cell_position: selectedCell,
                              failure_reason: `Intento ${attempt}/${MAX_RETRIES}: ${error.message || "Unknown error"}`,
                            })
                            .catch((err) => {
                              console.debug(
                                "[Generation Failure] Failed to log failure:",
                                err,
                              );
                            });
                        }

                        // If this wasn't the last attempt, wait before retrying
                        if (attempt < MAX_RETRIES) {
                          await new Promise((resolve) =>
                            setTimeout(resolve, 1000 * attempt),
                          ); // Exponential backoff
                        }
                      }
                    }

                    // If all retries failed, throw the last error
                    if (!generatedContent) {
                      throw (
                        lastError ||
                        new Error("Falló después de todos los reintentos")
                      );
                    }

                    // Obtener la celda donde debe ir la descripción
                    const descriptionCellKey = getDescriptionCellKey(block);

                    const existingContent =
                      tableData[descriptionCellKey]?.content || "";
                    const hasExistingContent = existingContent.trim() !== "";

                    if (hasExistingContent) {
                      const confirmReplace = window.confirm(
                        `Ya existe contenido en esta celda.\n\n¿Quieres reemplazarlo con nuevo contenido generado por IA?`,
                      );
                      if (!confirmReplace) {
                        return;
                      }
                    }

                    // Mostrar estado de carga
                    if (!button) {
                      return;
                    }

                    button.innerHTML =
                      '<div class="rd-spinner"></div><span>Generando...</span>';
                    button.disabled = true;
                    button.style.cursor = "not-allowed";

                    if (hasExistingContent) {
                      setTableData((prev) => ({
                        ...prev,
                        [descriptionCellKey]: {
                          content: "",
                        },
                      }));
                    }

                    // Actualizar la celda de descripción con el contenido generado
                    const updateTableDataByBlock = (blockNumber, content) => {
                      console.log(
                        "🔍 updateTableDataByBlock recibió:",
                        content,
                      );
                      console.log(
                        "🔍 structured_content KEYS:",
                        Object.keys(content?.structured_content || {}),
                      );

                      const brand = currentTemplate?.proyecto || "mcr";
                      const baseDesc =
                        content?.structured_content?.["desc"] || "";

                      setTableData((prev) => {
                        const updates = { ...prev };
                        const blockKey = String(blockNumber);
                        const meta = blocksMetadata[blockKey];

                        const favCityDescCheck = getFavCityMissingDescInfo(
                          meta,
                          content?.structured_content || {},
                        );
                        if (favCityDescCheck.hasIssue) {
                          console.warn(
                            "⚠️ Favorite Cities sin descripciones en structured_content:",
                            {
                              blockNumber,
                              missingDescFields:
                                favCityDescCheck.missingDescFields,
                              receivedKeys: Object.keys(
                                content?.structured_content || {},
                              ),
                            },
                          );
                        }

                        if (!meta || !meta.contentMapping) {
                          console.warn(
                            `❌ No hay metadata o contentMapping para el bloque ${blockNumber}`,
                          );
                          return updates;
                        }

                        // En regeneración, limpiar todo el bloque antes de aplicar el nuevo contenido
                        // para evitar mezclar texto viejo cuando el LLM omite algún campo.
                        if (hasExistingContent) {
                          Object.values(meta.contentMapping).forEach((mappedCellKey) => {
                            updates[mappedCellKey] = { content: "" };
                          });
                        }

                        Object.entries(meta.contentMapping).forEach(
                          ([field, cellKey]) => {
                            let contentValue =
                              content.structured_content[field];

                            // Si no encuentra el campo exacto, buscar alternativas
                            if (contentValue === undefined) {
                              // desc_X ↔ faq_X
                              if (field.startsWith("desc_")) {
                                const number = field.replace("desc_", "");
                                const altField = `faq_${number}`;
                                contentValue =
                                  content.structured_content[altField];
                                if (contentValue !== undefined) {
                                  console.log(
                                    `✅ Campo '${field}' no encontrado, pero sí '${altField}'`,
                                  );
                                }
                              } else if (field.startsWith("faq_")) {
                                const number = field.replace("faq_", "");
                                const altField = `desc_${number}`;
                                contentValue =
                                  content.structured_content[altField];
                                if (contentValue !== undefined) {
                                  console.log(
                                    `✅ Campo '${field}' no encontrado, pero sí '${altField}'`,
                                  );
                                }
                              }

                              // Mapeo especial para desc_1 → desc_h2, desc_2 → desc_h3
                              if (contentValue === undefined) {
                                if (field === "desc_1") {
                                  contentValue =
                                    content.structured_content["desc_h2"];
                                  if (contentValue !== undefined) {
                                    console.log(
                                      `✅ Campo '${field}' no encontrado, usando 'desc_h2'`,
                                    );
                                  }
                                } else if (field === "desc_2") {
                                  contentValue =
                                    content.structured_content["desc_h3"];
                                  if (contentValue !== undefined) {
                                    console.log(
                                      `✅ Campo '${field}' no encontrado, usando 'desc_h3'`,
                                    );
                                  }
                                }
                              }

                              // FAQ: permitir que faq_i tome q_i cuando el backend envía preguntas
                              if (
                                contentValue === undefined &&
                                field.startsWith("faq_")
                              ) {
                                const number = field.replace("faq_", "");
                                const altField = `q_${number}`;
                                contentValue =
                                  content.structured_content[altField];
                                if (contentValue !== undefined) {
                                  console.log(
                                    `✅ Campo '${field}' no encontrado, usando '${altField}'`,
                                  );
                                }
                              }
                            }

                            if (contentValue !== undefined) {
                              let itemTitleValue = null;
                              if (
                                field.startsWith("desc_") ||
                                field.startsWith("faq_")
                              ) {
                                const index = field
                                  .replace("desc_", "")
                                  .replace("faq_", "");
                                itemTitleValue =
                                  content.structured_content[`q_${index}`] ||
                                  content.structured_content[`tit_${index}`];
                              }

                              const colorized = colorizeField(
                                field,
                                contentValue,
                                brand,
                                baseDesc,
                              );
                              if (!colorized) {
                                console.log(
                                  `⚠️ Campo '${field}' llegó vacío — limpiando celda ${cellKey}`,
                                );
                                updates[cellKey] = { content: "" };
                              } else {
                                console.log(
                                  `✅ Actualizando celda ${cellKey} con contenido`,
                                );
                                updates[cellKey] = { content: colorized };
                              }

                              // Para FAQ/Favorite Cities: actualizar título H3 en la fila anterior
                              // aunque la descripción haya llegado vacía.
                              if (itemTitleValue) {
                                const [respRow] = cellKey.split("-").map(Number);
                                const titleCellKey = `${respRow - 1}-3`;
                                updates[titleCellKey] = {
                                  content: itemTitleValue,
                                };
                                console.log(
                                  `✅ Actualizando título de item ${titleCellKey} con: ${itemTitleValue}`,
                                );
                              }
                            } else {
                              console.log(
                                `❌ Campo '${field}' NO encontrado en structured_content`,
                              );
                            }
                          },
                        );

                        // Título H1/H2: structured_content.titulo o tit → celda titleRow-3
                        // Para fav_city/locationscarrusel el H2 siempre está en startRow
                        const tituloGenerado =
                          content.structured_content?.titulo ||
                          content.structured_content?.tit;
                        if (tituloGenerado) {
                          const isFavCity =
                            meta.type === "fav_city" ||
                            meta.type === "locationscarrusel";
                          const h2Row = isFavCity
                            ? meta.startRow
                            : meta.titleRow;
                          if (h2Row !== undefined) {
                            const titleCellKey = `${h2Row}-3`;
                            console.log(
                              `✅ Actualizando título ${titleCellKey} con: ${tituloGenerado}`,
                            );
                            updates[titleCellKey] = { content: tituloGenerado };
                          }
                        }

                        return updates;
                      });
                    };
                    updateTableDataByBlock(block.number, generatedContent);

                    const favCityDescCheck = getFavCityMissingDescInfo(
                      block,
                      generatedContent?.structured_content || {},
                    );
                    if (favCityDescCheck.hasIssue) {
                      alert(
                        "La IA devolvio titulos de ciudades pero no devolvio algunas descripciones. Revisa el backend/LLM (structured_content sin desc_i).",
                      );
                    }

                    // auto-save silencioso tras generación IA individual
                    saveRedactorProgress(currentLP.id, tableDataRef.current, annotations)
                      .catch(() => {});

                    // Restaurar botón
                    button.innerHTML = originalHTML;
                    button.disabled = false;
                    button.style.cursor = "pointer";
                  } catch (error) {
                    console.error(
                      "Error final generando contenido IA después de reintentos:",
                      error,
                    );

                    // Mostrar error al usuario
                    alert(
                      `Error al generar contenido con IA después de ${MAX_RETRIES} intentos:\n\n${error.message}`,
                    );

                    // Restaurar botón en caso de error
                    const button = event.target.closest("button");
                    if (button) {
                      button.innerHTML = `<span>IA ${block.name}</span>`;
                      button.disabled = false;
                      button.style.cursor = "pointer";
                    }
                  }
                }}
                title={`Generar contenido con IA para ${
                  block.name
                } (usa título de fila ${block.titleRow + 1})`}
              >
                <span>IA {block.name}</span>
              </button>
            );
          })()}

          {/* Botón de Traducción - Para columnas Inglés y Portugués */}
          {(() => {
            if (!selectedCell || editingCell) return null;

            const [row, col] = selectedCell.split("-").map(Number);
            const isEnglishColumn = col === 4; // Columna de Inglés
            const isPortugueseColumn = col === 5; // Columna de Portugués

            if (!isEnglishColumn && !isPortugueseColumn) return null;

            const targetLanguage = isEnglishColumn ? "inglés" : "portugués";
            const languageCode = isEnglishColumn ? "en" : "pt";
            const spanishContent = getSpanishContent(row, tableData);

            // Si no hay contenido en español, no mostrar el botón
            if (!spanishContent || spanishContent.trim() === "") return null;

            // Obtener información del bloque para el título y tema
            const block = getBlockFromRow(row);
            const tema = currentLP.title;
            const blockTitle = block
              ? getBlockTitleContent(block, tableData)
              : "";

            return (
              <button
                className="rd-tbtn rd-tbtn-success"
                onClick={async (event) => {
                  if (!selectedCell) return;

                  try {
                    const button = event.target.closest("button");
                    const originalHTML = button.innerHTML;
                    button.innerHTML =
                      '<div class="rd-spinner"></div><span>Traduciendo...</span>';
                    button.disabled = true;
                    button.style.cursor = "not-allowed";

                    const translatedContent = await callTranslationEndpoint(
                      spanishContent,
                      languageCode,
                      selectedCell,
                      null,
                      null,
                    );

                    setTableData((prev) => ({
                      ...prev,
                      [selectedCell]: {
                        content: translatedContent,
                      },
                    }));

                    button.innerHTML = originalHTML;
                    button.disabled = false;
                    button.style.cursor = "pointer";
                  } catch (error) {
                    console.error("Error traduciendo contenido:", error);
                    alert("Error al traducir contenido: " + error.message);

                    const button = event.target.closest("button");
                    button.innerHTML = `<span>Traducir a ${targetLanguage}</span>`;
                    button.disabled = false;
                    button.style.cursor = "pointer";
                  }
                }}
                title={`Traducir contenido de español a ${targetLanguage}`}
              >
                <span>Traducir a {targetLanguage}</span>
              </button>
            );
          })()}

          {/* Botón para generar todas las filas en español */}
          <div className="rd-toolbar-sep" />
          <button
            className={`rd-tbtn ${isBulkGenerating ? "rd-tbtn-muted" : "rd-tbtn-indigo"}`}
            onClick={async () => {
              if (isBulkGenerating) return;

              const confirm = window.confirm(
                `¿Generar TODO el contenido en español de TODOS los bloques?\n\nEsto procesará todos los bloques de la tabla.\nPuede tomar varios minutos.`,
              );
              if (!confirm) return;

              await generateAllRowsSpanish();
            }}
            disabled={isBulkGenerating}
            title="Generar todo el contenido en español (todos los bloques)"
          >
            <span>⚡</span>
            <span>Generar Todo (ES)</span>
          </button>

          {/* Botón para traducir todas las filas */}
          <button
            className={`rd-tbtn ${isBulkGenerating ? "rd-tbtn-muted" : "rd-tbtn-pink"}`}
            onClick={async () => {
              if (isBulkGenerating) return;

              const confirm = window.confirm(
                `¿Traducir TODO el contenido a inglés y portugués?\n\nEsto traducirá el contenido español existente de todos los bloques.\nPuede tomar varios minutos.`,
              );
              if (!confirm) return;

              await translateAllRows();
            }}
            disabled={isBulkGenerating}
            title="Traducir todo el contenido a inglés y portugués (todos los bloques)"
          >
            <span>🌐</span>
            <span>Traducir Todo (EN+PT)</span>
          </button>

          <div className="rd-toolbar-sep" />
          <button
            className={`rd-tbtn ${selectedCell && !editingCell ? "rd-tbtn-warning" : "rd-tbtn-inactive"}`}
            onClick={() =>
              selectedCell && !editingCell && addOrEditAnnotation(selectedCell)
            }
            disabled={!selectedCell || editingCell}
            title={
              selectedCell && annotations[selectedCell]?.length > 0
                ? `Ver/Agregar anotación (${annotations[selectedCell].length} ${
                    annotations[selectedCell].length === 1 ? "nota" : "notas"
                  })`
                : "Agregar anotación"
            }
          >
            <MessageSquare size={14} />
            <span>
              {selectedCell && annotations[selectedCell]?.length > 0
                ? `Notas (${annotations[selectedCell].length})`
                : "Anotar"}
            </span>
          </button>

          <div style={tableStyles.colorSection}>
            <Palette size={16} />
            <span style={{ fontSize: "12px", color: "#6b7280" }}>
              Selecciona texto para colorear
            </span>
          </div>
        </div>
      </div>

      {/* Tabla principal */}
      <div
        style={{
          ...tableStyles.tableContainer,
          paddingTop: "20px",
        }}
      >
        <div style={tableStyles.tableWrapper}>
          <div style={tableStyles.tableScroll}>
            <table style={tableStyles.table} ref={tableRef}>
              <thead>
                <tr>
                  <th style={tableStyles.headerCell}></th>
                  {Array.from({ length: numCols }, (_, col) => (
                    <th
                      key={col}
                      style={{
                        ...tableStyles.columnHeader,
                        width: columnWidths[col],
                        minWidth: columnWidths[col],
                      }}
                    >
                      {getColumnLabel(col)}
                      <div
                        style={tableStyles.resizeHandle}
                        onMouseDown={(e) => handleMouseDown(e, "column", col)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: numRows }, (_, row) => (
                  <tr key={row}>
                    <td
                      style={{
                        ...tableStyles.headerCell,
                        height: rowHeights[row],
                      }}
                    >
                      {row + 1}
                      <div
                        style={tableStyles.rowResizeHandle}
                        onMouseDown={(e) => handleMouseDown(e, "row", row)}
                      />
                    </td>
                    {Array.from({ length: numCols }, (_, col) => {
                      if (shouldSkipCell(row, col)) {
                        return null;
                      }

                      const cellKey = `${row}-${col}`;
                      const isSelected = selectedCell === cellKey;
                      const isInRange = isCellInRange(row, col);
                      const isEditing = editingCell === cellKey;
                      const cellData = tableData[cellKey] || { content: "" };
                      const merge = mergedCells[cellKey];

                      const cellStyle = getCellStyle(
                        tableStyles.cell,
                        isSelected,
                        isInRange,
                        columnWidths[col],
                        rowHeights[row],
                      );

                      return (
                        <td
                          key={col}
                          data-cell={cellKey}
                          style={{
                            ...cellStyle,
                            position: "relative",
                            overflow: "hidden",
                            padding: "0",
                            border: "1px solid #e5e7eb",
                            ...(isSelected && !isEditing
                              ? {
                                  border: "2px solid #3b82f6",
                                  zIndex: 1,
                                }
                              : {}),
                          }}
                          rowSpan={merge?.rowSpan || 1}
                          colSpan={merge?.colSpan || 1}
                          onClick={(e) => handleCellClick(row, col, e.shiftKey)}
                          onDoubleClick={() => handleCellDoubleClick(row, col)}
                          onKeyDown={(e) => handleKeyDown(e, row, col)}
                          onMouseOver={(e) => {
                            if (!isSelected && !isInRange) {
                              e.target.style.backgroundColor =
                                tableStyles.hoverCell.backgroundColor;
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!isSelected && !isInRange) {
                              e.target.style.backgroundColor = "transparent";
                            }
                          }}
                          tabIndex={0}
                        >
                          {annotations[cellKey] &&
                            annotations[cellKey].length > 0 && (
                              <AnnotationMarker
                                cellKey={cellKey}
                                onClick={showAnnotation}
                              />
                            )}

                          {isEditing ? (
                            <TiptapCellEditor
                              editorRef={tiptapEditorRef}
                              content={tableData[cellKey]?.content || ""}
                              editingContentRef={editingContentRef}
                              onChange={(newHtml) => {
                                editingContentRef.current = newHtml;
                              }}
                              onBlur={saveEditingCell}
                              onCancel={() => {
                                setEditingCell(null);
                                setShowColorToolbar(false);
                                setTextSelection(null);
                              }}
                              onSelection={handleTextSelection}
                            />
                          ) : (
                            <div
                              style={{
                                height: "100%",
                                fontSize: "14px",
                                lineHeight: "1.4",
                                wordWrap: "break-word",
                                boxSizing: "border-box",
                                direction: "ltr",
                                textAlign: "left",
                                all: "unset", // Opcional: evita que estilos globales de la tabla interfieran
                                display: "block",
                                width: "100%",
                                minHeight: "40px",
                                padding: "8px",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                              dangerouslySetInnerHTML={{
                                __html: cellData.content || "",
                              }}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Barra de informaciÃ³n */}
        {selectedCell && (
          <div
            style={{
              ...tableStyles.info,
              position: "sticky",
              bottom: 0,
              zIndex: 98,
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(8px)",
              borderTop: "1px solid #e5e7eb",
              boxShadow: "0 -2px 4px rgba(0, 0, 0, 0.05)",
            }}
          >
            <span>
              Celda seleccionada:{" "}
              {selectedCell
                .split("-")
                .map((n, i) =>
                  i === 0 ? parseInt(n) + 1 : getColumnLabel(parseInt(n)),
                )
                .reverse()
                .join(" ")}
            </span>
            <span style={{ color: "#6366f1", fontWeight: "500" }}>
              {(() => {
                const cellContent = tableData[selectedCell]?.content || "";
                const plainText = extractPlainText(cellContent);
                const wordCount = plainText
                  ? plainText.split(/\s+/).filter((word) => word.length > 0)
                      .length
                  : 0;
                return `${wordCount} ${
                  wordCount === 1 ? "palabra" : "palabras"
                }`;
              })()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
