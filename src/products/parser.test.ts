// ABOUTME: Tests for CSV product file parsing.
// ABOUTME: Verifies product/variant grouping and validation.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseProductsCsv } from './parser.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/spinner-test-products';

describe('parseProductsCsv', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('parses a simple product CSV', async () => {
    const csvPath = join(TEST_DIR, 'products.csv');
    writeFileSync(csvPath, `handle,title,description,vendor,type,tags,price,compare_at_price,sku,inventory_qty,weight,weight_unit,image_url,variant_option1_name,variant_option1_value
basic-tee,Basic Cotton Tee,Soft everyday comfort,Acme,Shirts,cotton;basics,29.99,39.99,TEE-001,100,0.3,lb,https://example.com/tee.jpg,,`);

    const result = await parseProductsCsv(csvPath);

    expect(result.errors).toHaveLength(0);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].handle).toBe('basic-tee');
    expect(result.products[0].title).toBe('Basic Cotton Tee');
    expect(result.products[0].tags).toEqual(['cotton', 'basics']);
    expect(result.products[0].variants).toHaveLength(1);
    expect(result.products[0].variants[0].price).toBe(29.99);
  });

  it('groups variants by handle', async () => {
    const csvPath = join(TEST_DIR, 'variants.csv');
    writeFileSync(csvPath, `handle,title,description,vendor,type,tags,price,compare_at_price,sku,inventory_qty,weight,weight_unit,image_url,variant_option1_name,variant_option1_value
hoodie,Logo Hoodie,Warm and cozy,Acme,Hoodies,winter,59.99,,HOOD-S,50,0.8,lb,https://example.com/hoodie.jpg,Size,Small
hoodie,Logo Hoodie,Warm and cozy,Acme,Hoodies,winter,59.99,,HOOD-M,30,0.8,lb,https://example.com/hoodie.jpg,Size,Medium
hoodie,Logo Hoodie,Warm and cozy,Acme,Hoodies,winter,64.99,,HOOD-L,25,0.9,lb,https://example.com/hoodie.jpg,Size,Large`);

    const result = await parseProductsCsv(csvPath);

    expect(result.products).toHaveLength(1);
    expect(result.products[0].variants).toHaveLength(3);
    expect(result.products[0].variants[0].options).toEqual({ Size: 'Small' });
    expect(result.products[0].variants[2].price).toBe(64.99);
  });

  it('returns errors for missing required fields', async () => {
    const csvPath = join(TEST_DIR, 'missing.csv');
    writeFileSync(csvPath, `handle,title,description,vendor,type,tags,price,compare_at_price,sku,inventory_qty,weight,weight_unit,image_url,variant_option1_name,variant_option1_value
,Missing Handle,Description,Acme,Shirts,tag,29.99,,SKU-001,100,,,,,`);

    const result = await parseProductsCsv(csvPath);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('handle');
  });

  it('warns on missing images but continues', async () => {
    const csvPath = join(TEST_DIR, 'no-image.csv');
    writeFileSync(csvPath, `handle,title,description,vendor,type,tags,price,compare_at_price,sku,inventory_qty,weight,weight_unit,image_url,variant_option1_name,variant_option1_value
no-img,No Image Product,Description,Acme,Shirts,tag,29.99,,SKU-001,100,,,,,`);

    const result = await parseProductsCsv(csvPath);

    expect(result.errors).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('image');
    expect(result.products).toHaveLength(1);
  });
});
