export const TOTAL_PERCENTAGE = 100;
export const MIN_DOMAIN_PERCENTAGE = 1;
export const MAX_DOMAIN_PERCENTAGE = 100;

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

export const updateDomainPercentage = (distribution = [], domainName, nextRawValue) => {
  if (!Array.isArray(distribution) || distribution.length === 0) return [];

  const nextPercentage = sanitizePercentage(nextRawValue);

  return distribution.map((item) => {
    if (item.name !== domainName) {
      return {
        ...item,
        percentage: sanitizePercentage(item.percentage),
        difficulty: sanitizeDifficultyDistribution(item.difficulty)
      };
    }

    return {
      ...item,
      percentage: nextPercentage,
      difficulty: sanitizeDifficultyDistribution(item.difficulty)
    };
  });
};

export const updateDifficultyForDomain = (
  distribution = [],
  domainName,
  difficultyLevel,
  nextRawValue
) => {
  if (!Array.isArray(distribution) || distribution.length === 0) return [];
  if (!DIFFICULTY_LEVELS.includes(difficultyLevel)) return distribution;

  const nextValue = clamp(toInteger(nextRawValue, 0), 0, TOTAL_PERCENTAGE);

  return distribution.map((item) => {
    const sanitizedDifficulty = sanitizeDifficultyDistribution(item.difficulty);

    if (item.name !== domainName) {
      return {
        ...item,
        percentage: sanitizePercentage(item.percentage),
        difficulty: sanitizedDifficulty
      };
    }

    return {
      ...item,
      percentage: sanitizePercentage(item.percentage),
      difficulty: {
        ...sanitizedDifficulty,
        [difficultyLevel]: nextValue
      }
    };
  });
};

export const getUsedDomainPercentage = (distribution = []) => (
  distribution.reduce((sum, item) => sum + sanitizePercentage(item.percentage), 0)
);

export const getRemainingDomainPercentage = (distribution = []) => (
  TOTAL_PERCENTAGE - getUsedDomainPercentage(distribution)
);

export const autoDistributeRemainingPercentage = (distribution = []) => {
  if (!Array.isArray(distribution) || distribution.length === 0) return [];

  const normalized = distribution.map((item) => ({
    ...item,
    percentage: sanitizePercentage(item.percentage),
    difficulty: sanitizeDifficultyDistribution(item.difficulty)
  }));

  const remaining = getRemainingDomainPercentage(normalized);
  if (remaining <= 0) return normalized;

  const unassignedDomains = normalized.filter((item) => item.percentage === 0);
  if (unassignedDomains.length === 0) return normalized;

  const share = Math.floor(remaining / unassignedDomains.length);
  let leftover = remaining - (share * unassignedDomains.length);

  const unassignedSet = new Set(unassignedDomains.map((item) => item.name));

  return normalized.map((item) => {
    if (!unassignedSet.has(item.name)) {
      return item;
    }

    const value = share + (leftover > 0 ? 1 : 0);
    if (leftover > 0) leftover -= 1;

    return {
      ...item,
      percentage: sanitizePercentage(value)
    };
  });
};

export const isValidDomainDistribution = (domains = [], distribution = []) => {
  const normalizedDomains = [...new Set((domains || []).filter(Boolean))];

  if (normalizedDomains.length === 0) {
    return Array.isArray(distribution) && distribution.length === 0;
  }

  if (!Array.isArray(distribution) || distribution.length !== normalizedDomains.length) {
    return false;
  }

  const names = distribution.map((item) => item.name);
  const uniqueNames = new Set(names);

  if (uniqueNames.size !== normalizedDomains.length) return false;
  if (!normalizedDomains.every((domain) => uniqueNames.has(domain))) return false;

  const hasInvalidPercentage = distribution.some((item) => {
    const value = Number(item.percentage);
    return !Number.isInteger(value) || value < MIN_DOMAIN_PERCENTAGE || value > MAX_DOMAIN_PERCENTAGE;
  });

  if (hasInvalidPercentage) return false;

  const used = distribution.reduce((sum, item) => sum + Number(item.percentage || 0), 0);
  if (used !== TOTAL_PERCENTAGE) return false;

  return distribution.every((item) => isValidDifficultyDistribution(item.difficulty));
};
