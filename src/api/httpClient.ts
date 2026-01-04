/**
 * HTTP client wrapper with automatic X-API-Key injection
 * 
 * This module provides a centralized axios instance that automatically
 * injects the X-API-Key header for service-level authentication when configured.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { configuration } from '@/configuration';
import { logger } from '@/ui/logger';

/**
 * Custom error class for API Key authentication errors
 */
export class ApiKeyAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyAuthError';
  }
}

/**
 * Custom error class for User Token authentication errors
 */
export class TokenAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenAuthError';
  }
}

/**
 * Create and configure the HTTP client instance
 */
function createHttpClient(): AxiosInstance {
  const instance = axios.create();

  // Request interceptor: inject X-API-Key header if configured
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Add X-API-Key header if API key is configured
      if (configuration.apiKey) {
        config.headers = config.headers || {};
        config.headers['X-API-Key'] = configuration.apiKey;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor: handle authentication errors
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        // Try to determine if it's an API Key or Token error
        const errorData = error.response.data as { error?: string; message?: string } | undefined;
        const errorMessage = errorData?.error || errorData?.message || '';
        
        // Check for API Key related errors
        if (
          errorMessage.toLowerCase().includes('api key') ||
          errorMessage.toLowerCase().includes('api-key') ||
          errorMessage.toLowerCase().includes('x-api-key')
        ) {
          logger.debug('[HTTP] API Key authentication failed:', errorMessage);
          return Promise.reject(new ApiKeyAuthError(
            `API Key authentication failed: ${errorMessage}. ` +
            'Please check your API Key configuration using "happy config show" or set HAPPY_API_KEY environment variable.'
          ));
        }

        // Default to Token error for other 401s
        logger.debug('[HTTP] Token authentication failed:', errorMessage);
        return Promise.reject(new TokenAuthError(
          `Authentication failed: ${errorMessage || 'Invalid or expired token'}. ` +
          'Please try "happy auth login --force" to re-authenticate.'
        ));
      }

      return Promise.reject(error);
    }
  );

  return instance;
}

/**
 * Singleton HTTP client instance with X-API-Key injection
 */
export const httpClient = createHttpClient();

/**
 * Get headers object with Authorization and optionally X-API-Key
 * Useful for cases where you need to construct headers manually
 */
export function getAuthHeaders(token: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  if (configuration.apiKey) {
    headers['X-API-Key'] = configuration.apiKey;
  }

  return headers;
}

/**
 * Get extra headers for Socket.IO connections
 * Returns headers object with X-API-Key if configured
 */
export function getSocketExtraHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  if (configuration.apiKey) {
    headers['X-API-Key'] = configuration.apiKey;
  }

  return headers;
}
