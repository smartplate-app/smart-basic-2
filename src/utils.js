import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const isIframe = window.self !== window.top;

const BASE_PATH = import.meta.env.BASE_URL || '/';

export function createPageUrl(pageName) {
  const base = BASE_PATH.endsWith('/') ? BASE_PATH.slice(0, -1) : BASE_PATH;
  const query = pageName.includes('?') ? pageName.slice(pageName.indexOf('?')) : '';
  const page = pageName.includes('?') ? pageName.slice(0, pageName.indexOf('?')) : pageName;
  return `${base}/${page}${query}`;
}
