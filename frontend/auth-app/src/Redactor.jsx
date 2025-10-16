import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Download, Upload, Plus, Trash2, Palette, Link, RotateCcw, Type, MessageSquare, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from './context/AppContext';
import { getExcelTemplate, columnHeaders, tableConfig } from './templateConfig';
import tableStyles, { getContainerStyle, getCellStyle } from './tableStyles';
import { isAdminUser, isEditorUser } from './utils/roles';
import apiService from './services/apiService';

function AnnotationMarker({ cellKey, onClick }) {
  return (
    <span
      onClick={e => onClick(cellKey, e)}
      title="Ver anotaciones"
      style={{
        position: 'absolute',
        top: 4,
        right: 4,
        background: '#f59e0b',
        color: 'white',
        borderRadius: '50%',
        width: 18,
        height: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 'bold',
        cursor: 'pointer',
        zIndex: 2
      }}
    >
      📝
    </span>
  );
}

const AnnotationPanel = React.memo(function AnnotationPanel({
  showAnnotationPanel,
  annotationPanelPosition,
  annotations,
  currentAnnotationCell,
  closeAnnotationPanel,
  deleteAllAnnotations,
  deleteAnnotation,
  saveAnnotation,
  getColumnLabel
}) {
  // Estado local para el texto de la anotación
  const [localAnnotationText, setLocalAnnotationText] = useState('');
  const annotationTextareaRef = useRef(null);

  // Limpiar el texto cuando se abre/cierra el panel o cambia la celda
  useEffect(() => {
    if (showAnnotationPanel && annotationTextareaRef.current) {
      setLocalAnnotationText('');
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
      setLocalAnnotationText('');
    }
  }, [localAnnotationText, saveAnnotation]);

  // Manejar Enter para guardar
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSaveAnnotation();
    }
  }, [handleSaveAnnotation]);

  if (!showAnnotationPanel) return null;
  
  const cellAnnotations = annotations[currentAnnotationCell] || [];

  return (
    <div
      data-annotation-panel
      style={{
        position: 'fixed',
        left: annotationPanelPosition.x,
        top: annotationPanelPosition.y,
        zIndex: 1001,
        backgroundColor: '#fffbeb',
        border: '1px solid #f59e0b',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        minWidth: '300px',
        maxWidth: '450px',
        maxHeight: '600px',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid #fbbf24'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: '600',
          color: '#92400e',
          wordWrap: 'break-word',
          flex: 1,
          marginRight: '8px'
        }}>
          Anotaciones - Celda {currentAnnotationCell?.split('-').map((n, i) => 
            i === 0 ? parseInt(n) + 1 : getColumnLabel(parseInt(n))
          ).reverse().join('')}
          {cellAnnotations.length > 0 && (
            <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#b45309' }}>
              {' '}({cellAnnotations.length} {cellAnnotations.length === 1 ? 'nota' : 'notas'})
            </span>
          )}
        </h3>
        <button
          onClick={closeAnnotationPanel}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: '#92400e',
            padding: '0',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          ×
        </button>
      </div>
      
      {/* Historial de anotaciones */}
      {cellAnnotations.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#92400e',
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <span>📝 Historial de anotaciones:</span>
            {cellAnnotations.length > 1 && (
              <button
                onClick={() => deleteAllAnnotations(currentAnnotationCell)}
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  border: '1px solid #ef4444',
                  borderRadius: '3px',
                  backgroundColor: '#fff',
                  color: '#ef4444',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                title="Eliminar todas las anotaciones"
              >
                Limpiar todo
              </button>
            )}
          </div>
          
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            overflowX: 'hidden',
            border: '1px solid #fbbf24',
            borderRadius: '4px',
            backgroundColor: '#fef3c7'
          }}>
            {cellAnnotations.slice().reverse().map((annotation, index) => (
              <div 
                key={annotation.id}
                style={{
                  padding: '10px',
                  borderBottom: index < cellAnnotations.length - 1 ? '1px solid #fbbf24' : 'none',
                  backgroundColor: index === 0 ? '#fef3c7' : '#fffbeb',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  hyphens: 'auto'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '6px',
                  flexWrap: 'wrap',
                  gap: '4px'
                }}>
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#92400e',
                    flex: 1,
                    minWidth: '0',
                    wordWrap: 'break-word'
                  }}>
                    <strong>{annotation.author}</strong> • {annotation.date}
                    {index === 0 && (
                      <span style={{ 
                        marginLeft: '6px', 
                        backgroundColor: '#f59e0b', 
                        color: 'white', 
                        padding: '1px 4px', 
                        borderRadius: '2px',
                        fontSize: '9px',
                        whiteSpace: 'nowrap'
                      }}>
                        RECIENTE
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteAnnotation(currentAnnotationCell, annotation.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#ef4444',
                      fontSize: '14px',
                      padding: '0',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                    title="Eliminar esta anotación"
                  >
                    ×
                  </button>
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#78350f',
                  lineHeight: '1.5',
                  backgroundColor: 'white',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #fbbf24',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  hyphens: 'auto',
                  minHeight: '20px'
                }}>
                  {annotation.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Nueva anotación */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#92400e',
          marginBottom: '6px'
        }}>
          ✏️ Agregar nueva anotación:
        </div>
        <textarea
          ref={annotationTextareaRef}
          value={localAnnotationText}
          onChange={handleAnnotationTextChange}
          onKeyDown={handleKeyPress}
          placeholder="Escribe tu nueva anotación aquí... (Ctrl+Enter para guardar)"
          style={{
            width: '100%',
            minHeight: '80px',
            border: '1px solid #d97706',
            borderRadius: '4px',
            padding: '8px',
            fontSize: '13px',
            lineHeight: '1.5',
            resize: 'vertical',
            fontFamily: 'inherit',
            outline: 'none',
            boxSizing: 'border-box',
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
          }}
        />
      </div>
      
      {/* Botones */}
      <div style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'flex-end',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={closeAnnotationPanel}
          style={{
            padding: '8px 12px',
            border: '1px solid #6b7280',
            borderRadius: '4px',
            backgroundColor: '#fff',
            color: '#6b7280',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSaveAnnotation}
          disabled={!localAnnotationText.trim()}
          style={{
            padding: '8px 12px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: localAnnotationText.trim() ? '#f59e0b' : '#d1d5db',
            color: 'white',
            fontSize: '12px',
            cursor: localAnnotationText.trim() ? 'pointer' : 'not-allowed',
            fontWeight: '500'
          }}
        >
          Agregar Nota
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
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
    const prevIds = prevCellAnnotations.map(a => a.id).join(',');
    const nextIds = nextCellAnnotations.map(a => a.id).join(',');
    
    if (prevIds !== nextIds) {
      return false; // Re-renderizar si cambian las anotaciones
    }
  }
  
  // Comparar posición del panel
  if (prevProps.annotationPanelPosition.x !== nextProps.annotationPanelPosition.x || 
      prevProps.annotationPanelPosition.y !== nextProps.annotationPanelPosition.y) {
    return false;
  }
  
  return true; // No re-renderizar en otros casos
});

