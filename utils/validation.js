function validateDrinkData(data) {
    const { name, description, alcoholic, category, image_path, instructions, ingredients } = data;
  
    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return { error: 'Name is required and must be a non-empty string.' };
    }
  
    // Validate description (optional)
    if (description && typeof description !== 'string') {
      return { error: 'Description must be a string.' };
    }
  
    // Validate alcoholic
    if (typeof alcoholic !== 'boolean') {
      return { error: 'Alcoholic must be a boolean value.' };
    }
  
    // Validate category
    if (!category || typeof category !== 'string' || category.trim() === '') {
      return { error: 'Category is required and must be a non-empty string.' };
    }
  
    // Validate image_path (optional)
    if (image_path && typeof image_path !== 'string') {
      return { error: 'Image path must be a string.' };
    }
  
    // Validate instructions (optional)
    if (instructions && typeof instructions !== 'string') {
      return { error: 'Instructions must be a string.' };
    }
  
    // Validate ingredients
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return { error: 'Ingredients is required and must be an array.' };
    }
  
    for (const ingredient of ingredients) {
      if (typeof ingredient.name !== 'string' || typeof ingredient.quantity !== 'number' || typeof ingredient.measurement !== 'string') {
        return { error: 'Each ingredient must have a valid name, quantity, and measurement.' };
      }
    }
  
    return null; // No errors
  }

  export default validateDrinkData;