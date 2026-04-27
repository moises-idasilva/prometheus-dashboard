import apisJson from '../../config/apis.json';
import { ApiConfig } from '@/types/metrics';

const apis: ApiConfig[] = apisJson as ApiConfig[];

export function getAllApis(): ApiConfig[] {
  return apis;
}

export function getApiConfig(id: string): ApiConfig | undefined {
  return apis.find((a) => a.id === id);
}

export function isValidApiId(id: string): boolean {
  return apis.some((a) => a.id === id);
}
