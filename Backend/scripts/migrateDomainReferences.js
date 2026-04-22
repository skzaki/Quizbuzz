import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeDomainName, toDomainKey } from '../utils/domainCatalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadEnvFile = () => {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, 'utf-8');
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
};

loadEnvFile();

const BULK_SIZE = 500;

const flushBulk = async (model, operations = []) => {
  if (operations.length === 0) return;
  await model.bulkWrite(operations);
  operations.length = 0;
};

const sameObjectId = (left, right) => {
  if (!left || !right) return false;
  return left.toString() === right.toString();
};

const buildDomainLookup = async (DomainModel) => {
  const domains = await DomainModel.find({ isDeleted: false }).select('_id key name').lean();

  return domains.reduce((acc, domain) => {
    acc[domain.key] = domain;
    return acc;
  }, {});
};

const migrateQuestions = async (QuestionModel, domainLookup) => {
  const operations = [];
  let scanned = 0;
  let updated = 0;
  let unresolved = 0;

  const questions = await QuestionModel.find({ isDeleted: false })
    .select('_id domain domainRef')
    .lean();

  for (const question of questions) {
    scanned += 1;

    const normalizedName = normalizeDomainName(question.domain || '');
    const key = toDomainKey(normalizedName);
    const matchedDomain = domainLookup[key];

    if (!matchedDomain) {
      unresolved += 1;
      continue;
    }

    const updateSet = {};

    if (question.domain !== matchedDomain.name) {
      updateSet.domain = matchedDomain.name;
    }

    if (!sameObjectId(question.domainRef, matchedDomain._id)) {
      updateSet.domainRef = matchedDomain._id;
    }

    if (Object.keys(updateSet).length === 0) {
      continue;
    }

    operations.push({
      updateOne: {
        filter: { _id: question._id },
        update: { $set: updateSet }
      }
    });

    updated += 1;

    if (operations.length >= BULK_SIZE) {
      await flushBulk(QuestionModel, operations);
    }
  }

  await flushBulk(QuestionModel, operations);

  return { scanned, updated, unresolved };
};

const dedupe = (values = []) => {
  const seen = new Set();
  const result = [];

  values.forEach((value) => {
    if (!value) return;
    const key = value.toString();
    if (seen.has(key)) return;

    seen.add(key);
    result.push(value);
  });

  return result;
};

const migrateContests = async (ContestModel, domainLookup) => {
  const operations = [];
  let scanned = 0;
  let updated = 0;
  let unresolvedTopics = 0;
  let unresolvedDistribution = 0;

  const contests = await ContestModel.find({ isDeleted: false })
    .select('_id topics topicRefs domainDistribution')
    .lean();

  for (const contest of contests) {
    scanned += 1;

    const normalizedTopics = [];
    const topicRefs = [];

    const rawTopics = Array.isArray(contest.topics) ? contest.topics : [];
    for (const rawTopic of rawTopics) {
      const normalizedTopic = normalizeDomainName(rawTopic || '');
      if (!normalizedTopic) continue;

      const matchedDomain = domainLookup[toDomainKey(normalizedTopic)];
      if (matchedDomain) {
        if (!normalizedTopics.includes(matchedDomain.name)) {
          normalizedTopics.push(matchedDomain.name);
          topicRefs.push(matchedDomain._id);
        }
      } else {
        unresolvedTopics += 1;
        if (!normalizedTopics.includes(normalizedTopic)) {
          normalizedTopics.push(normalizedTopic);
        }
      }
    }

    const normalizedDistribution = (Array.isArray(contest.domainDistribution)
      ? contest.domainDistribution
      : []
    ).map((item) => {
      const normalizedName = normalizeDomainName(item?.name || '');
      const matchedDomain = domainLookup[toDomainKey(normalizedName)];

      if (!matchedDomain) {
        unresolvedDistribution += 1;
        return {
          ...item,
          name: normalizedName
        };
      }

      return {
        ...item,
        name: matchedDomain.name,
        domainRef: matchedDomain._id
      };
    });

    const normalizedTopicRefs = dedupe(topicRefs);

    const updateSet = {
      topics: normalizedTopics,
      topicRefs: normalizedTopicRefs,
      domainDistribution: normalizedDistribution
    };

    const hasTopicsChanged = JSON.stringify(contest.topics || []) !== JSON.stringify(normalizedTopics);
    const hasTopicRefsChanged = JSON.stringify((contest.topicRefs || []).map((value) => value.toString())) !== JSON.stringify(normalizedTopicRefs.map((value) => value.toString()));
    const hasDistributionChanged = JSON.stringify(contest.domainDistribution || []) !== JSON.stringify(normalizedDistribution);

    if (!hasTopicsChanged && !hasTopicRefsChanged && !hasDistributionChanged) {
      continue;
    }

    operations.push({
      updateOne: {
        filter: { _id: contest._id },
        update: { $set: updateSet }
      }
    });

    updated += 1;

    if (operations.length >= BULK_SIZE) {
      await flushBulk(ContestModel, operations);
    }
  }

  await flushBulk(ContestModel, operations);

  return { scanned, updated, unresolvedTopics, unresolvedDistribution };
};

const run = async () => {
  try {
    let mongooseModule;
    let dbModule;

    try {
      mongooseModule = await import('mongoose');
      dbModule = await import('../Models/DB.js');
    } catch (moduleError) {
      if (moduleError?.code === 'ERR_MODULE_NOT_FOUND') {
        console.error('Missing Backend dependencies. Run `npm install` inside Backend, then rerun `npm run migrate:domain-refs`.');
      }

      throw moduleError;
    }

    const mongoose = mongooseModule.default;
    const { Contest, Domain, Question } = dbModule;

    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected to MongoDB');

    const domainLookup = await buildDomainLookup(Domain);
    const knownDomainCount = Object.keys(domainLookup).length;

    if (knownDomainCount === 0) {
      console.log('No domains found. Seed domains first, then retry migration.');
      process.exit(1);
    }

    const questionSummary = await migrateQuestions(Question, domainLookup);
    const contestSummary = await migrateContests(Contest, domainLookup);

    console.log('Domain reference migration completed');
    console.table({
      knownDomainCount,
      questionScanned: questionSummary.scanned,
      questionUpdated: questionSummary.updated,
      questionUnresolved: questionSummary.unresolved,
      contestScanned: contestSummary.scanned,
      contestUpdated: contestSummary.updated,
      contestUnresolvedTopics: contestSummary.unresolvedTopics,
      contestUnresolvedDistribution: contestSummary.unresolvedDistribution
    });

    process.exit(0);
  } catch (error) {
    console.error('Domain reference migration failed:', error);
    process.exit(1);
  }
};

run();
