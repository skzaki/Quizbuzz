export const DEFAULT_DOMAIN_NAMES = ['Java', 'Python', 'Cloud', 'JavaScript'];

export const normalizeDomainName = (value = '') => value.trim().replace(/\s+/g, ' ');

export const toDomainKey = (value = '') => normalizeDomainName(value).toLowerCase();
