export const TOTAL_PERCENTAGE = 100;
export const MIN_DOMAIN_PERCENTAGE = 10;
export const MAX_SELECTABLE_DOMAINS = TOTAL_PERCENTAGE / MIN_DOMAIN_PERCENTAGE;
export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];
export const DEFAULT_DIFFICULTY_DISTRIBUTION = {
  easy: 40,
  medium: 40,
  hard: 20
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const allocateIntegerByWeights = (total, rawWeights = []) => {
  const safeTotal = Math.max(0, Math.round(Number(total) || 0));
  if (safeTotal === 0) {
    return rawWeights.map(() => 0);
  }

  const sanitizedWeights = rawWeights.map((weight) => {
    const parsed = Number(weight);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  });

  const weightSum = sanitizedWeights.reduce((sum, value) => sum + value, 0);
  const effectiveWeights = weightSum > 0
    ? sanitizedWeights
    : sanitizedWeights.map(() => 1);

  const effectiveWeightSum = effectiveWeights.reduce((sum, value) => sum + value, 0);
  const rawAllocations = effectiveWeights.map(
    (weight) => (safeTotal * weight) / effectiveWeightSum
  );
  const allocations = rawAllocations.map((value) => Math.floor(value));

  let remainder = safeTotal - allocations.reduce((sum, value) => sum + value, 0);

  const fractions = rawAllocations
    .map((value, index) => ({
      index,
      fraction: value - Math.floor(value)
    }))
    .sort((a, b) => b.fraction - a.fraction);

  let cursor = 0;
  while (remainder > 0 && fractions.length > 0) {
    const target = fractions[cursor % fractions.length].index;
    allocations[target] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return allocations;
};

export const normalizeDifficultyDistribution = (difficulty = DEFAULT_DIFFICULTY_DISTRIBUTION) => {
  if (!difficulty || typeof difficulty !== 'object') {
    return { ...DEFAULT_DIFFICULTY_DISTRIBUTION };
  }

  const parsed = DIFFICULTY_LEVELS.map((level) => {
    const value = Number(difficulty[level]);
    if (!Number.isFinite(value)) return null;
    return clamp(Math.round(value), 0, 100);
  });

  const hasAnyValue = parsed.some((value) => value !== null);

  const weightInput = hasAnyValue
    ? parsed.map((value, index) => (
      value === null ? DEFAULT_DIFFICULTY_DISTRIBUTION[DIFFICULTY_LEVELS[index]] : value
    ))
    : DIFFICULTY_LEVELS.map((level) => DEFAULT_DIFFICULTY_DISTRIBUTION[level]);

  const allocated = allocateIntegerByWeights(TOTAL_PERCENTAGE, weightInput);

  return {
    easy: allocated[0],
    medium: allocated[1],
    hard: allocated[2]
  };
};

export const getDifficultyTotal = (difficulty = {}) => (
  DIFFICULTY_LEVELS.reduce((sum, level) => sum + (Number(difficulty[level]) || 0), 0)
);

export const isValidDifficultyDistribution = (difficulty = {}) => {
  if (!difficulty || typeof difficulty !== 'object') return false;

  const values = DIFFICULTY_LEVELS.map((level) => Number(difficulty[level]));

  const hasInvalidValue = values.some((value) => (
    !Number.isInteger(value) || value < 0 || value > TOTAL_PERCENTAGE
  ));

  if (hasInvalidValue) return false;

  return values.reduce((sum, value) => sum + value, 0) === TOTAL_PERCENTAGE;
};

const toPreferredMap = (distribution = []) => {
  const map = {};

  distribution.forEach((item) => {
    if (!item?.name) return;
    const percentage = Number(item.percentage);
    if (!Number.isFinite(percentage)) return;

    map[item.name] = {
      percentage,
      difficulty: normalizeDifficultyDistribution(item.difficulty)
    };
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
    const preferred = preferredMap[domain]?.percentage ?? MIN_DOMAIN_PERCENTAGE;
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
    return [{
      name: domains[0],
      percentage: TOTAL_PERCENTAGE,
      difficulty: normalizeDifficultyDistribution(preferredMap[domains[0]]?.difficulty)
    }];
  }

  if (domains.length > MAX_SELECTABLE_DOMAINS) {
    const base = Math.floor(TOTAL_PERCENTAGE / domains.length);
    let remainder = TOTAL_PERCENTAGE - (base * domains.length);

    return domains.map((domain) => {
      const percentage = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      return {
        name: domain,
        percentage,
        difficulty: normalizeDifficultyDistribution(preferredMap[domain]?.difficulty)
      };
    });
  }

  const allocation = allocateWithMinimum(domains, TOTAL_PERCENTAGE, preferredMap);

  return domains.map((domain) => ({
    name: domain,
    percentage: allocation[domain],
    difficulty: normalizeDifficultyDistribution(preferredMap[domain]?.difficulty)
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
    const hasSingleDomain = distribution[0].name === domains[0]
      && Number(distribution[0].percentage) === TOTAL_PERCENTAGE;

    if (!hasSingleDomain) return false;

    return isValidDifficultyDistribution(distribution[0].difficulty);
  }

  return distribution.every((item) => {
    const value = Number(item.percentage);
    const isValidPercentage = Number.isInteger(value)
      && value >= MIN_DOMAIN_PERCENTAGE
      && value <= TOTAL_PERCENTAGE;

    if (!isValidPercentage) return false;

    return isValidDifficultyDistribution(item.difficulty);
  });
};

export const normalizeDomainDistribution = (domains = [], distribution = []) => {
  if (!Array.isArray(domains) || domains.length === 0) return [];

  if (isValidDomainDistribution(domains, distribution)) {
    const distributionMap = toPreferredMap(distribution);

    return domains.map((domain) => ({
      name: domain,
      percentage: distributionMap[domain].percentage,
      difficulty: normalizeDifficultyDistribution(distributionMap[domain].difficulty)
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
    const map = toPreferredMap(currentDistribution);

    return [{
      name: domains[0],
      percentage: TOTAL_PERCENTAGE,
      difficulty: normalizeDifficultyDistribution(map[domains[0]]?.difficulty)
    }];
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
    percentage: domain === changedDomain ? nextValue : othersAllocation[domain],
    difficulty: normalizeDifficultyDistribution(preferredMap[domain]?.difficulty)
  }));
};

export const updateDifficultyForDomain = (
  distribution = [],
  domainName,
  difficultyLevel,
  nextRawValue
) => {
  if (!Array.isArray(distribution) || distribution.length === 0) return [];
  if (!domainName || !DIFFICULTY_LEVELS.includes(difficultyLevel)) return distribution;

  const nextValue = clamp(Math.round(Number(nextRawValue) || 0), 0, TOTAL_PERCENTAGE);

  return distribution.map((item) => {
    if (item.name !== domainName) {
      return {
        ...item,
        difficulty: normalizeDifficultyDistribution(item.difficulty)
      };
    }

    const normalizedDifficulty = normalizeDifficultyDistribution(item.difficulty);
    const otherLevels = DIFFICULTY_LEVELS.filter((level) => level !== difficultyLevel);
    const remaining = TOTAL_PERCENTAGE - nextValue;

    const otherAllocations = allocateIntegerByWeights(
      remaining,
      otherLevels.map((level) => normalizedDifficulty[level])
    );

    const nextDifficulty = {
      ...normalizedDifficulty,
      [difficultyLevel]: nextValue
    };

    otherLevels.forEach((level, index) => {
      nextDifficulty[level] = otherAllocations[index];
    });

    return {
      ...item,
      difficulty: nextDifficulty
    };
  });
};
