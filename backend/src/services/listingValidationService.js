const axios = require('axios');

function createValidationError(message, validationErrors = []) {
  const error = new Error(message);
  error.status = 400;
  error.details = {
    validationErrors
  };
  return error;
}

function extractRequiredAttributes(attributes = []) {
  return attributes.filter((attribute) => {
    const tags = attribute.tags || {};

    return (
      tags.required ||
      tags.catalog_required ||
      tags.conditional_required ||
      tags.fixed ||
      attribute.required === true
    );
  });
}

function getAttributeIdsFromListing(listing) {
  if (!Array.isArray(listing.attributes)) return [];

  return listing.attributes
    .map((attribute) => attribute.id)
    .filter(Boolean);
}

async function validateCategory(categoryId) {
  const errors = [];

  if (!categoryId) {
    errors.push({
      field: 'categoryId',
      message: 'Categoria é obrigatória.'
    });

    return errors;
  }

  try {
    const response = await axios.get(
      `https://api.mercadolibre.com/categories/${categoryId}`
    );

    const category = response.data;

    if (
      Array.isArray(category.children_categories) &&
      category.children_categories.length > 0
    ) {
      errors.push({
        field: 'categoryId',
        message:
          'A categoria informada não é uma categoria final. Escolha uma subcategoria mais específica.',
        childrenCategories: category.children_categories.map((child) => ({
          id: child.id,
          name: child.name
        }))
      });
    }
  } catch (error) {
    errors.push({
      field: 'categoryId',
      message:
        'Categoria inválida ou inexistente no Mercado Livre. Verifique o ID informado.'
    });
  }

  return errors;
}

async function validateRequiredAttributes(categoryId, listing) {
  const errors = [];

  if (!categoryId) return errors;

  try {
    const response = await axios.get(
      `https://api.mercadolibre.com/categories/${categoryId}/attributes`
    );

    const categoryAttributes = response.data;
    const requiredAttributes = extractRequiredAttributes(categoryAttributes);
    const listingAttributeIds = getAttributeIdsFromListing(listing);

    const missingAttributes = requiredAttributes.filter(
      (attribute) => !listingAttributeIds.includes(attribute.id)
    );

    if (missingAttributes.length > 0) {
      errors.push({
        field: 'attributes',
        message: 'Existem atributos obrigatórios faltando para esta categoria.',
        missingAttributes: missingAttributes.map((attribute) => ({
          id: attribute.id,
          name: attribute.name
        }))
      });
    }
  } catch (error) {
    errors.push({
      field: 'attributes',
      message:
        'Não foi possível consultar os atributos obrigatórios da categoria.'
    });
  }

  return errors;
}

async function validateImageUrl(pictureUrl) {
  const errors = [];

  if (!pictureUrl) {
    errors.push({
      field: 'pictureUrl',
      message: 'Imagem é obrigatória.'
    });

    return errors;
  }

  if (!pictureUrl.startsWith('https://')) {
    errors.push({
      field: 'pictureUrl',
      message: 'A imagem precisa ser uma URL pública com HTTPS.'
    });

    return errors;
  }

  if (
    pictureUrl.includes('google.com') ||
    pictureUrl.includes('gstatic.com') ||
    pictureUrl.includes('encrypted-tbn0.gstatic.com')
  ) {
    errors.push({
      field: 'pictureUrl',
      message:
        'Evite links de miniaturas do Google. Use uma URL pública direta de imagem, como Imgur ou CDN própria.'
    });

    return errors;
  }

  try {
    const response = await axios.head(pictureUrl, {
      timeout: 7000,
      maxRedirects: 5
    });

    const contentType = response.headers['content-type'] || '';

    if (!contentType.startsWith('image/')) {
      errors.push({
        field: 'pictureUrl',
        message:
          'A URL informada não parece apontar diretamente para uma imagem.'
      });
    }
  } catch (error) {
    const extensionLooksLikeImage =
      pictureUrl.endsWith('.jpg') ||
      pictureUrl.endsWith('.jpeg') ||
      pictureUrl.endsWith('.png') ||
      pictureUrl.endsWith('.webp');

    if (!extensionLooksLikeImage) {
      errors.push({
        field: 'pictureUrl',
        message:
          'Não foi possível validar a imagem. Use um link direto terminando em .jpg, .png ou .webp.'
      });
    }
  }

  return errors;
}

async function validateListingBeforeSync(listing) {
  const validationErrors = [];

  const categoryErrors = await validateCategory(listing.categoryId);
  validationErrors.push(...categoryErrors);

  const imageErrors = await validateImageUrl(listing.pictureUrl);
  validationErrors.push(...imageErrors);

  const attributeErrors = await validateRequiredAttributes(
    listing.categoryId,
    listing
  );
  validationErrors.push(...attributeErrors);

  if (validationErrors.length > 0) {
    throw createValidationError(
      'O anúncio possui dados inválidos para publicação no Mercado Livre.',
      validationErrors
    );
  }
}

module.exports = {
  validateListingBeforeSync
};