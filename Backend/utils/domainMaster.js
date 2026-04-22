import { Domain } from '../Models/DB.js';
import { toDomainKey } from './domainCatalog.js';

export const getActiveDomainKeyMap = async () => {
  const domains = await Domain.find({ isDeleted: false, isActive: true })
    .select('name key')
    .lean();

  return domains.reduce((acc, domain) => {
    acc[domain.key] = domain.name;
    return acc;
  }, {});
};

export const canonicalizeDomainList = (domains = [], domainKeyMap = {}) => {
  const canonicalNames = [];
  const unknownDomains = [];

  for (const rawDomain of domains) {
    const key = toDomainKey(rawDomain);
    const canonicalName = key ? domainKeyMap[key] : undefined;

    if (!canonicalName) {
      unknownDomains.push(rawDomain);
      continue;
    }

    if (!canonicalNames.includes(canonicalName)) {
      canonicalNames.push(canonicalName);
    }
  }

  return { canonicalNames, unknownDomains };
};

export const canonicalizeDomainDistributionList = (distribution = [], domainKeyMap = {}) => {
  const unknownDomains = [];

  const canonicalDistribution = distribution.map((item) => {
    const key = toDomainKey(item?.name);
    const canonicalName = key ? domainKeyMap[key] : undefined;

    if (!canonicalName) {
      unknownDomains.push(item?.name);
      return item;
    }

    return {
      ...item,
      name: canonicalName
    };
  });

  return { canonicalDistribution, unknownDomains };
};

export const canonicalizeSingleDomain = (domainName, domainKeyMap = {}) => {
  const key = toDomainKey(domainName);
  if (!key) {
    return null;
  }

  return domainKeyMap[key] || null;
};
