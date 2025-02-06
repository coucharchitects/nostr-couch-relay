function (doc) {
  if (doc.pubkey && doc.kind && doc.created_at) {
    emit([doc.pubkey, doc.kind, doc.created_at], null);
  }
}
