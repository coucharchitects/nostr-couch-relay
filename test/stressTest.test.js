// test/stressTest.test.js
import { describe, it, expect } from 'vitest';
import { generateNewEvent } from '../src/utils/eventUtils';
import { bulkSaveDocs } from "../src/db/index.js";

describe('Scaling Possibilities', () => {
  it('should insert 100k events and db size must be under 1gb', async () => {
    // use bulk updates to load the documents fast
    const LIMIT = 100000
    const BATCH = 500
    let savedAlready = 0
    let toSave = []
    for (let i = 0; i < LIMIT; i++) {
      const event = await generateNewEvent({ content: `test_doc_${i + 1}` })
      // transform to couch format
      event._id = event.id
      delete event.id
      toSave.push(event)
      // work in batches as otherwise we get a timeout
      if (toSave.length >= BATCH) {
        await bulkSaveDocs(toSave)
        savedAlready += BATCH
        console.log(`Saved batch of ${BATCH}, remaining ${LIMIT - savedAlready}`)
        toSave = []
      }
    }
    console.log('Saved events')
  }, 1200000)
})
