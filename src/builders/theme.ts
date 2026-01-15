// ABOUTME: Builds and configures Shopify themes via GraphQL API.
// ABOUTME: Uploads theme settings via settings_data.json asset.

import type { ShopifyClient } from '../shopify/client.js';

interface ThemeConfig {
  source?: string;
  settings?: {
    colors?: {
      primary?: string;
      secondary?: string;
    };
    typography?: {
      heading_font?: string;
      body_font?: string;
    };
    logo?: string;
  };
}

interface ThemeNode {
  id: string;
  name: string;
  role: 'MAIN' | 'UNPUBLISHED' | 'DEMO';
}

interface ThemesQueryResponse {
  themes: {
    nodes: ThemeNode[];
  };
}

interface ThemeFilesUpsertResponse {
  themeFilesUpsert: {
    userErrors: Array<{ field: string; message: string }>;
  };
}

const THEMES_QUERY = `
  query {
    themes(first: 10) {
      nodes {
        id
        name
        role
      }
    }
  }
`;

const THEME_FILES_UPSERT_MUTATION = `
  mutation ThemeFilesUpsert($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
    themeFilesUpsert(themeId: $themeId, files: $files) {
      userErrors {
        field
        message
      }
    }
  }
`;

export class ThemeBuilder {
  private client: ShopifyClient;

  constructor(client: ShopifyClient) {
    this.client = client;
  }

  buildSettingsData(themeConfig: ThemeConfig): Record<string, unknown> {
    const settings: Record<string, unknown> = {};

    if (themeConfig.settings?.colors?.primary) {
      settings.colors_solid_button_labels = themeConfig.settings.colors.primary;
      settings.colors_accent_1 = themeConfig.settings.colors.primary;
    }

    if (themeConfig.settings?.colors?.secondary) {
      settings.colors_accent_2 = themeConfig.settings.colors.secondary;
    }

    if (themeConfig.settings?.typography?.heading_font) {
      settings.type_header_font = themeConfig.settings.typography.heading_font;
    }

    if (themeConfig.settings?.typography?.body_font) {
      settings.type_body_font = themeConfig.settings.typography.body_font;
    }

    return {
      current: settings,
    };
  }

  async getMainThemeId(): Promise<string> {
    const response = await this.client.query<ThemesQueryResponse>(THEMES_QUERY);

    const mainTheme = response.themes.nodes.find((t) => t.role === 'MAIN');

    if (!mainTheme) {
      throw new Error('No main theme found');
    }

    return mainTheme.id;
  }

  async uploadThemeSettings(
    themeId: string,
    settingsData: Record<string, unknown>
  ): Promise<void> {
    const response = await this.client.mutate<ThemeFilesUpsertResponse>(
      THEME_FILES_UPSERT_MUTATION,
      {
        themeId,
        files: [
          {
            filename: 'config/settings_data.json',
            body: {
              type: 'JSON',
              value: JSON.stringify(settingsData, null, 2),
            },
          },
        ],
      }
    );

    if (response.themeFilesUpsert.userErrors.length > 0) {
      const errors = response.themeFilesUpsert.userErrors
        .map((e) => `${e.field}: ${e.message}`)
        .join(', ');
      throw new Error(`Failed to upload theme settings: ${errors}`);
    }
  }

  async configureTheme(themeConfig: ThemeConfig): Promise<void> {
    const themeId = await this.getMainThemeId();
    const settingsData = this.buildSettingsData(themeConfig);
    await this.uploadThemeSettings(themeId, settingsData);
  }
}
