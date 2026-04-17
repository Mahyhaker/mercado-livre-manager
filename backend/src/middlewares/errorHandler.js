function errorHandler(err, req, res, next) {
  console.error(err?.response?.data || err);

  return res.status(err?.response?.status || err.status || 500).json({
    message:
      err?.response?.data?.message ||
      err.message ||
      'Erro interno do servidor',
    details: err?.response?.data || null
  });
}

module.exports = { errorHandler };