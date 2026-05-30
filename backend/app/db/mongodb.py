from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from loguru import logger
from app.core.config import settings
from bson import ObjectId
import functools

# ==========================================
# In-Memory Mock MongoDB Classes for Local Run
# ==========================================

def match_query(doc, query):
    for key, val in query.items():
        if key not in doc:
            return False
        doc_val = doc[key]
        if isinstance(val, dict):
            for op, op_val in val.items():
                if op == "$gte":
                    if not (doc_val >= op_val): return False
                elif op == "$lte":
                    if not (doc_val <= op_val): return False
                elif op == "$gt":
                    if not (doc_val > op_val): return False
                elif op == "$lt":
                    if not (doc_val < op_val): return False
                elif op == "$in":
                    if doc_val not in op_val: return False
                else:
                    return False
        else:
            if doc_val != val:
                return False
    return True

def get_val_by_path(doc, path):
    if isinstance(path, str) and path.startswith("$"):
        if path == "$$ROOT":
            return doc
        return doc.get(path[1:])
    return path

def eval_expr(doc, expr):
    if isinstance(expr, dict):
        if "$multiply" in expr:
            args = expr["$multiply"]
            val1 = get_val_by_path(doc, args[0])
            val2 = get_val_by_path(doc, args[1])
            return (val1 or 0) * (val2 or 0)
    return get_val_by_path(doc, expr)

def sort_docs(docs, sort_spec):
    if not sort_spec:
        return docs
    if isinstance(sort_spec, dict):
        sort_list = list(sort_spec.items())
    elif isinstance(sort_spec, list):
        sort_list = sort_spec
    else:
        return docs

    def compare_docs(d1, d2):
        for field, order in sort_list:
            v1 = d1.get(field)
            v2 = d2.get(field)
            if v1 is None and v2 is not None:
                res = -1
            elif v1 is not None and v2 is None:
                res = 1
            elif v1 is None and v2 is None:
                res = 0
            else:
                if v1 < v2:
                    res = -1
                elif v1 > v2:
                    res = 1
                else:
                    res = 0
            if res != 0:
                return res * order
        return 0

    return sorted(docs, key=functools.cmp_to_key(compare_docs))

def process_group(docs, group_stage):
    id_expr = group_stage["_id"]
    groups = {}
    for doc in docs:
        if isinstance(id_expr, dict):
            g_key = tuple((k, get_val_by_path(doc, v)) for k, v in id_expr.items())
        else:
            g_key = get_val_by_path(doc, id_expr)
        if g_key not in groups:
            groups[g_key] = []
        groups[g_key].append(doc)

    output_docs = []
    for g_key, g_docs in groups.items():
        if isinstance(id_expr, dict):
            out_id = {k: v for k, v in g_key}
        else:
            out_id = g_key
        out_doc = {"_id": out_id}
        for field, acc_spec in group_stage.items():
            if field == "_id":
                continue
            acc_op, acc_expr = list(acc_spec.items())[0]
            vals = [eval_expr(d, acc_expr) for d in g_docs]
            numeric_vals = [v for v in vals if isinstance(v, (int, float))]
            if acc_op == "$sum":
                out_doc[field] = sum(vals) if all(isinstance(v, (int, float)) for v in vals) else sum(numeric_vals)
            elif acc_op == "$avg":
                out_doc[field] = sum(numeric_vals) / len(numeric_vals) if numeric_vals else 0
            elif acc_op == "$min":
                out_doc[field] = min(numeric_vals) if numeric_vals else 0
            elif acc_op == "$max":
                out_doc[field] = max(numeric_vals) if numeric_vals else 0
            elif acc_op == "$first":
                out_doc[field] = vals[0] if vals else None
        output_docs.append(out_doc)
    return output_docs

def process_replace_root(docs, replace_stage):
    new_root_expr = replace_stage["newRoot"]
    output_docs = []
    for doc in docs:
        new_doc = get_val_by_path(doc, new_root_expr)
        if isinstance(new_doc, dict):
            output_docs.append(new_doc.copy())
    return output_docs

def run_pipeline(docs, pipeline):
    current_docs = [doc.copy() for doc in docs]
    for stage in pipeline:
        for stage_name, stage_val in stage.items():
            if stage_name == "$match":
                current_docs = [d for d in current_docs if match_query(d, stage_val)]
            elif stage_name == "$sort":
                current_docs = sort_docs(current_docs, stage_val)
            elif stage_name == "$limit":
                current_docs = current_docs[:stage_val]
            elif stage_name == "$group":
                current_docs = process_group(current_docs, stage_val)
            elif stage_name == "$replaceRoot":
                current_docs = process_replace_root(current_docs, stage_val)
    return current_docs


class CursorMock:
    def __init__(self, docs):
        self.docs = docs
        self._skip = 0
        self._limit = None
        self._sort = None

    def skip(self, n):
        self._skip = n
        return self

    def limit(self, n):
        self._limit = n
        return self

    def sort(self, sort_spec):
        self._sort = sort_spec
        return self

    async def to_list(self, length=None):
        docs = self.docs
        if self._sort:
            docs = sort_docs(docs, self._sort)
        if self._skip:
            docs = docs[self._skip:]
        if self._limit is not None:
            docs = docs[:self._limit]
        elif length is not None:
            docs = docs[:length]
        return [doc.copy() for doc in docs]


