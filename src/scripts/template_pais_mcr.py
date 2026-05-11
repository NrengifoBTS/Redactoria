import requests
import json

def create_template():
    """Crear template para Ciudad"""
    
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
        "0-3": "Alquiler de Autos en Estados Unidos",
        "1-2": "Descripción H1",
        
        # Bloque benefits
        "2-0": "benefits",
        "3-0": "",
        # Bloque agency-logs
        "4-0": "agency_logs",
        "5-0": "",
        
        # Bloque 2
        "6-0": "fleet", 
        "6-1": "Bloque 2:", 
        "6-2": "H2", 
        "6-3": "Ofertas en Renta de Autos en EE.UU",
        "7-2": "Descripción H2", 
        "8-2": "IP USA",
        "9-2": "IP BR",
        
        # Bloque 3                       
        "10-0": "locationscarrusel", 
        "10-1": "Bloque 3:",
        "10-2": "H2",
        "10-3": "Renta de autos en las principales ciudades de USA",
        "10-4": "Car Rental in the Major Cities of the USA",
        "10-5": "Aluguel de carros nas principais cidades dos EUA",
        "11-2": "descripción H2",
        "12-2": "h3",
        "12-3": "Miami",
        "12-4": "Miami",
        "12-5": "Miami",
        "13-2": "Descripción H3",
        "13-3": "Autos económicos de renta en Miami, FL",
        "14-2": "h3",
        "14-3": "Orlando",
        "14-4": "Orlando",
        "14-5": "Orlando",
        "15-2": "Descripción H3",
        "15-3": "Renta de vehículos económicos en Orlando, Florida",
        "16-2": "h3",
        "16-3": "CBX",
        "16-4": "CBX",
        "16-5": "CBX",
        "17-2": "Descripción H3",
        "17-3": "Vehículos económicos de renta en CBX, CA",
        "18-2": "h3",
        "18-3": "Las Vegas",
        "18-4": "Las Vegas",
        "18-5": "Las Vegas",
        "19-2": "Descripción H3",
        "19-3": "Carros baratos de renta en Las Vegas, NV",
        "20-2": "h3",
        "20-3": "New york",
        "20-4": "New york",
        "20-5": "Nova york",
        "21-2": "Descripción H3",
        "21-3": "Alquiler de vehículos baratos en Nueva York, New York",
        "22-2": "h3",
        "22-3": "Los Angeles",
        "22-4": "Los Angeles",
        "22-5": "Los Angeles",
        "23-2": "Descripción H3",
        "23-3": "Vehículos de alquiler en Los Ángeles, CA",
        "24-2": "h3",
        "24-3": "Houston",
        "24-4": "Houston",
        "24-5": "Houston",
        "25-2": "Descripción H3",
        "25-3": "Renta de autos económicos en Houston, Texas",
        "26-2": "h3",
        "26-3": "Chicago",
        "26-4": "Chicago",
        "26-5": "Chicago",
        "27-2": "Descripción H3",
        "27-3": "Coches de alquiler en Chicago, IL",
        "28-2": "h3",
        "28-3": "Fort Lauderdale",
        "28-4": "Fort Lauderdale",
        "28-5": "Fort Lauderdale",
        "29-2": "Descripción H3",
        "29-3": "Autos económicos de alquiler en Fort Lauderdale, Florida",
        "30-2": "h3",
        "30-3": "San Diego",
        "30-4": "San Diego",
        "30-5": "San Diego",
        "31-2": "Descripción H3",
        "31-3": "Renta de vehículos económicos en San Diego, CA",
        "32-2": "h3",
        "32-3": "Dallas",
        "32-4": "Dallas",
        "32-5": "Dallas",
        "33-2": "Descripción H3",
        "33-3": "Alquiler de vehículos económicos en Dallas, Texas",
        "34-2": "h3",
        "34-3": "Phoenix",
        "34-4": "Phoenix",
        "34-5": "Phoenix",
        "35-2": "Descripción H3",
        "35-3": "Renta de autos baratos en Phoenix, AZ",
        "36-2": "h3",
        "36-3": "Tampa",
        "36-4": "Tampa",
        "36-5": "Tampa",
        "37-2": "Descripción H3",
        "37-3": "Vehículos de alquiler en Tampa, FL",
        "38-2": "h3",
        "38-3": "San Francisco",
        "38-4": "San Francisco",
        "38-5": "San Francisco",
        "39-2": "Descripción H3",
        "39-3": "Renta de autos económicos en San Francisco, CA",
        "40-2": "h3",
        "40-3": "Atlanta",
        "40-4": "Atlanta",
        "40-5": "Atlanta",
        "41-2": "Descripción H3",
        "41-3": "Alquiler de vehículos económicos en Atlanta, GA",
        "42-2": "h3",
        "42-3": "Denver",
        "42-4": "Denver",
        "42-5": "Denver",
        "43-2": "Descripción H3",
        "43-3": "Vehículos económicos de renta en Denver, CO",
        
        # Bloque 4
        "44-0": "reviews",
        "44-1": "Bloque 4:",
        "44-2": "H2",
        "44-3": "Opiniones sobre alquiler de vehículos en USA",
        "45-2": "descripción H2",
        
        # Bloque 5
        "46-0": "rentcompanies",
        "46-1": "Bloque 5:",
        "46-2": "H2",
        "46-3": "Empresas de alquiler de autos en USA",
        "47-2": "descripción H2",
        
        # Bloque 6
        "48-0": "questions",
        "48-1": "Bloque 6:",
        "48-2": "H2",
        "48-3": "Preguntas frecuentes sobre alquiler de autos en Estados Unidos",
        "49-2": "descripción H2",
        "50-2": "h3",
        "50-3": "¿Cuánto cuesta rentar un auto en USA?",
        "51-2": "Descripción H3",
        "51-3": "",
        "52-2": "h3",
        "52-3": "¿Qué se necesita para alquilar un coche en Estados Unidos?",
        "53-2": "Descripción H3",
        "53-3": "",
        "54-2": "h3",
        "54-3": "¿Cuál es la agencia de alquiler de autos con los precios más baratos en Estados Unidos?",
        "55-2": "Descripción H3",
        "55-3": "",
        "56-2": "h3",
        "56-3": "¿Cuánto cuesta rentar un carro por una semana en USA?",
        "57-2": "Descripción H3",
        "57-3": "",
        "58-2": "Disclaimer",
        "58-3": "*Precios basados en los resultados entre los últimos 12 - 24 meses. Los precios pueden variar de acuerdo a la temporada y disponibilidad.",
        "58-4": "*Prices based on data from the last 12 - 24 months. Prices may vary depending on the season and availability.",
        "58-5": "*Precios basados en los resultados entre los últimos 12 - 24 meses. Los precios pueden variar de acuerdo a la temporada y disponibilidad.",
        
        # Bloque 7
        "59-0": "fleetcarrusel",
        "59-1": "Bloque 7:",
        "59-2": "H2",
        "59-3": "Tipos de vehículos de alquiler en Estados Unidos",
        "60-2": "descripción H2",
        "61-2": "h3",
        "61-3": "Económico",
        "62-2": "Descripción H3",
        "63-2": "h3",
        "63-3": "Camionetas",
        "64-2": "Descripción H3",
        "65-2": "h3",
        "65-3": "Van",
        "66-2": "Descripción H3",
        "67-2": "h3",
        "67-3": "Convertibles",
        "68-2": "Descripción H3",
        "69-2": "h3",
        "69-3": "Lujo",
        "70-2": "Descripción H3",
        "71-2": "h3",
        "71-3": "Eléctricos",
        "72-2": "Descripción H3",
        
        # Bloque 8
        "73-0": "text_end_landingpage",
        "74-1": "Bloque 8:",
        "74-2": "Disclaimer",
        "74-3": "*Estos precios son sujetos a cambios  y variarán dependiendo de la temporada del año, el tamaño del vehículo, los días de renta, la agencia de alquiler de carros, las coberturas que adquieras, entre otros servicios opcionales.",
        "74-4": "*These pricesare subject to change and may vary depending on the season, the vehicle size, the rental duration, the car rental agency, the coverages you select, and other optional services.",
        "74-5": "*Estes preços estão sujeitos a alterações e variam em função da época do ano, do tamanho do veículo, dos dias de locação, da locadora, das coberturas adquiridas, entre outros serviços opcionais."
              
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
            "startRow": 6,
            "endRow": 9,
            "titleRow": 6,
            "descRow": 7,
            "contentMapping": {
                "desc": "7-3",
                "ip_usa": "8-3",
                "ip_bra": "9-3"
            }
        },
        "3": {
            "name": "Bloque 3",
            "type": "locationscarrusel",
            "startRow": 10,
            "endRow": 43,
            "titleRow": 10,
            "descRow": 11,
            "contentMapping": {
                "desc": "11-3",    
                "desc_1": "13-3",         
                "desc_2": "15-3",         
                "desc_3": "17-3",         
                "desc_4": "19-3",         
                "desc_5": "21-3",         
                "desc_6": "23-3",
                "desc_7": "25-3",
                "desc_8": "27-3",
                "desc_9": "29-3",
                "desc_10": "31-3",
                "desc_11": "33-3",
                "desc_12": "35-3",
                "desc_13": "37-3",
                "desc_14": "39-3",
                "desc_15": "41-3",
                "desc_16": "43-3"                   
            }
        },   
        "4": {
            "name": "Bloque 4",
            "type": "reviews",
            "startRow": 44,
            "endRow": 45,
            "titleRow": 44,
            "descRow": 45,
            "contentMapping": {
                "desc_h2": "45-3"
            }
        },
        "5": {
            "name": "Bloque 5",
            "type": "rentcompanies",
            "startRow": 46,
            "endRow": 47,
            "titleRow": 46,
            "descRow": 47,
            "contentMapping": {
                "desc": "47-3",      
            }
        },
        "6": {
            "name": "Bloque 6",
            "type": "questions",
            "startRow": 48,
            "endRow": 58,
            "titleRow": 48,
            "descRow": 49,
            "contentMapping": {
                "desc": "49-3",    
                "desc_1": "51-3",         
                "desc_2": "53-3",         
                "desc_3": "55-3",         
                "desc_4": "57-3"
            }
        },
        "7": {
            "name": "Bloque 7",
            "type": "fleetcarrusel",
            "startRow": 59,
            "endRow": 74,
            "titleRow": 59,
            "descRow": 60,
            "contentMapping": {
                "desc": "60-3",    
                "desc_1": "62-3",         
                "desc_2": "64-3",         
                "desc_3": "66-3",
                "desc_4": "68-3",
                "desc_5": "70-3",
                "desc_6": "72-3"
            }
        }
    }
    
    # Configuración de merged_cells para Bloque 1 y 2
    merged_cells = {
        # Bloque 1
        "0-0": {"rowSpan": 2, "colSpan": 1},
        "0-1": {"rowSpan": 2, "colSpan": 1},
        # # Bloque benefits
        "2-0": {"rowSpan": 2, "colSpan": 1},
        "2-1": {"rowSpan": 2, "colSpan": 1},
        # Bloque agency-logs
        "4-0": {"rowSpan": 2, "colSpan": 1},
        "4-1": {"rowSpan": 2, "colSpan": 1},
        # Bloque 2
        "6-0": {"rowSpan": 4, "colSpan": 1},
        "6-1": {"rowSpan": 4, "colSpan": 1},
        # Bloque 3
        "10-0": {"rowSpan": 34, "colSpan": 1},
        "10-1": {"rowSpan": 34, "colSpan": 1},
        # Bloque 4
        "44-0": {"rowSpan": 2, "colSpan": 1},
        "44-1": {"rowSpan": 2, "colSpan": 1},
        # Bloque 5
        "46-0": {"rowSpan": 2, "colSpan": 1},
        "46-1": {"rowSpan": 2, "colSpan": 1},
        # Bloque 6
        "48-0": {"rowSpan": 11, "colSpan": 1},
        "48-1": {"rowSpan": 11, "colSpan": 1},
        # Bloque 7
        "59-0": {"rowSpan": 16, "colSpan": 1},
        "59-1": {"rowSpan": 16, "colSpan": 1},
        # Bloque 8
        "73-0": {"rowSpan": 2, "colSpan": 1},
        "73-1": {"rowSpan": 2, "colSpan": 1}
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
        "name": "Template pais",
        "description": "Template para la landing page de Paises MCR",
        "proyecto": "mcr",
        "dominio": ".com",
        "categoria": "pais",
        "merged_cells": merged_cells,      
        "column_widths": column_widths,    
        "template_data": template_data,    
        "table_config": {                 
            "numRows": 75,
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
        print(f"\n Creando template Agencias")
        print(f" URL: {base_url}/templates/from-config")
        
        response = requests.post(
            f"{base_url}/templates/from-config",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            return result['id']
            
        elif response.status_code == 401:
            print("Error de autenticación: Token inválido o expirado")
            print("Asegúrate de colocar tu token en la variable 'token'")
            
        elif response.status_code == 422:
            print("Error de validación:")
            error_detail = response.json()
            print(json.dumps(error_detail, indent=2))
            
            # Imprimir más detalles del error
            if 'detail' in error_detail:
                print("\nDetalles del error:")
                if isinstance(error_detail['detail'], list):
                    for error in error_detail['detail']:
                        print(f"   - Campo: {error.get('loc', 'desconocido')}")
                        print(f"     Mensaje: {error.get('msg', 'sin mensaje')}")
                else:
                    print(f"   {error_detail['detail']}")
            
        else:
            print(f"Error {response.status_code}:")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("Error de conexión: ¿Está corriendo tu servidor?")
        
    except requests.exceptions.Timeout:
        print("Timeout: La request tardó demasiado")
        
    except Exception as e:
        print(f"Error inesperado: {str(e)}")

    return None

if __name__ == "__main__":
    print("Creador de Template Agencias")
    print("=" * 50)
    
    template_id = create_template()
    
    if template_id:
        print(f"\n¡Template creado exitosamente!")
        print(f"ID: {template_id}")
    else:
        print("\nNo se pudo crear el template")
        print("Verifica que hayas colocado tu token")