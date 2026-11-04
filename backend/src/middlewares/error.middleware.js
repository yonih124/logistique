export function notFound(req, _res, next) { const error = new Error(`Route introuvable: ${req.method} ${req.originalUrl}`); error.statusCode = 404; next(error); }
export function errorHandler(error, _req, res, _next) {
  if (error.code === 'P2034') return res.status(409).json({ success: false, message: 'Le stock ou la demande a changé pendant cette opération. Actualisez les données puis réessayez.' });
  if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Cette valeur existe déjà', fields: error.meta?.target });
  if (error.code === 'P2003') return res.status(409).json({ success: false, message: 'Une ressource liée est introuvable ou encore utilisée', field: error.meta?.field_name });
  if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Ressource introuvable' });
  res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Erreur interne', ...(error.details && { details: error.details }), ...(process.env.NODE_ENV === 'development' && { stack: error.stack }) });
}
