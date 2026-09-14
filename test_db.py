import sqlite3
conn = sqlite3.connect('shopsense.db')
query = """
SELECT transaction_date FROM transactions ORDER BY transaction_date DESC LIMIT 10;
"""
print(conn.execute(query).fetchall())
