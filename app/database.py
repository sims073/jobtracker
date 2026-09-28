import os
import certifi
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
from pymongo import AsyncMongoClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "devtrack")

# tlsCAFile=certifi.where() works around a common Windows/Atlas TLS handshake
# error (Windows' built-in certificate store is often outdated for this).
# Harmless for a local mongodb:// connection, which ignores it.
client = AsyncMongoClient(MONGO_URL, tlsCAFile=certifi.where())
db = client[DB_NAME]


def oid(s):
    """Parse a string into an ObjectId, or raise a clean 404 instead of a 500."""
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        raise HTTPException(404, "Not found")


def ser(doc):
    """Turn a Mongo document's _id into a plain 'id' string for JSON responses."""
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)
    return doc
