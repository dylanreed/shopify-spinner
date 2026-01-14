// ABOUTME: Parses CSV product files and groups rows into products with variants.
// ABOUTME: Handles validation of required fields and generates warnings for missing optional data.

import { readFileSync, existsSync } from 'fs';
import type { Product, ProductVariant, ProductParseResult } from './types.js';

/**
 * Parses a CSV line, handling quoted fields that may contain commas.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Parses a CSV file of products and groups rows by handle into products with variants.
 */
export async function parseProductsCsv(path: string): Promise<ProductParseResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const productMap = new Map<string, Product>();

  if (!existsSync(path)) {
    return {
      products: [],
      warnings: [],
      errors: [`File not found: ${path}`],
    };
  }

  const content = readFileSync(path, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return {
      products: [],
      warnings: [],
      errors: ['CSV file is empty'],
    };
  }

  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine);

  // Create column index map
  const colIndex: Record<string, number> = {};
  headers.forEach((header, index) => {
    colIndex[header.toLowerCase()] = index;
  });

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const fields = parseCsvLine(lines[i]);

    const getValue = (col: string): string => {
      const idx = colIndex[col.toLowerCase()];
      return idx !== undefined ? fields[idx] || '' : '';
    };

    const handle = getValue('handle');
    const title = getValue('title');
    const price = getValue('price');

    // Validate required fields
    if (!handle) {
      errors.push(`Row ${rowNum}: Missing required field 'handle'`);
      continue;
    }
    if (!title) {
      errors.push(`Row ${rowNum}: Missing required field 'title'`);
      continue;
    }
    if (!price) {
      errors.push(`Row ${rowNum}: Missing required field 'price'`);
      continue;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
      errors.push(`Row ${rowNum}: Invalid price value '${price}'`);
      continue;
    }

    // Check for missing image_url and warn
    const imageUrl = getValue('image_url');
    if (!imageUrl) {
      warnings.push(`Row ${rowNum}: Missing image_url for product '${handle}'`);
    }

    // Build variant options from variant_option1/2/3 name/value columns
    const options: Record<string, string> = {};
    for (let optNum = 1; optNum <= 3; optNum++) {
      const optName = getValue(`variant_option${optNum}_name`);
      const optValue = getValue(`variant_option${optNum}_value`);
      if (optName && optValue) {
        options[optName] = optValue;
      }
    }

    // Parse optional numeric fields
    const compareAtPriceStr = getValue('compare_at_price');
    const compareAtPrice = compareAtPriceStr
      ? parseFloat(compareAtPriceStr)
      : undefined;

    const inventoryQtyStr = getValue('inventory_qty');
    const inventoryQty = inventoryQtyStr ? parseInt(inventoryQtyStr, 10) : 0;

    const weightStr = getValue('weight');
    const weight = weightStr ? parseFloat(weightStr) : undefined;

    const weightUnit = getValue('weight_unit') as
      | 'lb'
      | 'kg'
      | 'oz'
      | 'g'
      | undefined;

    const variant: ProductVariant = {
      sku: getValue('sku'),
      price: parsedPrice,
      compareAtPrice:
        compareAtPrice !== undefined && !isNaN(compareAtPrice)
          ? compareAtPrice
          : undefined,
      inventoryQty: isNaN(inventoryQty) ? 0 : inventoryQty,
      weight: weight !== undefined && !isNaN(weight) ? weight : undefined,
      weightUnit: weightUnit || undefined,
      imageUrl: imageUrl || undefined,
      options,
    };

    // Check if product already exists (grouping by handle)
    if (productMap.has(handle)) {
      const existingProduct = productMap.get(handle)!;
      existingProduct.variants.push(variant);
    } else {
      // Create new product
      const tagsStr = getValue('tags');
      const tags = tagsStr ? tagsStr.split(';').map((t) => t.trim()) : [];

      const product: Product = {
        handle,
        title,
        description: getValue('description'),
        vendor: getValue('vendor'),
        type: getValue('type'),
        tags,
        variants: [variant],
      };
      productMap.set(handle, product);
    }
  }

  return {
    products: Array.from(productMap.values()),
    warnings,
    errors,
  };
}
