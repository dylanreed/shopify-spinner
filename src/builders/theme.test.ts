// ABOUTME: Tests for the theme builder that configures Shopify themes.
// ABOUTME: Verifies theme settings JSON generation and upload.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeBuilder } from './theme.js';
import type { ShopifyClient } from '../shopify/client.js';

describe('ThemeBuilder', () => {
  const mockClient = {
    query: vi.fn(),
    mutate: vi.fn(),
  } as unknown as ShopifyClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds settings_data.json from config', () => {
    const builder = new ThemeBuilder(mockClient);

    const themeConfig = {
      source: 'dawn',
      settings: {
        colors: {
          primary: '#FF5733',
          secondary: '#333333',
        },
        typography: {
          heading_font: 'Montserrat',
          body_font: 'Open Sans',
        },
      },
    };

    const settingsData = builder.buildSettingsData(themeConfig);

    expect(settingsData.current.colors_solid_button_labels).toBeDefined();
  });

  it('gets main theme ID', async () => {
    (mockClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      themes: {
        nodes: [
          { id: 'gid://shopify/OnlineStoreTheme/123', name: 'Dawn', role: 'MAIN' },
        ],
      },
    });

    const builder = new ThemeBuilder(mockClient);
    const themeId = await builder.getMainThemeId();

    expect(themeId).toBe('gid://shopify/OnlineStoreTheme/123');
  });

  it('uploads theme settings via API', async () => {
    (mockClient.mutate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      themeFilesUpsert: {
        userErrors: [],
      },
    });

    const builder = new ThemeBuilder(mockClient);
    await builder.uploadThemeSettings('gid://shopify/OnlineStoreTheme/123', { current: { colors_accent_1: '#FF0000' } });

    expect(mockClient.mutate).toHaveBeenCalled();
  });

  it('throws error when upload fails', async () => {
    (mockClient.mutate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      themeFilesUpsert: {
        userErrors: [{ field: 'files', message: 'Invalid file' }],
      },
    });

    const builder = new ThemeBuilder(mockClient);

    await expect(
      builder.uploadThemeSettings('gid://shopify/OnlineStoreTheme/123', { current: {} })
    ).rejects.toThrow('Failed to upload theme settings');
  });

  it('throws error when no main theme found', async () => {
    (mockClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      themes: {
        nodes: [
          { id: 'gid://shopify/OnlineStoreTheme/456', name: 'Test', role: 'UNPUBLISHED' },
        ],
      },
    });

    const builder = new ThemeBuilder(mockClient);

    await expect(builder.getMainThemeId()).rejects.toThrow('No main theme found');
  });

  it('configures theme by getting ID, building settings, and uploading', async () => {
    (mockClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      themes: {
        nodes: [{ id: 'gid://shopify/OnlineStoreTheme/123', name: 'Dawn', role: 'MAIN' }],
      },
    });
    (mockClient.mutate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      themeFilesUpsert: { userErrors: [] },
    });

    const builder = new ThemeBuilder(mockClient);
    await builder.configureTheme({
      source: 'dawn',
      settings: { colors: { primary: '#FF5733' } },
    });

    expect(mockClient.query).toHaveBeenCalled();
    expect(mockClient.mutate).toHaveBeenCalled();
  });
});
