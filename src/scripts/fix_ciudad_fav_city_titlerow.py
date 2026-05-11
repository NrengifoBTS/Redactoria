import requests

def fix_fav_city_titlerow():
    """
    Corrige el titleRow del bloque fav_city en el template Ciudad (Viajemos .com).

    Bug: titleRow era 61 (fila de "Dallas" H3) en lugar de 41 (fila del H2 real).
    Efecto: el título H2 generado se escribía en la celda de Dallas sobreescribiéndola,
            y la celda 41-3 del H2 nunca se actualizaba.
    """

    # TOKEN - REEMPLAZA CON TU TOKEN
    token = "TU_TOKEN_AQUI"

    # URL de la API
    base_url = "http://192.168.1.129:8080"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    # 1. Buscar el template de viajemos/.com/ciudad
    print("Buscando templates de viajemos...")
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
            print(f"  id={t['id']}  proyecto={t['proyecto']}  dominio={t['dominio']}  categoria={t['categoria']}  nombre={t['name']}")
        return

    template_id = target["id"]
    print(f"Template encontrado: id={template_id}  nombre={target['name']}")

    # 2. Obtener template_config actual
    template_config = target.get("template_config", {})
    blocks_metadata = template_config.get("blocks_metadata", {})

    # 3. Verificar el valor actual del titleRow del bloque fav_city
    fav_block = None
    fav_key = None
    for key, block in blocks_metadata.items():
        if block.get("type") == "fav_city":
            fav_block = block
            fav_key = key
            break

    if not fav_block:
        print("ERROR: No se encontró bloque fav_city en blocks_metadata")
        print("Bloques disponibles:", list(blocks_metadata.keys()))
        return

    current_title_row = fav_block.get("titleRow")
    print(f"Bloque fav_city (key={fav_key}): titleRow actual = {current_title_row}")

    if current_title_row == 41:
        print("El titleRow ya es correcto (41). No se requiere actualización.")
        return

    if current_title_row != 61:
        print(f"ADVERTENCIA: titleRow es {current_title_row}, valor inesperado. Abortando para revisar manualmente.")
        return

    # 4. Corregir titleRow de 61 a 41
    blocks_metadata[fav_key]["titleRow"] = 41
    template_config["blocks_metadata"] = blocks_metadata

    # 5. Enviar el PUT con el template_config corregido
    payload = {"template_config": template_config}
    print(f"Actualizando template {template_id}...")
    update_resp = requests.put(
        f"{base_url}/templates/{template_id}",
        headers=headers,
        json=payload,
        timeout=30
    )
    print(f"Status: {update_resp.status_code}")
    if update_resp.status_code == 200:
        updated = update_resp.json()
        new_title_row = (
            updated.get("template_config", {})
            .get("blocks_metadata", {})
            .get(fav_key, {})
            .get("titleRow")
        )
        print(f"Actualización exitosa. Nuevo titleRow del bloque fav_city: {new_title_row}")
    else:
        print(f"Error en la actualización: {update_resp.text}")


if __name__ == "__main__":
    fix_fav_city_titlerow()
