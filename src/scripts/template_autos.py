import requests
import json

def create_template():
    """Crear template de autos"""
    
    # TOKEN - REEMPLAZA CON TU TOKEN
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjYW1pbGFjQHJlZGFjdG9yaWEuY29tIiwiaWQiOiJiNDNmMWQwNC1mMzM5LTRjZjktOGU0ZS00ZjEyN2YxMmFmNWEiLCJleHAiOjE3NTI4NTk1MDJ9.o9NeRqDJ7p9Aho9cDzzB-E5-RmMpDdfQIfSI5VisJPI"
    
    # URL de tu API
    base_url = "http://192.168.1.129:8080"  
    
    # Template data - BLOQUE 1 Y BLOQUE 2
    template_text_data = {
        # Bloque 1
        "0-0": "quicksearch", 
        "0-1": "Bloque 1:", 
        "0-2": "H1", 
        "0-3": "Alquiler de autos económicos en Estados Unidos",
        "1-2": "Descripción H1",
        
        # Bloque 2
        "2-0": "fleet", 
        "2-1": "Bloque 2:", 
        "2-2": "H2", 
        "2-3": "Renta de autos baratos en Estados Unidos, ¡tenemos la mejor oferta!",
        "3-2": "Descripción H2", 
        "4-2": "Texto alt", 
        "5-2": "IP USA",
        "6-2": "Texto alt", 
        "7-2": "IP BR",
        
        # Bloque 3
        "8-0": "agencies", 
        "8-1": "Bloque 3:", 
        "8-2": "H2", 
        "8-3": "Conoce las mejores agencias de alquiler de autos baratos en USA",
        "9-2": "Descripción H2", 
        "10-2": "Descripción H3", 
        "11-2": "Disclaimer", 
        "11-3": "*Precios basados en los resultados entre los últimos 12 - 24 meses. Los precios pueden variar de acuerdo a la temporada y disponibilidad.",

        # Bloque 4
        "12-0": "faqs", 
        "12-1": "Bloque 4:", 
        "12-2": "H2", 
        "12-3": "Información importante sobre renta de autos baratos en EE. UU",
        "13-2": "Descripción H2", 
        "14-2": "H3 FAQ", 
        "14-3": "¿Cuánto cuesta alquilar un auto económico en Estados Unidos?", 
        "15-2": "Descripción H3 FAQ",
        "16-2": "H3 FAQ", 
        "16-3": "¿Cuáles agencias tienen las tarifas más bajas para alquilar autos en Estados Unidos?", 
        "17-2": "Descripción H3 FAQ", 
        "18-2": "H3 FAQ", 
        "18-3": "¿Cuál es el auto más barato para alquilar en Estados Unidos?",
        "19-2": "Descripción H3 FAQ", 
        "20-2": "H3 FAQ", 
        "20-3": "¿Qué se necesita para rentar un auto barato en Estados Unidos?", 
        "21-2": "Descripción H3 FAQ",
        "22-2": "H3 FAQ", 
        "22-3": " ",  
        "23-2": "Descripción H3 FAQ", 
        "24-2": "H3 FAQ",
        "24-3": " ",  
        "25-2": "Descripción H3 FAQ", 
        "26-2": "Disclaimer", 
        "26-3": "*Precios basados en los resultados entre los últimos 12 - 24 meses. Los precios pueden variar de acuerdo a la temporada y disponibilidad.",

        # Bloque 5 - Ciudades
        "27-0": "favoriteCities", 
        "27-1": "Bloque 5:", 
        "27-2": "H2", 
        "27-3": "Renta autos económicos en ciudades de Estados Unidos",
        "28-2": "Descripción H2", 
        "29-2": "H3",
        "29-3": "Miami", 
        "30-2": "Descripción H3",
        "31-2": "H3", 
        "31-3": "Orlando", 
        "32-2": "Descripción H3", 
        "33-2": "H3", 
        "33-3": "CBX", 
        "34-2": "Descripción H3",
        "35-2": "H3", 
        "35-3": "Las Vegas", 
        "36-2": "Descripción H3", 
        "37-2": "H3", 
        "37-3": "Nueva York", 
        "38-2": "Descripción H3",
        "39-2": "H3", 
        "39-3": "Los Ángeles", 
        "40-2": "Descripción H3", 
        "41-2": "H3", 
        "41-3": "Houston", 
        "42-2": "Descripción H3",
        "43-2": "H3", 
        "43-3": "Chicago", 
        "44-2": "Descripción H3", 
        "45-2": "H3", 
        "45-3": "Fort Lauderdale", 
        "46-2": "Descripción H3",
        "47-2": "H3", 
        "47-3": "San Diego", 
        "48-2": "Descripción H3", 
        "49-2": "H3", 
        "49-3": "Dallas", 
        "50-2": "Descripción H3",
        "51-2": "H3", 
        "51-3": "Phoenix", 
        "52-2": "Descripción H3", 
        "53-2": "H3", 
        "53-3": "Tampa", 
        "54-2": "Descripción H3",
        "55-2": "H3", 
        "55-3": "San Francisco", 
        "56-2": "Descripción H3", 
        "57-2": "H3", 
        "57-3": "Atlanta", 
        "58-2": "Descripción H3",
        "59-2": "H3", 
        "59-3": "Denver", 
        "60-2": "Descripción H3",
        
        #Bloque 6
        "61-0": "carRental",
        "61-1": "Bloque 6:",
        "61-2": "H2",
        "61-3": "Alquiler de autos económicos y otros vehículos para movilizarte ",
        "62-2": "Descripción H2",
        "63-2": "H3",
        "63-3": "Alquiler de Autos de Lujo",
        "64-2": "Descripción H3",
        "65-2": "H3",
        "65-3": "Renta de SUVs",
        "66-2": "Descripción H3",
        "67-2": "H3",
        "67-3": "Alquiler de Vans",
        "68-2": "Descripción H3",
        "69-2": "H3",
        "69-3": "Renta de Convertibles",
        "70-2": "Descripción H3",
        "71-2": "H3",
        "71-3": "Alquiler de Eléctricos",
        "72-2": "Descripción H3",
        "73-2": "H3",
        "73-3": " ",
        "74-2": "Descripción H3",
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
            "type": "agencies",
            "startRow": 8,
            "endRow": 11,
            "titleRow": 8,
            "descRow": 9,
            "contentMapping": {
                "desc_h2": "9-3",
                "desc_h3": "10-3"
            }
        },
        "4": {
            "name": "Bloque 4",
            "type": "faqs",
            "startRow": 12,
            "endRow": 26,
            "titleRow": 12,
            "descRow": 13,
            "contentMapping": {
                "desc": "13-3",   
                "faq_1": "15-3",        
                "faq_2": "17-3",        
                "faq_3": "19-3",        
                "faq_4": "21-3",        
                "faq_5": "23-3",        
                "faq_6": "25-3"         
            }
        },
        "5": {
            "name": "Bloque 5",
            "type": "fav_city",
            "startRow": 27,
            "endRow": 60,
            "titleRow": 27,
            "descRow": 28,
            "contentMapping": {
                "desc": "28-3",    
                "desc_1": "30-3",         
                "desc_2": "32-3",         
                "desc_3": "34-3",         
                "desc_4": "36-3",         
                "desc_5": "38-3",         
                "desc_6": "40-3",         
                "desc_7": "42-3",         
                "desc_8": "44-3",         
                "desc_9": "46-3",         
                "desc_10": "48-3",       
                "desc_11": "50-3",        
                "desc_12": "52-3",        
                "desc_13": "54-3",       
                "desc_14": "56-3",        
                "desc_15": "58-3",        
                "desc_16": "60-3"         
            }
        },
        "6": {
            "name": "Bloque 6",
            "type": "car_rental",
            "startRow": 61,
            "endRow": 73,
            "titleRow": 61,
            "descRow": 62,
            "contentMapping": {
                "desc": "62-3",    
                "desc_1": "64-3",         
                "desc_2": "66-3",         
                "desc_3": "68-3",         
                "desc_4": "70-3",         
                "desc_5": "72-3",         
                "desc_6": "74-3"          
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
        "8-0": {"rowSpan": 4, "colSpan": 1},
        "8-1": {"rowSpan": 4, "colSpan": 1},
        # Bloque 4
        "12-0": {"rowSpan": 15, "colSpan": 1},
        "12-1": {"rowSpan": 15, "colSpan": 1},
        # Bloque 5
        "27-0": {"rowSpan": 34, "colSpan": 1},
        "27-1": {"rowSpan": 34, "colSpan": 1},
        # Bloque 6
        "61-0": {"rowSpan": 15, "colSpan": 1},
        "61-1": {"rowSpan": 14, "colSpan": 1},
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
        "name": "Template Autos",
        "description": "Template para la landing page de alquiler de autos Viajemos",
        "proyecto": "viajemos",
        "dominio": ".com",
        "categoria": "autos",
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