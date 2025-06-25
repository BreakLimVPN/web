from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Fastapi APP
    debug: bool = True
    src_path: Path =  Path(__file__).parent.parent.parent
    templates_path: Path = src_path / 'templates'
    assets_path: Path = src_path / 'assets'
    
    # Database
    DB_HOST: str = ''
    DB_PORT: int = 12
    DB_USERNAME: str = ''
    DB_PASSWORD: str = ''
    DATABASE: str = ''
    DSN: str = 'postgres://turntable.proxy.rlwy.net:55649/railway?user=postgres&password=VccfhorWkZlsriFteBImsqyinjDcNClY'
    
    # Other...


settings = Settings()
