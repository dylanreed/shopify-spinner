// ABOUTME: CLI command to validate config files without creating stores.
// ABOUTME: Returns structured validation results with errors.

import { parseConfigFile } from '../../config/parser.js';
import { z } from 'zod';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  config?: unknown;
}

export async function validateCommand(configPath: string): Promise<ValidationResult> {
  try {
    const config = await parseConfigFile(configPath);
    return {
      valid: true,
      errors: [],
      config,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }

    return {
      valid: false,
      errors: [(error as Error).message],
    };
  }
}
