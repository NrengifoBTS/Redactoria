import spacy
import sys

print(f"--- Ejecutando con Python en: {sys.executable} ---")

try:
    # Intentamos cargar el modelo que descargaste
    nlp = spacy.load("es_core_news_sm")
    print("✅ ¡Éxito! El modelo 'es_core_news_sm' se cargó correctamente.")
    
    # Prueba de fuego: Similitud Semántica
    doc1 = nlp("La inteligencia artificial genera textos para blogs.")
    doc2 = nlp("La IA crea artículos automáticamente.")
    
    similitud = doc1.similarity(doc2)
    print(f"📊 Resultado de similitud: {similitud:.4f}")
    
    if similitud > 0.5:
        print("🚀 EL MOTOR SEMÁNTICO ESTÁ LISTO PARA LOS LOGS.")
    else:
        print("⚠️ El motor funciona, pero la similitud es baja (revisa los textos).")

except Exception as e:
    print(f"❌ ERROR: No se pudo cargar spaCy o el modelo.")
    print(f"Detalle: {e}")
    print("\n💡 Sugerencia: Asegúrate de que el .venv esté activo al ejecutar este archivo.")