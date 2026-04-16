export const TOTAL_PERCENTAGE = 100;
export const MIN_DOMAIN_PERCENTAGE = 10;
export const MAX_DISTRIBUTION_DOMAINS = TOTAL_PERCENTAGE / MIN_DOMAIN_PERCENTAGE;

const toDistributionMap = (distribution = []) => {
  const map = {};

  distribution.forEach((item) => {
    if (!item?.name) return;
    const percentage = Number(item.percentage);
    if (!Number.isFinite(percentage)) return;
    map[item.name] = percentage;
  });

  return map;
};

const allocateWithMinimum = (domains = [], total = TOTAL_PERCENTAGE, preferredMap = {}) => {
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

export const isDistributionMatchingDomains = (domains = [], distribution = []) => {
  if (!Array.isArray(domains) || !Array.isArray(distribution)) return false;
  if (domains.length !== distribution.length) return false;

  const domainSet = new Set(domains);
  const distributionNames = distribution.map((item) => item.name);
  const distributionSet = new Set(distributionNames);

  if (distributionSet.size !== domains.length) return false;

  return [...domainSet].every((domain) => distributionSet.has(domain));
};

export const normalizeDomainDistribution = (domains = [], distribution = []) => {
  if (!Array.isArray(domains) || domains.length === 0) return [];

  if (domains.length === 1) {
    return [{ name: domains[0], percentage: TOTAL_PERCENTAGE }];
  }

  if (domains.length > MAX_DISTRIBUTION_DOMAINS) {
    const base = Math.floor(TOTAL_PERCENTAGE / domains.length);
    let remainder = TOTAL_PERCENTAGE - (base * domains.length);

    return domains.map((domain) => {
      const percentage = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      return { name: domain, percentage };
    });
  }

  const preferredMap = toDistributionMap(distribution);
  const allocation = allocateWithMinimum(domains, TOTAL_PERCENTAGE, preferredMap);

  return domains.map((domain) => ({
    name: domain,
    percentage: allocation[domain]
  }));
};

export const calculateQuestionCountsFromDistribution = (totalQuestions = 0, distribution = []) => {
  const safeTotal = Math.max(0, parseInt(totalQuestions, 10) || 0);
  if (safeTotal === 0 || !Array.isArray(distribution) || distribution.length === 0) {
    return [];
  }

  const rawCounts = distribution.map((item) => (safeTotal * Number(item.percentage || 0)) / TOTAL_PERCENTAGE);
  const counts = rawCounts.map((value) => Math.floor(value));

  let remainder = safeTotal - counts.reduce((sum, value) => sum + value, 0);

  const fractions = rawCounts
    .map((value, index) => ({
      index,
      fraction: value - Math.floor(value)
    }))
    .sort((a, b) => b.fraction - a.fraction);

  let fractionIndex = 0;
  while (remainder > 0 && fractions.length > 0) {
    const target = fractions[fractionIndex % fractions.length].index;
    counts[target] += 1;
    fractionIndex += 1;
    remainder -= 1;
  }

  return distribution.map((item, index) => ({
    name: item.name,
    percentage: Number(item.percentage),
    questionCount: counts[index]
  }));
};
