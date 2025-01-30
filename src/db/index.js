import { nanoid } from 'nanoid'

const COUCHDB_URL = 'http://localhost:5984'; // Replace with your CouchDB URL
const DB_NAME = 'nostr-events';
const AUTH_HEADER = 'Basic ' + btoa('radu:sirius'); // Replace with your CouchDB username:password

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
    console.log('Starting Insert event', event)
    const docId = event.id || nanoid();
    const existingDoc = await fetchCouchDB(`${DB_NAME}/${docId}`).catch(() => null);

    const doc = { ...event, _id: docId };
    console.log('Inserting event', doc)
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

export default null;
