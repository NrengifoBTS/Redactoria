import requests
import json

def create_template():
    """Crear template con Bloques 1 y 2"""
    
    # TOKEN - REEMPLAZA CON TU TOKEN
    token = ""
    
    # URL de tu API
    base_url = "http://192.168.1.129:8080"  
    
    # Template data - BLOQUE 1 Y BLOQUE 2
    template_text_data = {
        # Bloque 1
        "0-0": "quicksearch", 
        "0-1": "Bloque 1:", 
        "0-2": "H1", 
        "0-3": "Alquiler de autos Budget en Estados Unidos",
        "1-2": "Descripción H1",
        
        # Bloque 2
        "2-0": "fleet", 
        "2-1": "Bloque 2:", 
        "2-2": "H2", 
        "2-3": "Renta de carros Budget en USA - Mejor precio",
        "3-2": "Descripción H2", 
        "4-2": "Texto alt", 
        "5-2": "IP USA",
        "6-2": "Texto alt", 
        "7-2": "IP BR",
        
        # Bloque 3
        "8-0": "carRental",
        "8-1": "Bloque 3:",
        "8-2": "H2",
        "8-3": "Tipos de autos de alquiler Budget en Estados Unidos",
        "9-2": "Descripción H2",
        "10-2": "H3",
        "10-3": "Alquiler de Carros Económicos",
        "11-2": "Descripción H3",
        "12-2": "H3",
        "12-3": "Alquiler de SUV",
        "13-2": "Descripción H3",
        "14-2": "H3",
        "14-3": "Alquiler de Vans",
        "15-2": "Descripción H3",
        "16-2": "H3",
        "16-3": "Alquiler de Convertibles",
        "17-2": "Descripción H3",
        "18-2": "H3",
        "18-3": "Alquiler de Autos de Lujo",
        "19-2": "Descripción H3",
        "20-2": "H3",
        "20-3": " ",
        "21-2": "Descripción H3",

        # Bloque 4
        "22-0": "faqs", 
        "22-1": "Bloque 4:", 
        "22-2": "H2", 
        "22-3": "Preguntas frecuentes sobre renta de autos Budget en Estados Unidos",
        "23-2": "Descripción H2", 
        "24-2": "H3 FAQ", 
        "24-3": "¿Cuánto cuesta alquilar un auto Budget en Estados Unidos?", 
        "25-2": "Descripción H3 FAQ",
        "26-2": "H3 FAQ", 
        "26-3": "¿Se puede rentar un carro de la agencia Budget por horas en USA?", 
        "27-2": "Descripción H3 FAQ", 
        "28-2": "H3 FAQ", 
        "28-3": "¿Cuál es el carro Budget más barato para alquilar en Estados Unidos?",
        "29-2": "Descripción H3 FAQ", 
        "30-2": "H3 FAQ", 
        "30-3": "¿Qué se necesita para rentar un carro Budget en Estados Unidos?", 
        "31-2": "Descripción H3 FAQ",
        "32-2": "H3 FAQ", 
        "32-3": " ",  
        "33-2": "Descripción H3 FAQ", 
        "34-2": "H3 FAQ",
        "34-3": " ",  
        "35-2": "Descripción H3 FAQ", 
        "36-2": "Disclaimer", 
        "36-3": "*Precios basados en los resultados entre los últimos 12 - 24 meses. Los precios pueden variar de acuerdo a la temporada y disponibilidad.",

        # Bloque 5 - Ciudades
        "37-0": "favoriteCities", 
        "37-1": "Bloque 5:", 
        "37-2": "H2", 
        "37-3": "Renta autos económicos en ciudades de Estados Unidos",
        "38-2": "Descripción H2", 
        "39-2": "H3",
        "39-3": "Miami", 
        "40-2": "Descripción H3",
        "41-2": "H3", 
        "41-3": "Orlando", 
        "42-2": "Descripción H3", 
        "43-2": "H3", 
        "43-3": "CBX", 
        "44-2": "Descripción H3",
        "45-2": "H3", 
        "45-3": "Las Vegas", 
        "46-2": "Descripción H3", 
        "47-2": "H3", 
        "47-3": "Nueva York", 
        "48-2": "Descripción H3",
        "49-2": "H3", 
        "49-3": "Los Ángeles", 
        "50-2": "Descripción H3", 
        "51-2": "H3", 
        "51-3": "Houston", 
        "52-2": "Descripción H3",
        "53-2": "H3", 
        "53-3": "Chicago", 
        "54-2": "Descripción H3", 
        "55-2": "H3", 
        "55-3": "Fort Lauderdale", 
        "56-2": "Descripción H3",
        "57-2": "H3", 
        "57-3": "San Diego", 
        "58-2": "Descripción H3", 
        "59-2": "H3", 
        "59-3": "Dallas", 
        "60-2": "Descripción H3",
        "61-2": "H3", 
        "61-3": "Phoenix", 
        "62-2": "Descripción H3", 
        "63-2": "H3", 
        "63-3": "Tampa", 
        "64-2": "Descripción H3",
        "65-2": "H3", 
        "65-3": "San Francisco", 
        "66-2": "Descripción H3", 
        "67-2": "H3", 
        "67-3": "Atlanta", 
        "68-2": "Descripción H3",
        "69-2": "H3", 
        "69-3": "Denver", 
        "70-2": "Descripción H3",
        
        #Bloque 6
        "71-0": "agencies", 
        "71-1": "Bloque 6:", 
        "71-2": "H2", 
        "71-3": "¿Te interesa alquilar con Budget? ¡Conoce también estas agencias de primer nivel!",
        "72-2": "Descripción H2", 
        "73-2": "Descripción H3", 
        "74-2": "Disclaimer", 
        "74-3": "*Precios basados en los resultados entre los últimos 12 - 24 meses. Los precios pueden variar de acuerdo a la temporada y disponibilidad.",
        "75-1": "Bloque 7",
        "75-2": "disclaimer F",
        "75-3": "*Estos precios son sujetos a cambios y varían dependiendo la temporada del año, el tamaño del vehículo, los días de renta, la agencia de alquiler de carros, las coberturas que adquieran, entre otros servicios opcionales. "
        
    }
    
    # Definir metadata de bloques que el Redactor usará
    blocks_metadata = {
        "1": {
            "name": "Bloque 1",
            "type": "quicksearch",
            "startRow": 0,
            "endRow": 1,
            "titleRow": 0,
            "descRow": 1,
            "contentMapping": {
                "desc": "1-3"  
            }
        },
        "2": {
            "name": "Bloque 2",
            "type": "fleet",
            "startRow": 2,
            "endRow": 7,
            "titleRow": 2,
            "descRow": 3,
            "contentMapping": {
                "desc": "3-3",      
                "ip_usa": "5-3",         
                "ip_bra": "7-3"          
            }
        },
        "3": {
            "name": "Bloque 3",
            "type": "car_rental",
            "startRow": 8,
            "endRow": 21,
            "titleRow": 8,
            "descRow": 9,
            "contentMapping": {
                "desc": "9-3",    
                "desc_1": "11-3",         
                "desc_2": "13-3",         
                "desc_3": "15-3",         
                "desc_4": "17-3",         
                "desc_5": "19-3",         
                "desc_6": "21-3"   
            }
        },
        "4": {
            "name": "Bloque 4",
            "type": "faqs",
            "startRow": 22,
            "endRow": 35,
            "titleRow": 22,
            "descRow": 23,
            "contentMapping": {
                "desc": "23-3",   
                "faq_1": "25-3",        
                "faq_2": "27-3",        
                "faq_3": "29-3",        
                "faq_4": "31-3",        
                "faq_5": "33-3",        
                "faq_6": "35-3"         
            }
        },
        "5": {
            "name": "Bloque 5",
            "type": "fav_city",
            "startRow": 37,
            "endRow": 70,
            "titleRow": 37,
            "descRow": 38,
            "contentMapping": {
                "desc": "38-3",
                "desc_1": "40-3",
                "desc_2": "42-3",
                "desc_3": "44-3",
                "desc_4": "46-3",
                "desc_5": "48-3",
                "desc_6": "50-3",
                "desc_7": "52-3",
                "desc_8": "54-3",
                "desc_9": "56-3",
                "desc_10": "58-3",
                "desc_11": "60-3",
                "desc_12": "62-3",
                "desc_13": "64-3",
                "desc_14": "66-3",
                "desc_15": "68-3",
                "desc_16": "70-3"
            }
        },
        "6": {
            "name": "Bloque 6",
            "type": "agencies",
            "startRow": 71,
            "endRow": 72,
            "titleRow": 71,
            "descRow": 72,
            "contentMapping": {
                "desc_h2": "72-3",    
                "desc_h3": "73-3"
            }
        }
    }
    
    # Configuración de merged_cells para Bloque 1 y 2
    merged_cells = {
        # Bloque 1
        "0-0": {"rowSpan": 2, "colSpan": 1},
        "0-1": {"rowSpan": 2, "colSpan": 1},
        # Bloque 2
        "2-0": {"rowSpan": 6, "colSpan": 1},
        "2-1": {"rowSpan": 6, "colSpan": 1},
        # Bloque 3
        "8-0": {"rowSpan": 14, "colSpan": 1},
        "8-1": {"rowSpan": 14, "colSpan": 1},
        # Bloque 4
        "22-0": {"rowSpan": 15, "colSpan": 1},
        "22-1": {"rowSpan": 15, "colSpan": 1},
        # Bloque 5
        "37-0": {"rowSpan": 34, "colSpan": 1},
        "37-1": {"rowSpan": 34, "colSpan": 1},
        # Bloque 6
        "71-0": {"rowSpan": 5, "colSpan": 1},
        "71-1": {"rowSpan": 4, "colSpan": 1},
    }
    
    # Configuración de anchos de columna
    column_widths = {
        "0": 120, "1": 120, "2": 300, "3": 350, 
        "4": 350, "5": 350, "6": 200
    }

    # Convertir a formato con color
    template_data = {}
    for key, text in template_text_data.items():
        template_data[key] = {"text": text, "color": "#000000"}

    for row in range(77):  
        for col in range(7):
            key = f"{row}-{col}"
            if key not in template_data:
                template_data[key] = {"text": "", "color": "#000000"}


    payload = {
        "name": "Template Agencias",
        "description": "Template para la landing page de Agencias Viajemos",
        "proyecto": "viajemos",
        "dominio": ".com",
        "categoria": "agencias",
        "merged_cells": merged_cells,      
        "column_widths": column_widths,    
        "template_data": template_data,
        "table_config": {                 
            "numRows": 80,
            "numCols": 7,
            "defaultRowHeight": 40,
            "defaultColumnWidth": 120
        },
        "column_headers": [                
            "Página", "Bloque", "Comentarios para el equipo IT", "Español",
            "Inglés", "Portugués", "Revisado por / Fecha"
        ],
        "blocks_metadata": blocks_metadata,
        "is_active": True,
        "is_public": True
    }

    # Headers con autenticación
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }


    try:
        print(f"\n Creando template con Bloques 1 y 2...")
        print(f" URL: {base_url}/templates/from-config")
        
        response = requests.post(
            f"{base_url}/templates/from-config",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        print(f" Status Code: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            return result['id']
            
        elif response.status_code == 401:
            print(" Error de autenticación: Token inválido o expirado")
            print("  Asegúrate de colocar tu token en la variable 'token'")
        
        elif response.status_code == 422:
            print(" Error de validación:")
            error_detail = response.json()
            print(json.dumps(error_detail, indent=2))
            
            # Imprimir más detalles del error
            if 'detail' in error_detail:
                print("\n Detalles del error:")
                if isinstance(error_detail['detail'], list):
                    for error in error_detail['detail']:
                        print(f"   - Campo: {error.get('loc', 'desconocido')}")
                        print(f"     Mensaje: {error.get('msg', 'sin mensaje')}")
                else:
                    print(f"   {error_detail['detail']}")
            
        else:
            print(f" Error {response.status_code}:")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print(" Error de conexión: ¿Está corriendo tu servidor?")
        
    except requests.exceptions.Timeout:
        print(" Timeout: La request tardó demasiado")
        
    except Exception as e:
        print(f" Error inesperado: {str(e)}")

    return None

if __name__ == "__main__":
    print(" Creador de Template - Bloques 1 y 2")
    print("=" * 50)
    
    template_id = create_template()
    
    if template_id:
        print(f"\n ¡Template creado exitosamente!")
        print(f" ID: {template_id}")
    else:
        print("\n No se pudo crear el template")
        print("  Verifica que hayas colocado tu token")