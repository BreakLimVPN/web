from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Fastapi APP
    debug: bool = True
    src_path: Path =  Path(__file__).parent.parent.parent
    templates_path: Path = src_path / 'templates'
    assets_path: Path = src_path / 'assets'
    
    # Database
    
    # Other...


settings = Settings()
