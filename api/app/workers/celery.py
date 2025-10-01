from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "logparts",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_reject_on_worker_lost=True,
    worker_disable_rate_limits=True,
    task_routes={
        "app.workers.tasks.generate_embeddings": {"queue": "embeddings"},
        "app.workers.tasks.process_images": {"queue": "images"},
        "app.workers.tasks.import_bulk_data": {"queue": "imports"},
    }
)
