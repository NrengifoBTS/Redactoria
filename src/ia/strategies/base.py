from src.core.generators.base_generator import _FAV_CITY_DEFAULTS

from .models import GenerationResult


class BaseBrandGenerationStrategy:
    """Responsabilidad base de generacion por marca y tipo de bloque."""

    SUPPORTED_BLOCKS = {
        "quicksearch",
        "fleet",
        "deals",
        "agencies",
        "reviews",
        "rentcompanies",
        "bloquehistoria",
        "advicestipocarrusel",
        "rentacar",
        "faqs",
        "questions",
        "car_rental",
        "fleetcarrusel",
        "fav_city",
        "locationscarrusel",
    }

    DEFAULT_ADVICE_TYPES = [
        "Consejo sobre reservas",
        "Consejo sobre seguros",
        "Consejo sobre combustible",
        "Consejo sobre documentación",
        "Consejo sobre inspección",
        "Consejo sobre devolución",
    ]

    DEFAULT_FLEET_CAROUSEL_TYPES = ["Económico", "Camionetas", "Convertibles", "Lujo", "Van", "Eléctricos"]

    DEFAULT_DEALS_TYPES = [
        "Ofertas de Autos Económicos",
        "Ofertas de SUV",
        "Ofertas de Vans",
        "Ofertas de Autos de Lujo",
        "Ofertas de Convertibles",
        "Ofertas de Autos Eléctricos",
        "Ofertas de Alquiler Semanal",
    ]

    DEFAULT_CAR_RENTAL_TYPES = [
        "Auto Económico",
        "Auto Compacto",
        "Auto Intermedio",
        "SUV",
        "Van",
        "Auto de Lujo",
    ]

    def __init__(self, generator):
        self.generator = generator

    def supports_block(self, block_type: str) -> bool:
        return block_type in self.SUPPORTED_BLOCKS

    def generate_block(
        self,
        block_type: str,
        titulo_limpio: str,
        nuevo_tema: str,
        request,
    ) -> GenerationResult:
        if not self.supports_block(block_type):
            raise ValueError(f"Block type '{block_type}' no soportado para esta marca")

        result = GenerationResult()

        if block_type == "quicksearch":
            result.raw_generated_content = self.generator.generate_quicksearch(titulo_limpio, nuevo_tema)

        elif block_type == "fleet":
            result.raw_generated_content = self.generator.generate_fleet(titulo_limpio, nuevo_tema)

        elif block_type == "agencies":
            result.raw_generated_content = self.generator.generate_agencies(titulo_limpio, nuevo_tema)

        elif block_type == "reviews":
            result.raw_generated_content = self.generator.generate_reviews(titulo_limpio, nuevo_tema)

        elif block_type == "rentcompanies":
            result.raw_generated_content = self.generator.generate_rentcompanies(titulo_limpio, nuevo_tema)

        elif block_type == "bloquehistoria":
            result.raw_generated_content = self.generator.generate_bloquehistoria(titulo_limpio, nuevo_tema)

        elif block_type == "advicestipocarrusel":
            result.raw_generated_content = self.generator.generate_advicestipocarrusel(titulo_limpio, nuevo_tema)
            tipos_validos = [t for t in (request.car_types or []) if t and t.strip()]
            if not tipos_validos:
                tipos_validos = self.DEFAULT_ADVICE_TYPES
            result.additional_content = self.generator.generate_advice_type(tipos_validos, nuevo_tema)

        elif block_type == "rentacar":
            result.raw_generated_content = self.generator.generate_rentacar(titulo_limpio, nuevo_tema)

        elif block_type in ("faqs", "questions"):
            result.raw_generated_content = self.generator.generate_faq(titulo_limpio, nuevo_tema)
            preguntas_validas = [q for q in (request.faq_questions or []) if q and q.strip()]
            if not preguntas_validas:
                preguntas_validas = self.generator.generate_faq_questions_from_title(titulo_limpio)
            preguntas_validas = preguntas_validas[:4]
            result.faq_questions_for_response = preguntas_validas
            result.additional_content = self.generator.generate_faq_respuesta(nuevo_tema, preguntas_validas)

        elif block_type in ("car_rental", "fleetcarrusel"):
            result.raw_generated_content = self.generator.generate_car_rental(titulo_limpio, nuevo_tema)
            tipos_validos = [t for t in (request.car_types or []) if t and t.strip()]
            if not tipos_validos:
                tipos_validos = (
                    self.DEFAULT_FLEET_CAROUSEL_TYPES
                    if block_type == "fleetcarrusel"
                    else self.DEFAULT_CAR_RENTAL_TYPES
                )
            result.additional_content = self.generator.generate_car_type(tipos_validos, nuevo_tema)

        elif block_type in ("fav_city", "locationscarrusel"):
            result.raw_generated_content = self.generator.generate_fav_city(titulo_limpio, nuevo_tema)
            ciudades_validas = [c for c in (request.fav_city_questions or []) if c and c.strip()]

            if ciudades_validas:
                target_city_items = len(ciudades_validas)
            else:
                ciudades_validas = [c[0] for c in _FAV_CITY_DEFAULTS]
                target_city_items = len(ciudades_validas)

            ciudades_validas = ciudades_validas[:target_city_items]
            result.city_titles_for_response = ciudades_validas
            if ciudades_validas:
                result.additional_content = self.generator.generate_fav_city_respuesta(nuevo_tema, ciudades_validas)
            else:
                result.additional_content = "|error: No se pudieron generar ciudades|"

        return result
