export const TOTAL_PERCENTAGE = 100;
export const MIN_DOMAIN_PERCENTAGE = 10;
export const MAX_SELECTABLE_DOMAINS = TOTAL_PERCENTAGE / MIN_DOMAIN_PERCENTAGE;

const toPreferredMap = (distribution = []) => {
  const map = {};
  distribution.forEach((item) => {
    if (!item?.name) return;
    const percentage = Number(item.percentage);
    if (!Number.isFinite(percentage)) return;
    map[item.name] = percentage;
  });
  return map;
};

const allocateWithMinimum = (domains, total, preferredMap = {}) => {
  const allocation = {};
  if (!Array.isArray(domains) || domains.length === 0) {
    return allocation;
  }

  if (domains.length === 1) {
    allocation[domains[0]] = total;
    return allocation;
  }

  const minimumTotal = domains.length * MIN_DOMAIN_PERCENTAGE;
  const safeTotal = Math.max(total, minimumTotal);
  const extraBudget = safeTotal - minimumTotal;

  let weights = domains.map((domain) => {
    const preferred = preferredMap[domain] ?? MIN_DOMAIN_PERCENTAGE;
    return Math.max(preferred - MIN_DOMAIN_PERCENTAGE, 0);
  });

  if (weights.every((weight) => weight === 0)) {
    weights = domains.map(() => 1);
  }

  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  const rawExtras = weights.map((weight) => (extraBudget * weight) / weightSum);
  const extras = rawExtras.map((value) => Math.floor(value));

  let remainder = extraBudget - extras.reduce((sum, value) => sum + value, 0);

  const fractions = rawExtras
    .map((value, index) => ({
      index,
      fraction: value - Math.floor(value)
    }))
    .sort((a, b) => b.fraction - a.fraction);

  let fractionIndex = 0;
  while (remainder > 0 && fractions.length > 0) {
    const target = fractions[fractionIndex % fractions.length].index;
    extras[target] += 1;
    fractionIndex += 1;
    remainder -= 1;
  }

  domains.forEach((domain, index) => {
    allocation[domain] = MIN_DOMAIN_PERCENTAGE + extras[index];
  });

  return allocation;
};

export const buildDomainDistribution = (domains = [], preferredMap = {}) => {
  if (!Array.isArray(domains) || domains.length === 0) return [];

  if (domains.length === 1) {
    return [{ name: domains[0], percentage: TOTAL_PERCENTAGE }];
  }

  if (domains.length > MAX_SELECTABLE_DOMAINS) {
    const base = Math.floor(TOTAL_PERCENTAGE / domains.length);
    let remainder = TOTAL_PERCENTAGE - (base * domains.length);

    return domains.map((domain) => {
      const percentage = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      return { name: domain, percentage };
    });
  }

  const allocation = allocateWithMinimum(domains, TOTAL_PERCENTAGE, preferredMap);

  return domains.map((domain) => ({
    name: domain,
    percentage: allocation[domain]
  }));
};

export const isValidDomainDistribution = (domains = [], distribution = []) => {
  if (!Array.isArray(domains) || !Array.isArray(distribution)) return false;

  if (domains.length === 0) {
    return distribution.length === 0;
  }

  if (distribution.length !== domains.length) return false;

  const distributionNames = distribution.map((item) => item.name);
  const uniqueNames = new Set(distributionNames);

  if (uniqueNames.size !== domains.length) return false;
  if (!domains.every((domain) => uniqueNames.has(domain))) return false;

  const total = distribution.reduce((sum, item) => sum + Number(item.percentage || 0), 0);
  if (total !== TOTAL_PERCENTAGE) return false;

  if (domains.length === 1) {
    return distribution[0].name === domains[0] && Number(distribution[0].percentage) === TOTAL_PERCENTAGE;
  }

  return distribution.every((item) => {
    const value = Number(item.percentage);
    return Number.isInteger(value) && value >= MIN_DOMAIN_PERCENTAGE && value <= TOTAL_PERCENTAGE;
  });
};

export const normalizeDomainDistribution = (domains = [], distribution = []) => {
  if (!Array.isArray(domains) || domains.length === 0) return [];

  if (isValidDomainDistribution(domains, distribution)) {
    const distributionMap = toPreferredMap(distribution);
    return domains.map((domain) => ({
      name: domain,
      percentage: distributionMap[domain]
    }));
  }

  const preferredMap = toPreferredMap(distribution);
  return buildDomainDistribution(domains, preferredMap);
};

export const getSliderBounds = (domainCount) => {
  if (domainCount <= 1) {
    return { min: TOTAL_PERCENTAGE, max: TOTAL_PERCENTAGE };
  }

  if (domainCount > MAX_SELECTABLE_DOMAINS) {
    return { min: 0, max: TOTAL_PERCENTAGE };
  }

  return {
    min: MIN_DOMAIN_PERCENTAGE,
    max: TOTAL_PERCENTAGE - (domainCount - 1) * MIN_DOMAIN_PERCENTAGE
  };
};

export const rebalanceAfterDomainChange = (
  domains = [],
  currentDistribution = [],
  changedDomain,
  nextRawValue
) => {
  if (!Array.isArray(domains) || domains.length === 0) return [];
  if (!changedDomain || !domains.includes(changedDomain)) {
    return normalizeDomainDistribution(domains, currentDistribution);
  }

  if (domains.length === 1) {
    return [{ name: domains[0], percentage: TOTAL_PERCENTAGE }];
  }

  if (domains.length > MAX_SELECTABLE_DOMAINS) {
    return normalizeDomainDistribution(domains, currentDistribution);
  }

  const { min, max } = getSliderBounds(domains.length);
  const nextValue = Math.min(max, Math.max(min, Math.round(Number(nextRawValue) || min)));

  const otherDomains = domains.filter((domain) => domain !== changedDomain);
  const remaining = TOTAL_PERCENTAGE - nextValue;
  const preferredMap = toPreferredMap(currentDistribution);

  const othersAllocation = allocateWithMinimum(otherDomains, remaining, preferredMap);

  return domains.map((domain) => ({
    name: domain,
    percentage: domain === changedDomain ? nextValue : othersAllocation[domain]
  }));
};
