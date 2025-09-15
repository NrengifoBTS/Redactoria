// templateConfig.js - Configuración del template basada en el Excel

// Fusiones de celdas siguiendo el patrón del Excel original
const mergedCells = {
  // Bloque 1 (filas 1-2)
  "0-0": { rowSpan: 2, colSpan: 1 },    // LP Las Vegas
  "0-1": { rowSpan: 2, colSpan: 1 },    // Bloque 1:
  
  // Bloque 2 (filas 3-8)
  "2-0": { rowSpan: 6, colSpan: 1 },    // LP Las Vegas
  "2-1": { rowSpan: 6, colSpan: 1 },    // Bloque 2:
  
  // Bloque 3 (filas 9-12)
  "8-0": { rowSpan: 4, colSpan: 1 },   // LP Las Vegas
  "8-1": { rowSpan: 4, colSpan: 1 },   // Bloque 3:
  
  // Bloque 4 (filas 13-27)
  "12-0": { rowSpan: 15, colSpan: 1 },  // LP Las Vegas
  "12-1": { rowSpan: 15, colSpan: 1 },  // Bloque 4:
  
  // Bloque 5 (filas 28-41)
  "27-0": { rowSpan: 14, colSpan: 1 },  // LP Las Vegas
  "27-1": { rowSpan: 14, colSpan: 1 },  // Bloque 5:
  
  // Bloque 6 (filas 42-75)
  "41-0": { rowSpan: 34, colSpan: 1 },  // LP Las Vegas
  "41-1": { rowSpan: 34, colSpan: 1 },  // Bloque 6:
  
};

// Anchos de columnas optimizados
const columnWidths = {
  0: 120,   // Página
  1: 120,   // Bloque  
  2: 300,   // Comentarios para el equipo IT
  3: 350,   // Español
  4: 350,   // Inglés
  5: 350,   // Portugués
  6: 200,   // Revisado por / Fecha
  7: 120, 8: 120, 9: 120, 10: 120, 11: 120
};

// Datos del template basados en tu Excel
const templateTextData = {
  // Bloque 1 (filas 1-2, fusionadas)
  "0-0": "LP Las Vegas", "0-1": "Bloque 1:", "0-2": "H1",
  "1-2": "Descripción H1",
  
  // Bloque 2 (filas 3-8, fusionadas)
  "2-0": " ", "2-1": "Bloque 2:", "2-2": "H2",
  "3-2": "Descripción H2",
  "4-2": "Texto alt",
  "5-2": "IP USA",
  "6-2": "Texto alt",
  "7-2": "IP BR",
  
  // Bloque 3 (filas 9-12, fusionadas)
  "8-0": " ", "8-1": "Bloque 3:", "8-2": "H2",
  "9-2": "Descripción H2",
  "10-2": "Descripción H3",
  "11-2": "Disclaimer",
  
  // Bloque 4 (filas 13-27, fusionadas)
  "12-0": " ", "12-1": "Bloque 4:", "12-2": "H2",
  "13-2": "Descripción H2",
  "14-2": "H3 FAQ", 
  "15-2": "Descripción H3 FAQ",
  "16-2": "H3 FAQ",
  "17-2": "Descripción H3 FAQ",
  "18-2": "H3 FAQ",
  "19-2": "Descripción H3 FAQ",
  "20-2": "H3 FAQ",
  "21-2": "Descripción H3 FAQ",
  "22-2": "H3 FAQ",
  "23-2": "Descripción H3 FAQ",
  "24-2": "H3 FAQ",
  "25-2": "Descripción H3 FAQ",
  "26-2": "Disclaimer",
  
  // Bloque 5 (filas 28-41, fusionadas)
  "27-0": " ", "27-1": "Bloque 5:", "27-2": "H2",
  "28-2": "Descripción H2",
  "29-2": "H3",
  "30-2": "Descripción H3",
  "31-2": "H3",
  "32-2": "Descripción H3",
  "33-2": "H3",
  "34-2": "Descripción H3",
  "35-2": "H3",
  "36-2": "Descripción H3",
  "37-2": "H3",
  "38-2": "Descripción H3",
  "39-2": "H3",
  "40-2": "Descripción H3",
  
  // Bloque 6 (filas 42-75, fusionadas)
  "41-0": " ", "41-1": "Bloque 6:", "41-2": "H2",
  "42-2": "Descripción H2",
  "43-2": "H3",
  "44-2": "Descripción H3",
  "45-2": "H3",
  "46-2": "Descripción H3",
  "47-2": "H3",
  "48-2": "Descripción H3",
  "49-2": "H3",
  "50-2": "Descripción H3",
  "51-2": "H3",
  "52-2": "Descripción H3",
  "53-2": "H3",
  "54-2": "Descripción H3",
  "55-2": "H3",
  "56-2": "Descripción H3",
  "57-2": "H3",
  "58-2": "Descripción H3",
  "59-2": "H3",
  "60-2": "Descripción H3",
  "61-2": "H3",
  "62-2": "Descripción H3",
  "63-2": "H3",
  "64-2": "Descripción H3",
  "65-2": "H3",
  "66-2": "Descripción H3",
  "67-2": "H3",
  "68-2": "Descripción H3",
  "69-2": "H3",
  "70-2": "Descripción H3",
  "71-2": "H3",
  "72-2": "Descripción H3",
  "73-2": "H3",
  "74-2": "Descripción H3",
  
  // Bloque 7 (filas 76-85)
  "75-0": " ", "75-1": "Bloque 7:", "75-2": "Desclaimers F",
};

// Función principal para obtener el template completo
const getExcelTemplate = () => {
  const initializedData = {};
  
  // Inicializar todas las celdas 
  for (let row = 0; row < 80; row++) {
    for (let col = 0; col < 12; col++) {
      const key = `${row}-${col}`;
      const text = templateTextData[key] || '';
      initializedData[key] = {
        text: text,
        color: '#000000'
      };
    }
  }

  return {
    templateData: initializedData,
    mergedCells: mergedCells,
    columnWidths: columnWidths
  };
};

// Headers de las columnas
const columnHeaders = [
  "Página", "Bloque", "Comentarios para el equipo IT", "Español", 
  "Inglés", "Portugués", "Revisado por / Fecha", "Columna H",
  "Columna I", "Columna J", "Columna K", "Columna L"
];

// Configuración de dimensiones
const tableConfig = {
  numRows: 77,
  numCols: 7,
  defaultRowHeight: 40,
  defaultColumnWidth: 120
};

// Exportar todas las configuraciones
export {
  getExcelTemplate,
  mergedCells,
  columnWidths,
  templateTextData,
  columnHeaders,
  tableConfig
};