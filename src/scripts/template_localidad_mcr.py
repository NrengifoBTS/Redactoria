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
        "0-3": "Renta de Autos en el Aeropuerto de Orlando, (MCO)",
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
        "6-3": "Alquiler de Autos en el Aeropuerto de Orlando",
        "7-2": "Descripción H2", 
        "8-2": "IP USA",
        "9-2": "IP BR",
        
        # Bloque 3
        "10-0": "reviews", 
        "10-1": "Bloque 3:",
        "10-2": "H2",
        "10-3": "Agencias de renta de carros en el Aeropuerto de Orlando, Florida",
        "11-2": "descripcion H2",
        # disclaimer
        "12-2": "Disclaimer",
        "12-3": "*Precios basados en los resultados entre los últimos 12 - 24 meses. Los precios pueden variar de acuerdo a la temporada y disponibilidad.",
        "12-4": "*Prices are based on results from the past 12 - 24 months. Prices may vary according to season and availability.",
        "12-5": "*Preços baseados em resultados dos últimos 12 a 24 meses. Os valores podem variar de acordo com a época e disponibilidade.",
        
        # Bloque 4
        "13-0": "rentcompanies", 
        "13-1": "Bloque 4:",
        "13-2": "H2",
        "13-3": "Opiniones sobre alquiler de vehículos en el Aeropuerto de Orlando, (MCO)",
        "14-2": "Descripción H2",
        
        # Bloque 5
        "15-0": "questions",
        "15-1": "Bloque 5:",
        "15-2": "H2",
        "15-3": "Preguntas frecuentes sobre alquiler de carros en el Aeropuerto de Orlando, (MCO)",
        "16-2": "Descripción H2",
        "17-2": "h3",
        "17-3": "¿Cuánto cuesta rentar un auto en el Aeropuerto de Orlando?",
        "18-2": "Descripción H3",
        "19-2": "h3",
        "19-3": "¿Qué se necesita para alquilar un auto en el Orlando International Airport (MCO)?",
        "20-2": "Descripción H3",
        "21-2": "h3",
        "21-3": "¿Cuál es la agencia de alquiler de autos con los precios más baratos en el Aeropuerto de Orlando, Florida?",
        "22-2": "Descripción H3",
        "23-2": "h3",
        "23-3": "¿Es posible retirar el auto alquilado en Orlando Airport y devolverlo en otra localidad?",
        "24-2": "Descripción H3",
        "25-2": "h3",
        "25-3": "",
        "26-2": "Descripción H3",
        "27-2": "h3",
        "27-3": "",
        "28-2": "Descripción H3",
        "29-2": "Diclaimer",
        "29-3": "*Precios basados en los resultados entre los últimos 12 - 24 meses. Los precios pueden variar de acuerdo a la temporada y disponibilidad.",
        "29-4": "*Prices based on data from the past 12-24 months. Prices may vary depending on the season and availability.",
        "29-5": "*Preços baseados em resultados dos últimos 12 a 24 meses. Os preços podem variar de acordo com a época e disponibilidade.",
    
        # Bloque 6
        "30-0": "locationscarrusel", 
        "30-1": "Bloque 6:",
        "30-2": "H2",
        "30-3": "Renta de autos en localidades cerca al Aeropuerto de Orlando, Florida ",
        "31-2": "descripción H2",
        "32-2": "h3",
        "32-3": "Downtown Orlando",
        "33-2": "Descripción H3",
        "34-2": "h3",
        "34-3": "Puerto Cañaveral",
        "35-2": "Descripción H3",
        "36-2": "h3",
        "36-3": "Universal Studios",
        "37-2": "Descripción H3",
        "38-2": "h3",
        "38-3": "Disney",
        "39-2": "Descripción H3",
        "40-2": "h3",
        "40-3": "Kissimmee",
        "41-2": "Descripción H3",
        
        # Bloque 7
        "42-0": "rentacar",
        "42-1": "Bloque 7:",
        "42-2": "H2",
        "42-3": "Actividades recomendadas cerca del Aeropuerto de Orlando",
        "43-2": "Descripción H2",
        "44-2": "h3",
        "44-3": "Visita los parques naturales de Orlando",
        "45-2": "Descripción H3",
        "46-2": "h3",
        "46-3": "Actividades familiares para hacer en Orlando",
        "47-2": "Descripción H3",
        
        # Bloque 8
        "48-0": "text_end_landingpage",
        "49-1": "Bloque 8:",
        "4-2": "Disclaimer",
        "49-3": "*Estos precios son sujetos a cambios  y variarán dependiendo de la temporada del año, el tamaño del vehículo, los días de renta, la agencia de alquiler de carros, las coberturas que adquieras, entre otros servicios opcionales.",
        "49-4": "*These prices are subject to change and may vary depending on the season, the vehicle size, the rental duration, the car rental agency, the coverages you select, and other optional services.",
        "49-5": "*Estes preços estão sujeitos a alterações e variam em função da época do ano, do tamanho do veículo, dos dias de locação, da locadora, das coberturas adquiridas, entre outros serviços opcionais."
              
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
            "endRow": 12,
            "titleRow": 10,
            "descRow": 11,
            "contentMapping": {
                "desc_h2": "11-3"
            }
        },
        "4": {
            "name": "Bloque 4",
            "type": "rentcompanies",
            "startRow": 13,
            "endRow": 14,
            "titleRow": 13,
            "descRow": 14,
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
            "type": "locationscarrusel",
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
            "type": "rentacar",
            "startRow": 42,
            "endRow": 47,
            "titleRow": 42,
            "descRow": 43,
            "contentMapping": {
                "desc": "43-3",    
                "desc_1": "45-3",         
                "desc_2": "47-3"  
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
        "10-0": {"rowSpan": 3, "colSpan": 1},
        "10-1": {"rowSpan": 3, "colSpan": 1},
        # Bloque 4
        "13-0": {"rowSpan": 2, "colSpan": 1},
        "13-1": {"rowSpan": 2, "colSpan": 1},
        # Bloque 5
        "15-0": {"rowSpan": 15, "colSpan": 1},
        "15-1": {"rowSpan": 15, "colSpan": 1},
        # Bloque 6  
        "30-0": {"rowSpan": 12, "colSpan": 1},
        "30-1": {"rowSpan": 12, "colSpan": 1},
        # Bloque 7
        "42-0": {"rowSpan": 6, "colSpan": 1},
        "42-1": {"rowSpan": 6, "colSpan": 1},
        # Bloque 8  
        "48-0": {"rowSpan": 4, "colSpan": 1},
        "49-1": {"rowSpan": 4, "colSpan": 1}
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
        "name": "Template localidad",
        "description": "Template para la landing page de Localidad MCR",
        "proyecto": "mcr",
        "dominio": ".com",
        "categoria": "localidad",
        "merged_cells": merged_cells,      
        "column_widths": column_widths,    
        "template_data": template_data,    
        "table_config": {                 
            "numRows": 70,
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