import requests
import json

def fix_bloques_6_7():
    """
    Corrige el template Viajemos Ciudad en la BD:

    Bug 1 — Bloque 6 endRow = 75 (debería ser 74).
             La fila 75 cae dentro del rango de Bloque 6 pero no está en
             su contentMapping, así el contenido generado nunca llega allí.

    Bug 2 — Bloque 7 (disclaimer F, fila 75) no existe en blocks_metadata.
             La celda 75-3 queda huérfana: el Redactor no la reconoce como
             parte de ningún bloque y no muestra botón de edición/generación.
    """

    token = "TU_TOKEN_AQUI"
    base_url = "http://192.168.1.129:8080"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    # 1. Buscar el template viajemos / .com / ciudad
    print("Buscando template viajemos/.com/ciudad...")
    resp = requests.get(f"{base_url}/templates/", headers=headers, timeout=30)
    resp.raise_for_status()
    templates = resp.json()

    target = None
    for t in templates:
        if (
            (t.get("proyecto") or "").lower() == "viajemos"
            and (t.get("dominio") or "").lower() in (".com", "com")
            and (t.get("categoria") or "").lower() == "ciudad"
        ):
            target = t
            break

    if not target:
        print("ERROR: No se encontró el template viajemos/.com/ciudad")
        print("Templates disponibles:")
        for t in templates:
            print(
                f"  id={t['id']}  proyecto={t['proyecto']}"
                f"  dominio={t['dominio']}  categoria={t['categoria']}"
                f"  nombre={t['name']}"
            )
        return

    template_id = target["id"]
    print(f"Template encontrado: id={template_id}  nombre={target['name']}")

    # 2. Obtener blocks_metadata actual
    template_config = target.get("template_config", {})
    blocks_metadata = template_config.get("blocks_metadata", {})

    print("\nEstado actual de blocks_metadata:")
    for k, v in sorted(blocks_metadata.items(), key=lambda x: int(x[0])):
        print(f"  Bloque {k}: type={v.get('type')}  startRow={v.get('startRow')}  endRow={v.get('endRow')}  titleRow={v.get('titleRow')}")

    # 3. Corregir Bloque 6
    b6 = blocks_metadata.get("6")
    if not b6:
        print("\nERROR: No se encontró Bloque 6 en blocks_metadata")
        return

    changed = False

    if b6.get("endRow") != 74:
        print(f"\nBloque 6: corrigiendo endRow {b6.get('endRow')} → 74")
        blocks_metadata["6"]["endRow"] = 74
        changed = True
    else:
        print("\nBloque 6: endRow ya es 74, sin cambios.")

    if b6.get("titleRow") != 41:
        print(f"Bloque 6: corrigiendo titleRow {b6.get('titleRow')} → 41")
        blocks_metadata["6"]["titleRow"] = 41
        changed = True

    # 4. Agregar Bloque 7 si no existe
    if "7" not in blocks_metadata:
        print("Agregando Bloque 7 (disclaimer F, fila 75)...")
        blocks_metadata["7"] = {
            "name": "Bloque 7",
            "type": "disclaimer",
            "startRow": 75,
            "endRow": 75,
            "titleRow": 75,
            "descRow": 75,
            "contentMapping": {
                "disclaimer_f": "75-3"
            },
        }
        changed = True
    else:
        print("Bloque 7 ya existe, sin cambios.")

    if not changed:
        print("\nNo se requieren cambios.")
        return

    # 5. Enviar el PUT con los cambios
    template_config["blocks_metadata"] = blocks_metadata
    payload = {"template_config": template_config}

    print(f"\nActualizando template {template_id}...")
    update_resp = requests.put(
        f"{base_url}/templates/{template_id}",
        headers=headers,
        json=payload,
        timeout=30,
    )
    print(f"Status: {update_resp.status_code}")

    if update_resp.status_code == 200:
        updated_meta = (
            update_resp.json()
            .get("template_config", {})
            .get("blocks_metadata", {})
        )
        print("\nblocks_metadata actualizado:")
        for k, v in sorted(updated_meta.items(), key=lambda x: int(x[0])):
            print(
                f"  Bloque {k}: type={v.get('type')}  startRow={v.get('startRow')}"
                f"  endRow={v.get('endRow')}  titleRow={v.get('titleRow')}"
            )
        print("\nActualización exitosa.")
    else:
        print(f"Error en la actualización: {update_resp.text}")


if __name__ == "__main__":
    print("Fix: Viajemos Ciudad — Bloques 6 y 7")
    print("=" * 50)
    fix_bloques_6_7()
