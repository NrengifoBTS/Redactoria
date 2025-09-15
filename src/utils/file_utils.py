import json
import os
import openpyxl
from typing import Dict, Any, List, Union, Optional


class FileHandler:
    """Utilidades para manejo de archivos."""
    
    @staticmethod
    def load_json(path: str) -> Dict[str, Any]:
        """
        Carga un archivo JSON.
        
        Args:
            path: Ruta al archivo JSON
            
        Returns:
            Datos del archivo JSON
            
        Raises:
            FileNotFoundError: Si el archivo no existe
            json.JSONDecodeError: Si el archivo no es un JSON válido
        """
        if not os.path.exists(path):
            raise FileNotFoundError(f"El archivo no existe: {path}")
        
        try:
            with open(path, 'r', encoding='utf-8') as file:
                return json.load(file)
        except json.JSONDecodeError as e:
            raise json.JSONDecodeError(f"Error al decodificar JSON: {e.msg}", e.doc, e.pos)
        
    @staticmethod
    def save_json(path: str, data: Dict[str, Any], indent: int = 4) -> None:
        """
        Guarda datos en un archivo JSON.
        
        Args:
            path: Ruta donde guardar el archivo
            data: Datos a guardar
            indent: Indentación para el archivo JSON
            
        Raises:
            IOError: Si hay un error al escribir el archivo
        """
        try:
            # Crear directorios si no existen
            directory = os.path.dirname(path)
            FileHandler.ensure_dir(directory)
            
            # Guardar el archivo
            with open(path, 'w', encoding='utf-8') as file:
                json.dump(data, file, ensure_ascii=False, indent=indent)
                
        except Exception as e:
            raise IOError(f"Error al guardar el archivo JSON: {e}")
        
    @staticmethod
    def ensure_dir(directory: str) -> None:
        """
        Asegura que un directorio existe, creándolo si es necesario.
        
        Args:
            directory: Ruta del directorio
        """
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)
            
    @staticmethod
    def get_file_name(path: str, with_extension: bool = True) -> str:
        """
        Obtiene el nombre de un archivo de una ruta.
        
        Args:
            path: Ruta completa al archivo
            with_extension: Si se incluye la extensión
            
        Returns:
            Nombre del archivo
        """
        base_name = os.path.basename(path)
        if with_extension:
            return base_name
        else:
            return os.path.splitext(base_name)[0]
            
    @staticmethod
    def generate_output_path(input_path: str, suffix: str = "", output_dir: Optional[str] = None) -> str:
        """
        Genera una ruta de salida basada en la ruta de entrada.
        
        Args:
            input_path: Ruta del archivo de entrada
            suffix: Sufijo a añadir al nombre del archivo
            output_dir: Directorio de salida (opcional)
            
        Returns:
            Ruta de salida generada
        """
        # Obtener directorio y nombre base
        input_dir = os.path.dirname(input_path)
        base_name = FileHandler.get_file_name(input_path, False)
        extension = os.path.splitext(input_path)[1]
        
        # Determinar directorio de salida
        output_directory = output_dir if output_dir else input_dir
        FileHandler.ensure_dir(output_directory)
        
        # Generar nombre de archivo de salida
        output_name = f"{base_name}{suffix}{extension}"
        
        # Combinar para obtener la ruta completa
        return os.path.join(output_directory, output_name)
    
    @staticmethod
    def load_excel(path: str) -> openpyxl.Workbook:
        """
        Carga un archivo Excel.
        
        Args:
            path: Ruta al archivo Excel
            
        Returns:
            Objeto Workbook de openpyxl
            
        Raises:
            FileNotFoundError: Si el archivo no existe
        """
        if not os.path.exists(path):
            raise FileNotFoundError(f"El archivo Excel no existe: {path}")
            
        try:
            return openpyxl.load_workbook(path)
        except Exception as e:
            raise Exception(f"Error al cargar el archivo Excel: {e}")
    
    @staticmethod
    def save_excel(workbook: openpyxl.Workbook, path: str) -> None:
        """
        Guarda un libro de Excel.
        
        Args:
            workbook: Libro de Excel a guardar
            path: Ruta donde guardar el archivo
            
        Raises:
            IOError: Si hay un error al guardar
        """
        try:
            # Crear directorios si no existen
            directory = os.path.dirname(path)
            FileHandler.ensure_dir(directory)
            
            # Guardar el workbook
            workbook.save(path)
            
        except Exception as e:
            raise IOError(f"Error al guardar el archivo Excel: {e}")