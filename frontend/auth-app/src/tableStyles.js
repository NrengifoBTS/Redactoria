// tableStyles.js - Estilos CSS para la tabla

const tableStyles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    userSelect: 'auto'
  },
  containerResizing: {
    userSelect: 'none'
  },
  navbar: {
    backgroundColor: 'white',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    borderBottom: '1px solid #e5e7eb',
    padding: '12px 24px'
  },
  navContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    margin: 0
  },
  buttonGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s'
  },
  primaryButtonHover: {
    backgroundColor: '#1d4ed8'
  },
  secondaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s'
  },
  secondaryButtonHover: {
    backgroundColor: '#e5e7eb'
  },
  resetButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s'
  },
  resetButtonHover: {
    backgroundColor: '#fde68a'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  userInfo: {
    textAlign: 'right'
  },
  userName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827',
    margin: 0
  },
  userStatus: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0
  },
  avatar: {
    width: '40px',
    height: '40px',
    backgroundColor: '#2563eb',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: '500',
    fontSize: '14px'
  },
  toolbar: {
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '8px 24px'
  },
  toolbarButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.2s'
  },
  addButtonHover: {
    backgroundColor: '#bbf7d0'
  },
  deleteButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.2s'
  },
  deleteButtonHover: {
    backgroundColor: '#fecaca'
  },
  mergeButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: '#ddd6fe',
    color: '#581c87',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.2s'
  },
  mergeButtonHover: {
    backgroundColor: '#c4b5fd'
  },
  colorSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingLeft: '12px',
    borderLeft: '1px solid #e5e7eb'
  },
  tableContainer: {
    padding: '24px'
  },
  tableWrapper: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    overflow: 'hidden'
  },
  tableScroll: {
    overflow: 'auto'
  },
  table: {
    borderCollapse: 'collapse',
    position: 'relative'
  },
  headerCell: {
    width: '48px',
    backgroundColor: '#f3f4f6',
    borderRight: '1px solid #d1d5db',
    borderBottom: '1px solid #d1d5db',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    position: 'relative'
  },
  columnHeader: {
    backgroundColor: '#f3f4f6',
    borderRight: '1px solid #d1d5db',
    borderBottom: '1px solid #d1d5db',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    position: 'relative'
  },
  cell: {
    borderRight: '1px solid #d1d5db',
    borderBottom: '1px solid #d1d5db',
    padding: 0,
    position: 'relative',
    cursor: 'cell',
    minHeight: '40px',
    height: 'auto',
    verticalAlign: 'top'
  },
  cellContent: {
    width: '100%',
    minHeight: '40px',
    padding: '8px',
    display: 'flex',
    alignItems: 'flex-start',
    boxSizing: 'border-box'
  },
  cellText: {
    fontSize: '14px',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    lineHeight: '1.4',
    width: '100%'
  },
  cellInput: {
    width: '100%',
    minHeight: '40px',
    maxHeight: '200px',
    padding: '8px',
    border: 'none',
    outline: 'none',
    backgroundColor: 'white',
    fontSize: '14px',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: '1.4',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    verticalAlign: 'top',
    boxSizing: 'border-box',
    overflow: 'hidden'
  },
  selectedCell: {
    outline: '2px solid #3b82f6',
    backgroundColor: '#eff6ff'
  },
  rangeSelection: {
    backgroundColor: '#dbeafe',
    outline: '1px solid #60a5fa'
  },
  hoverCell: {
    backgroundColor: '#f9fafb'
  },
  resizeHandle: {
    position: 'absolute',
    backgroundColor: 'transparent',
    cursor: 'col-resize',
    right: '-2px',
    top: 0,
    width: '4px',
    height: '100%',
    zIndex: 10
  },
  rowResizeHandle: {
    position: 'absolute',
    backgroundColor: 'transparent',
    cursor: 'row-resize',
    bottom: '-2px',
    left: 0,
    width: '100%',
    height: '4px',
    zIndex: 10
  },
  // Styles para rich text toolbar
  richTextToolbar: {
    position: 'fixed',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '300px'
  },
  colorOption: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    cursor: 'pointer',
    border: '2px solid #fff',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.1s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  colorOptionHover: {
    transform: 'scale(1.1)'
  },
  richTextDisplay: {
    fontSize: '14px',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    lineHeight: '1.4',
    width: '100%'
  },
  info: {
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    fontSize: '14px',
    color: '#6b7280'
  }
};

// Función helper para aplicar estilos condicionales
export const getContainerStyle = (isResizing) => ({
  ...tableStyles.container,
  ...(isResizing ? tableStyles.containerResizing : {})
});

export const getCellStyle = (base, isSelected, isInRange, width, height) => ({
  ...base,
  width: width,
  minHeight: Math.max(40, height),
  minWidth: width,
  ...(isSelected ? tableStyles.selectedCell : {}),
  ...(isInRange ? tableStyles.rangeSelection : {})
});

export default tableStyles;