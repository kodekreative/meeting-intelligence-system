/**
 * Microsoft Authentication Service
 * Handles OAuth flow with Microsoft Graph API
 */

import { ConfidentialClientApplication, AuthorizationUrlRequest, AuthorizationCodeRequest } from '@azure/msal-node'
import { Client } from '@microsoft/microsoft-graph-client'
import crypto from 'crypto'

interface MicrosoftAuthConfig {
  clientId: string
  clientSecret: string
  tenantId: string
  redirectUri: string
  scopes: string[]
}

interface TokenSet {
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  scope: string
}

class MicrosoftAuthService {
  private msalClient?: ConfidentialClientApplication
  private config: MicrosoftAuthConfig
  private encryptionKey: Buffer

  constructor() {
    // Load configuration from environment
    this.config = {
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
      redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/callback',
      scopes: (process.env.MICROSOFT_SCOPES || 'Calendars.Read,offline_access').split(','),
    }

    // Initialize encryption key
    const key = process.env.ENCRYPTION_KEY || 'default_key_change_in_production'
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32)

    // Only initialize MSAL client if credentials are configured
    // This prevents crashes when Azure AD credentials are not set
    if (this.config.clientId && this.config.clientSecret) {
      this.msalClient = new ConfidentialClientApplication({
        auth: {
          clientId: this.config.clientId,
          authority: `https://login.microsoftonline.com/${this.config.tenantId}`,
          clientSecret: this.config.clientSecret,
        },
      })
    }
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  async getAuthUrl(userId: string): Promise<string> {
    const authCodeUrlParameters: AuthorizationUrlRequest = {
      scopes: this.config.scopes.map(scope => `https://graph.microsoft.com/${scope.trim()}`),
      redirectUri: this.config.redirectUri,
      state: this.encryptState({ userId, timestamp: Date.now() }),
      prompt: 'select_account',
    }

    const authUrl = await this.msalClient.getAuthCodeUrl(authCodeUrlParameters)
    return authUrl
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokenFromCode(code: string, state: string): Promise<{ tokens: TokenSet; userId: string }> {
    // Decrypt and verify state
    const stateData = this.decryptState(state)

    const tokenRequest: AuthorizationCodeRequest = {
      code,
      scopes: this.config.scopes.map(scope => `https://graph.microsoft.com/${scope.trim()}`),
      redirectUri: this.config.redirectUri,
    }

    const response = await this.msalClient.acquireTokenByCode(tokenRequest)

    if (!response) {
      throw new Error('Failed to acquire token')
    }

    const tokens: TokenSet = {
      accessToken: response.accessToken,
      // MSAL AuthenticationResult no longer exposes refreshToken; persist accessToken and expiresOn
      refreshToken: (response as any).refreshToken,
      expiresAt: response.expiresOn || new Date(Date.now() + 3600 * 1000),
      scope: response.scopes?.join(',') || '',
    }

    return {
      tokens,
      userId: stateData.userId,
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenSet> {
    const refreshTokenRequest = {
      refreshToken,
      scopes: this.config.scopes.map(scope => `https://graph.microsoft.com/${scope.trim()}`),
    }

    const response = await this.msalClient.acquireTokenByRefreshToken(refreshTokenRequest)

    if (!response) {
      throw new Error('Failed to refresh token')
    }

    return {
      accessToken: response.accessToken,
      refreshToken: ((response as any).refreshToken) || refreshToken,
      expiresAt: response.expiresOn || new Date(Date.now() + 3600 * 1000),
      scope: response.scopes?.join(',') || '',
    }
  }

  /**
   * Create Microsoft Graph client with access token
   */
  getGraphClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken)
      },
    })
  }

  /**
   * Encrypt token for storage
   */
  encryptToken(token: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv)

    let encrypted = cipher.update(token, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return `${iv.toString('hex')}:${encrypted}`
  }

  /**
   * Decrypt token from storage
   */
  decryptToken(encryptedToken: string): string {
    const [ivHex, encrypted] = encryptedToken.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  /**
   * Encrypt state parameter for OAuth flow
   */
  private encryptState(data: any): string {
    const stateString = JSON.stringify(data)
    return this.encryptToken(stateString)
  }

  /**
   * Decrypt state parameter from OAuth callback
   */
  private decryptState(encryptedState: string): any {
    const stateString = this.decryptToken(encryptedState)
    return JSON.parse(stateString)
  }

  /**
   * Check if token is expired or about to expire
   */
  isTokenExpired(expiresAt: Date, bufferMinutes: number = 5): boolean {
    const bufferMs = bufferMinutes * 60 * 1000
    return new Date(expiresAt).getTime() - bufferMs < Date.now()
  }
}

export const microsoftAuthService = new MicrosoftAuthService()
export type { TokenSet }