class CollectionMock:
    def __init__(self, name, db_mock):
        self.name = name
        self.db_mock = db_mock
        if self.name not in self.db_mock._store:
            self.db_mock._store[self.name] = []

    @property
    def docs(self):
        return self.db_mock._store[self.name]

    async def insert_one(self, doc):
        doc = doc.copy()
        if "_id" not in doc:
            doc["_id"] = ObjectId()
        self.docs.append(doc)
        class InsertOneResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertOneResult(doc["_id"])

    async def insert_many(self, doc_list):
        inserted_ids = []
        for doc in doc_list:
            doc = doc.copy()
            if "_id" not in doc:
                doc["_id"] = ObjectId()
            self.docs.append(doc)
            inserted_ids.append(doc["_id"])
        class InsertManyResult:
            def __init__(self, ids):
                self.inserted_ids = ids
        return InsertManyResult(inserted_ids)

    async def delete_many(self, query):
        initial_len = len(self.docs)
        self.db_mock._store[self.name] = [d for d in self.docs if not match_query(d, query)]
        deleted_count = initial_len - len(self.docs)
        class DeleteResult:
            def __init__(self, count):
                self.deleted_count = count
        return DeleteResult(deleted_count)

    async def create_index(self, keys, **kwargs):
        return "mock_index"

    async def distinct(self, field):
        values = set()
        for doc in self.docs:
            val = doc.get(field)
            if val is not None:
                if isinstance(val, list):
                    values.update(val)
                else:
                    values.add(val)
        return list(values)

    async def count_documents(self, query):
        count = sum(1 for d in self.docs if match_query(d, query))
        return count

    async def find_one(self, query, sort=None):
        docs = [d for d in self.docs if match_query(d, query)]
        if sort:
            docs = sort_docs(docs, sort)
        return docs[0].copy() if docs else None

    async def update_one(self, query, update):
        target_doc = None
        for d in self.docs:
            if match_query(d, query):
                target_doc = d
                break
        matched_count = 1 if target_doc is not None else 0
        modified_count = 0
        if target_doc is not None:
            if "$set" in update:
                set_vals = update["$set"]
                for k, v in set_vals.items():
                    target_doc[k] = v
                modified_count = 1
        class UpdateResult:
            def __init__(self, matched, modified):
                self.matched_count = matched
                self.modified_count = modified
        return UpdateResult(matched_count, modified_count)

    def find(self, query, sort=None, limit=None):
        docs = [d for d in self.docs if match_query(d, query)]
        cursor = CursorMock(docs)
        if sort:
            cursor.sort(sort)
        if limit is not None:
            cursor.limit(limit)
        return cursor

    def aggregate(self, pipeline):
        output_docs = run_pipeline(self.docs, pipeline)
        return CursorMock(output_docs)


class DatabaseMock:
    def __init__(self, client_mock):
        self.client_mock = client_mock
        self._store = client_mock._store

    def __getattr__(self, name):
        return CollectionMock(name, self)

    async def command(self, cmd):
        if cmd == "ping":
            return {"ok": 1.0}
        return {}


class ClientMock:
    _shared_store = {}

    def __init__(self, *args, **kwargs):
        self._store = ClientMock._shared_store

    def __getitem__(self, name):
        return DatabaseMock(self)

    @property
    def admin(self):
        return DatabaseMock(self)

    def close(self):
        pass


class MongoDB:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None


mongodb = MongoDB()


async def connect_to_mongo():
    """Establish MongoDB connection with connection pooling."""
    if settings.USE_IN_MEMORY_DB:
        logger.info("Initializing In-Memory Mock MongoDB...")
        mongodb.client = ClientMock()
        mongodb.db = mongodb.client[settings.DATABASE_NAME]
        await create_indexes()
        
        # Auto-seed the database if it is empty
        prod_count = await mongodb.db.products.count_documents({})
        if prod_count == 0:
            logger.info("In-memory database is empty. Auto-seeding sample data...")
            from app.db.seed import seed
            await seed(mongodb.db)
            logger.info("Auto-seeding complete.")
        return

    try:
        mongodb.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            maxPoolSize=50,
            minPoolSize=10,
            serverSelectionTimeoutMS=5000,
        )
        mongodb.db = mongodb.client[settings.DATABASE_NAME]
        # Verify connection
        await mongodb.client.admin.command("ping")
        logger.info(f"Connected to MongoDB: {settings.DATABASE_NAME}")
        await create_indexes()
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        raise


async def close_mongo_connection():
    """Close MongoDB connection."""
    if mongodb.client:
        mongodb.client.close()
        logger.info("MongoDB connection closed.")


async def create_indexes():
    """Create database indexes for performance."""
    db = mongodb.db

    # Products indexes
    await db.products.create_index("sku", unique=True)
    await db.products.create_index("category")
    await db.products.create_index("status")

    # Price history indexes
    await db.price_history.create_index([("product_id", 1), ("timestamp", -1)])
    await db.price_history.create_index("timestamp")

    # Sales history indexes
    await db.sales_history.create_index([("product_id", 1), ("date", -1)])
    await db.sales_history.create_index("date")

    # Competitor prices indexes
    await db.competitor_prices.create_index([("product_id", 1), ("scraped_at", -1)])
    await db.competitor_prices.create_index("competitor_name")

    # Forecasts indexes
    await db.forecasts.create_index([("product_id", 1), ("created_at", -1)])

    # RL decisions indexes
    await db.rl_decisions.create_index([("product_id", 1), ("created_at", -1)])

    logger.info("Database indexes created.")


def get_database() -> AsyncIOMotorDatabase:
    return mongodb.db
