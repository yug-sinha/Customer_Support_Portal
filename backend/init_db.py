"""
Script to initialize Google Sheets database with proper schema
Run this once to set up your spreadsheet
"""
from app.core.sheets_db import sheets_db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    logger.info("Starting Google Sheets database initialization...")
    
    try:
        # Initialize the schema
        sheets_db.initialize_schema()
        logger.info("✅ Database schema initialized successfully!")
        logger.info(f"📊 Spreadsheet: {sheets_db.spreadsheet.title}")
        logger.info(f"🔗 URL: {sheets_db.spreadsheet.url}")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {str(e)}")
        raise

if __name__ == "__main__":
    main()
