import { nanoid } from 'nanoid'
import dotenv from 'dotenv';
dotenv.config();

const COUCHDB_URL = 'http://localhost:5984'; // Replace with your CouchDB URL
const DB_NAME = 'nostr-events';
const AUTH_HEADER = 'Basic ' + process.env.COUCHDB_AUTH_TOKEN; // Replace with your CouchDB username:password encoded string

// Helper function for making fetch requests
const fetchCouchDB = async (path, options = {}) => {
  const url = `${COUCHDB_URL}/${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': AUTH_HEADER,
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.reason || response.statusText);
  }

  return response.json();
};

// Ensure the database exists
(async () => {
  try {
    const databases = await fetchCouchDB('_all_dbs');
    if (!databases.includes(DB_NAME)) {
      await fetchCouchDB(DB_NAME, { method: 'PUT' });
    }
  } catch (error) {
    console.error('Error initializing CouchDB:', error);
  }
})();

// Insert or update an event
export const insertEvent = async (event) => {
  try {
    const docId = event.id || nanoid();
    const existingDoc = await fetchCouchDB(`${DB_NAME}/${docId}`).catch(() => null);

    const doc = { ...event, _id: docId };
    if (existingDoc) {
      doc._rev = existingDoc._rev;
    }

    const result = await fetchCouchDB(`${DB_NAME}/${docId}`, {
      method: 'PUT',
      body: JSON.stringify(doc)
    });
    return { success: true, id: result.id };
  } catch (error) {
    console.error('Error inserting event:', error);
    return { success: false, error: error.message };
  }
};

// Retrieve an event by ID
export const getEvent = async (id) => {
  try {
    const doc = await fetchCouchDB(`${DB_NAME}/${id}`);
    return doc;
  } catch (error) {
    console.error('Error retrieving event:', error);
    return null;
  }
};

// Query all events using Mango
export const findEvents = async (query) => {
  try {
    const docs = await fetchCouchDB(`${DB_NAME}/_find`, {
      method: 'POST',
      body: JSON.stringify(query)
    });
    return docs;
  } catch (error) {
    console.error('Error retrieving event:', error);
    return null;
  }
}

/**
 * Starts a long running listener on CouchDB's _changes feed with include_docs enabled.
 *
 * This function opens a long polling connection to the _changes feed with a timeout of 5 minutes.
 * When the request completes (either because data arrived or due to timeout), it calls the provided
 * callback for each updated document and then immediately reissues the long poll so that it runs continuously.
 *
 * @param {Function} onChange - A callback that is invoked with each updated document from the feed.
 *                              For example, the callback may call broadcastEvent(doc).
 */
export const startChangesFeedListener = async (onChange) => {
  // Start with the "now" sequence so that only new changes are reported.
  // (Alternatively, set this to 0 or a specific seq if you need historical data.)
  let since = 'now';

  /**
   * Poll the CouchDB _changes feed using long polling.
   * Reconnects immediately after the request completes.
   */
  async function pollChanges() {
    // Build the URL with long polling parameters and include_docs.
    const url = `${DB_NAME}/_changes?feed=longpoll&include_docs=true&since=${since}&timeout=300000`;

    try {
      const data = await fetchCouchDB(url);
      if (!data.last_seq) {
        throw new Error(`HTTP error ${data}`);
      }

      // Process each change.
      if (data.results && Array.isArray(data.results)) {
        for (const change of data.results) {
          if (change.doc) {
            onChange(change.doc);
          }
        }
      }

      // Update the since value to the last sequence so subsequent polls only return new changes.
      since = data.last_seq;
    } catch (error) {
      console.error('Error polling _changes feed:', error);
      // Optional: wait a bit before retrying on error.
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } finally {
      // Immediately start the next poll.
      pollChanges();
    }
  }

  // Start the polling loop.
  pollChanges();
}

/**
 * Bulk saves an array of documents to the CouchDB database using the _bulk_docs endpoint.
 *
 * This function allows you to perform a bulk insert/update operation on CouchDB.
 * An optional parameter `customDbName` can be provided to specify a different database
 * (for example, when running tests against a test database).
 *
 * @param {Array<Object>} docs - An array of document objects to be saved.
 * @param {string} [customDbName] - Optional custom database name. If provided, the docs will be saved in that database instead of DB_NAME.
 * @returns {Promise<Object>} The result of the bulk save operation.
 */
export const bulkSaveDocs = async (docs, customDbName) => {
  try {
    const dbName = customDbName || DB_NAME;
    const result = await fetchCouchDB(`${dbName}/_bulk_docs`, {
      method: 'POST',
      body: JSON.stringify({ docs })
    });
    return result;
  } catch (error) {
    console.error('Error in bulk saving docs:', error);
    return { success: false, error: error.message };
  }
};

export default null;
