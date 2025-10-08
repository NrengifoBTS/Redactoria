import React, { useState } from "react";
import "@iconscout/unicons/css/line.css";
// Eliminamos: import { Link } from "react-router-dom"; // Ya no se usa

import "./css/styles.css";

// -----------------------------------------------------------------------------
// Componente ModalCreacionBlog
// -----------------------------------------------------------------------------
const ModalCreacionBlog = ({ onClose }) => {
  // Estado para manejar los inputs del formulario
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
    console.log("Datos para Generar Ideas recopilados:", formData);

    alert("Datos enviados. Redirigiendo para generar ideas...");

    // Cierra el modal después de la acción
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
            <label htmlFor="titulo">Título del Blog/Tema Central:</label>
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
              Keywords Extras (separadas por coma o desde Excel):
            </label>
            <textarea
              id="keywords"
              name="keywords"
              value={formData.keywords}
              onChange={handleChange}
              placeholder="Ingresa keywords o pega texto de Excel. Ejemplo: 'inversion, tips legales, contrato alquiler'"
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

  const statsData = [
    { value: "1,245", label: "Visitas Totales" },
    { value: "87", label: "Artículos Generados" },
    { value: "142", label: "Imágenes Generadas" },
  ];

  const tableData = [
    {
      archivo: "Guía de Viajes 2025",
      tipo: "Artículo",
      palabras: 1200,
      estado: "Activo",
      prioridad: "Urgente",
      fecha: "18/09/2025",
    },
    {
      archivo: "IA Futurista",
      tipo: "Artículo",
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

  // Componentes internos
  const Header = () => (
    <header className="navbar">
      <h1>Analíticas</h1>
      <nav>
        {/* CORRECCIÓN: Usar un botón para "Volver" o un <a> con href válido */}
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
            <option>Todos los tipos</option>
            <option>Artículos</option>
            <option>Imágenes</option>
          </select>
          <select>
            <option>Últimos 7 días</option>
            <option>Últimos 30 días</option>
            <option>Este año</option>
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
            <th>Archivo</th>
            <th>Tipo</th>
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

  const Footer = () => <footer className="footer"></footer>;

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
        <ModalCreacionBlog onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default App;
