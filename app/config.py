import os
from dotenv import load_dotenv

# Load local development secrets before any configuration is read. Environment
# variables provided by the host still take precedence over values in .env.
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./shopsense.db")
APP_TITLE = "ShopSense API"
APP_VERSION = "1.1.0"
APP_DESCRIPTION = "ShopSense multi-vendor analytics platform with JWT role-based access and AI listing support"
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "development-only-change-this-secret")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
