export const TOTAL_PERCENTAGE = 100;
export const MIN_DOMAIN_PERCENTAGE = 10;
export const MAX_DISTRIBUTION_DOMAINS = TOTAL_PERCENTAGE / MIN_DOMAIN_PERCENTAGE;
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

export const isValidDifficultyDistribution = (difficulty = {}) => {
  if (!difficulty || typeof difficulty !== 'object') return false;

  const values = DIFFICULTY_LEVELS.map((level) => Number(difficulty[level]));

  const hasInvalidValue = values.some((value) => (
    !Number.isInteger(value) || value < 0 || value > TOTAL_PERCENTAGE
  ));

  if (hasInvalidValue) return false;

  return values.reduce((sum, value) => sum + value, 0) === TOTAL_PERCENTAGE;
};

const toDistributionMap = (distribution = []) => {
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
    const preferredMap = toDistributionMap(distribution);
    return [{
      name: domains[0],
      percentage: TOTAL_PERCENTAGE,
      difficulty: normalizeDifficultyDistribution(preferredMap[domains[0]]?.difficulty)
    }];
  }

  if (domains.length > MAX_DISTRIBUTION_DOMAINS) {
    const preferredMap = toDistributionMap(distribution);
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

  const preferredMap = toDistributionMap(distribution);
  const allocation = allocateWithMinimum(domains, TOTAL_PERCENTAGE, preferredMap);

  return domains.map((domain) => ({
    name: domain,
    percentage: allocation[domain],
    difficulty: normalizeDifficultyDistribution(preferredMap[domain]?.difficulty)
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
    questionCount: counts[index],
    difficulty: normalizeDifficultyDistribution(item.difficulty)
  }));
};

export const calculateDifficultyQuestionCounts = (
  totalQuestions = 0,
  difficultyDistribution = DEFAULT_DIFFICULTY_DISTRIBUTION
) => {
  const safeTotal = Math.max(0, parseInt(totalQuestions, 10) || 0);
  if (safeTotal === 0) {
    return [];
  }

  const normalizedDifficulty = normalizeDifficultyDistribution(difficultyDistribution);
  const counts = allocateIntegerByWeights(
    safeTotal,
    DIFFICULTY_LEVELS.map((level) => normalizedDifficulty[level])
  );

  return DIFFICULTY_LEVELS.map((difficulty, index) => ({
    difficulty,
    percentage: normalizedDifficulty[difficulty],
    questionCount: counts[index]
  }));
};
