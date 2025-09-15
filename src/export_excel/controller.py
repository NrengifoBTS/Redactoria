from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import Dict, Any
import logging
from io import BytesIO

from ..database.core import DbSession
from . import models
from . import service
from ..auth.service import CurrentUser

router = APIRouter(
    prefix="/export",
    tags=["Export"]
)


@router.post("/excel", response_class=StreamingResponse)
def export_to_excel(
    export_request: models.ExportExcelRequest,
    current_user: CurrentUser,
    db: DbSession
):
    """
    Exporta los datos del template a un archivo Excel
    """
    try:
        logging.info(f"Starting Excel export for user: {current_user.get_uuid()}")
        logging.info(f"Template: {export_request.template_info.name}")
        
        # Crear archivo Excel
        excel_buffer = service.create_excel_from_template(export_request)
        
        # Generar nombre de archivo
        filename = service.generate_filename(export_request.template_info)
        
        # Configurar headers para la descarga
        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
        
        logging.info(f"Excel export completed successfully. Filename: {filename}")
        
        # Retornar archivo como stream
        return StreamingResponse(
            BytesIO(excel_buffer.read()),
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers=headers
        )
        
    except Exception as e:
        logging.error(f"Error during Excel export: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating Excel file: {str(e)}"
        )


@router.post("/excel/validate", response_model=models.ExportExcelResponse)
def validate_export_data(
    export_request: models.ExportExcelRequest,
    current_user: CurrentUser,
    db: DbSession
):
    """
    Valida los datos antes de exportar (opcional)
    """
    try:
        logging.info(f"Validating export data for user: {current_user.get_uuid()}")
        
        # Validaciones básicas
        if not export_request.template_config.templateData:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No template data provided"
            )
        
        if not export_request.template_config.columnHeaders:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Column headers are required"
            )
        
        # Validar que existan datos en las columnas de traducción (3, 4, 5)
        translation_columns = [3, 4, 5]  # Español, Inglés, Portugués
        has_translation_data = False
        
        for cell_key, cell_data in export_request.template_config.templateData.items():
            try:
                row, col = map(int, cell_key.split('-'))
                if col in translation_columns and cell_data.value.strip():
                    has_translation_data = True
                    break
            except (ValueError, AttributeError):
                continue
        
        if not has_translation_data:
            logging.warning("No translation data found in required columns")
        
        logging.info("Export data validation completed successfully")
        
        return models.ExportExcelResponse(
            success=True,
            message="Data validation completed successfully",
            filename=service.generate_filename(export_request.template_info)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error during validation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation error: {str(e)}"
        )