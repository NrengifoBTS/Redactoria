from src.ia.strategies import BaseBrandGenerationStrategy, MilesGenerationStrategy, ViajemosGenerationStrategy


def _normalize_brand(brand: str) -> str:
    b = (brand or "mcr").strip().lower()
    if b in {"mcr", "miles", "miles car rental", "milescarrental", "miles_car_rental"}:
        return "mcr"
    if b in {"vjm", "viajemos", "viajemos.com", "viajemos autos"}:
        return "vjm"
    return b


def build_brand_strategy(brand: str, generator) -> BaseBrandGenerationStrategy:
    normalized_brand = _normalize_brand(brand)
    if normalized_brand == "vjm":
        return ViajemosGenerationStrategy(generator)
    return MilesGenerationStrategy(generator)
