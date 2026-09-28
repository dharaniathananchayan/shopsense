from app.database import SessionLocal, engine
from app.models import Transaction, ProductReview
from app.seed import seed_data
db = SessionLocal()
db.query(Transaction).delete()
db.commit()
db.close()
seed_data()
