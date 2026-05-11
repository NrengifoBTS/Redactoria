import requests
import json

def create_template():
    """Crear template para Ciudad"""
    
    # TOKEN - REEMPLAZA CON TU TOKEN
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnaXNlbGxoQHJlZGFjdG9yaWEuY29tIiwiaWQiOiJjN2MxNzgzOC0wNzRkLTQ0ZmEtOTI0OC04ZGM4N2MxNWVkZDUiLCJleHAiOjE3NjkxMTE0NTl9.aC_D_IQfXxNHY-2pR-6l7l-ph00cIb55exS3Nu8qn6o"
    
    # URL de tu API
    base_url = "http://192.168.1.129:8080"  
    
    # Template data - BLOQUE 1 Y BLOQUE 2
    template_text_data = {
        # Bloque 1
        "0-0": "quicksearch", 
        "0-1": "Bloque 1:", 
        "0-2": "H1", 
        "0-3": "Alquiler de autos Avis",
        "1-2": "Descripción H1",
        
        # Bloque benefits
        "2-0": "benefits",
        "3-0": " ",
        # Bloque agency-logs
        "4-0": "agency_logs",
        "5-0": " ",
        
        # Bloque 2
        "6-0": "fleet", 
        "6-1": "Bloque 2:", 
        "6-2": "H2", 
        "6-3": "Flota de autos baratos Avis",
        "7-2": "Descripción H2", 
        "8-2": "IP USA",
        "9-2": "IP BR",
        
        # Bloque 3
        "10-0": "questions",
        "10-1": "Bloque 3:",
        "10-2": "H2",
        "10-3": "Preguntas frecuentes sobre renta de autos Avis",
        "11-2": "Descripción H2",
        "12-2": "h3",
        "12-3": "¿Cuánto cuesta alquilar un auto en Avis?",
        "13-2": "Descripción H3",
        "14-2": "h3",
        "14-3": "¿Se puede rentar un auto Avis por horas?",
        "15-2": "Descripción H3",
        "16-2": "h3",
        "16-3": "¿Cuál es el carro más barato para alquilar con Avis?",
        "17-2": "Descripción H3",
        "18-2": "h3",
        "18-3": "¿Por qué elegir Avis?",
        "19-2": "Descripción H3",
        "20-2": "h3",
        "20-3": "",
        "21-2": "Descripción H3",
        "22-2": "Diclaimer",
        "22-3": "*Precios basados en los resultados entre los últimos 12 - 24 meses. Los precios pueden variar de acuerdo a la temporada y disponibilidad.",
        "22-4": "*Prices based on data from the past 12-24 months. Prices may vary depending on the season and availability.",
        "22-5": "*Preços baseados em resultados dos últimos 12 a 24 meses. Os preços podem variar de acordo com a época e disponibilidade.",
        
        # Bloque 4
        "23-0": "fleetcarrusel", 
        "23-1": "Bloque 4:",
        "23-2": "H2",
        "23-3": "Tipos de autos de alquiler en Avis",
        "24-2": "descripción H2",
        "25-2": "h3",
        "25-3": "Económico",
        "26-2": "Descripción H3",
        "27-2": "h3",
        "27-3": "Camionetas",
        "28-2": "Descripción H3",
        "29-2": "h3",
        "29-3": "Van",
        "30-2": "Descripción H3",
        "31-2": "h3",
        "31-3": "Convertibles",
        "32-2": "Descripción H3",
        "33-2": "h3",
        "33-3": "Lujo",
        "34-2": "Descripción H3",
        "35-2": "h3",
        "35-3": "Eléctricos",
        "36-2": "Descripción H3",
        "37-2": "h3",
        "37-3": "Alquiler de Autos de Hibridos",
        "38-2": "Descripción H3",

        # Bloque 5
        "39-0": "locationscarrusel",  
        "39-1": "Bloque 5:",
        "39-2": "H2",
        "39-3": "Renta de autos Avis alrededor del mundo",
        "39-4": "Avis car rentals around the world",
        "39-5": "Aluguel de carros Avis em todo o mundo",
        "40-2": "Descripción H2",
        "41-2": "h3",
        "41-3": "Alquiler de Autos en EE.UU.",
        "41-4": "Car Rentals in the U.S.",
        "41-5": "Aluguel de Carros nos EUA",
        "42-2": "Descripción H3",
        "43-2": "h3",
        "43-3": "Renta de Autos en México",
        "43-4": "Car Rentals in Mexico",
        "43-5": "Locação de Veículos no México",
        "44-2": "Descripción H3",
        "45-2": "h3",
        "45-3": "Alquiler de Autos en Brasil",
        "45-4": "Car Rentals in Brazil",
        "45-5": "Locação de Carros no Brasil",
        "46-2": "Descripción H3",
        "47-2": "h3",
        "47-3": "Alquile de Carros en Colombia",
        "47-4": "Car Rentals in Colombia",
        "47-5": "Aluguel de Veículos na Colômbia",
        "48-2": "Descripción H3",
        "49-2": "h3",
        "49-3": "Renta de autos en Rep. Dominicana",
        "49-4": "Car Rentals in the Dominican Republic",
        "49-5": "Locação de Carros na República Dominicana",
        "50-2": "Descripción H3",
        "51-2": "h3",
        "51-3": "Renta de Autos en Argentina",
        "51-4": "Car Rentals in Argentina",
        "51-5": "Aluguel de Veículos na Argentina",
        "52-2": "Descripción H3",
        "53-2": "h3",
        "53-3": "Alquile de Autos en Costa Rica",
        "53-4": "Car Rentals in Costa Rica",
        "53-5": "Locação de Carros na Costa Rica",
        "54-2": "Descripción H3",
        "55-2": "h3",
        "55-3": "Renta de Autos en Panamá",
        "55-4": "Car Rentals in Panama",
        "55-5": "Aluguel de Carros no Panamá",
        "56-2": "Descripción H3",
        "57-2": "h3",
        "57-3": "Alquiler de Autos en Reino Unido",
        "57-4": "Car Rentals in the United Kingdom",
        "57-5": "Locação de Veículos no Reino Unido",
        "58-2": "Descripción H3",
        "59-2": "h3",
        "59-3": "Alquiler de Coches en España",
        "59-4": "Car Rentals in Spain",
        "59-5": "Aluguel de Carros na Espanha",
        "60-2": "Descripción H3",
        "61-2": "h3",
        "61-3": "Renta de Autos en Portugal",
        "61-4": "Car Rentals in Portugal",
        "61-5": "Locação de Veículos em Portugal",
        "62-2": "Descripción H3",
        "63-2": "h3",
        "63-3": "",
        "64-2": "descripción H3",
        "65-2": "h3",
        "65-3": "",
        "66-2": "Descripción H3",
        "67-2": "h3",
        "67-3": "",
        "68-2": "Descripción H3",
        "69-2": "h3",
        "69-3": "",
        "70-2": "Descripción H3",
        "71-2": "h3",
        "71-3": "",
        "72-2": "Descripción H3",
        
        # Bloque 6
        "73-0": "rentacar",
        "73-1": "Bloque 6:",
        "73-2": "H2",
        "73-3": "Mejores lugares para visitar en Miami",
        "74-2": "Descripción H2",
        "75-2": "h3",
        "75-3": "Actividades gratis para hacer en Miami",
        "76-2": "Descripción H3",
        "77-2": "h3",
        "77-3": "¿Qué hacer en 3 días en Miami ?",
        "78-2": "Descripción H3",

        # Bloque 7
        "79-0": "rentcompanies", 
        "79-1": "Bloque 7:",
        "79-2": "H2",
        "79-3": "Agencias de renta de carros en Miami, Florida",
        "80-2": "Descripción H2",
        "81-2": "Disclaimer",
        "81-3": "*Precios basados en los resultados entre los últimos 12 - 24 meses. Los precios pueden variar de acuerdo a la temporada y disponibilidad.",
        "81-4": "*Prices based on data from the past 12-24 months. Prices may vary depending on the season and availability.",
        "81-5": "*Preços baseados em resultados dos últimos 12 a 24 meses. Os preços podem variar de acordo com a época e disponibilidade.",
        
        # Bloque 8
        "82-0": "text_end_landingpage",
        "83-1": "Bloque 8:",
        "83-2": "Disclaimer",
        "83-3": "*Estos precios son sujetos a cambios  y variarán dependiendo de la temporada del año, el tamaño del vehículo, los días de renta, la agencia de alquiler de carros, las coberturas que adquieras, entre otros servicios opcionales.",
        "83-4": "*These prices are subject to change and may vary depending on the season, the vehicle size, the rental duration, the car rental agency, the coverages you select, and other optional services.",
        "83-5": "*Estes preços estão sujeitos a alterações e variam em função da época do ano, do tamanho do veículo, dos dias de locação, da locadora, das coberturas adquiridas, entre outros serviços opcionais."      
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
            "type": "questions",
            "startRow": 10,
            "endRow": 22,
            "titleRow": 10,
            "descRow": 11,
            "contentMapping": {
                "desc": "11-3",    
                "desc_1": "13-3",         
                "desc_2": "15-3",         
                "desc_3": "17-3",         
                "desc_4": "19-3",         
                "desc_5": "21-3",       
            }
        },
        "4": {
            "name": "Bloque 4",
            "type": "fleetcarrusel",
            "startRow": 23    ,
            "endRow": 38,
            "titleRow": 23,
            "descRow": 24,
            "contentMapping": {
                "desc": "24-3",    
                "desc_1": "26-3",         
                "desc_2": "28-3",         
                "desc_3": "30-3",         
                "desc_4": "32-3",         
                "desc_5": "34-3",
                "desc_6": "36-3"
            }
        },
        "5": {
            "name": "Bloque 5",
            "type": "locationscarrusel",
            "startRow": 39,
            "endRow": 72,
            "titleRow": 39,
            "descRow": 40,
            "contentMapping": {
                "desc": "40-3",    
                "desc_1": "42-3",         
                "desc_2": "44-3",         
                "desc_3": "46-3",         
                "desc_4": "48-3",         
                "desc_5": "50-3",         
                "desc_6": "52-3",
                "desc_7": "54-3",
                "desc_8": "56-3",
                "desc_9": "58-3",
                "desc_10": "60-3",
                "desc_11": "62-3",
                "desc_12": "64-3",
                "desc_13": "66-3",
                "desc_14": "68-3",
                "desc_15": "70-3",
                "desc_16": "72-3"
            }
        },
        "6": {
            "name": "Bloque 6",
            "type": "rentacar",
            "startRow": 73,
            "endRow": 78,
            "titleRow": 73,
            "descRow": 74,
            "contentMapping": {
                "desc": "74-3",    
                "desc_1": "76-3",         
                "desc_2": "78-3"  
            }
        },
        "7": {
            "name": "Bloque 7",
            "type": "rentcompanies",
            "startRow": 79,
            "endRow": 81,
            "titleRow": 79,
            "descRow": 80,
            "contentMapping": {
                "desc": "80-3",      
            }
        },
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
        "10-0": {"rowSpan": 13, "colSpan": 1},
        "10-1": {"rowSpan": 13, "colSpan": 1},
        # Bloque 4
        "23-0": {"rowSpan": 16, "colSpan": 1},
        "23-1": {"rowSpan": 16, "colSpan": 1},
        # Bloque 5
        "39-0": {"rowSpan": 34, "colSpan": 1},
        "39-1": {"rowSpan": 34, "colSpan": 1},
        # Bloque 6
        "73-0": {"rowSpan": 6, "colSpan": 1},
        "73-1": {"rowSpan": 6, "colSpan": 1},
        # Bloque 7
        "79-0": {"rowSpan": 3, "colSpan": 1},
        "79-1": {"rowSpan": 3, "colSpan": 1},
        # Bloque 8
        "82-0": {"rowSpan": 2, "colSpan": 1},
        "83-1": {"rowSpan": 1, "colSpan": 1}
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
        "name": "Template agencias",
        "description": "Template para la landing page de Agencias MCR",
        "proyecto": "mcr",
        "dominio": ".com",
        "categoria": "agencia",
        "merged_cells": merged_cells,      
        "column_widths": column_widths,    
        "template_data": template_data,    
        "table_config": {                 
            "numRows": 90,
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