export { AnnotationPanel };

export default function Redactor() {
  const { lpId } = useParams();
  const navigate = useNavigate();
  const { 
    getLandingPageByProyectoId, 
    loadLandingPageSections, 
    loadLandingPageAnnotations,
    saveAnnotationToDB,       
    deleteAnnotationFromDB,    
    saveRedactorProgress, 
    currentUser,
    loading: appLoading,
    templates,
    loadTemplates,
    getTemplateById
  } = useApp();

  const [editingCell, setEditingCell] = useState(null);
  const [tableData, setTableData] = useState({});
  const [mergedCells, setMergedCells] = useState({});
  const [columnWidths, setColumnWidths] = useState({});
  const [blocksMetadata, setBlocksMetadata] = useState({});

  const [currentLP, setCurrentLP] = useState(null);
  const [loading, setLoading] = useState(true);

  const cleanHtml = (html) => {
    if (!html || html.trim() === '') return '';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const cleanedHtml = tempDiv.innerHTML
      .replace(/<span[^>]*>\s*<\/span>/g, '')
      .replace(/<div[^>]*>\s*<\/div>/g, '')  
      .replace(/<p[^>]*>\s*<\/p>/g, '')
      .replace(/<br\s*\/?>\s*<br\s*\/?>/g, '<br>')
      .replace(/(<br\s*\/?>){3,}/g, '<br><br>')
      .trim();
    
    return cleanedHtml;
  };

  const saveEditingCell = useCallback(() => {
    if (editingCell && inputRef.current && !isUpdatingContent.current) {
      setShowColorToolbar(false);
      setTextSelection(null);

      const htmlContent = inputRef.current.innerHTML;
      const cleanedContent = cleanHtml(htmlContent);

      // Solo actualizar si el contenido realmente cambió
      const currentContent = tableData[editingCell]?.content || '';
      if (cleanedContent !== currentContent && cleanedContent !== '') {
        setTableData(prev => ({
          ...prev,
          [editingCell]: {
            content: cleanedContent
          }
        }));
      }

      setEditingCell(null);
      editingContentRef.current = '';
    }
  }, [editingCell, tableData, cleanHtml]);

  const getThemeFromTable = (tableData) => {
    const themeCellKey = "0-0";
    const themeCell = tableData[themeCellKey];
    return themeCell?.content || '';
  };


  const isMergeOrigin = (row, col) => {
    const cellKey = `${row}-${col}`;
    return !!mergedCells[cellKey];
  };


  const getTitleForIAGeneration = (selectedCell, block, tableData) => {
    const [row, col] = selectedCell.split('-').map(Number);

    if (block.type === 'car_rental' || block.type === 'fleetcarrusel' || block.type === 'advicestipocarrusel') {
      const carTypes = []; // En este caso serían "tipos de consejos"
      if (block.contentMapping) {
        Object.entries(block.contentMapping).forEach(([field, cellKey]) => {
          if (field.startsWith('desc_') && field !== 'desc') {
            const [respRow] = cellKey.split('-').map(Number);
            const typeRow = respRow - 1;
            const typeContent = tableData[`${typeRow}-3`]?.content || '';
            const fieldType = tableData[`${typeRow}-2`]?.content || '';
            
            if (typeContent && typeContent.trim() !== '' && 
                (fieldType.includes('H3') || fieldType.includes('h3'))) {
              carTypes.push(typeContent.trim());
            }
          }
        });
      }
      
      const blockTitle = tableData[`${block.titleRow}-3`]?.content || '';
      
      console.log('🚗 CAR_RENTAL/FLEET/ADVICES:', {
        blockType: block.type,
        itemsEncontrados: carTypes,
        totalItems: carTypes.length
      });
      
      return {
        title: blockTitle,
        type: 'car_rental_complete',
        faqQuestions: [],
        favCityQuestions: [],
        carTypes: carTypes
      };
    }

    
    if (block.type === 'fav_city' || block.type === 'locationscarrusel') {
      
      const favCityQuestions = [];
      if (block.contentMapping) {
        Object.entries(block.contentMapping).forEach(([field, cellKey]) => {
          
          if (field.startsWith('desc_') && field !== 'desc') {
            const [respRow] = cellKey.split('-').map(Number);
            const questionRow = respRow - 1;
            const questionContent = tableData[`${questionRow}-3`]?.content || '';
            
            
            if (questionContent && questionContent.trim() !== '') {
              favCityQuestions.push(questionContent.trim());
            }
          }
        });
      }
      
      const blockTitle = tableData[`${block.titleRow}-3`]?.content || '';
      
      return {
        title: blockTitle,
        type: 'fav_city_complete',
        faqQuestions: [],
        favCityQuestions: favCityQuestions,
        carTypes: []
      };
    }
    //
    if (block.type === 'faqs' || block.type === 'questions') {
      
      const faqQuestions = [];
      if (block.contentMapping) {
        Object.entries(block.contentMapping).forEach(([field, cellKey]) => {
          
          // Buscar tanto faq_ como desc_ (excluyendo desc principal)
          if ((field.startsWith('faq_') || field.startsWith('desc_')) && field !== 'desc') {
            const [respRow] = cellKey.split('-').map(Number);
            const questionRow = respRow - 1;
            const questionContent = tableData[`${questionRow}-3`]?.content || '';
            
            if (questionContent && questionContent.trim() !== '') {
              faqQuestions.push(questionContent.trim());
            }
          }
        });
      }


  
      
      // Si es la descripción principal del bloque (desc)
      if (row === block.descRow) {
        const h2Title = tableData[`${block.titleRow}-3`]?.content || '';
        return {
          title: h2Title,
          type: 'h2_description',
          faqQuestions: faqQuestions,
          favCityQuestions: [], 
          carTypes: [] 
        };
      }
      
      // Para las respuestas FAQ individuales
      const questionRow = row - 1;
      const questionFieldType = tableData[`${questionRow}-2`]?.content || '';
      
      if (questionFieldType.includes('H3') && questionFieldType.includes('FAQ')) {
        const faqQuestion = tableData[`${questionRow}-3`]?.content || '';
        
        if (faqQuestion && faqQuestion.trim() !== '') {
          return {
            title: faqQuestion,
            type: 'faq_answer',
            faqQuestions: faqQuestions,
            favCityQuestions: [], 
            carTypes: [] 
          };
        } else {
          return {
            title: '',
            type: 'faq_answer_empty',
            faqQuestions: faqQuestions,
            favCityQuestions: [], 
            carTypes: [] 
          };
        }
      }
    }

    if (block.type === 'rentacar') {
      const blockTitle = tableData[`${block.titleRow}-3`]?.content || '';
      
      console.log('🚗 RENTACAR:', {
        blockTitle: blockTitle,
        blockType: block.type
      });
      
      return {
        title: blockTitle,
        type: 'rentacar_block',
        faqQuestions: [],
        favCityQuestions: [],
        carTypes: []
      };
    }



    if (block.type === 'car_rental' || block.type === 'fleetcarrusel') {
      const carTypes = [];
      if (block.contentMapping) {
        Object.entries(block.contentMapping).forEach(([field, cellKey]) => {
          if (field.startsWith('desc_') && field !== 'desc') {
            const [respRow] = cellKey.split('-').map(Number);
            const typeRow = respRow - 1;
            const typeContent = tableData[`${typeRow}-3`]?.content || '';
            const fieldType = tableData[`${typeRow}-2`]?.content || '';
            
            // Busca H3 o h3 (case-insensitive)
            if (typeContent && typeContent.trim() !== '' && 
                (fieldType.includes('H3') || fieldType.includes('h3'))) {
              carTypes.push(typeContent.trim());
            }
          }
        });
      }
        
        
        // Si es la descripción principal del bloque
        if (row === block.descRow) {
          const h2Title = tableData[`${block.titleRow}-3`]?.content || '';
          return {
            title: h2Title,
            type: 'h2_description',
            faqQuestions: [],
            favCityQuestions: [],
            carTypes: carTypes
          };
        }
        
        // Para las respuestas individuales de tipos de autos
        const typeRow = row - 1;
        const typeFieldType = tableData[`${typeRow}-2`]?.content || '';
        
        if (typeFieldType.includes('H3')) {
          const carTypeTitle = tableData[`${typeRow}-3`]?.content || '';
          
          if (carTypeTitle && carTypeTitle.trim() !== '') {
            return {
              title: carTypeTitle,
              type: 'car_type_answer',
              faqQuestions: [],
              favCityQuestions: [],
              carTypes: carTypes
            };
          } else {
            return {
              title: '',
              type: 'car_type_answer_empty',
              faqQuestions: [],
              favCityQuestions: [],
              carTypes: carTypes
            };
          }
        }
      }
    
    // Para otros bloques, usar el título del bloque
    const defaultTitle = tableData[`${block.titleRow}-3`]?.content || '';
    return {
      title: defaultTitle,
      type: 'default',
      faqQuestions: []
    };
  };

  const isCellMerged = (row, col) => {
    return !!findMergeOrigin(row, col);
  };

  const getBlockTitleContent = (blockInfo, tableData) => {
    if (!blockInfo) return '';
    
    const titleCellKey = `${blockInfo.titleRow}-3`; 
    const titleCell = tableData[titleCellKey];
    return titleCell?.content || '';
  };

  const getDescriptionCellKey = (blockInfo) => {
    if (!blockInfo) return null;
    return `${blockInfo.descRow}-3`;
  };

  const getSpanishContent = (row, tableData) => {
    const spanishCellKey = `${row}-3`;
    const spanishCell = tableData[spanishCellKey];
    return spanishCell?.content || '';
  };

  const getBlockTypeFromNumber = (blockNumber) => {
    const blockMapping = {
      1: "quicksearch",  
      2: "fleet",        
      3: "agencies",     
      4: "faqs",         
      5: "car_rental",   
      6: "fav_city",     
      7: "fav_city"      
    };
    
    return blockMapping[blockNumber] || "quicksearch";
  };

  const [isExporting, setIsExporting] = useState(false);

  const [columnHeaders, setColumnHeaders] = useState([
    "Página", "Bloque", "Comentarios para el equipo IT", 
    "Español", "Inglés", "Portugués", "Revisado por / Fecha"
  ]);

  const [tableConfig, setTableConfig] = useState({
    numRows: 80,
    numCols: 7,
    defaultRowHeight: 40,
    defaultColumnWidth: 120
  });

  // Función para exportar a Excel
  const exportToExcelWithTemplate = async () => {
    try {
      setIsExporting(true);
      
      // Obtener template actual
      const currentTemplate = getCurrentTemplate();
      if (!currentTemplate) {
        alert('No se pudo obtener la información del template actual');
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
          templateData: getTemplateDataForExport()
        },
        template_info: {
          id: currentTemplate.id,
          name: currentTemplate.name,
          description: currentTemplate.description,
          categoria: currentTemplate.categoria,
          proyecto: currentTemplate.proyecto,
          dominio: currentTemplate.dominio,
          is_active: currentTemplate.is_active
        },
        cell_data: getCellDataFromTable()
      };

      // Llamar al endpoint
      const response = await fetch('http://192.168.1.11:8000/export/excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`, 
        },
        body: JSON.stringify(exportData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error en la exportación: ${response.status}`);
      }

      // Crear blob y descargar archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentTemplate.name}_${currentTemplate.categoria}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Error durante la exportación:', error);
      alert('Error al exportar el archivo: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Función auxiliar para obtener datos del template en formato correcto
  const getTemplateDataForExport = () => {
    const templateData = {};
    
    // Convertir tableData actual al formato esperado por el backend
    Object.keys(tableData).forEach(cellKey => {
      const cellContent = tableData[cellKey];
      templateData[cellKey] = {
        value: cellContent.content || '',
        style: null, 
        type: 'text'
      };
    });
    
    return templateData;
  };

  // Función auxiliar para obtener datos actualizados de las celdas
  const getCellDataFromTable = () => {
    const cellData = {};
    
    // Recorrer todas las celdas del tableData actual
    Object.keys(tableData).forEach(cellKey => {
      const cellContent = tableData[cellKey];
      if (cellContent && cellContent.content) {
        cellData[cellKey] = {
          value: cellContent.content || '',
          style: null,
          type: 'text'
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
          templateInfo 
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

  const callTranslationEndpoint = async (sourceContent, targetLanguage, cellKey, blockTitle, tema) => {
    return await apiService.translateContent(
      currentLP.id,
      sourceContent,
      targetLanguage,
      cellKey,
      blockTitle,
      tema
    );
  };
  const getBlockFromRow = (row) => {
    console.log('🔍 getBlockFromRow - Analizando fila:', row);
    console.log('🔍 blocksMetadata disponible:', blocksMetadata);
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
          contentMapping: blockData.contentMapping || {}
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
          loadLandingPageAnnotations(lp.id)
        ]);
        
        // Obtener el template completo
        const template = await apiService.getTemplateById(lp.template_id);
        
        // Extraer configuraciones del template
        if (template?.template_config?.blocks_metadata) {
          setBlocksMetadata(template.template_config.blocks_metadata);
        }
        console.log('🔍 TEMPLATE blocks_metadata:', template?.template_config?.blocks_metadata);
        console.log('🔍 Bloque 5 específico:', template?.template_config?.blocks_metadata?.['5']);
        
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
        Object.keys(templateData).forEach(key => {
          const templateCell = templateData[key];
          const existingCell = existingSections[key];
          
          mergedTableData[key] = {
            content: existingCell ? existingCell.content : templateCell?.text || ''
          };
        });
        
        setTableData(mergedTableData);
        setAnnotations(existingAnnotations);
      }
      
      setCurrentLP(lp);
      setLoading(false);
    };
    
    loadLandingPage();
  }, [lpId]);
  
  const [lastSaved, setLastSaved] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');


  
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);

  
  const [textSelection, setTextSelection] = useState(null);
  const [showColorToolbar, setShowColorToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  
  const [annotations, setAnnotations] = useState(() => {
    return currentLP?.annotations || {};
  });
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(false);
  const [annotationPanelPosition, setAnnotationPanelPosition] = useState({ x: 0, y: 0 });
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
  
  const inputRef = useRef(null);
  const tableRef = useRef(null);
  const annotationTextareaRef = useRef(null);
  const isUpdatingContent = useRef(false);
  
  const getColumnLabel = (index) => columnHeaders[index] || `Col ${index + 1}`;
  const numRows = tableConfig.numRows;
  const numCols = tableConfig.numCols;

  const editingContentRef = useRef(''); 
  const resizeTimeoutRef = useRef(null);

  const closeAnnotationPanel = () => {
    setShowAnnotationPanel(false);
    setCurrentAnnotationCell(null);
  };


  const saveProgress = async () => {
    if (!currentLP) return;
    
    setSaveStatus('saving');
    try {
      await saveRedactorProgress(currentLP.id, tableData, annotations);
      setLastSaved(new Date());
      setSaveStatus('saved');
      
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error guardando progreso:', error);
      setSaveStatus('error');
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
      if (showColorToolbar && !event.target.closest('[data-color-toolbar]') && !editingCell) {
        setShowColorToolbar(false);
        setTextSelection(null);
      }
      
      if (showAnnotationPanel && !event.target.closest('[data-annotation-panel]')) {
        closeAnnotationPanel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // AGREGAR ESTE CLEANUP
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [showColorToolbar, showAnnotationPanel, editingCell, closeAnnotationPanel]);

  // Redimensionamiento
  useEffect(() => {
    let throttleTimeout = null;
    
    const handleMouseMove = (e) => {
      if (!isResizing || !resizeData) return;
      
      // Throttle el mouse move para hacer el redimensionamiento menos sensible
      if (throttleTimeout) return;
      
      throttleTimeout = setTimeout(() => {
        const { type, index, startX, startY } = resizeData;
        
        if (type === 'column') {
          const diff = e.clientX - startX;
          // Hacer el redimensionamiento menos sensible dividiendo por 2
          const adjustedDiff = Math.round(diff / 2);
          const currentWidth = columnWidths[index] || 120;
          const newWidth = Math.max(80, currentWidth + adjustedDiff); // Ancho mínimo 80px
          
          setColumnWidths(prev => ({ ...prev, [index]: newWidth }));
          
          // Actualizar la posición de inicio para el siguiente cálculo
          setResizeData(prev => ({ ...prev, startX: e.clientX }));
          
        } else if (type === 'row') {
          const diff = e.clientY - startY;
          // Hacer el redimensionamiento menos sensible dividiendo por 2
          const adjustedDiff = Math.round(diff / 2);
          const currentHeight = rowHeights[index] || 40;
          const newHeight = Math.max(30, currentHeight + adjustedDiff); // Altura mínima 30px
          
          setRowHeights(prev => ({ ...prev, [index]: newHeight }));
          
          // Actualizar la posición de inicio para el siguiente cálculo
          setResizeData(prev => ({ ...prev, startY: e.clientY }));
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
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [isResizing, resizeData, columnWidths, rowHeights]);


  const extractPlainText = (html) => { 
    if (!html || html.trim() === '') return '';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return (tempDiv.textContent || tempDiv.innerText || '').trim();
  };

  const autoResizeTextarea = useCallback((element) => {
    if (!element || !editingCell) return;
    
    // Throttle el resize para evitar llamadas excesivas
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      // Reset height to auto to get the actual content height
      element.style.height = 'auto';
      
      // Calculate the actual content height
      const contentHeight = element.scrollHeight;
      const minHeight = 40; // Altura mínima
      const newHeight = Math.max(minHeight, contentHeight + 4);
      
      // Apply the new height
      element.style.height = newHeight + 'px';
      
      // Update row height SOLO si hay un cambio significativo (más de 5px)
      const [row] = editingCell.split('-').map(Number);
      const currentRowHeight = rowHeights[row] || minHeight;
      
      // Permitir tanto crecimiento como reducción
      if (Math.abs(newHeight - currentRowHeight) > 5) {
        setRowHeights(prev => ({
          ...prev,
          [row]: newHeight
        }));
      }
    }, 100); // Throttle de 100ms
  }, [editingCell, rowHeights]);

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

  const saveAnnotationLocal = useCallback(async (textToSave) => {
    if (!currentAnnotationCell || !textToSave || !currentLP) {
      return;
    }

    try {
      const savedAnnotation = await saveAnnotationToDB(currentLP.id, currentAnnotationCell, textToSave);
      
      setAnnotations(prev => {
        const updated = {
          ...prev,
          [currentAnnotationCell]: [
            ...(prev[currentAnnotationCell] || []),
            savedAnnotation
          ]
        };
        return updated;
      });
      
      closeAnnotationPanel();
      
    } catch (error) {
      console.error('Error guardando anotación:', error);
      alert('Error al guardar la anotación: ' + error.message);
    }
  }, [currentAnnotationCell, currentLP, saveAnnotationToDB, closeAnnotationPanel]);
                                        
  const deleteAnnotationLocal = useCallback(async (cellKey, annotationId) => {
    try {
      // Eliminar de BD
      await deleteAnnotationFromDB(annotationId);
      
      // Actualizar estado local
      setAnnotations(prev => {
        const cellAnnotations = prev[cellKey] || [];
        const updatedAnnotations = cellAnnotations.filter(ann => ann.id !== annotationId);
        
        if (updatedAnnotations.length === 0) {
          const newAnnotations = { ...prev };
          delete newAnnotations[cellKey];
          return newAnnotations;
        } else {
          return {
            ...prev,
            [cellKey]: updatedAnnotations
          };
        }
      });
      
    } catch (error) {
      console.error('Error eliminando anotación:', error);
      alert('Error al eliminar la anotación: ' + error.message);
    }
  }, [deleteAnnotationFromDB]); 

  const deleteAllAnnotations = useCallback((cellKey) => {
    setAnnotations(prev => {
      const newAnnotations = { ...prev };
      delete newAnnotations[cellKey];
      return newAnnotations;
    });
    closeAnnotationPanel();
  }, [closeAnnotationPanel]);

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

  const resetToTemplate = () => {
    setEditingCell(null);
    setShowColorToolbar(false);
    setTextSelection(null);
    closeAnnotationPanel();
    
    const template = getExcelTemplate();
    const richData = {};
    
    Object.keys(template.templateData).forEach(key => {
      const text = template.templateData[key].text || '';
      richData[key] = {
        content: text
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
    if (!editingCell || !inputRef.current || !textSelection) return;

    const { range } = textSelection;
    if (!range) return;

    try {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range.cloneRange());
      
      const selectedText = selection.toString();
      if (!selectedText) return;

      document.execCommand('styleWithCSS', false, true);
      const success = document.execCommand('foreColor', false, color);
      
      if (!success) {
        const span = document.createElement('span');
        span.style.color = color;
        
        try {
          range.surroundContents(span);
        } catch (e) {
          const contents = range.extractContents();
          span.appendChild(contents);
          range.insertNode(span);
        }
      }
      
      selection.removeAllRanges();
      setShowColorToolbar(false);
      setTextSelection(null);
      
      if (inputRef.current) {
        inputRef.current.focus();
        const newRange = document.createRange();
        newRange.selectNodeContents(inputRef.current);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
      
    } catch (error) {
      console.error('Error aplicando color:', error);
      setShowColorToolbar(false);
      setTextSelection(null);
    }
  };

  const handleTextSelection = useCallback(debounce((e) => {
    if (!editingCell || !inputRef.current) return;
    
    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText.length > 0 && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        const isWithinEditor = inputRef.current.contains(range.commonAncestorContainer) ||
                              inputRef.current.contains(range.startContainer) ||
                              inputRef.current.contains(range.endContainer) ||
                              range.commonAncestorContainer === inputRef.current;
        
        if (isWithinEditor) {
          setTextSelection({ 
            selectedText: selectedText,
            range: range 
          });
          
          const rect = range.getBoundingClientRect();
          const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
          const scrollY = window.pageYOffset || document.documentElement.scrollTop;
          
          setToolbarPosition({
            x: rect.left + scrollX + (rect.width / 2),
            y: rect.top + scrollY - 60
          });
          setShowColorToolbar(true);
        } else {
          setShowColorToolbar(false);
          setTextSelection(null);
        }
      } else {
        setShowColorToolbar(false);
        setTextSelection(null);
      }
    }, 50);
  }, 100), [editingCell]);

  const handleCellDoubleClick = useCallback((row, col) => {
    if (isCellMerged(row, col) && !isMergeOrigin(row, col)) return;
    
    const cellKey = `${row}-${col}`;
    
    if (editingCell === cellKey) return;
    
    if (editingCell && editingCell !== cellKey) {
      saveEditingCell();
    }
    
    setEditingCell(cellKey);
    
    const cellData = tableData[cellKey];
    const contentToEdit = cellData ? cleanHtml(cellData.content || '') : '';
    
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
  }, [editingCell, tableData, isCellMerged, isMergeOrigin, saveEditingCell, autoResizeTextarea, showAnnotationPanel, closeAnnotationPanel]);


  const handleCellClick = (row, col, isRangeSelect = false) => {
    const cellKey = `${row}-${col}`;
    
    if (editingCell === cellKey) return;
    
    if (isRangeSelect && selectedCell) {
      const [startRow, startCol] = selectedCell.split('-').map(Number);
      setSelectedRange({
        startRow: Math.min(startRow, row),
        endRow: Math.max(startRow, row),
        startCol: Math.min(startCol, col),
        endCol: Math.max(startCol, col)
      });
    } else {
      setSelectedCell(cellKey);
      setSelectedRange(null);
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
          console.error('Error cargando templates:', error);
        }
      }
    };

    loadTemplatesIfNeeded();
  }, [templates.length, loadTemplates]);

  const mergeCells = () => {
    if (!selectedRange) return;
    
    const { startRow, endRow, startCol, endCol } = selectedRange;
    const mergeKey = `${startRow}-${startCol}`;
    
    setMergedCells(prev => ({
      ...prev,
      [mergeKey]: {
        rowSpan: endRow - startRow + 1,
        colSpan: endCol - startCol + 1
      }
    }));
    
    setSelectedRange(null);
  };

  const unmergeCells = () => {
    if (!selectedCell) return;
    
    const [row, col] = selectedCell.split('-').map(Number);
    const mergeKey = findMergeOrigin(row, col);
    
    if (mergeKey) {
      setMergedCells(prev => {
        const newMerged = { ...prev };
        delete newMerged[mergeKey];
        return newMerged;
      });
    }
  };

  const getCurrentTemplate = () => {
    if (currentLP?.template_id) {
      const template = getTemplateById(currentLP.template_id);
      
      if (template) {
        return {
          id: template.id,
          name: template.name,
          description: template.description || '',
          categoria: template.categoria,
          proyecto: template.proyecto,
          dominio: template.dominio,
          is_active: template.is_active,
          template_config: template.template_config // Incluir toda la configuración
        };
      } else {
        console.warn('Template no encontrado');
      }
    }
    return null;
  };

  const findMergeOrigin = (row, col) => {
    for (const [mergeKey, span] of Object.entries(mergedCells)) {
      const [mergeRow, mergeCol] = mergeKey.split('-').map(Number);
      if (row >= mergeRow && row < mergeRow + span.rowSpan &&
          col >= mergeCol && col < mergeCol + span.colSpan) {
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
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        saveEditingCell();
      } else if (e.key === 'Escape') {
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
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
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
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '0.75rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
          <h2 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>
            Landing Page no encontrada
          </h2>
          <p style={{ margin: '0 0 1.5rem 0', color: '#64748b' }}>
            La landing page con ID "{lpId}" no existe o no tienes permisos para editarla.
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={getContainerStyle(isResizing)}>
      {/* Estilos CSS */}
      <style>{`
        .cell-editor:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          font-style: italic;
          pointer-events: none;
        }
        .cell-editor:focus:empty::before {
          opacity: 0.5;
        }
        .cell-editor:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        .cell-editor {
          border: none !important;
          outline: none !important;
          direction: ltr !important;
          text-align: left !important;
          transform: none !important;
          writing-mode: horizontal-tb !important;
          unicode-bidi: normal !important;
        }
        td:focus {
          outline: none !important;
        }
        *::selection {
          background: rgba(59, 130, 246, 0.3);
        }
        .cell-editor * {
          user-select: text;
        }
        textarea {
          direction: ltr !important;
          text-align: left !important;
          transform: none !important;
          writing-mode: horizontal-tb !important;
          unicode-bidi: normal !important;
        }
        [contenteditable="true"] {
          direction: ltr !important;
          text-align: left !important;
          transform: none !important;
          writing-mode: horizontal-tb !important;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* Rich Text Color Toolbar */}
      {showColorToolbar && (
        <div 
          data-color-toolbar
          style={{
            position: 'absolute',
            left: toolbarPosition.x ,
            top: toolbarPosition.y,
            zIndex: 1000,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}
        >
          <Type size={16} />
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Colorear:</span>
          {['#000000', '#E6484B', '#0583ff', '#150a44', '#00ffff', '#00eba7', '#B45F1D', '#9900ff'].map(color => (
            <div
              key={color}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: color,
                cursor: 'pointer',
                border: '2px solid #fff',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.1s ease'
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
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              title={`Aplicar color ${color === '#000000' ? 'negro' : color}`}
            >
              {color === '#000000' && <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>A</span>}
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

      {/* Navbar */}
      <nav style={{
        ...tableStyles.navbar,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={tableStyles.navContent}>
          <div style={tableStyles.navLeft}>
            <button 
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                color: '#374151',
                cursor: 'pointer',
                marginRight: '1rem',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
              onMouseOver={e => e.target.style.backgroundColor = '#f3f4f6'}
              onMouseOut={e => e.target.style.backgroundColor = 'transparent'}
            >
              <ArrowLeft size={16} />
              Dashboard
            </button>
            
            <div>
              <h1 style={tableStyles.title}>{currentLP.name}</h1>
              <p style={{ 
                margin: '0.25rem 0 0 0', 
                fontSize: '0.875rem', 
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>••••••</span> 
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
                disabled={saveStatus === 'saving'}
                style={{
                  ...tableStyles.primaryButton,
                  backgroundColor: saveStatus === 'saved' ? '#10b981' : 
                                 saveStatus === 'error' ? '#ef4444' : 
                                 saveStatus === 'saving' ? '#6b7280' : '#3b82f6',
                  cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer'
                }}
                title={saveStatus === 'saved' ? 'Progreso guardado' : 
                       saveStatus === 'error' ? 'Error al guardar' : 
                       saveStatus === 'saving' ? 'Guardando...' : 'Guardar progreso'}
              >
                {saveStatus === 'saving' ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #ffffff40',
                      borderTop: '2px solid #ffffff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span>Guardando...</span>
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Guardar</span>
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <AlertCircle size={16} />
                    <span>Error</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Guardar</span>
                  </>
                )}
              </button>

              {/* BOTÓN DE EXPORTACIÓN CON TEMPLATE */}
              <button 
                onClick={exportToExcelWithTemplate}
                disabled={isExporting}
                style={{
                  ...tableStyles.primaryButton,
                  backgroundColor: isExporting ? '#6b7280' : '#10b981',
                  marginLeft: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: isExporting ? 'not-allowed' : 'pointer'
                }}
                onMouseOver={e => {
                  if (!isExporting) {
                    e.target.style.backgroundColor = '#059669';
                  }
                }}
                onMouseOut={e => {
                  if (!isExporting) {
                    e.target.style.backgroundColor = '#10b981';
                  }
                }}
                title={isExporting ? 'Exportando...' : 'Exportar a Excel'}
              >
                {isExporting ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #ffffff40',
                      borderTop: '2px solid #ffffff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span>Exportando...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Exportar Excel</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
          <div style={{
            width: '2rem',
            height: '2rem',
            backgroundColor: '#3b82f6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            {currentUser.avatar || (
              (currentUser.first_name || currentUser.last_name)
                ? `${(currentUser.first_name?.[0] || '').toUpperCase()}${(currentUser.last_name?.[0] || '').toUpperCase()}`
                : (currentUser.email?.[0] || '').toUpperCase()
            )}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
              {currentUser.name}
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
              {isAdminUser && isAdminUser(currentUser.id)
                ? 'Administrador'
                : isEditorUser && isEditorUser(currentUser.id)
                  ? 'Editor'
                  : 'Visualizador'}
            </p>
          </div>
        </div>
        </div>
      </nav>

      {/* Indicador de estado de guardado */}
      {saveStatus !== 'idle' && (
        <div style={{
          position: 'fixed',
          top: '100px',
          right: '20px',
          zIndex: 1000,
          backgroundColor: saveStatus === 'saved' ? '#10b981' : 
                          saveStatus === 'error' ? '#ef4444' : '#3b82f6',
          color: 'white',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '500'
        }}>
          {saveStatus === 'saving' && (
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid #ffffff40',
              borderTop: '2px solid #ffffff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          )}
          {saveStatus === 'saved' && <CheckCircle2 size={16} />}
          {saveStatus === 'error' && <AlertCircle size={16} />}
          
          <span>
            {saveStatus === 'saving' && 'Guardando progreso...'}
            {saveStatus === 'saved' && 'Progreso guardado correctamente'}
            {saveStatus === 'error' && 'Error al guardar progreso'}
          </span>
        </div>
      )}

      {/* Barra de herramientas */}
      <div style={{
        ...tableStyles.toolbar,
        position: 'sticky',
        top: '80px',
        zIndex: 99,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={tableStyles.toolbarButtons}>

        {/* Botón de IA - Solo para columna Español */}
        {(() => {
          if (!selectedCell || editingCell) return null;
          
          const [row, col] = selectedCell.split('-').map(Number);
          const isSpanishColumn = col === 3; // Columna de Español
          
          if (!isSpanishColumn) return null;
          
          const block = getBlockFromRow(row);
          if (!block) return null;
          
          return (
            <button 
              style={{
                ...tableStyles.mergeButton,
                backgroundColor: '#8b5cf6',
                color: 'white',
                cursor: 'pointer',
                marginRight: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onClick={async (event) => {
                if (!selectedCell) return;
                try {
                  const tema = currentLP.title;
                  // Obtener el título correcto según el contexto
                  const titleInfo = getTitleForIAGeneration(selectedCell, block, tableData);
                  const blockTitle = titleInfo.title;
                  const currentTemplate = getCurrentTemplate();
                                    
                  if (!blockTitle || blockTitle.trim() === '') {
                    if (titleInfo.type === 'faq_answer_empty') {
                      alert(`No se puede generar respuesta FAQ porque no hay pregunta en la fila anterior. Por favor, agrega primero la pregunta en la celda H3 FAQ.`);
                      return;
                    }
                    
                    alert(`Para generar contenido con IA, primero debes agregar un título o pregunta.`);
                    return;
                  }


                  if (block.type === 'car_rental') {
                    const carTypes = [];
                    if (block.contentMapping) {
                      Object.entries(block.contentMapping).forEach(([field, cellKey]) => {
                        if (field.startsWith('desc_') && field !== 'desc') {
                          const [respRow] = cellKey.split('-').map(Number);
                          const typeRow = respRow - 1;
                          const typeContent = tableData[`${typeRow}-3`]?.content || '';
                          if (typeContent && typeContent.trim() !== '') {
                            carTypes.push(typeContent.trim());
                          }
                        }
                      });
                    }
                  }
                  
                  // Validación especial para fav_city
                  if (block.type === 'fav_city') {
                    if (!titleInfo.favCityQuestions || titleInfo.favCityQuestions.length === 0) {
                      alert('No hay preguntas/títulos de ciudad escritos en este bloque. Primero agrega los títulos en las celdas H3 correspondientes.');
                      // Restaurar botón
                      button.innerHTML = originalHTML;
                      button.disabled = false;
                      button.style.cursor = 'pointer';
                      return;
                    }
                  }

                  // Validación especial para FAQs
                  if (block.type === 'faqs') {
                    if (!titleInfo.faqQuestions || titleInfo.faqQuestions.length === 0) {
                      alert('No hay preguntas FAQ escritas en este bloque. Primero agrega las preguntas en las celdas H3 FAQ correspondientes.');
                      // Restaurar botón
                      button.innerHTML = originalHTML;
                      button.disabled = false;
                      button.style.cursor = 'pointer';
                      return;
                    }
                  }
                  
                  // Mostrar estado de carga
                  const button = event.target.closest('button');
                  const originalHTML = button.innerHTML;
                  button.innerHTML = '<span>🔄</span><span>Generando...</span>';
                  button.disabled = true;
                  const generatedContent = await callIAEndpoint({
                    blockNumber: block.number,
                    blockTitle: blockTitle,
                    cellKey: selectedCell,
                    tema: tema,
                    faqQuestions: titleInfo.faqQuestions || [],
                    favCityQuestions: titleInfo.favCityQuestions || [], 
                    carTypes: titleInfo.carTypes || [], 
                    blockType: block.type,
                    templateInfo: currentTemplate
                  });
                  
                  // Obtener la celda donde debe ir la descripción
                  const descriptionCellKey = getDescriptionCellKey(block);

                  const existingContent = tableData[descriptionCellKey]?.content || '';
          
                  if (existingContent.trim() !== '') {
                    const confirmReplace = window.confirm(
                      `Ya existe contenido en esta celda.\n\n¿Quieres reemplazarlo con nuevo contenido generado por IA?`
                    );
                    if (!confirmReplace) {
                      return;
                    }
                  }
                
                  
                  // Mostrar estado de carga
                  if (!button) {
                    return;
                  }
                  
                  button.innerHTML = '<span>🔄</span><span>Generando...</span>';
                  button.disabled = true;
                  button.style.cursor = 'not-allowed';
                  
                  if (existingContent.trim() !== '') {
                    setTableData(prev => ({
                      ...prev,
                      [descriptionCellKey]: {
                        content: ''
                      }
                    }));
                  } 
                  
                  // Actualizar la celda de descripción con el contenido generado
                  const updateTableDataByBlock = (blockNumber, content) => {
                    console.log('🔍 updateTableDataByBlock recibió:', content);
                    console.log('🔍 structured_content KEYS:', Object.keys(content?.structured_content || {}));
                    
                    setTableData(prev => {
                      const updates = { ...prev };
                      const blockKey = String(blockNumber);
                      const meta = blocksMetadata[blockKey];
                      
                      console.log('🔍 contentMapping KEYS:', Object.keys(meta?.contentMapping || {}));
                      
                      if (!meta || !meta.contentMapping) {
                        console.warn(`❌ No hay metadata o contentMapping para el bloque ${blockNumber}`);
                        return updates;
                      }
                      
                      Object.entries(meta.contentMapping).forEach(([field, cellKey]) => {
                        let contentValue = content.structured_content[field];
                        
                        // Si no encuentra el campo exacto, buscar alternativas
                        if (contentValue === undefined) {
                          // desc_X ↔ faq_X
                          if (field.startsWith('desc_')) {
                            const number = field.replace('desc_', '');
                            const altField = `faq_${number}`;
                            contentValue = content.structured_content[altField];
                            if (contentValue !== undefined) {
                              console.log(`✅ Campo '${field}' no encontrado, pero sí '${altField}'`);
                            }
                          } else if (field.startsWith('faq_')) {
                            const number = field.replace('faq_', '');
                            const altField = `desc_${number}`;
                            contentValue = content.structured_content[altField];
                            if (contentValue !== undefined) {
                              console.log(`✅ Campo '${field}' no encontrado, pero sí '${altField}'`);
                            }
                          }
                          
                          // Mapeo especial para desc_1 → desc_h2, desc_2 → desc_h3
                          if (contentValue === undefined) {
                            if (field === 'desc_1') {
                              contentValue = content.structured_content['desc_h2'];
                              if (contentValue !== undefined) {
                                console.log(`✅ Campo '${field}' no encontrado, usando 'desc_h2'`);
                              }
                            } else if (field === 'desc_2') {
                              contentValue = content.structured_content['desc_h3'];
                              if (contentValue !== undefined) {
                                console.log(`✅ Campo '${field}' no encontrado, usando 'desc_h3'`);
                              }
                            }
                          }
                        }
                        
                        if (contentValue !== undefined) {
                          console.log(`✅ Actualizando celda ${cellKey} con contenido`);
                          updates[cellKey] = { content: contentValue };
                        } else {
                          console.log(`❌ Campo '${field}' NO encontrado en structured_content`);
                        }
                      });
                      
                      return updates;
                    });
                  };
                  updateTableDataByBlock(block.number, generatedContent);
                  
                  // Restaurar botón
                  button.innerHTML = originalHTML;
                  button.disabled = false;
                  button.style.cursor = 'pointer';
                } catch (error) {
                  console.error('Error generando contenido IA:', error);
                  
                  // Mostrar error al usuario
                  alert('Error al generar contenido con IA: ' + error.message);
                  
                  // Restaurar botón en caso de error
                  const button = event.target.closest('button');
                  if (button) {
                    button.innerHTML = `<span>🤖</span><span>IA ${block.name}</span>`;
                    button.disabled = false;
                    button.style.cursor = 'pointer';
                  }
                }
              }}
              title={`Generar contenido con IA para ${block.name} (usa título de fila ${block.titleRow + 1})`}
            >
              <span>IA {block.name}</span>
            </button>
          );
        })()}

        {/* Botón de Traducción - Para columnas Inglés y Portugués */}
        {(() => {
          if (!selectedCell || editingCell) return null;
          
          const [row, col] = selectedCell.split('-').map(Number);
          const isEnglishColumn = col === 4; // Columna de Inglés
          const isPortugueseColumn = col === 5; // Columna de Portugués
          
          if (!isEnglishColumn && !isPortugueseColumn) return null;
          
          const targetLanguage = isEnglishColumn ? 'inglés' : 'portugués';
          const languageCode = isEnglishColumn ? 'en' : 'pt';
          const spanishContent = getSpanishContent(row, tableData); 
          
          // Si no hay contenido en español, no mostrar el botón
          if (!spanishContent || spanishContent.trim() === '') return null;
          
          // Obtener información del bloque para el título y tema
          const block = getBlockFromRow(row);
          const tema = currentLP.title;
          const blockTitle = block ? getBlockTitleContent(block, tableData) : '';
          
          return (
            <button 
              style={{
                ...tableStyles.mergeButton,
                backgroundColor: '#10b981',
                color: 'white',
                cursor: 'pointer',
                marginRight: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onClick={async (event) => {
                if (!selectedCell) return;
                
                try {
                  // Mostrar estado de carga
                  const button = event.target.closest('button');
                  const originalHTML = button.innerHTML;
                  button.innerHTML = '<span>🔄</span><span>Traduciendo...</span>';
                  button.disabled = true;
                  button.style.cursor = 'not-allowed';
                  
                  const translatedContent = await callTranslationEndpoint(
                    spanishContent, 
                    languageCode, 
                    selectedCell,
                    null, 
                    null        
                  );
                  
                  // Actualizar la celda con el contenido traducido
                  setTableData(prev => ({
                    ...prev,
                    [selectedCell]: {
                      content: translatedContent
                    }
                  }));
                  
                  // Restaurar botón
                  button.innerHTML = originalHTML;
                  button.disabled = false;
                  button.style.cursor = 'pointer';
                  
                } catch (error) {
                  console.error('Error traduciendo contenido:', error);
                  alert('Error al traducir contenido: ' + error.message);
                  
                  // Restaurar botón en caso de error
                  const button = event.target.closest('button');
                  button.innerHTML = `<span>🌐</span><span>Traducir a ${targetLanguage}</span>`;
                  button.disabled = false;
                  button.style.cursor = 'pointer';
                }
              }}
              title={`Traducir contenido de español a ${targetLanguage}`}
            >
              <span>Traducir a {targetLanguage}</span>
            </button>
          );
        })()}     
        
          <button 
            style={{
              ...tableStyles.mergeButton,
              backgroundColor: selectedCell && !editingCell ? '#f59e0b' : '#f3f4f6',
              color: selectedCell && !editingCell ? 'white' : '#9ca3af',
              cursor: selectedCell && !editingCell ? 'pointer' : 'not-allowed'
            }}
            onClick={() => selectedCell && !editingCell && addOrEditAnnotation(selectedCell)}
            disabled={!selectedCell || editingCell}
            title={selectedCell && annotations[selectedCell]?.length > 0 ? 
              `Ver/Agregar anotación (${annotations[selectedCell].length} ${annotations[selectedCell].length === 1 ? 'nota' : 'notas'})` : 
              'Agregar anotación'
            }
          >
            <MessageSquare size={14} />
            <span>
              {selectedCell && annotations[selectedCell]?.length > 0 ? 
                `Notas (${annotations[selectedCell].length})` : 
                'Anotar'
              }
            </span>
          </button>

          <div style={tableStyles.colorSection}>
            <Palette size={16} />
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              Selecciona texto para colorear
            </span>
          </div>
        </div>
      </div>

      {/* Tabla principal */}
      <div style={{
        ...tableStyles.tableContainer,
        paddingTop: '20px'
      }}>
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
                        minWidth: columnWidths[col]
                      }}
                    >
                      {getColumnLabel(col)}
                      <div
                        style={tableStyles.resizeHandle}
                        onMouseDown={(e) => handleMouseDown(e, 'column', col)}
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
                        height: rowHeights[row]
                      }}
                    >
                      {row + 1}
                      <div
                        style={tableStyles.rowResizeHandle}
                        onMouseDown={(e) => handleMouseDown(e, 'row', row)}
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
                      const cellData = tableData[cellKey] || { content: '' };
                      const merge = mergedCells[cellKey];
                      
                      const cellStyle = getCellStyle(
                        tableStyles.cell, 
                        isSelected, 
                        isInRange, 
                        columnWidths[col], 
                        rowHeights[row]
                      );
                      
                      return (
                        <td
                          key={col}
                          data-cell={cellKey}
                          style={{
                            ...cellStyle,
                            position: 'relative',
                            overflow: 'hidden',
                            padding: '0',
                            border: '1px solid #e5e7eb',
                            ...(isSelected && !isEditing ? {
                            border: '2px solid #3b82f6', 
                            zIndex: 1
                          } : {}),
                          }}
                          rowSpan={merge?.rowSpan || 1}
                          colSpan={merge?.colSpan || 1}
                          onClick={(e) => handleCellClick(row, col, e.shiftKey)}
                          onDoubleClick={() => handleCellDoubleClick(row, col)}
                          onKeyDown={(e) => handleKeyDown(e, row, col)}
                          onMouseOver={e => {
                            if (!isSelected && !isInRange) {
                              e.target.style.backgroundColor = tableStyles.hoverCell.backgroundColor;
                            }
                          }}
                          onMouseOut={e => {
                            if (!isSelected && !isInRange) {
                              e.target.style.backgroundColor = 'transparent';
                            }
                          }}
                          tabIndex={0}
                        >
                          {annotations[cellKey] && annotations[cellKey].length > 0 && (
                            <AnnotationMarker 
                              cellKey={cellKey} 
                              onClick={showAnnotation}
                            />
                          )}
                          
                          {isEditing ? (
                            <div
                              ref={inputRef}
                              contentEditable={true}
                              suppressContentEditableWarning={true}
                              onInput={(e) => {
                                if (!isUpdatingContent.current) {
                                  // Solo actualizar el ref, no el estado
                                  editingContentRef.current = e.target.innerHTML;
                                  // Throttled resize
                                  autoResizeTextarea(e.target);
                                }
                              }}
                              onBlur={saveEditingCell}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.shiftKey) {
                                  e.preventDefault();
                                  saveEditingCell();
                                  return;
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingCell(null);
                                  setShowColorToolbar(false);
                                  setTextSelection(null);
                                  return;
                                }
                                
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  const selection = window.getSelection();
                                  if (selection.rangeCount > 0) {
                                    const range = selection.getRangeAt(0);
                                    const br = document.createElement('br');
                                    range.deleteContents();
                                    range.insertNode(br);
                                    range.setStartAfter(br);
                                    range.collapse(true);
                                    selection.removeAllRanges();
                                    selection.addRange(range);
                                  }
                                  autoResizeTextarea(e.target);
                                }
                              }}
                              onMouseUp={handleTextSelection}
                              onKeyUp={(e) => {
                                if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Shift', 'Control', 'Alt'].includes(e.key)) {
                                  handleTextSelection(e);
                                }
                              }}
                              style={{
                                width: '100%',
                                height: '100%',
                                minHeight: '40px',
                                padding: '8px',
                                border: '2px solid #3b82f6',
                                borderRadius: '4px',
                                outline: 'none',
                                fontFamily: 'inherit',
                                fontSize: '14px',
                                lineHeight: '1.4',
                                whiteSpace: 'pre-wrap',
                                overflowWrap: 'break-word',
                                backgroundColor: 'white',
                                boxSizing: 'border-box',
                                resize: 'none',
                                direction: 'ltr',
                                textAlign: 'left',
                                transform: 'none',
                                writingMode: 'horizontal-tb'
                              }}
                              className="cell-editor"
                              data-placeholder="Escribe texto... (selecciona palabras para cambiar color)"
                            />
                          ) : (
                            <div 
                              style={{
                                width: '100%',
                                height: '100%',
                                minHeight: '40px',
                                padding: '8px',
                                fontSize: '14px',
                                lineHeight: '1.4',
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word',
                                boxSizing: 'border-box',
                                direction: 'ltr',
                                textAlign: 'left',
                                transform: 'none',
                                writingMode: 'horizontal-tb'
                              }}
                              dangerouslySetInnerHTML={{ 
                                __html: cellData.content || '' 
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
          <div style={{
            ...tableStyles.info,
            position: 'sticky',
            bottom: 0,
            zIndex: 98,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid #e5e7eb',
            boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.05)'
          }}>
            <span>Celda seleccionada: {selectedCell.split('-').map((n, i) => i === 0 ? parseInt(n) + 1 : getColumnLabel(parseInt(n))).reverse().join(' ')}</span>
            <span style={{ color: '#6366f1', fontWeight: '500' }}>
               {(() => {
                const cellContent = tableData[selectedCell]?.content || '';
                const plainText = extractPlainText(cellContent);
                const wordCount = plainText ? plainText.split(/\s+/).filter(word => word.length > 0).length : 0;
                return `${wordCount} ${wordCount === 1 ? 'palabra' : 'palabras'}`;
              })()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

