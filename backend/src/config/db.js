import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '') {
    console.error('Error: MONGODB_URI is missing or empty. Please set MONGODB_URI in backend/.env');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Normalizes a single host string for symmetrical comparison:
 * - Trims whitespace and converts to lowercase.
 * - Strips trailing dots (FQDN formatting).
 * - Strips explicit default MongoDB port (:27017) so explicit and default hostnames match.
 *
 * @param {string} hostStr
 * @returns {string}
 */
const normalizeHost = (hostStr) => {
  if (!hostStr || typeof hostStr !== 'string') return '';
  let h = hostStr.trim().toLowerCase();
  h = h.replace(/\.+$/, '');
  h = h.replace(/:27017$/, '');
  return h;
};

/**
 * Safely extracts and decodes the database name segment from a URI pathname.
 * Handles URL-encoded characters and converts invalid percent-encoding into null.
 *
 * @param {string} rawPath
 * @returns {string | null}
 */
const safeDecodeDatabaseName = (rawPath) => {
  if (!rawPath || typeof rawPath !== 'string') return '';
  const segment = rawPath.replace(/^\/+/, '').split('/')[0].split('?')[0].trim();
  if (!segment) return '';
  try {
    return decodeURIComponent(segment);
  } catch (_) {
    return null;
  }
};

/**
 * Safely parses a MongoDB connection string into its protocol, hosts, and database components.
 * Supports standard mongodb:// and mongodb+srv:// connection schemes.
 * Extracts database name strictly from the URI pathname without exposing credentials.
 *
 * Note: Host comparison checks connection-string host metadata. In DNS/SRV topology,
 * this cannot guarantee that two distinct external domain names do not route to the same
 * underlying infrastructure. Physical cluster isolation requires separate credentials and clusters.
 *
 * @param {string} uriString
 * @returns {{ protocol: string, hosts: string[], database: string } | null}
 */
export const parseMongoUri = (uriString) => {
  if (!uriString || typeof uriString !== 'string') return null;
  const trimmed = uriString.trim();

  // Try WHATWG URL parser
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'mongodb:' && url.protocol !== 'mongodb+srv:') {
      return null;
    }
    const db = safeDecodeDatabaseName(url.pathname);
    if (db === null) return null; // Decode failure on invalid percent sequence
    const hosts = url.host.split(',').map(normalizeHost).filter(Boolean);
    if (hosts.length === 0) return null;
    return {
      protocol: url.protocol,
      hosts,
      database: db,
    };
  } catch (_) {
    // Regex fallback for multi-host comma-separated URIs (e.g. replica sets) unsupported by WHATWG URL
    const match = trimmed.match(
      /^(mongodb(?:\+srv)?):\/\/(?:[^@]+@)?([^\/\?]+)(?:\/([^\?]*))?(?:\?.*)?$/i
    );
    if (!match) return null;
    const protocol = match[1].toLowerCase() + ':';
    const hosts = match[2].split(',').map(normalizeHost).filter(Boolean);
    if (hosts.length === 0) return null;
    const db = safeDecodeDatabaseName(match[3] || '');
    if (db === null) return null;
    return {
      protocol,
      hosts,
      database: db,
    };
  }
};

/**
 * Conservative allowlist for authorized test database names:
 * Only ASCII alphanumeric characters, underscores, and hyphens permitted.
 */
const TEST_DB_NAME_ALLOWLIST = /^[a-zA-Z0-9_-]+$/;

/**
 * Establishes an isolated database connection strictly for test suites.
 * Enforces strict fail-closed safety guards:
 * 1. MONGODB_TEST_URI must be explicitly set and non-empty.
 * 2. MONGODB_TEST_URI must be a valid, parseable MongoDB connection string.
 * 3. Safely decodes and validates database name from URI pathname (must equal "test" or end in "_test" / "-test").
 * 4. Fails closed if MONGODB_URI exists but cannot be safely parsed.
 * 5. Rejects any test URI sharing a cluster host with primary MONGODB_URI (blocks production-cluster reuse).
 * 6. Compares parsed test URI against MONGODB_URI to reject pointing to the same database target.
 * 7. Rejects missing, empty, traversal-like, or malformed database names.
 * 8. Never permits testing against the live production database.
 */
