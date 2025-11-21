import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def test_task(x, y):
    logger.info("Running test_task with %s and %s", x, y)
    return x + y
