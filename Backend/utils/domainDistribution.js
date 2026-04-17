export const TOTAL_PERCENTAGE = 100;
export const MIN_DOMAIN_PERCENTAGE = 1;
export const MAX_DOMAIN_PERCENTAGE = 100;
export const MAX_DISTRIBUTION_DOMAINS = TOTAL_PERCENTAGE;

export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];
export const DEFAULT_DIFFICULTY_DISTRIBUTION = {
  easy: 40,
  medium: 40,
  hard: 20
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toInteger = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(parsed);
};

const sanitizePercentage = (value, fallback = 0) => (
  clamp(toInteger(value, fallback), 0, MAX_DOMAIN_PERCENTAGE)
);

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

export const sanitizeDifficultyDistribution = (difficulty = DEFAULT_DIFFICULTY_DISTRIBUTION) => ({
  easy: clamp(toInteger(difficulty?.easy, DEFAULT_DIFFICULTY_DISTRIBUTION.easy), 0, TOTAL_PERCENTAGE),
  medium: clamp(toInteger(difficulty?.medium, DEFAULT_DIFFICULTY_DISTRIBUTION.medium), 0, TOTAL_PERCENTAGE),
  hard: clamp(toInteger(difficulty?.hard, DEFAULT_DIFFICULTY_DISTRIBUTION.hard), 0, TOTAL_PERCENTAGE)
});

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

const toDistributionMap = (distribution = []) => {
  const map = {};

  distribution.forEach((item) => {
    if (!item?.name) return;

    map[item.name] = {
      percentage: sanitizePercentage(item.percentage),
      difficulty: sanitizeDifficultyDistribution(item.difficulty)
    };
  });

  return map;
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
  const uniqueDomains = [...new Set((domains || []).filter(Boolean))];
  const existingMap = toDistributionMap(distribution);

  return uniqueDomains.map((domain) => {
    const existing = existingMap[domain];

    return {
      name: domain,
      percentage: existing ? existing.percentage : 0,
      difficulty: existing ? existing.difficulty : { ...DEFAULT_DIFFICULTY_DISTRIBUTION }
    };
  });
};

export const calculateQuestionCountsFromDistribution = (totalQuestions = 0, distribution = []) => {
  const safeTotal = Math.max(0, parseInt(totalQuestions, 10) || 0);
  if (safeTotal === 0 || !Array.isArray(distribution) || distribution.length === 0) {
    return [];
  }

  const percentages = distribution.map((item) => sanitizePercentage(item.percentage));
  const counts = allocateIntegerByWeights(safeTotal, percentages);

  return distribution.map((item, index) => ({
    name: item.name,
    percentage: percentages[index],
    questionCount: counts[index],
    difficulty: sanitizeDifficultyDistribution(item.difficulty)
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

  const normalizedDifficulty = sanitizeDifficultyDistribution(difficultyDistribution);
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
