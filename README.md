<p align="center">
<img src="./logo.jpg" alt="CouchDB-NOSTR logo" width="200" height="200">
</p>

# CouchDB-NOSTR Relay Server

## Overview

This project is a **CouchDB-based NOSTR relay server** designed to efficiently store and distribute messages across the decentralized NOSTR network. By leveraging **CouchDB’s multi-master replication, deterministic revision hashes, and HTTP-native API**, this relay provides a scalable and fault-tolerant solution for relaying NOSTR events.

## Features

-   **Multi-Master Replication**: Seamlessly sync events across multiple relays without additional middleware.

-   **Deterministic Revision Hashes**: Ensures identical events stored in different instances have the same hash, making data verification efficient.

-   **Schema-Free JSON Storage**: Stores NOSTR events as JSON documents, allowing flexibility in event evolution.

-   **Database-Per-User Model**: Optionally assign individual databases for users, improving privacy and scalability.

-   **Web-Native API**: Utilize CouchDB’s RESTful API for efficient event storage and retrieval.

-   **Built-In Fault Tolerance**: Relays continue functioning even in the event of node failures.

-   **Precomputed MapReduce Indexes**: Speeds up querying for specific events and metadata filtering.

## Implemented NIPs

- [x] NIP-01: Basic protocol flow description
- [ ] NIP-02: Follow list

## Installation

### Prerequisites

-   **CouchDB v3.x+** installed and running.

-   **Node.js 20+** for the websocket server.


### Setup Instructions

1.  **Clone the repository**:

    ```
    git clone https://github.com/yourusername/couchdb-nostr-relay.git
    cd couchdb-nostr-relay
    npm install
    ```

2.  **Configure CouchDB**:

    -   Create the necessary databases:

        ```
        curl -X PUT http://localhost:5984/nostr_events
        ```

3.  **Run the relay server**:

    ```
    node src/server.js
    ```


## API Endpoints

### Store an Event

```
curl -X POST http://localhost:5984/nostr_events \
     -H "Content-Type: application/json" \
     -d '{"id": "event_id", "pubkey": "user_pubkey", "content": "message_content", "sig": "signature"}'
```

### Retrieve an Event

```
curl -X GET http://localhost:5984/nostr_events/event_id
```

### Query Events by Author

```
curl -X GET "http://localhost:5984/nostr_events/_design/events/_view/by_pubkey?key=\"user_pubkey\""
```

## Security Considerations

-   **Restrict CouchDB access**: Ensure only the relay server has write access.

-   **Use Reverse Proxies**: Protect the database with **Caddy** or **NGINX**.

-   **Enable Authentication**: Use CouchDB’s **JWT authentication** for enhanced security.

-   **Rate Limiting**: Implement rate limiting to prevent abuse.


## Scaling and Performance

-   **Sharding**: Distribute events across multiple CouchDB nodes for better scalability.

-   **Optimized Indexing**: Use MapReduce views to precompute queries for fast retrieval.

-   **Replication Strategies**: Use **filtered replication** to sync only relevant events across relay clusters.


## Contributing

Contributions are welcome! Feel free to **fork** this repository and submit a pull request.

## License

This project is licensed under the **MIT License**. See the LICENSE file for details.

## Contact

For support or questions, open an **issue** on GitHub or contact the maintainers via NOSTR.
