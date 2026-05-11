import requests
import json

def create_template():
    """Crear template para Ciudad"""
    
    # TOKEN - REEMPLAZA CON TU TOKEN
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnaXNlbGxoQHJlZGFjdG9yaWEuY29tIiwiaWQiOiJjN2MxNzgzOC0wNzRkLTQ0ZmEtOTI0OC04ZGM4N2MxNWVkZDUiLCJleHAiOjE3NjA2NjE5MDZ9.CsKgUFRBmfqFLgOOJXZAv-HZ33m0zPYdqg0wuqM0xgQ"
    
    # URL de tu API
    base_url = "http://192.168.1.129:8080"  
    
    # Template data - BLOQUE 1 Y BLOQUE 2
    template_text_data = {
        # Bloque 1
        "0-0": "quicksearch", 
        "0-1": "Bloque 1:", 
        "0-2": "H1", 
        "0-3": "Renta de Autos en Miami, FL",
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
        "6-3": "Ofertas en Alquiler de Autos en Miami, Florida",
        "7-2": "Descripción H2", 
        "8-2": "IP USA",
        "9-2": "IP BR",
        
        # Bloque 3
        "10-0": "reviews", 
        "10-1": "Bloque 3:",
        "10-2": "H2",
        "10-3": "Opiniones sobre alquiler de vehículos en Miami",
        "11-2": "descripcion H2",
        
        # Bloque 4
        "12-0": "rentcompanies", 
        "12-1": "Bloque 4:",
        "12-2": "H2",
        "12-3": "Agencias de renta de carros en Miami, Florida",
        "13-2": "Descripción H2",
        "14-2": "Disclaimer",
        "14-3": "*Precios basados en los resultados entre los últimos 12 - 24 meses. Los precios pueden variar de acuerdo a la temporada y disponibilidad.",
        "14-4": "*Prices based on data from the past 12-24 months. Prices may vary depending on the season and availability.",
        "14-5": "*Preços baseados em resultados dos últimos 12 a 24 meses. Os preços podem variar de acordo com a época e disponibilidade.",
        
        # Bloque 5
        "15-0": "questions",
        "15-1": "Bloque 5:",
        "15-2": "H2",
        "15-3": "Preguntas frecuentes sobre Alquiler de Autos en Miami",
        "16-2": "Descripción H2",
        "17-2": "h3",
        "17-3": "¿Cuánto cuesta rentar un auto en Miami, Florida?",
        "18-2": "Descripción H3",
        "19-2": "h3",
        "19-3": "¿Cuál es la agencia de alquiler de autos con los precios más baratos en Miami, FL?",
        "20-2": "Descripción H3",
        "21-2": "h3",
        "21-3": "¿Qué se necesita para alquilar un coche en Miami, FL?",
        "22-2": "Descripción H3",
        "23-2": "h3",
        "23-3": "¿Cuánto cuesta rentar un carro por una semana en Miami?",
        "24-2": "Descripción H3",
        "25-2": "h3",
        "25-3": "¿Cuánto cuesta alquilar un auto cerca al estadio Hard Rock Stadium?",
        "26-2": "Descripción H3",
        "27-2": "h3",
        "27-3": "¿Es posible alquilar un auto en Miami y entregarlo en otra ciudad?",
        "28-2": "Descripción H3",
        "29-2": "Diclaimer",
        "29-3": "*Precios basados en los resultados entre los últimos 12 - 24 meses. Los precios pueden variar de acuerdo a la temporada y disponibilidad.",
        "29-4": "*Prices based on data from the past 12-24 months. Prices may vary depending on the season and availability.",
        "29-5": "*Preços baseados em resultados dos últimos 12 a 24 meses. Os preços podem variar de acordo com a época e disponibilidade.",
    
        # Bloque 6
        "30-0": "advicestipocarrusel",
        "30-1": "Bloque 6:",
        "30-2": "H2",
        "30-3": "Consejos sobre alquiler de autos en Miami",
        "31-2": "Descripción H2",
        "32-2": "h3",
        "32-3": "Elige un comparador web de confianza",
        "33-2": "Descripción H3",
        "34-2": "h3",
        "34-3": "Reserva con anticipación",
        "35-2": "Descripción H3",
        "36-2": "h3",
        "36-3": "Suscríbete a nuestra plataforma",
        "37-2": "Descripción H3",
        "38-2": "h3",
        "38-3": "Sé muy cuidadoso con el estado del vehículo",
        "39-2": "Descripción H3",
        "40-2": "h3",
        "40-3": "Devuelve el auto a tiempo",
        "41-2": "Descripción H3",
        
        # Bloque 7
        "42-0": "fleetcarrusel", 
        "42-1": "Bloque 7:",
        "42-2": "H2",
        "42-3": "Flota de vehículos para rentar en Miami, FL",
        "43-2": "descripción H2",
        "44-2": "h3",
        "44-3": "Económico",
        "45-2": "Descripción H3",
        "46-2": "h3",
        "46-3": "Camionetas",
        "47-2": "Descripción H3",
        "48-2": "h3",
        "48-3": "Van",
        "49-2": "Descripción H3",
        "50-2": "h3",
        "50-3": "Convertibles",
        "51-2": "Descripción H3",
        "52-2": "h3",
        "52-3": "Lujo",
        "53-2": "Descripción H3",
        "54-2": "h3",
        "54-3": "Eléctricos",
        "55-2": "Descripción H3",
        
        # Bloque 8                          # Bloque dedicado a Ciudades Top
        "56-0": "locationscarrusel", 
        "56-1": "Bloque 8:",
        "56-2": "H2",
        "56-3": "Alquiler de autos en las localidades mas importantes de Miami",
        "57-2": "descripción H2",
        "58-2": "h3",
        "58-3": "Aeropuerto Internacional de Miami (MIA)",
        "59-2": "Descripción H3",
        "60-2": "h3",
        "60-3": "Aeropuerto Ejecutivo de Miami",
        "61-2": "Descripción H3",
        "62-2": "h3",
        "62-3": "Aeropuerto Opa Locka",
        "63-2": "Descripción H3",
        "64-2": "h3",
        "64-3": "Puerto de Miami",
        "65-2": "Descripción H3",
        "66-2": "h3",
        "66-3": "South Beach",
        "67-2": "Descripción H3",
        "68-2": "h3",
        "68-3": "Downtown Miami",
        "69-2": "Descripción H3",
        
        # Bloque 9
        "70-0": "locationscarrusel",  
        "70-1": "Bloque 9:",
        "70-2": "H2",
        "70-3": "Las mejores ciudades para rentar un auto en USA",
        "70-4": "Car rentals in other cities across the US",
        "70-5": "Alugue um carro em outras cidades dos EUA",
        "71-2": "Descripción H2",
        "72-2": "h3",
        "72-3": "Orlando",
        "72-4": "Orlando",
        "72-5": "Orlando",
        "73-2": "Descripción H3",
        "73-3": "Renta de autos baratos en Orlando",
        "73-4": "Cheap Car Rentals in Orlando",
        "73-5": "Aluguel de Carros baratos em Orlando",
        "74-2": "h3",
        "74-3": "CBX",
        "74-4": "CBX",
        "74-5": "CBX",
        "75-2": "Descripción H3",
        "75-3": "Alquiler de Vehículos baratos en CBX",
        "75-4": "Cheap Car Rentals in CBX",
        "75-5": "Locação de Veículos econômicos em CBX",
        "76-2": "h3",
        "76-3": "Las Vegas",
        "76-4": "Las Vegas",
        "76-5": "Las Vegas",
        "77-2": "Descripción H3",
        "77-3": "Alquiler de Vehículos baratos en Las Vegas",
        "77-4": "Cheap Car Rentals in Las Vegas",
        "77-5": "Aluguel de Carros baratos em Las Vegas",
        "78-2": "h3",
        "78-3": "New york",
        "78-4": "New york",
        "78-5": "Nova york",
        "79-2": "Descripción H3",
        "79-3": "Renta de Vehículos baratos en New york",
        "79-4": "Cheap Car Rentals in New york",
        "79-5": "Locação de Veículos econômicos em Nova York",
        "80-2": "h3",
        "80-3": "Los Angeles",
        "80-4": "Los Angeles",
        "80-5": "Los Angeles",
        "81-2": "Descripción H3",
        "81-3": "Alquiler de Vehículos baratos en Los Angeles",
        "81-4": "Cheap Car Rentals in Los Angeles",
        "81-5": "Aluguel de Carros baratos em Los Angeles",
        "82-2": "h3",
        "82-3": "Houston",
        "82-4": "Houston",
        "82-5": "Houston",
        "83-2": "Descripción H3",
        "83-3": "Renta de Carros baratos en Houston",
        "83-4": "Cheap Car Rentals in Houston",
        "83-5": "Locação de Veículos econômicos em Houston",
        "84-2": "h3",
        "84-3": "Chicago",
        "84-4": "Chicago",
        "84-5": "Chicago",
        "85-2": "Descripción H3",
        "85-3": "Alquiler de Vehículos baratos en Chicago",
        "85-4": "Cheap Car Rentals in Chicago",
        "85-5": "Aluguel de Carros baratos em Chicago",
        "86-2": "h3",
        "86-3": "Fort Lauderdale",
        "86-4": "Fort Lauderdale",
        "86-5": "Fort Lauderdale",
        "87-2": "Descripción H3",
        "87-3": "Renta de Autos baratos en Fort Lauderdale",
        "87-4": "Cheap Car Rentals in Fort Lauderdale",
        "87-5": "Locação de Veículos econômicos em Fort Lauderdale",
        "88-2": "h3",
        "88-3": "San Diego",
        "88-4": "San Diego",
        "88-5": "San Diego",
        "89-2": "Descripción H3",
        "89-3": "Alquiler de Vehículos baratos en San Diego",
        "89-4": "Cheap Car Rentals in San Diego",
        "89-5": "Aluguel de Carros baratos em San Diego",
        "90-2": "h3",
        "90-3": "Dallas",
        "90-4": "Dallas",
        "90-5": "Dallas",
        "91-2": "Descripción H3",
        "91-3": "Alquiler de Vehículos baratos en Dallas",
        "91-4": "Cheap Car Rentals in Dallas",
        "91-5": "Locação de Veículos econômicos em Dallas",
        "92-2": "h3",
        "92-3": "Phoenix",
        "92-4": "Phoenix",
        "92-5": "Phoenix",
        "93-2": "Descripción H3",
        "93-3": "Alquiler de Vehículos baratos en Phoenix ",
        "93-4": "Cheap Car Rentals in Phoenix",
        "93-5": "Aluguel de Carros baratos em Phoenix",
        "94-2": "h3",
        "94-3": "Tampa",
        "94-4": "Tampa",
        "94-5": "Tampa",
        "95-2": "Descripción H3",
        "95-3": "Alquiler de Vehículos baratos en Tampa",
        "95-4": "Cheap Car Rentals in Tampa",
        "95-5": "Locação de Veículos econômicos em Tampa",
        "96-2": "h3",
        "96-3": "San Francisco",
        "96-4": "San Francisco",
        "96-5": "San Francisco",
        "97-2": "Descripción H3",
        "97-3": "Alquiler de Vehículos baratos en San Francisco",
        "97-4": "Cheap Car Rentals in San Francisco",
        "97-5": "Aluguel de Carros baratos em San Francisco",
        "98-2": "h3",
        "98-3": "Atlanta",
        "98-4": "Atlanta",
        "98-5": "Atlanta",
        "99-2": "Descripción H3",
        "99-3": "Alquiler de Vehículos baratos en Atlanta",
        "99-4": "Cheap Car Rentals in Atlanta",
        "99-5": "Locação de Veículos econômicos em Atlanta",
        "100-2": "h3",
        "100-3": "Denver",
        "100-4": "Denver",
        "100-5": "Denver",
        "101-2": "Descripción H3",
        "101-3": "Alquiler de Vehículos baratos en Denver",
        "101-4": "Cheap Car Rentals in Denver",
        "101-5": "Aluguel de Carros baratos em Denver",
        "102-2": "h3",
        "102-3": "Austin",
        "102-4": "Austin",
        "102-5": "Austin",
        "103-2": "Descripción H3",
        "103-3": "Alquiler de Vehículos baratos en Austin",
        "103-4": "Cheap Car Rentals in Austin",
        "103-5": "Locação de Veículos econômicos em Austin",
        
        # Bloque 10
        "104-0": "rentacar",
        "104-1": "Bloque 10:",
        "104-2": "H2",
        "104-3": "Mejores lugares para visitar en Miami",
        "105-2": "Descripción H2",
        "106-2": "h3",
        "106-3": "Actividades gratis para hacer en Miami",
        "107-2": "Descripción H3",
        "108-2": "h3",
        "108-3": "¿Qué hacer en 3 días en Miami ?",
        "109-2": "Descripción H3",
        
        # Bloque 11
        "110-0": "text_end_landingpage",
        "111-1": "Bloque 11:",
        "111-2": "Disclaimer",
        "111-3": "*Estos precios son sujetos a cambios  y variarán dependiendo de la temporada del año, el tamaño del vehículo, los días de renta, la agencia de alquiler de carros, las coberturas que adquieras, entre otros servicios opcionales.",
        "111-4": "*These prices are subject to change and may vary depending on the season, the vehicle size, the rental duration, the car rental agency, the coverages you select, and other optional services.",
        "111-5": "*Estes preços estão sujeitos a alterações e variam em função da época do ano, do tamanho do veículo, dos dias de locação, da locadora, das coberturas adquiridas, entre outros serviços opcionais."
              
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
            "type": "reviews",
            "startRow": 10,
            "endRow": 11,
            "titleRow": 10,
            "descRow": 11,
            "contentMapping": {
                "desc_h2": "11-3"
            }
        },
        "4": {
            "name": "Bloque 4",
            "type": "rentcompanies",
            "startRow": 12,
            "endRow": 14,
            "titleRow": 12,
            "descRow": 13,
            "contentMapping": {
                "desc": "13-3",      
            }
        },
        "5": {
            "name": "Bloque 5",
            "type": "questions",
            "startRow": 15,
            "endRow": 29,
            "titleRow": 15,
            "descRow": 16,
            "contentMapping": {
                "desc": "16-3",    
                "desc_1": "18-3",         
                "desc_2": "20-3",         
                "desc_3": "22-3",         
                "desc_4": "24-3",         
                "desc_5": "26-3",         
                "desc_6": "28-3"         
            }
        },
        "6": {
            "name": "Bloque 6",
            "type": "advicestipocarrusel",
            "startRow": 30,
            "endRow": 41,
            "titleRow": 30,
            "descRow": 31,
            "contentMapping": {
                "desc": "31-3",    
                "desc_1": "33-3",         
                "desc_2": "35-3",         
                "desc_3": "37-3",         
                "desc_4": "39-3",         
                "desc_5": "41-3"
            }
        },
        "7": {
            "name": "Bloque 7",
            "type": "fleetcarrusel",
            "startRow": 42,
            "endRow": 55,
            "titleRow": 42,
            "descRow": 43,
            "contentMapping": {
                "desc": "43-3",    
                "desc_1": "45-3",         
                "desc_2": "47-3",         
                "desc_3": "49-3",         
                "desc_4": "51-3",         
                "desc_5": "53-3",         
                "desc_6": "55-3"     
            }
        },
        "8": {
            "name": "Bloque 8",
            "type": "locationscarrusel",
            "startRow": 56,
            "endRow": 69,
            "titleRow": 56,
            "descRow": 57,
            "contentMapping": {
                "desc": "57-3",    
                "desc_1": "59-3",         
                "desc_2": "61-3",         
                "desc_3": "63-3",         
                "desc_4": "65-3",         
                "desc_5": "67-3",         
                "desc_6": "69-3"     
            }
        },
        "9": {
            "name": "Bloque 9",
            "type": "locationscarrusel",
            "startRow": 70,
            "endRow": 104,
            "titleRow": 70,
            "descRow": 71,
            "contentMapping": {
                "desc": "71-3",    
                "desc_1": "73-3",         
                "desc_2": "75-3",         
                "desc_3": "77-3",         
                "desc_4": "79-3",         
                "desc_5": "81-3",         
                "desc_6": "83-3",
                "desc_7": "85-3",
                "desc_8": "87-3",
                "desc_9": "89-3",
                "desc_10": "91-3",
                "desc_11": "93-3",
                "desc_12": "95-3",
                "desc_13": "97-3",
                "desc_14": "99-3",
                "desc_15": "101-3",
                "desc_16": "103-3"
                   
            }
        },
        "10": {
            "name": "Bloque 10",
            "type": "rentacar",
            "startRow": 105,
            "endRow": 110,
            "titleRow": 105,
            "descRow": 106,
            "contentMapping": {
                "desc": "106-3",    
                "desc_1": "108-3",         
                "desc_2": "110-3"  
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
        "10-0": {"rowSpan": 2, "colSpan": 1},
        "10-1": {"rowSpan": 2, "colSpan": 1},
        # Bloque 4
        "12-0": {"rowSpan": 3, "colSpan": 1},
        "12-1": {"rowSpan": 3, "colSpan": 1},
        # Bloque 5
        "15-0": {"rowSpan": 15, "colSpan": 1},
        "15-1": {"rowSpan": 15, "colSpan": 1},
        # Bloque 6
        "30-0": {"rowSpan": 12, "colSpan": 1},
        "30-1": {"rowSpan": 12, "colSpan": 1},
        # Bloque 7
        "42-0": {"rowSpan": 14, "colSpan": 1},
        "42-1": {"rowSpan": 14, "colSpan": 1},
        # Bloque 8
        "56-0": {"rowSpan": 14, "colSpan": 1},
        "56-1": {"rowSpan": 14, "colSpan": 1},
        # Bloque 9
        "70-0": {"rowSpan": 34, "colSpan": 1},
        "70-1": {"rowSpan": 34, "colSpan": 1},
        # Bloque 10
        "104-0": {"rowSpan": 6, "colSpan": 1},
        "104-1": {"rowSpan": 6, "colSpan": 1},
        # Bloque 11
        "110-0": {"rowSpan": 2, "colSpan": 1},
        "111-1": {"rowSpan": 1, "colSpan": 1},
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
        "name": "Template Ciudad con locationscarrusel",
        "description": "Template para la landing page de Ciudades MCR",
        "proyecto": "mcr",
        "dominio": ".com",
        "categoria": "ciudad",
        "merged_cells": merged_cells,      
        "column_widths": column_widths,    
        "template_data": template_data,    
        "table_config": {                 
            "numRows": 112,
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