export const connectTestDB = async () => {
  const primaryUri = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : '';
  const testUri = process.env.MONGODB_TEST_URI ? process.env.MONGODB_TEST_URI.trim() : '';

  if (!testUri) {
    const errorMsg =
      '[SAFETY HALT] MONGODB_TEST_URI is not configured in backend/.env.\n' +
      'Test suites are strictly prohibited from connecting to the primary/production database (MONGODB_URI).\n' +
      'Please define an isolated test database URI: MONGODB_TEST_URI=mongodb://.../aurevella_test';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Exact string match rejection
  if (primaryUri && testUri === primaryUri) {
    const errorMsg =
      '[SAFETY HALT] MONGODB_TEST_URI is identical to primary MONGODB_URI.\n' +
      'Running test suites against the primary database will corrupt real data and stock quantities.\n' +
      'A dedicated, separate test database URI is required.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Parse test URI - fail closed if malformed
  const parsedTest = parseMongoUri(testUri);
  if (!parsedTest) {
    const errorMsg =
      '[SAFETY HALT] MONGODB_TEST_URI is malformed or could not be parsed as a valid MongoDB connection string.\n' +
      'Expected format: mongodb://[host]:[port]/[database_name] or mongodb+srv://[host]/[database_name]';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Validate actual database name from pathname
  const rawDbName = parsedTest.database.trim();
  if (!rawDbName) {
    const errorMsg =
      '[SAFETY HALT] MONGODB_TEST_URI does not specify an explicit database name in the path.\n' +
      'Connecting to the default cluster database without an explicit test name is strictly prohibited.\n' +
      'Example: mongodb://127.0.0.1:27017/aurevella_test';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Enforce conservative allowlist on database name (rejects traversal, null bytes, slashes)
  if (!TEST_DB_NAME_ALLOWLIST.test(rawDbName)) {
    const errorMsg =
      `[SAFETY HALT] Target database name "${rawDbName}" contains invalid characters or path traversal.\n` +
      'Database names may only contain alphanumeric characters, underscores, and hyphens.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const testDbName = rawDbName.toLowerCase();

  // Require dedicated test naming convention strictly on the database name
  const isDedicatedTestDb =
    testDbName === 'test' ||
    testDbName.endsWith('_test') ||
    testDbName.endsWith('-test');

  if (!isDedicatedTestDb) {
    const errorMsg =
      `[SAFETY HALT] Target database "${rawDbName}" is not an authorized test database name.\n` +
      'The database name from the URI path must explicitly end with "_test", "-test", or be exactly "test".\n' +
      'Example: /aurevella_test or /aurevella-test';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // If primary URI is configured, enforce strict fail-closed isolation checks
  if (primaryUri) {
    const parsedPrimary = parseMongoUri(primaryUri);
    if (!parsedPrimary) {
      // FAIL CLOSED if primary URI exists but cannot be safely parsed
      const errorMsg =
        '[SAFETY HALT] Primary MONGODB_URI is configured but could not be safely parsed.\n' +
        'Cannot verify database and cluster isolation. Aborting test connection for safety.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const primaryDbName = parsedPrimary.database.trim().toLowerCase();

    // 1. Reject if targeting the same database name
    if (primaryDbName && testDbName === primaryDbName) {
      const errorMsg =
        `[SAFETY HALT] MONGODB_TEST_URI targets the same database ("${parsedPrimary.database}") as primary MONGODB_URI.\n` +
        'Test suites must target a distinct, isolated test database.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // 2. Reject ANY host belonging to the primary/production cluster (blocks production-cluster reuse)
    const sharesHost = parsedPrimary.hosts.some((h) => parsedTest.hosts.includes(h));
    if (sharesHost) {
      const errorMsg =
        '[SAFETY HALT] MONGODB_TEST_URI targets a cluster or host associated with primary MONGODB_URI.\n' +
        'Running test suites against the production cluster is strictly prohibited, even with a separate database name.\n' +
        'Please use an isolated local MongoDB instance (e.g. mongodb://127.0.0.1:27017/aurevella_test) or a dedicated test cluster.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  try {
    const conn = await mongoose.connect(testUri);
    console.log(
      `[Test DB Guard] Successfully connected to dedicated test database: ${conn.connection.host} (${conn.connection.name})`
    );
    return conn;
  } catch (error) {
    console.error(`[Test DB Guard] Connection failed: ${error.message}`);
    throw error;
  }
};
