import gspread
from google.oauth2.service_account import Credentials
from app.core.config import settings
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class GoogleSheetsDB:
    def __init__(self):
        self.client = None
        self.spreadsheet = None
        self.sheets = {}
        self._initialize()

    def _initialize(self):
        """Initialize Google Sheets connection"""
        try:
            # Define the scope
            scope = [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive'
            ]
            
            # Load credentials - support both file and JSON string
            if settings.GOOGLE_SHEETS_CREDENTIALS_JSON:
                # Load from JSON string in environment variable
                import json
                creds_dict = json.loads(settings.GOOGLE_SHEETS_CREDENTIALS_JSON)
                creds = Credentials.from_service_account_info(creds_dict, scopes=scope)
                logger.info("Loaded credentials from JSON string")
            else:
                # Load from file
                creds = Credentials.from_service_account_file(
                    settings.GOOGLE_SHEETS_CREDENTIALS_FILE,
                    scopes=scope
                )
                logger.info(f"Loaded credentials from file: {settings.GOOGLE_SHEETS_CREDENTIALS_FILE}")
            
            self.client = gspread.authorize(creds)
            logger.info("Google Sheets client initialized successfully")
            
            # Open or create spreadsheet
            if settings.GOOGLE_SPREADSHEET_ID:
                self.spreadsheet = self.client.open_by_key(settings.GOOGLE_SPREADSHEET_ID)
                logger.info(f"Opened existing spreadsheet: {self.spreadsheet.title}")
            else:
                logger.warning("No GOOGLE_SPREADSHEET_ID provided. Please create a spreadsheet and set the ID.")
                
        except Exception as e:
            logger.error(f"Failed to initialize Google Sheets: {str(e)}")
            raise

    def _get_or_create_sheet(self, sheet_name: str, headers: List[str]) -> gspread.Worksheet:
        """Get existing sheet or create new one with headers"""
        try:
            worksheet = self.spreadsheet.worksheet(sheet_name)
            logger.info(f"Found existing sheet: {sheet_name}")
        except gspread.WorksheetNotFound:
            worksheet = self.spreadsheet.add_worksheet(title=sheet_name, rows=1000, cols=len(headers))
            worksheet.append_row(headers)
            logger.info(f"Created new sheet: {sheet_name}")
        
        self.sheets[sheet_name] = worksheet
        return worksheet

    def initialize_schema(self):
        """Initialize all sheets with proper schema"""
        logger.info("Initializing database schema...")
        
        # Agents Sheet
        self._get_or_create_sheet('Agents', [
            'agent_id', 'name', 'persona', 'system_instructions', 
            'tools', 'escalation_threshold', 'created_at', 'updated_at', 'status'
        ])
        
        # Conversations Sheet
        self._get_or_create_sheet('Conversations', [
            'conversation_id', 'agent_id', 'user_id', 'started_at', 
            'ended_at', 'status', 'total_messages'
        ])
        
        # Messages Sheet
        self._get_or_create_sheet('Messages', [
            'message_id', 'conversation_id', 'agent_id', 'role', 
            'content', 'intent', 'confidence_score', 'timestamp', 'escalated'
        ])
        
        # Escalations Sheet
        self._get_or_create_sheet('Escalations', [
            'escalation_id', 'conversation_id', 'message_id', 'agent_id',
            'query', 'reason', 'status', 'created_at', 'resolved_at', 
            'resolved_by', 'resolution_notes'
        ])
        
        # Metrics Sheet
        self._get_or_create_sheet('Metrics', [
            'date', 'agent_id', 'total_queries', 'resolved_queries',
            'escalated_queries', 'resolution_rate', 'avg_confidence'
        ])
        
        logger.info("Database schema initialized successfully")

    def insert_row(self, sheet_name: str, data: Dict[str, Any]) -> bool:
        """Insert a row into a sheet"""
        try:
            worksheet = self.sheets.get(sheet_name) or self.spreadsheet.worksheet(sheet_name)
            headers = worksheet.row_values(1)
            
            # Create row in the same order as headers
            row = []
            for header in headers:
                value = data.get(header, '')
                # Convert lists/dicts to JSON strings
                if isinstance(value, (list, dict)):
                    value = json.dumps(value)
                row.append(str(value))
            
            worksheet.append_row(row)
            logger.debug(f"Inserted row into {sheet_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to insert row into {sheet_name}: {str(e)}")
            return False

    def get_all_rows(self, sheet_name: str) -> List[Dict[str, Any]]:
        """Get all rows from a sheet as list of dicts"""
        try:
            worksheet = self.sheets.get(sheet_name) or self.spreadsheet.worksheet(sheet_name)
            records = worksheet.get_all_records()
            logger.debug(f"Retrieved {len(records)} rows from {sheet_name}")
            return records
        except Exception as e:
            logger.error(f"Failed to get rows from {sheet_name}: {str(e)}")
            return []

    def find_row(self, sheet_name: str, key: str, value: Any) -> Optional[Dict[str, Any]]:
        """Find a row by key-value pair"""
        try:
            records = self.get_all_rows(sheet_name)
            for record in records:
                if str(record.get(key)) == str(value):
                    return record
            return None
        except Exception as e:
            logger.error(f"Failed to find row in {sheet_name}: {str(e)}")
            return None

    def update_row(self, sheet_name: str, key: str, value: Any, updates: Dict[str, Any]) -> bool:
        """Update a row by finding it with key-value pair"""
        try:
            worksheet = self.sheets.get(sheet_name) or self.spreadsheet.worksheet(sheet_name)
            headers = worksheet.row_values(1)
            all_values = worksheet.get_all_values()
            
            # Find the key column index
            key_col_idx = headers.index(key)
            
            # Find the row
            for row_idx, row in enumerate(all_values[1:], start=2):  # Skip header
                if row[key_col_idx] == str(value):
                    # Update the row
                    for update_key, update_value in updates.items():
                        if update_key in headers:
                            col_idx = headers.index(update_key) + 1  # 1-indexed
                            if isinstance(update_value, (list, dict)):
                                update_value = json.dumps(update_value)
                            worksheet.update_cell(row_idx, col_idx, str(update_value))
                    logger.debug(f"Updated row in {sheet_name}")
                    return True
            
            logger.warning(f"Row not found in {sheet_name} with {key}={value}")
            return False
        except Exception as e:
            logger.error(f"Failed to update row in {sheet_name}: {str(e)}")
            return False

    def delete_row(self, sheet_name: str, key: str, value: Any) -> bool:
        """Delete a row by key-value pair"""
        try:
            worksheet = self.sheets.get(sheet_name) or self.spreadsheet.worksheet(sheet_name)
            headers = worksheet.row_values(1)
            all_values = worksheet.get_all_values()
            
            key_col_idx = headers.index(key)
            
            for row_idx, row in enumerate(all_values[1:], start=2):
                if row[key_col_idx] == str(value):
                    worksheet.delete_rows(row_idx)
                    logger.debug(f"Deleted row from {sheet_name}")
                    return True
            
            return False
        except Exception as e:
            logger.error(f"Failed to delete row from {sheet_name}: {str(e)}")
            return False

# Singleton instance
sheets_db = GoogleSheetsDB()
