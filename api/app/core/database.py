from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings

# Create engine
if settings.database_url.startswith("sqlite"):
    # SQLite configuration for testing
    engine = create_engine(
        settings.database_url,
        poolclass=StaticPool,
        connect_args={
            "check_same_thread": False,
        },
        echo=settings.environment == "development"
    )
else:
    # PostgreSQL configuration
    engine = create_engine(
        settings.database_url,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        echo=settings.environment == "development"
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
