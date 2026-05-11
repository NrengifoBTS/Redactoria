import requests
import json
import os
import importlib
import pkgutil

from src.database.core import SessionLocal
from src.entities.template import Template
from src.entities.user import User


def _load_all_entities():
    """Importa todos los módulos de src.entities para resolver relaciones ORM."""
    import src.entities as entities_pkg

    for module in pkgutil.iter_modules(entities_pkg.__path__):
        if not module.name.startswith("__"):
            importlib.import_module(f"src.entities.{module.name}")


def build_payload():
    """Construye el payload completo del template de ofertas."""

    # URL de tu API
    base_url = os.getenv("REDACTORIA_API_URL", "http://192.168.1.129:8080").strip()
    
    # Template data - Template Ofertas MCR
    template_text_data = {
        # Bloque 1
        "0-0": "quicksearch", 
        "0-1": "Bloque 1:", 
        "0-2": "H1", 
        "0-3": "Oferta de Autos en Estados Unidos",
        "1-2": "Descripción H1",
        
        # Bloque benefits
        "2-0": "benefits",
        "3-0": "",
        # Bloque agency-logs
        "4-0": "agency_logs",
        "5-0": "",
        
        # Bloque 2 — deals (H2 + DescH2 + IP USA + IP BRA + 7×H3/DescH3)
        "6-0": "deals", 
        "6-1": "Bloque 2:", 
        "6-2": "H2", 
        "6-3": "Ofertas en Renta de Autos en EE.UU",
        "7-2": "Descripción H2", 
        "8-2": "IP USA",
        "9-2": "IP BRA",
        "10-2": "h3",
        "11-2": "Descripción H3",
        "12-2": "h3",
        "13-2": "Descripción H3",
        "14-2": "h3",
        "15-2": "Descripción H3",
        "16-2": "h3",
        "17-2": "Descripción H3",
        "18-2": "h3",
        "19-2": "Descripción H3",
        "20-2": "h3",
        "21-2": "Descripción H3",
        "22-2": "h3",
        "23-2": "Descripción H3",

        # Bloque 3 — advicestipocarrusel (H2 + DescH2 + 9×H3/DescH3)
        "24-0": "advicestipocarrusel", 
        "24-1": "Bloque 3:",
        "24-2": "H2",
        "25-2": "Descripción H2",
        "26-2": "h3",
        "27-2": "Descripción H3",
        "28-2": "h3",
        "29-2": "Descripción H3",
        "30-2": "h3",
        "31-2": "Descripción H3",
        "32-2": "h3",
        "33-2": "Descripción H3",
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

        # Bloque 4 — services (H2 + DescH2 + 7×H3/DescH3)
        "44-0": "services",
        "44-1": "Bloque 4:",
        "44-2": "H2",
        "45-2": "Descripción H2",
        "46-2": "h3",
        "47-2": "Descripción H3",
        "48-2": "h3",
        "49-2": "Descripción H3",
        "50-2": "h3",
        "51-2": "Descripción H3",
        "52-2": "h3",
        "53-2": "Descripción H3",
        "54-2": "h3",
        "55-2": "Descripción H3",
        "56-2": "h3",
        "57-2": "Descripción H3",
        "58-2": "h3",
        "59-2": "Descripción H3",

        # Bloque 5 — text_end_landingpage
        "60-0": "text_end_landingpage",
        "60-1": "Bloque 5:",
        "61-2": "Disclaimer",
        "61-3": "*Estos precios son sujetos a cambios  y variarán dependiendo de la temporada del año, el tamaño del vehículo, los días de renta, la agencia de alquiler de carros, las coberturas que adquieras, entre otros servicios opcionales.",
        "61-4": "*These pricesare subject to change and may vary depending on the season, the vehicle size, the rental duration, the car rental agency, the coverages you select, and other optional services.",
        "61-5": "*Estes preços estão sujeitos a alterações e variam em função da época do ano, do tamanho do veículo, dos dias de locação, da locadora, das coberturas adquiridas, entre outros serviços opcionais."
              
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
            "type": "deals",
            "startRow": 6,
            "endRow": 23,
            "titleRow": 6,
            "descRow": 7,
            "contentMapping": {
                "desc": "7-3",
                "ip_usa": "8-3",
                "ip_bra": "9-3",
                "desc_1": "11-3",
                "desc_2": "13-3",
                "desc_3": "15-3",
                "desc_4": "17-3",
                "desc_5": "19-3",
                "desc_6": "21-3",
                "desc_7": "23-3"
            }
        },
        "3": {
            "name": "Bloque 3",
            "type": "advicestipocarrusel",
            "startRow": 24,
            "endRow": 43,
            "titleRow": 24,
            "descRow": 25,
            "contentMapping": {
                "desc": "25-3",
                "desc_1": "27-3",
                "desc_2": "29-3",
                "desc_3": "31-3",
                "desc_4": "33-3",
                "desc_5": "35-3",
                "desc_6": "37-3",
                "desc_7": "39-3",
                "desc_8": "41-3",
                "desc_9": "43-3"
            }
        },
        "4": {
            "name": "Bloque 4",
            "type": "services",
            "startRow": 44,
            "endRow": 59,
            "titleRow": 44,
            "descRow": 45,
            "contentMapping": {
                "desc": "45-3",
                "desc_1": "47-3",
                "desc_2": "49-3",
                "desc_3": "51-3",
                "desc_4": "53-3",
                "desc_5": "55-3",
                "desc_6": "57-3",
                "desc_7": "59-3"
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
        # Bloque 2 — deals (filas 6–23 = 18)
        "6-0": {"rowSpan": 18, "colSpan": 1},
        "6-1": {"rowSpan": 18, "colSpan": 1},
        # Bloque 3 — advicestipocarrusel (filas 24–43 = 20)
        "24-0": {"rowSpan": 20, "colSpan": 1},
        "24-1": {"rowSpan": 20, "colSpan": 1},
        # Bloque 4 — services (filas 44–59 = 16)
        "44-0": {"rowSpan": 16, "colSpan": 1},
        "44-1": {"rowSpan": 16, "colSpan": 1},
        # Bloque 5 — text_end_landingpage (filas 60–61 = 2)
        "60-0": {"rowSpan": 2, "colSpan": 1},
        "60-1": {"rowSpan": 2, "colSpan": 1}
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

    for row in range(62):
        for col in range(7):
            key = f"{row}-{col}"
            if key not in template_data:
                template_data[key] = {"text": "", "color": "#000000"}


    payload = {
        "name": "Template ofertas",
        "description": "Template para la landing page de Ofertas MCR",
        "proyecto": "mcr",
        "dominio": ".com",
        "categoria": "ofertas",
        "merged_cells": merged_cells,      
        "column_widths": column_widths,    
        "template_data": template_data,    
        "table_config": {                 
            "numRows": 62,
            "numCols": 7,
            "defaultRowHeight": 40,
            "defaultColumnWidth": 120
        },
        "column_headers": [                
            "Página", "Bloque", "Comentarios para el equipo IT", "Español",
            "Inglés", "Portugués", "Revisado por / Fecha"
        ],
        "blocks_metadata": blocks_metadata,
        "is_active": True
    }

    return payload, base_url


def upsert_template_db(payload):
    """Upsert directo en BD para que el template aparezca en el modal de proyectos."""
    _load_all_entities()
    db = SessionLocal()
    try:
        # Reusar el creador más reciente de templates MCR para cumplir FK created_by.
        creator = (
            db.query(Template.created_by)
            .filter(Template.proyecto == payload["proyecto"])
            .order_by(Template.created_at.desc())
            .first()
        )
        if creator:
            created_by = creator[0]
        else:
            first_user = db.query(User.id).order_by(User.id.asc()).first()
            if not first_user:
                print("No hay usuarios en BD para asignar created_by")
                return None
            created_by = first_user[0]

        template_config = {
            "mergedCells": payload["merged_cells"],
            "columnWidths": payload["column_widths"],
            "templateData": payload["template_data"],
            "tableConfig": payload["table_config"],
            "columnHeaders": payload["column_headers"],
            "blocks_metadata": payload["blocks_metadata"],
        }

        existing = (
            db.query(Template)
            .filter(
                Template.proyecto == payload["proyecto"],
                Template.dominio == payload["dominio"],
                Template.categoria == payload["categoria"],
            )
            .order_by(Template.created_at.desc())
            .first()
        )

        if existing:
            existing.name = payload["name"]
            existing.description = payload["description"]
            existing.template_config = template_config
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            print(f"Template actualizado en BD: {existing.id}")
            return str(existing.id)

        new_template = Template(
            name=payload["name"],
            description=payload["description"],
            template_config=template_config,
            proyecto=payload["proyecto"],
            dominio=payload["dominio"],
            categoria=payload["categoria"],
            is_active=True,
            created_by=created_by,
        )
        db.add(new_template)
        db.commit()
        db.refresh(new_template)
        print(f"Template creado en BD: {new_template.id}")
        return str(new_template.id)
    except Exception as e:
        db.rollback()
        print(f"Error guardando template en BD: {str(e)}")
        return None
    finally:
        db.close()


def create_template():
    """Crear o actualizar template de ofertas vía API o BD."""
    payload, base_url = build_payload()

    # Configuración desde variables de entorno
    token = os.getenv("REDACTORIA_TOKEN", "").strip()

    # Sin token, hacemos fallback a BD directamente.
    if not token:
        print("REDACTORIA_TOKEN no configurado. Usando guardado directo en BD...")
        return upsert_template_db(payload)

    # Headers con autenticación
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }


    try:
        print("\nBuscando template activo existente para MCR/ofertas...")
        existing = requests.get(
            f"{base_url}/templates/public/active",
            headers=headers,
            timeout=30
        )

        template_id = None
        if existing.status_code == 200:
            templates = existing.json()
            for item in templates:
                if (
                    item.get("proyecto") == payload["proyecto"] and
                    item.get("dominio") == payload["dominio"] and
                    item.get("categoria") == payload["categoria"] and
                    item.get("name") == payload["name"]
                ):
                    template_id = item.get("id")
                    break

        if template_id:
            print(f"Actualizando template existente: {template_id}")
            response = requests.put(
                f"{base_url}/templates/{template_id}",
                headers=headers,
                json={
                    "name": payload["name"],
                    "description": payload["description"],
                    "proyecto": payload["proyecto"],
                    "dominio": payload["dominio"],
                    "categoria": payload["categoria"],
                    "is_active": True,
                    "template_config": {
                        "mergedCells": payload["merged_cells"],
                        "columnWidths": payload["column_widths"],
                        "templateData": payload["template_data"],
                        "tableConfig": payload["table_config"],
                        "columnHeaders": payload["column_headers"],
                        "blocks_metadata": payload["blocks_metadata"]
                    }
                },
                timeout=30
            )
        else:
            print(f"\n Creando template Ofertas")
            print(f" URL: {base_url}/templates/from-config")
            response = requests.post(
                f"{base_url}/templates/from-config",
                headers=headers,
                json=payload,
                timeout=30
            )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code in (200, 201):
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
    print("Creador de Template Ofertas")
    print("=" * 50)
    
    template_id = create_template()
    
    if template_id:
        print(f"\n¡Template creado exitosamente!")
        print(f"ID: {template_id}")
    else:
        print("\nNo se pudo crear el template")
        print("Verifica que hayas colocado tu token")