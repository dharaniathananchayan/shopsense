from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def apply_sqlite_migrations():
    """Add columns introduced after the initial SQLite database was created."""
    if not DATABASE_URL.startswith("sqlite"):
        return
    existing = {column["name"] for column in inspect(engine).get_columns("products")}
    migrations = {
        "approval_status": "ALTER TABLE products ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED'",
        "approval_note": "ALTER TABLE products ADD COLUMN approval_note TEXT",
        "approved_at": "ALTER TABLE products ADD COLUMN approved_at DATETIME",
    }
    with engine.begin() as connection:
        for column, statement in migrations.items():
            if column not in existing:
                connection.execute(text(statement))
        user_columns = {column["name"] for column in inspect(engine).get_columns("users")}
        if "approval_status" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED'"))
        transaction_columns = {column["name"] for column in inspect(engine).get_columns("transactions")}
        if "sales_platform" not in transaction_columns:
            connection.execute(text("ALTER TABLE transactions ADD COLUMN sales_platform VARCHAR(50) NOT NULL DEFAULT 'ShopSense Direct'"))
            connection.execute(text("UPDATE transactions SET sales_platform = CASE id % 3 WHEN 0 THEN 'Amazon' WHEN 1 THEN 'Flipkart' ELSE 'ShopSense Direct' END"))
