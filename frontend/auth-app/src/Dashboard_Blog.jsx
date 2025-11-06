import React, { useState } from "react";
import "@iconscout/unicons/css/line.css";
import "./css/styles.css";
import GeneracionBlog from "./Blog_Generacion";

// -----------------------------------------------------------------------------
// Componente ModalCreacionBlog (Mantenido casi igual, llama a onGenerateSubmit)
// -----------------------------------------------------------------------------
const ModalCreacionBlog = ({ onClose, onGenerateSubmit }) => {
  const [formData, setFormData] = useState({
    titulo: "",
    categoria: "",
    keywords: "",
    idioma: "es",
    tecnica: "persuasiva",
    acento: "neutral",
    tono: "profesional",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Llama a la función del componente principal (App) para pasar los datos
    // y provocar el cambio de vista.
    onGenerateSubmit(formData);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Generar Ideas para Blog</h2>
          <button className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="titulo">
              Título del Blog/Tema Central (Query):
            </label>
            <input
              type="text"
              id="titulo"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="categoria">Categoría del Blog:</label>
            <select
              id="categoria"
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona una categoría</option>
              <option value="arriendo">Arriendo</option>
              <option value="viajemos">Viajemos</option>
              <option value="guia_legal">Guía Legal</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="keywords">
              Keywords Secundarias (Extras, separadas por coma):
            </label>
            <textarea
              id="keywords"
              name="keywords"
              value={formData.keywords}
              onChange={handleChange}
              rows="3"
              placeholder="Ej: 'impuestos, contrato alquiler, avalúo'"
            ></textarea>
          </div>
          <div className="form-group-inline">
            <div className="form-group">
              <label htmlFor="idioma">Idioma:</label>
              <select
                id="idioma"
                name="idioma"
                value={formData.idioma}
                onChange={handleChange}
                required
              >
                <option value="es">Español</option>
                <option value="en">Inglés</option>
                <option value="pt">Portugués</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="tecnica">Técnicas de Redacción:</label>
              <select
                id="tecnica"
                name="tecnica"
                value={formData.tecnica}
                onChange={handleChange}
              >
                <option value="persuasiva">Persuasiva</option>
                <option value="informativa">Informativa/Educativa</option>
                <option value="narrativa">Narrativa</option>
                <option value="seo">Optimización SEO</option>
              </select>
            </div>
          </div>
          <div className="form-group-inline">
            <div className="form-group">
              <label htmlFor="acento">Acento:</label>
              <select
                id="acento"
                name="acento"
                value={formData.acento}
                onChange={handleChange}
              >
                <option value="neutral">Neutral (Latam)</option>
                <option value="es_es">España</option>
                <option value="mx">México</option>
                <option value="co">Colombia</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="tono">Tono:</label>
              <select
                id="tono"
                name="tono"
                value={formData.tono}
                onChange={handleChange}
              >
                <option value="profesional">Profesional</option>
                <option value="amigable">Amigable</option>
                <option value="formal">Formal</option>
                <option value="entusiasta">Entusiasta</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn-generate">
            Generar Ideas
          </button>
        </form>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Componente Principal App
// -----------------------------------------------------------------------------
const App = () => {
  // Estado para controlar la visibilidad del modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // *** ESTADOS CLAVE PARA LA TRANSICIÓN ***
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationParams, setGenerationParams] = useState(null);

  const handleGenerationStart = (formData) => {
    // 1. Almacena los datos
    setGenerationParams(formData);
    // 2. Cierra el modal (ya lo hace el modal, pero por seguridad)
    setIsModalOpen(false);
    // 3. Cambia la vista para renderizar Blog_Generacion
    setIsGenerating(true);

    console.log("Datos de Generación listos para Blog_Generacion:", formData);
  };

  const handleBackToDashboard = () => {
    // 1. Vuelve a la vista del Dashboard
    setIsGenerating(false);
    // 2. Limpia los parámetros (opcional, pero buena práctica)
    setGenerationParams(null);
  };

  // --- Componentes y Datos Internos (Mantenidos igual) ---
  const statsData = [
    { value: "1,245", label: "Visitas Totales" },
    { value: "87", label: "Artículos Generados" },
    { value: "142", label: "Imágenes Generadas" },
  ];

  const Header = () => (
    <header className="navbar">
      <h1>Analíticas</h1>
      <nav>
        <button className="btn" onClick={() => window.history.back()}>
          Volver
        </button>
      </nav>
    </header>
  );

  const Stats = () => (
    <section className="stats">
      {statsData.map((stat, idx) => (
        <div className="stat-card" key={idx}>
          <h2>{stat.value}</h2>
          <p>{stat.label}</p>
        </div>
      ))}
    </section>
  );

  const TableRow = ({ data }) => (
    <tr>
      <td>{data.archivo}</td>
      <td>{data.tipo}</td>
      <td>{data.palabras}</td>
      <td>{data.estado}</td>
      <td>{data.prioridad}</td>
      <td>{data.fecha}</td>
      <td className="acciones">
        <button className="btn-action edit">Editar</button>
        <button className="btn-action view">Visualizar</button>
        <button className="btn-action delete">Eliminar</button>
        <button className="btn-action download">Descargar</button>
      </td>
    </tr>
  );

  const Table = () => (
    <section className="table-section">
      <div className="table-controls">
        <div className="filters">
          <input type="text" placeholder="Buscar..." />
          <select>
            <option>Todos los Estados</option>
            <option>Borrador</option>
            <option>Pendiente</option>
            <option>En proceso</option>
            <option>Pendiente de revisión</option>
            <option>Pendiente de ajuste</option>
            <option>Aprobado</option>
            <option>Pendiente</option>
          </select>
          <select>
            <option>Todas las fechas</option>
            <option>Esta Semana</option>
            <option>Este mes</option>
            <option>Este año</option>
          </select>
          <select>
            <option value="">Todos los asignados </option>
            {/*Aqui va la logica con la llamada a usuarios para obtenerlos */}
          </select>

          <select>
            <option value="">Todas las prioridades</option>
            <option value="">Alta</option>
            <option value="">Media</option>
            <option value="">Baja</option>
          </select>
        </div>
        {/* Uso de botón para abrir el modal */}
        <button className="btn-create" onClick={() => setIsModalOpen(true)}>
          + Crear Blog
        </button>
      </div>
      <h3>Últimos Archivos Generados</h3>
      <table>
        <thead>
          <tr>
            <th>Nombre archivo</th>
            <th>Asignado A</th>
            <th>Palabras</th>
            <th>Estado</th>
            <th>Prioridad</th>
            <th>Ultima modificacion</th>
            <th>Opciones</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, idx) => (
            <TableRow key={idx} data={row} />
          ))}
        </tbody>
      </table>
    </section>
  );

  // ... (tableData)
  const tableData = [
    {
      archivo: "Guía de Viajes 2025",
      tipo: "Persona 1",
      palabras: 1200,
      estado: "Activo",
      prioridad: "Urgente",
      fecha: "18/09/2025",
    },
    {
      archivo: "IA Futurista",
      tipo: "Persona2",
      palabras: 850,
      estado: "Inactivo",
      prioridad: "Neutral",
      fecha: "17/09/2025",
    },
    {
      archivo: "Logo Digital",
      tipo: "Imagen",
      palabras: 1500,
      estado: "Activo",
      prioridad: "Alto",
      fecha: "15/09/2025",
    },
  ];

  const Footer = () => <footer className="footer"></footer>;
  // --- Fin de Componentes y Datos Internos ---

  // --- Lógica de Renderizado Condicional
  if (isGenerating && generationParams) {
    // 1. Si isGenerating es true, renderiza la vista de generación
    return (
      <GeneracionBlog
        initialParams={generationParams}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  // 2. Por defecto (isGenerating es false), renderiza el Dashboard
  return (
    <div>
      <Header />
      <main className="container">
        <Stats />
        <Table />
      </main>
      <Footer />
      {/* Renderizado condicional del Modal */}
      {isModalOpen && (
        <ModalCreacionBlog
          onClose={() => setIsModalOpen(false)}
          onGenerateSubmit={handleGenerationStart} // Pasamos la función de manejo
        />
      )}
    </div>
  );
};

export default App;
