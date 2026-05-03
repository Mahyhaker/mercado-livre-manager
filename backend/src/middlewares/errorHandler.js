function errorHandler(err, req, res, next) {
  const responseData = err?.response?.data || null;

  console.error('Erro tratado pelo middleware:');
  console.error(responseData || err);

  return res.status(err?.response?.status || err.status || 500).json({
    message:
      responseData?.message ||
      err.message ||
      'Erro interno do servidor',
    details: responseData
  });
}

module.exports = { errorHandler };