"""
Standalone ETL runner — invoked by Railway cron services.

Railway cron setup (configure in Railway dashboard):
  Service 1 — StatCan ETL
    Schedule:  0 6 1,8,15 * *   (1st, 8th, 15th of each month at 06:00 UTC)
    Command:   python src/etl.py statcan

  Service 2 — Bank of Canada ETL
    Schedule:  0 6 2,9,16 * *   (2nd, 9th, 16th of each month at 06:00 UTC)
    Command:   python src/etl.py boc

Usage locally:
    python src/etl.py statcan
    python src/etl.py boc
    python src/etl.py all
"""
import logging
import sys
from pathlib import Path

# Ensure the project root is on sys.path when the script is run directly.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

logger = logging.getLogger(__name__)


def main() -> None:
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    if target not in ("statcan", "boc", "all"):
        logger.error("Unknown target %r. Use: statcan | boc | all", target)
        sys.exit(1)

    # Import engine here so DATABASE_URL is already loaded from .env above.
    from app.dependencies import engine  # noqa: PLC0415

    if target in ("statcan", "all"):
        from src.statcan_fetcher import fetch_and_load_all  # noqa: PLC0415
        logger.info("Starting StatCan ETL...")
        fetch_and_load_all(engine)

    if target in ("boc", "all"):
        from src.boc_fetcher import fetch_and_load_boc  # noqa: PLC0415
        logger.info("Starting Bank of Canada ETL...")
        fetch_and_load_boc(engine)

    logger.info("ETL complete.")


if __name__ == "__main__":
    main()
