# redactoria/utils/text_utils.py

import re
from typing import Dict, List, Any, Optional, Tuple


class TextProcessor:
    """Procesa texto y maneja formato especial."""
    
    @staticmethod
    def remove_think_tags(text: str) -> str:
        """
        Elimina completamente todo el contenido que esté dentro de las etiquetas <think>...</think>,
        incluyendo las propias etiquetas.
        
        Args:
            text: Texto a procesar
            
        Returns:
            Texto sin etiquetas <think>
        """
        pattern = r'<think>.*?</think>'
        return re.sub(pattern, '', text, flags=re.DOTALL)
    
    @staticmethod
    def clean_format_tags(text: str) -> str:
        """
        Limpia las etiquetas de formato y asegura que estén correctamente cerradas.
        
        Args:
            text: Texto con etiquetas de formato
            
        Returns:
            Texto con etiquetas corregidas
        """
        # Eliminar espacios entre etiquetas
        text = re.sub(r'>\s+<', '><', text)
        
        # Asegurar que las etiquetas están correctamente cerradas
        for tag in ['b', 'r', 'bl', 'g', 'mo']:
            # Contar etiquetas de apertura y cierre
            open_tags = text.count(f'<{tag}>')
            close_tags = text.count(f'</{tag}>')
            
            # Agregar etiquetas de cierre si faltan
            if open_tags > close_tags:
                text += f'</{tag}>' * (open_tags - close_tags)
        
        return text
    
    @staticmethod
    def extract_fields_from_text(text: str, field_type: Optional[str] = None) -> Dict[str, str]:
        """
        Extrae pares clave-valor del texto con patrones específicos.
        
        Args:
            text: Texto del cual extraer los campos
            field_type: Tipo de campo para aplicar un patrón específico
            
        Returns:
            Diccionario con los campos extraídos
        """
        # Diccionario para almacenar los resultados
        extracted_fields = {}

        # Patrón para extraer bloques con formato '|clave: valor|'
        pattern = r"\|([\w_]+):\s*(.*?)\|"

        # Buscar todos los bloques en el texto
        matches = re.findall(pattern, text, re.DOTALL)

        for match in matches:
            # Extraer clave y valor
            key, value = match
            extracted_fields[key.strip()] = value.strip()

        return extracted_fields
    
    @staticmethod
    def extract_segments(text: str) -> List[Dict[str, Any]]:
        """
        Extrae segmentos de texto con sus respectivas etiquetas de formato.
        
        Args:
            text: Texto con etiquetas de formato
            
        Returns:
            Lista de segmentos con texto y etiquetas
        """
        # Si no hay etiquetas, retornar el texto completo sin formato
        if not any(f"<{tag}>" in text for tag in ['r', 'b', 'bl', 'g', 'mo']):
            return [{'text': text, 'tags': []}]
        
        segments = []
        current_pos = 0
        
        # Definir patrón para buscar etiquetas de apertura
        open_tag_pattern = re.compile(r'<(r|b|bl|g|mo)>')
        
        while current_pos < len(text):
            # Buscar la próxima etiqueta de apertura
            open_match = open_tag_pattern.search(text, current_pos)
            
            if not open_match:
                # No hay más etiquetas, añadir el resto del texto
                if current_pos < len(text):
                    segments.append({'text': text[current_pos:], 'tags': []})
                break
            
            # Añadir texto sin formato antes de la etiqueta
            if open_match.start() > current_pos:
                segments.append({'text': text[current_pos:open_match.start()], 'tags': []})
            
            # Obtener la etiqueta actual
            tag = open_match.group(1)
            close_tag = f"</{tag}>"
            close_pos = text.find(close_tag, open_match.end())
            
            if close_pos == -1:
                # Etiqueta de cierre no encontrada, tratar como texto normal
                segments.append({'text': text[open_match.start():open_match.end()], 'tags': []})
                current_pos = open_match.end()
                continue
        
            content = text[open_match.end():close_pos]
            nested_segments = TextProcessor.extract_segments(content)
            
            # Añadir la etiqueta actual a todos los segmentos anidados
            for segment in nested_segments:
                segment['tags'].append(tag)
                segments.append(segment)
            
            # Actualizar la posición actual
            current_pos = close_pos + len(close_tag)
        
        return segments
    
    @staticmethod
    def get_tag_color(tag: str) -> Optional[str]:
        """
        Devuelve el color correspondiente a una etiqueta.
        
        Args:
            tag: Etiqueta de formato (r, bl, g, mo)
            
        Returns:
            Código de color o None si no es una etiqueta de color
        """
        tag_colors = {
            'r': "FF0000",   # Rojo
            'bl': "0000FF",  # Azul
            'g': "008000",   # Verde
            'mo': "800080"   # Morado oscuro
        }
        return tag_colors.get(tag)
    
    @staticmethod
    def has_format_tags(text: str) -> bool:
        """
        Comprueba si un texto tiene etiquetas de formato.
        
        Args:
            text: Texto a comprobar
            
        Returns:
            True si el texto tiene etiquetas de formato
        """
        return any(f"<{tag}>" in text for tag in ['r', 'b', 'bl', 'g', 'mo'])
    
    @staticmethod
    def get_plain_text(text: str) -> str:
        """
        Elimina todas las etiquetas de formato y devuelve solo el texto plano.
        
        Args:
            text: Texto con etiquetas
            
        Returns:
            Texto sin etiquetas
        """
        # Eliminar etiquetas <think>
        text = TextProcessor.remove_think_tags(text)
        
        # Eliminar otras etiquetas de formato
        for tag in ['r', 'b', 'bl', 'g', 'mo']:
            text = text.replace(f'<{tag}>', '')
            text = text.replace(f'</{tag}>', '')
            
        return text