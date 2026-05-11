import requests
import json

def deactivate_template(template_id):
    """Desactivar un template marcándolo como is_active: False"""
    
    # TOKEN - REEMPLAZA CON TU TOKEN
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnaXNlbGxoQHJlZGFjdG9yaWEuY29tIiwiaWQiOiJjN2MxNzgzOC0wNzRkLTQ0ZmEtOTI0OC04ZGM4N2MxNWVkZDUiLCJleHAiOjE3Njk3MjA3MzF9.tuWhvnl6BMgGic8ryWSI7-2ALRnio1HRABPss5MyHDI"
    
    # URL de tu API
    base_url = "http://192.168.1.129:8080"
    
    # Payload para desactivar - solo cambiar is_active
    payload = {
        "is_active": False
    }
    
    # Headers con autenticación
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    try:
        print(f"\n Desactivando template con ID: {template_id}")
        print(f" URL: {base_url}/templates/{template_id}")
        
        # Intentar PUT primero
        response = requests.put(
            f"{base_url}/templates/{template_id}",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        print(f" Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print(" Template desactivado exitosamente")
            result = response.json()
            print(f" Estado actual: is_active = {result.get('is_active', 'unknown')}")
            return True
            
        elif response.status_code == 404:
            print(" Template no encontrado")
            print("  Verifica que el ID sea correcto")
            
        elif response.status_code == 401:
            print("Error de autenticación: Token inválido o expirado")
            
        elif response.status_code == 405:
            print(" Método PUT no permitido")
            print("Tu API no tiene endpoint PUT para templates")
            print(" Intentando con PATCH...")
            
            # Intentar con PATCH si PUT no funciona
            response = requests.patch(
                f"{base_url}/templates/{template_id}",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                print(" Template desactivado con PATCH")
                return True
            else:
                print(f" PATCH también falló: {response.status_code}")
                
        elif response.status_code == 422:
            print(" Error de validación:")
            error_detail = response.json()
            print(json.dumps(error_detail, indent=2))
            
        else:
            print(f" Error {response.status_code}:")
            try:
                error_detail = response.json()
                print(json.dumps(error_detail, indent=2))
            except:
                print(response.text)
            
    except requests.exceptions.ConnectionError:
        print(" Error de conexión: ¿Está corriendo tu servidor?")
        
    except requests.exceptions.Timeout:
        print(" Timeout: La request tardó demasiado")
        
    except Exception as e:
        print(f" Error inesperado: {str(e)}")

    return False

def list_templates():
    """Listar todos los templates para ver cuáles están activos"""
    
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnaXNlbGxoQHJlZGFjdG9yaWEuY29tIiwiaWQiOiJjN2MxNzgzOC0wNzRkLTQ0ZmEtOTI0OC04ZGM4N2MxNWVkZDUiLCJleHAiOjE3Njk3MjA3MzF9.tuWhvnl6BMgGic8ryWSI7-2ALRnio1HRABPss5MyHDI"
    base_url = "http://192.168.1.129:8080"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        print(f"\n Listando templates...")
        print(f" URL: {base_url}/templates/public/active")

        response = requests.get(f"{base_url}/templates/public/active", headers=headers, timeout=30)
        
        if response.status_code == 200:
            templates = response.json()
            
            if not templates:
                print(" No hay templates en la base de datos")
                return []
            
            print(f"\n Encontrados {len(templates)} templates:")
            print("=" * 100)
            
            active_count = 0
            inactive_count = 0
            
            for i, template in enumerate(templates, 1):
                is_active = template.get('is_active', True)
                status_icon = "🟢" if is_active else "🔴"
                status_text = "ACTIVO" if is_active else "INACTIVO"
                
                if is_active:
                    active_count += 1
                else:
                    inactive_count += 1
                
                print(f"{i}. {status_icon} {status_text}")
                print(f" ID: {template.get('id', 'N/A')}")
                print(f"Nombre: {template.get('name', 'Sin nombre')}")
                print(f"Descripción: {template.get('description', 'Sin descripción')}")
                print(f"Proyecto: {template.get('proyecto', 'N/A')}")
                print(f"Dominio: {template.get('dominio', 'N/A')}")
                print(f"Categoría: {template.get('categoria', 'N/A')}")
                print("-" * 100)
            
            print(f"\n Resumen: {active_count} activos, {inactive_count} inactivos")
            return templates
            
        else:
            print(f" Error al listar templates: {response.status_code}")
            try:
                error_detail = response.json()
                print(json.dumps(error_detail, indent=2))
            except:
                print(response.text)
            
    except Exception as e:
        print(f" Error: {str(e)}")
    
    return []

def get_template_by_id(template_id):
    """Obtener información detallada de un template específico"""
    
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnaXNlbGxoQHJlZGFjdG9yaWEuY29tIiwiaWQiOiJjN2MxNzgzOC0wNzRkLTQ0ZmEtOTI0OC04ZGM4N2MxNWVkZDUiLCJleHAiOjE3Njk3MjA3MzF9.tuWhvnl6BMgGic8ryWSI7-2ALRnio1HRABPss5MyHDI"
    base_url = "http://192.168.1.129:8080"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.get(f"{base_url}/templates/{template_id}", headers=headers, timeout=30)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f" Error al obtener template: {response.status_code}")
            return None
            
    except Exception as e:
        print(f" Error: {str(e)}")
        return None

if __name__ == "__main__":
    print(" Desactivar Templates")
    print("=" * 50)
    
    # Listar todos los templates
    templates = list_templates()
    
    if not templates:
        print("\n No hay templates para desactivar")
        exit()
    
    # Filtrar solo los activos
    active_templates = [t for t in templates if t.get('is_active', True)]
    
    if not active_templates:
        print("\n  No hay templates activos para desactivar")
        print(" Todos los templates ya están inactivos")
        exit()
    
    print(f"\n Templates activos que puedes desactivar: {len(active_templates)}")
    
    # Pedir ID del template
    template_id = input("\n Ingresa el ID del template que quieres desactivar: ").strip()
    
    if not template_id:
        print(" ID no válido")
        exit()
    
    # Verificar que el template existe y está activo
    template_info = get_template_by_id(template_id)
    
    if not template_info:
        print(f" Template '{template_id}' no encontrado")
        exit()
    
    if not template_info.get('is_active', True):
        print(f"  El template '{template_info.get('name', template_id)}' ya está inactivo")
        exit()
    
    # Mostrar información del template
    print(f"\n Template a desactivar:")
    print(f"    Nombre: {template_info.get('name', 'Sin nombre')}")
    print(f"    Descripción: {template_info.get('description', 'Sin descripción')}")
    print(f"     Proyecto: {template_info.get('proyecto', 'N/A')}")
    
    # Confirmar
    confirm = input(f"\n  ¿Estás seguro que quieres DESACTIVAR este template? (SI/no): ").strip().upper()
    
    if confirm == 'SI':
        success = deactivate_template(template_id)
        if success:
            print(f"\n ¡Template '{template_info.get('name', template_id)}' desactivado exitosamente!")
            print(" El template ya no aparecerá como activo, pero no se eliminó permanentemente")
        else:
            print(f"\n No se pudo desactivar el template")
            print(" Verifica que tu API tenga un endpoint PUT o PATCH para actualizar templates")
    else:
        print("\n Operación cancelada")
        print(" No se realizaron cambios")