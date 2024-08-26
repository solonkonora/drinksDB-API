function validateDrinkData(data) {
    const errors = []; // Initialize an empty array for errors

    const { name, description, alcoholic, category, image_path, instructions, ingredients } = data;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
        errors.push({ field: 'name', message: 'Name is required and must be a non-empty string.' });
    }

    // Validate description (optional)
    if (description && typeof description !== 'string') {
        errors.push({ field: 'description', message: 'Description must be a string.' });
    }

    // Validate alcoholic
    if (typeof alcoholic !== 'string') {
        errors.push({ field: 'alcoholic', message: 'Alcoholic must be a boolean value.' });
    }

    // Validate category
    if (!category || typeof category !== 'string' || category.trim() === '') {
        errors.push({ field: 'category', message: 'Category is required and must be a non-empty string.' });
    }

    // Validate image_path (optional)
    if (image_path && typeof image_path !== 'string') {
        errors.push({ field: 'image_path', message: 'Image path must be a string.' });
    }
    // // 5. Image URL Validation
    // if (imageUrl) {
    //     // You can add more specific image URL validation here
    //     // For example, check if it's a valid URL format, or if it points to a supported image type
    //     if (!imageUrl.startsWith('http')) {
    //         errors.push('Image URL must start with "http"');
    //     }
    // }

    // Validate instructions (optional)
    if (instructions && typeof instructions !== 'string') {
        errors.push({ field: 'instructions', message: 'Instructions must be a string.' });
    }

    // Validate ingredients
    // if (!data.ingredients) {
    //     errors.push({ field: 'ingredients', message: 'Ingredients are required' });
    // } else {
    //     try {
    //         const parsedIngredients = JSON.parse(data.ingredients);
    //         if (!Array.isArray(parsedIngredients)) {
    //             errors.push({ field: 'ingredients', message: 'Ingredients must be an array' });
    //         }
    //     } catch (error) {
    //         errors.push({ field: 'ingredients', message: 'Ingredients must be a valid JSON array' });
    //     }
    // }

    // 1. Check for Existence and Type
  if (!data.ingredients || !Array.isArray(data.ingredients)) {
    errors.push({ field: 'ingredients', message: 'Ingredients are required and must be an array' });
    return errors; // Return early if ingredients are invalid
  }

  // 2. Validate Each Ingredient
  for (let i = 0; i < data.ingredients.length; i++) {
    const ingredient = data.ingredients[i];

    if (!ingredient.name || typeof ingredient.name !== 'string') {
      errors.push({ field: 'ingredients', message: `Ingredient at index ${i} must have a valid name (string)` });
    }

    if (!ingredient.quantity || typeof ingredient.quantity !== 'number') {
      errors.push({ field: 'ingredients', message: `Ingredient at index ${i} must have a valid quantity (number)` });
    }

    if (!ingredient.measurement || typeof ingredient.measurement !== 'string') {
      errors.push({ field: 'ingredients', message: `Ingredient at index ${i} must have a valid measurement (string)` });
    }
  }

    return errors.length > 0 ? errors : null;
}

export default validateDrinkData;