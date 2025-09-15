import requests
import json

def create_template():
    """Crear template para Ciudad"""
    
    # TOKEN - REEMPLAZA CON TU TOKEN
    token = ""
    
    # URL de tu API
    base_url = "http://192.168.1.11:8000"  
    
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
        "8-2": "Texto alt", 
        "9-2": "IP USA",
        "10-2": "Texto alt", 
        "11-2": "IP BR",
        
        # Bloque 3
        "12-0": "reviews", 
        "12-1": "Bloque 3:",
        "12-2": "H2",
        "12-3": "Opiniones sobre alquiler de vehículos en Miami",
        "13-2": "descripcion H2",
        
        # Bloque 4
        "14-0": "rentcompanies", 
        "14-1": "Bloque 4:",
        "14-2": "H2",
        "14-3": "Agencias de renta de carros en Miami, Florida",
        "15-2": "Descripción H2",
        "16-2": "Disclaimer",
        "16-3": "*Precios basados en los resultados entre los últimos 12 - 24 meses. Los precios pueden variar de acuerdo a la temporada y disponibilidad.",
        "16-4": "*Prices based on data from the past 12-24 months. Prices may vary depending on the season and availability.",
        "16-5": "*Preços baseados em resultados dos últimos 12 a 24 meses. Os preços podem variar de acordo com a época e disponibilidade.",
        
        # Bloque 5
        "17-0": "questions",
        "17-1": "Bloque 5:",
        "17-2": "H2",
        "17-3": "Preguntas frecuentes sobre Alquiler de Autos en Miami",
        "18-2": "Descripción H2",
        "19-2": "h3",
        "19-3": "¿Cuánto cuesta rentar un auto en Miami, Florida?",
        "20-2": "Descripción H3",
        "21-2": "h3",
        "21-3": "¿Cuál es la agencia de alquiler de autos con los precios más baratos en Miami, FL?",
        "22-2": "Descripción H3",
        "23-2": "h3",
        "23-3": "¿Qué se necesita para alquilar un coche en Miami, FL?",
        "24-2": "Descripción H3",
        "25-2": "h3",
        "25-3": "¿Cuánto cuesta rentar un carro por una semana en Miami?",
        "26-2": "Descripción H3",
        "27-2": "h3",
        "27-3": "¿Cuánto cuesta alquilar un auto cerca al estadio Hard Rock Stadium?",
        "28-2": "Descripción H3",
        "29-2": "h3",
        "29-3": "¿Es posible alquilar un auto en Miami y entregarlo en otra ciudad?",
        "30-2": "Descripción H3",
        "31-2": "Diclaimer",
        "31-3": "*Precios basados en los resultados entre los últimos 12 - 24 meses. Los precios pueden variar de acuerdo a la temporada y disponibilidad.",
        "31-4": "*Prices based on data from the past 12-24 months. Prices may vary depending on the season and availability.",
        "31-5": "*Preços baseados em resultados dos últimos 12 a 24 meses. Os preços podem variar de acordo com a época e disponibilidade.",
    
        # Bloque 6
        "32-0": "advicestipocarrusel",
        "32-1": "Bloque 6:",
        "32-2": "H2",
        "32-3": "Consejos sobre alquiler de autos en Miami",
        "33-2": "Descripción H2",
        "34-2": "h3",
        "35-2": "Descripción H3",
        "36-2": "h3",
        "37-2": "Descripción H3",
        "38-2": "h3",
        "39-2": "Descripción H3",
        "40-2": "h3",
        "41-2": "Descripción H3",
        "42-2": "h3",
        "43-2": "Descripción H3",
        
        # Bloque 7
        "44-0": "fleetcarrusel", 
        "44-1": "Bloque 7:",
        "44-2": "H2",
        "44-3": "Flota de vehículos para rentar en Miami, FL",
        "45-2": "descripción H2",
        "46-2": "h3",
        "46-3": "Carros Económicos",
        "47-2": "Descripción H3",
        "48-2": "h3",
        "48-3": "Camionetas",
        "49-2": "Descripción H3",
        "50-2": "h3",
        "50-3": "Vans",
        "51-2": "Descripción H3",
        "52-2": "h3",
        "52-3": "Convertibles",
        "53-2": "Descripción H3",
        "54-2": "h3",
        "54-3": "Carros de Lujo",
        "55-2": "Descripción H3",
        "56-2": "h3",
        "56-3": "Autos Eléctricos",
        "57-2": "Descripción H3",
        
        # Bloque 8                          # Bloque dedicado a Ciudades Top
        "58-0": "locationscarrusel", 
        "58-1": "Bloque 7:",
        "58-2": "H2",
        "59-2": "descripción H2",
        "60-2": "h3",
        "61-2": "Descripción H3",
        "62-2": "h3",
        "63-2": "Descripción H3",
        "64-2": "h3",
        "65-2": "Descripción H3",
        "66-2": "h3",
        "67-2": "Descripción H3",
        "68-2": "h3",
        "69-2": "Descripción H3",
        "70-2": "h3",
        "71-2": "Descripción H3",
        
        # Bloque 9
        "72-0": "locationcarrusel",  
        "72-1": "Bloque 8:",
        "72-2": "H2",
        "72-3": "Las mejores ciudades para rentar un auto en USA",
        "73-2": "Descripción H2",
        "74-2": "h3",
        "74-3": "Orlando",
        "75-2": "Descripción H3",
        "75-3": "Renta de autos baratos en Orlando",
        "76-2": "h3",
        "76-3": "CBX",
        "77-2": "Descripción H3",
        "77-3": "Alquiler de Vehículos baratos en CBX",
        "78-2": "h3",
        "78-3": "Las Vegas",
        "79-2": "Descripción H3",
        "79-3": "Alquiler de Vehículos baratos en Las Vegas",
        "80-2": "h3",
        "80-3": "New york",
        "81-2": "Descripción H3",
        "81-3": "Renta de Vehículos baratos en New york",
        "82-2": "h3",
        "82-3": "Los Angeles",
        "83-2": "Descripción H3",
        "83-3": "Alquiler de Vehículos baratos en Los Angeles",
        "84-2": "h3",
        "84-3": "Houston",
        "85-2": "Descripción H3",
        "85-3": "Renta de Carros baratos en Houston",
        "86-2": "h3",
        "86-3": "Chicago",
        "87-2": "Descripción H3",
        "87-3": "Alquiler de Vehículos baratos en Chicago",
        "88-2": "h3",
        "88-3": "Fort Lauderdale",
        "89-2": "Descripción H3",
        "89-3": "Renta de Autos baratos en Fort Lauderdale",
        "90-2": "h3",
        "90-3": "San Diego",
        "91-2": "Descripción H3",
        "91-3": "Alquiler de Vehículos baratos en San Diego",
        "92-2": "h3",
        "92-3": "Dallas",
        "93-2": "Descripción H3",
        "93-3": "Alquiler de Vehículos baratos en Dallas",
        "94-2": "h3",
        "94-3": "Phoenix",
        "95-2": "Descripción H3",
        "95-3": "Alquiler de Vehículos baratos en Phoenix ",
        "96-2": "h3",
        "96-3": "Tampa",
        "97-2": "Descripción H3",
        "97-3": "Alquiler de Vehículos baratos en Tampa",
        "98-2": "h3",
        "98-3": "San Francisco",
        "99-2": "Descripción H3",
        "99-3": "Alquiler de Vehículos baratos en San Francisco",
        "100-2": "h3",
        "100-3": "Atlanta",
        "101-2": "Descripción H3",
        "101-3": "Alquiler de Vehículos baratos en Atlanta",
        "102-2": "h3",
        "102-3": "Denver",
        "103-2": "Descripción H3",
        "103-3": "Alquiler de Vehículos baratos en Denver",
        "104-2": "h3",
        "104-3": "Austin",
        "105-2": "Descripción H3",
        "105-3": "Alquiler de Vehículos baratos en Austin",
        
        # Bloque 10
        "106-0": "rentacar",
        "106-1": "Bloque 9:",
        "106-2": "H2",
        "106-3": "Mejores lugares para visitar en Miami",
        "107-2": "Descripción H2",
        "108-2": "h3",
        "108-3": "Actividades gratis para hacer en Miami",
        "109-2": "Descripción H3",
        "110-2": "h3",
        "110-3": "¿Qué hacer en 3 días en Miami ?",
        "111-2": "Descripción H3",
        
        # Bloque 11
        "112-0": "text_end_landingpage",
        "113-1": "Bloque 10:",
        "113-2": "Disclaimer",
        "113-3": "*Estos precios son sujetos a cambios  y variarán dependiendo de la temporada del año, el tamaño del vehículo, los días de renta, la agencia de alquiler de carros, las coberturas que adquieras, entre otros servicios opcionales.",
        "113-4": "*These prices are subject to change and may vary depending on the season, the vehicle size, the rental duration, the car rental agency, the coverages you select, and other optional services.",
        "113-5": "*Estes preços estão sujeitos a alterações e variam em função da época do ano, do tamanho do veículo, dos dias de locação, da locadora, das coberturas adquiridas, entre outros serviços opcionais."
              
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
            "endRow": 11,
            "titleRow": 6,
            "descRow": 7,
            "contentMapping": {
                "desc": "7-3",
                "ip_usa": "9-3",
                "ip_bra": "11-3"
            }
        },
        "3": {
            "name": "Bloque 3",
            "type": "reviews",
            "startRow": 12,
            "endRow": 13,
            "titleRow": 12,
            "descRow": 13,
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
            "type": "car_rental",
            "startRow": 27,
            "endRow": 40,
            "titleRow": 27,
            "descRow": 28,
            "contentMapping": {
                "desc": "28-3",    
                "desc_1": "30-3",         
                "desc_2": "32-3",         
                "desc_3": "34-3",         
                "desc_4": "36-3",         
                "desc_5": "38-3",         
                "desc_6": "40-3"         
            }
        },
        "6": {
            "name": "Bloque 6",
            "type": "fav_city",
            "startRow": 41,
            "endRow": 75,
            "titleRow": 61,
            "descRow": 42,
            "contentMapping": {
                "desc": "42-3",    
                "desc_1": "44-3",         
                "desc_2": "46-3",         
                "desc_3": "48-3",         
                "desc_4": "50-3",         
                "desc_5": "52-3",         
                "desc_6": "54-3",         
                "desc_7": "56-3",         
                "desc_8": "58-3",         
                "desc_9": "60-3",         
                "desc_10": "62-3",       
                "desc_11": "64-3",        
                "desc_12": "66-3",        
                "desc_13": "68-3",       
                "desc_14": "70-3",        
                "desc_15": "72-3",        
                "desc_16": "74-3"        
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
        "27-0": {"rowSpan": 14, "colSpan": 1},
        "27-1": {"rowSpan": 14, "colSpan": 1},
        # Bloque 6
        "41-0": {"rowSpan": 35, "colSpan": 1},
        "41-1": {"rowSpan": 34, "colSpan": 1},
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
        "name": "Template Ciudad",
        "description": "Template para la landing page de Ciudades MCR",
        "proyecto": "mcr",
        "dominio": ".com",
        "categoria": "ciudad",
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
        print(f"\n🚀 Creando template Agencias")
        print(f"📡 URL: {base_url}/templates/from-config")
        
        response = requests.post(
            f"{base_url}/templates/from-config",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            return result['id']
            
        elif response.status_code == 401:
            print("❌ Error de autenticación: Token inválido o expirado")
            print("⚠️  Asegúrate de colocar tu token en la variable 'token'")
            
        elif response.status_code == 422:
            print("❌ Error de validación:")
            error_detail = response.json()
            print(json.dumps(error_detail, indent=2))
            
            # Imprimir más detalles del error
            if 'detail' in error_detail:
                print("\n📌 Detalles del error:")
                if isinstance(error_detail['detail'], list):
                    for error in error_detail['detail']:
                        print(f"   - Campo: {error.get('loc', 'desconocido')}")
                        print(f"     Mensaje: {error.get('msg', 'sin mensaje')}")
                else:
                    print(f"   {error_detail['detail']}")
            
        else:
            print(f"❌ Error {response.status_code}:")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ Error de conexión: ¿Está corriendo tu servidor?")
        
    except requests.exceptions.Timeout:
        print("❌ Timeout: La request tardó demasiado")
        
    except Exception as e:
        print(f"❌ Error inesperado: {str(e)}")

    return None

if __name__ == "__main__":
    print("🎯 Creador de Template Agencias")
    print("=" * 50)
    
    template_id = create_template()
    
    if template_id:
        print(f"\n🎉 ¡Template creado exitosamente!")
        print(f"🆔 ID: {template_id}")
    else:
        print("\n❌ No se pudo crear el template")
        print("⚠️  Verifica que hayas colocado tu token")