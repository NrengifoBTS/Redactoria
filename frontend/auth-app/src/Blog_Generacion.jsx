import "./css/styles_generacion.css";

// 🔹 Navbar
function Navbar() {
  return (
    <header className="navbar">
      <a href="/dashboard" className="btn">
        ⬅ Volver al Dashboard
      </a>
      <h1>Generación de Blog</h1>
    </header>
  );
}

// 🔹 Configuración inicial
function Preconfig() {
  return (
    <section className="preconfig">
      <h2>Configuración del Prompt</h2>
      <div className="config-grid">
        <textarea placeholder="Tema principal" className="auto-expand" />
        <textarea placeholder="Palabras clave" className="auto-expand" />

        <div className="slider-container">
          <label>Longitud del Artículo:</label>
          <input
            type="range"
            min="500"
            max="3000"
            step="100"
            defaultValue="1000"
          />
          <span>1000 palabras</span>
        </div>

        <div className="slider-container">
          <label>Número de Secciones:</label>
          <input type="range" min="3" max="10" defaultValue="5" />
          <span>5 secciones</span>
        </div>

        <select defaultValue="">
          <option value="" disabled>
            Idioma
          </option>
          <option value="es">Español</option>
          <option value="en">Inglés</option>
        </select>

        <select defaultValue="">
          <option value="" disabled>
            Tono
          </option>
          <option value="formal">Formal</option>
          <option value="casual">Casual</option>
        </select>

        <label>
          <input type="checkbox" /> Incluir Imágenes
        </label>
        <label>
          <input type="checkbox" /> Incluir FAQ
        </label>
        <label>
          <input type="checkbox" /> Optimización SEO
        </label>
      </div>
    </section>
  );
}

// 🔹 Generador de ideas
function IdeaGenerator() {
  return (
    <section className="idea-generator">
      <h2>Generador de Ideas</h2>
      <textarea
        className="auto-expand"
        placeholder="Ej: tecnología educativa"
      />
      <div className="idea-buttons">
        <button className="btn-generate">Generar Ideas</button>
        <button className="btn-regenerar">Regenerar Ideas</button>
      </div>
      <div className="idea-output">
        <div className="idea-bubble">Ejemplo de idea generada</div>
      </div>
    </section>
  );
}

// 🔹 Generador de imágenes
function ImageGenerator() {
  return (
    <section className="image-generator">
      <div className="image-controls">
        <h2>Generador de Imágenes</h2>
        <div className="image-grid">
          <textarea className="auto-expand" placeholder="Tema de la imagen" />
          <select defaultValue="">
            <option value="" disabled>
              Estilo
            </option>
            <option value="realista">Realista</option>
            <option value="anime">Anime</option>
          </select>
        </div>
        <button className="btn-generate-image">Generar Imagen</button>
      </div>
      <div className="image-output">
        <div className="prompt-box">Aquí aparecerá el prompt generado...</div>
        <div className="image-preview">Vista previa aquí...</div>
      </div>
    </section>
  );
}

// 🔹 Generador de enlaces
function LinksGenerator() {
  return (
    <section className="links-generator">
      <h2>Enlaces SEO</h2>
      <div className="link-form">
        <input type="text" placeholder="URL interna" />
        <input type="text" placeholder="Anchor Text" />
      </div>
      <button className="btn-secondary">Añadir Interno</button>
    </section>
  );
}

// 🔹 FAQ
function FaqGenerator() {
  return (
    <section className="faq-generator">
      <h2>Generador de FAQ</h2>
      <p>Configura preguntas frecuentes</p>
      <div className="faq-config">
        <label>Número de preguntas:</label>
        <input type="number" min="1" max="10" defaultValue="3" />
      </div>
      <button className="btn-generate">Generar FAQ</button>
      <div className="faq-preview">
        <h3>Vista previa:</h3>
        <ul>
          <li>¿Qué es la IA en educación?</li>
        </ul>
      </div>
    </section>
  );
}

// 🔹 Vista previa del blog
function VisualGenerator() {
  return (
    <section className="visual-generator">
      <h2>Vista Previa del Blog</h2>
      <div className="preview-box">
        <h3>Título generado aquí...</h3>
        <p>Contenido generado aparecerá aquí...</p>
      </div>
    </section>
  );
}

// 🔹 Página completa
export default function BlogGeneracion() {
  return (
    <div>
      <Navbar />
      <Preconfig />
      <main className="container generadores-container">
        <div className="generadores-izquierda">
          <IdeaGenerator />
          <ImageGenerator />
          <LinksGenerator />
          <FaqGenerator />
        </div>
        <VisualGenerator />
      </main>
    </div>
  );
}
