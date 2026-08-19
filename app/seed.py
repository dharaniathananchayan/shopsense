import random
import json
from datetime import datetime, timedelta
from app.database import SessionLocal, engine, Base
from app.models import Vendor, Product, Customer, Transaction, ProductReview
from app.models.user import User


SAMPLE_REVIEWS = [
    {
        "product_name": "Wireless Bluetooth Earbuds",
        "reviews": [
            {
                "rating": 5,
                "title": "Incredible sound quality and long battery!",
                "text": "These earbuds exceeded my expectations. The active noise cancellation is top notch, treble is crisp, and bass is deep without distortion. Battery easily lasts 7 hours per charge with the case giving another 24 hours.",
                "sentiment_score": 96.0,
                "sentiment_label": "POSITIVE",
                "pros": ["Outstanding battery life", "Crisp audio and punchy bass", "Comfortable ergonomic fit"],
                "cons": ["Case is a bit bulky in tight pockets"],
                "aspects": {"quality": 95, "value": 92, "usability": 94, "durability": 90},
                "summary": "Exceptional audio performance and battery endurance make this a top-tier choice for daily commuting and workout sessions."
            },
            {
                "rating": 4,
                "title": "Great value, minor mic delay on Zoom",
                "text": "Music playback is superb and pairing with both my iPhone and laptop was seamless. Microphone is good for calls, though occasional slight latency on video conferences. Overall very satisfied with the purchase.",
                "sentiment_score": 82.0,
                "sentiment_label": "POSITIVE",
                "pros": ["Seamless multi-device pairing", "Great sound for the price", "Fast USB-C charging"],
                "cons": ["Slight microphone latency during video meetings"],
                "aspects": {"quality": 84, "value": 88, "usability": 85, "durability": 80},
                "summary": "Solid all-rounder with strong audio fidelity and convenience, despite minor microphone latency."
            },
            {
                "rating": 2,
                "title": "Left earbud stopped charging after 3 weeks",
                "text": "Initially loved them, but after three weeks the left earbud stopped charging in the case unless I press down hard. Customer support was helpful with replacement, but QC could be improved.",
                "sentiment_score": 35.0,
                "sentiment_label": "NEGATIVE",
                "pros": ["Helpful customer support response", "Comfortable fit when working"],
                "cons": ["Left earbud charging pin issue", "Inconsistent build quality"],
                "aspects": {"quality": 40, "value": 45, "usability": 50, "durability": 30},
                "summary": "Quality control flaw on the charging contact dampens an otherwise decent audio product."
            }
        ]
    },
    {
        "product_name": "Mechanical Gaming Keyboard",
        "reviews": [
            {
                "rating": 5,
                "title": "Tactile satisfaction and responsive RGB lighting",
                "text": "The custom linear switches feel incredibly smooth. Typing code and playing FPS games is a joy. The aluminum top plate adds sturdy weight and zero deck flex.",
                "sentiment_score": 98.0,
                "sentiment_label": "POSITIVE",
                "pros": ["Solid aluminum chassis", "Smooth custom mechanical switches", "Vibrant customizable RGB"],
                "cons": ["Accompanying software takes time to configure"],
                "aspects": {"quality": 98, "value": 90, "usability": 95, "durability": 96},
                "summary": "A premium mechanical keyboard providing unmatched tactile feedback and durable build."
            },
            {
                "rating": 4,
                "title": "Heavy and reliable gaming companion",
                "text": "Keycaps are high quality PBT that won't shine over time. Cable is braided and detachable. A bit loud for shared office spaces, but perfect for a dedicated gaming setup.",
                "sentiment_score": 85.0,
                "sentiment_label": "POSITIVE",
                "pros": ["Durable PBT double-shot keycaps", "Detachable braided cable", "Zero ghosting"],
                "cons": ["A bit loud for quiet office environments"],
                "aspects": {"quality": 92, "value": 86, "usability": 88, "durability": 94},
                "summary": "Rugged, high-performance keyboard tailored for gaming enthusiasts and power typists."
            }
        ]
    },
    {
        "product_name": "Smart LED Monitor 27\"",
        "reviews": [
            {
                "rating": 5,
                "title": "Vivid 4K colors and ultra-thin bezels",
                "text": "Color accuracy out of the box is fantastic for photo and video editing. The USB-C hub functionality powers my MacBook while transmitting 4K 60Hz display.",
                "sentiment_score": 95.0,
                "sentiment_label": "POSITIVE",
                "pros": ["Single-cable 65W USB-C power & video", "99% sRGB color calibration", "Ultra-thin modern bezels"],
                "cons": ["Built-in speakers are rather tinny"],
                "aspects": {"quality": 94, "value": 90, "usability": 96, "durability": 92},
                "summary": "Crisp visuals and single-cable workspace connectivity make this an excellent workstation monitor."
            },
            {
                "rating": 3,
                "title": "Decent display, stand is wobbly",
                "text": "The panel itself is bright with great viewing angles. However, the default stand wobbles whenever I type vigorously on my desk. Recommend mounting on a monitor arm.",
                "sentiment_score": 60.0,
                "sentiment_label": "NEUTRAL",
                "pros": ["Sharp vibrant panel", "Great viewing angles", "Multiple HDMI/DisplayPort inputs"],
                "cons": ["Wobbly stand", "Requires monitor arm for full stability"],
                "aspects": {"quality": 75, "value": 70, "usability": 65, "durability": 60},
                "summary": "Good display quality let down by a flimsy included stand."
            }
        ]
    },
    {
        "product_name": "Premium Leather Jacket",
        "reviews": [
            {
                "rating": 5,
                "title": "Genuine full-grain leather that breaks in wonderfully",
                "text": "The craftsmanship on this jacket is outstanding. Heavyweight genuine leather, sturdy YKK brass zippers, and the quilted interior lining keeps me warm in chilly weather.",
                "sentiment_score": 94.0,
                "sentiment_label": "POSITIVE",
                "pros": ["Authentic full-grain leather aroma and feel", "Heavy-duty YKK zippers", "Timeless silhouette"],
                "cons": ["Runs slightly slim around shoulders, size up if layering"],
                "aspects": {"quality": 96, "value": 88, "usability": 90, "durability": 98},
                "summary": "Heritage-grade leather jacket that looks better with age and provides solid weather protection."
            },
            {
                "rating": 4,
                "title": "Stylish and comfortable",
                "text": "Got countless compliments wearing this. Leather was slightly stiff on day one but softened up within a week of regular wear.",
                "sentiment_score": 86.0,
                "sentiment_label": "POSITIVE",
                "pros": ["Flattering tailored fit", "High quality lining", "Fast delivery"],
                "cons": ["Initial stiffness required brief break-in period"],
                "aspects": {"quality": 90, "value": 85, "usability": 88, "durability": 92},
                "summary": "High-style wardrobe essential with great cut and durable leather construction."
            }
        ]
    },
    {
        "product_name": "Smart Air Purifier",
        "reviews": [
            {
                "rating": 5,
                "title": "Huge relief for seasonal allergies and pet dander",
                "text": "I noticed a dramatic difference in bedroom air quality within 24 hours. The quiet sleep mode is whisper-silent and the auto particulate sensor ramps up when cooking.",
                "sentiment_score": 97.0,
                "sentiment_label": "POSITIVE",
                "pros": ["Whisper-quiet sleep mode (<24dB)", "Real-time PM2.5 air index display", "True HEPA filtration"],
                "cons": ["Replacement filters are somewhat expensive"],
                "aspects": {"quality": 96, "value": 86, "usability": 95, "durability": 92},
                "summary": "High-efficiency HEPA air purifier providing immediate relief for allergy sufferers with silent operation."
            },
            {
                "rating": 2,
                "title": "Wi-Fi app setup was frustrating",
                "text": "Air purifier cleans air well, but pairing with the mobile app failed three times on 5GHz Wi-Fi. Only worked once I split my router to 2.4GHz.",
                "sentiment_score": 42.0,
                "sentiment_label": "NEGATIVE",
                "pros": ["Effective HEPA filtration", "Clean modern aesthetics"],
                "cons": ["Incompatible with 5GHz Wi-Fi during setup", "App connectivity glitches"],
                "aspects": {"quality": 70, "value": 55, "usability": 40, "durability": 75},
                "summary": "Good physical hardware hindered by a cumbersome Wi-Fi onboarding experience."
            }
        ]
    },
    {
        "product_name": "Carbon Fiber Tennis Racket",
        "reviews": [
            {
                "rating": 5,
                "title": "Lightweight swing with tremendous topspin control",
                "text": "Balanced head weight allows for rapid swings and pinpoint baseline accuracy. The carbon fiber dampening prevents wrist fatigue during two-hour matches.",
                "sentiment_score": 95.0,
                "sentiment_label": "POSITIVE",
                "pros": ["Featherlight carbon fiber weave", "Great vibration absorption", "Generous sweet spot"],
                "cons": ["Factory string tension could be tighter"],
                "aspects": {"quality": 95, "value": 90, "usability": 96, "durability": 92},
                "summary": "Competitive tennis racket offering superior control and maneuverability for intermediate to advanced players."
            }
        ]
    },
    {
        "product_name": "The Art of Data Science",
        "reviews": [
            {
                "rating": 5,
                "title": "Practical, beautifully illustrated, and code-ready",
                "text": "Unlike purely theoretical math textbooks, this walks through end-to-end industry pipelines with clean Python and SQL examples. Must-read for any ML practitioner.",
                "sentiment_score": 98.0,
                "sentiment_label": "POSITIVE",
                "pros": ["Clear industry-tested code snippets", "Excellent visual diagrams", "Covers end-to-end ML ops"],
                "cons": ["Paperback cover prone to bending"],
                "aspects": {"quality": 98, "value": 95, "usability": 96, "durability": 85},
                "summary": "Authoritative and approachable data science guide bridging theory and production systems."
            }
        ]
    }
]


def seed_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # --- Vendors ---
    if not db.query(Vendor).first():
        print("Seeding vendors...")
        vendors_data = [
            {"vendor_name": "TechGadgets Pro", "contact_email": "contact@techgadgetspro.com", "phone": "555-0101", "address": "123 Tech Ave, San Francisco, CA"},
            {"vendor_name": "Fashion Forward", "contact_email": "hello@fashionforward.com", "phone": "555-0102", "address": "456 Style St, New York, NY"},
            {"vendor_name": "Home Essentials", "contact_email": "info@homeessentials.com", "phone": "555-0103", "address": "789 Comfort Blvd, Chicago, IL"},
            {"vendor_name": "Sports Elite", "contact_email": "support@sportselite.com", "phone": "555-0104", "address": "321 Fitness Rd, Austin, TX"},
            {"vendor_name": "BookWorm Haven", "contact_email": "books@bookwormhaven.com", "phone": "555-0105", "address": "654 Library Ln, Seattle, WA"},
        ]
        for vd in vendors_data:
            v = Vendor(**vd, status="ACTIVE")
            db.add(v)
        db.commit()

    vendors = db.query(Vendor).all()

    # --- Products ---
    if db.query(Product).count() < 10:
        print("Seeding products...")
        product_names = {
            "Electronics": [
                "Wireless Bluetooth Earbuds", "Smart LED Monitor 27\"",
                "Mechanical Gaming Keyboard", "USB-C Hub Adapter"
            ],
            "Fashion": [
                "Premium Leather Jacket", "Classic Aviator Sunglasses",
                "Silk Evening Dress", "Canvas Sneakers"
            ],
            "Home & Kitchen": [
                "Stainless Steel Cookware Set", "Smart Air Purifier",
                "Memory Foam Pillow", "Bamboo Cutting Board"
            ],
            "Sports": [
                "Carbon Fiber Tennis Racket", "Yoga Mat Premium",
                "Adjustable Dumbbell Set", "Running Hydration Vest"
            ],
            "Books": [
                "The Art of Data Science", "Modern Python Cookbook",
                "Leadership in Tech", "Sci-Fi Anthology Collection"
            ],
        }

        categories = list(product_names.keys())
        for i, category in enumerate(categories):
            vendor = vendors[i % len(vendors)]
            for name in product_names[category]:
                p = Product(
                    vendor_id=vendor.id,
                    product_name=name,
                    description=f"High-quality {category.lower()} product — {name}. Engineered for performance, reliability, and modern lifestyle satisfaction.",
                    category=category,
                    price=round(random.uniform(29.99, 399.99), 2),
                    stock_quantity=random.randint(15, 120),
                    is_active=True,
                    approval_status="APPROVED",
                )
                db.add(p)
        db.commit()

    products = db.query(Product).all()

    # --- Customers ---
    if db.query(Customer).count() < 5:
        print("Seeding customers...")
        customer_names = [
            ("Alice", "Johnson"), ("Bob", "Smith"), ("Carol", "Davis"),
            ("David", "Wilson"), ("Emma", "Brown"), ("Frank", "Taylor"),
            ("Grace", "Anderson"), ("Henry", "Thomas"), ("Isabel", "Martinez"),
            ("Jack", "Robinson"),
        ]
        for i, (first, last) in enumerate(customer_names):
            c = Customer(
                first_name=first,
                last_name=last,
                email=f"{first.lower()}.{last.lower()}@example.com",
                phone=f"555-{1000 + i}",
            )
            db.add(c)
        db.commit()

    customers = db.query(Customer).all()

    # --- Rich Time-Series Transactions (spanning 60 days) ---
    tx_count = db.query(Transaction).count()
    if tx_count < 120:
        print("Seeding extended historical transactions for time-series ML forecasting...")
        now = datetime.utcnow()
        # Seed daily transactions across 60 days with realistic seasonal curves
        for day_offset in range(60, -1, -1):
            date = now - timedelta(days=day_offset, hours=random.randint(0, 20), minutes=random.randint(0, 50))
            # Day of week seasonality: weekends have slightly higher volume
            is_weekend = date.weekday() >= 5
            daily_tx_count = random.randint(3, 7) if is_weekend else random.randint(2, 5)

            for _ in range(daily_tx_count):
                p = random.choice(products)
                c = random.choice(customers)
                qty = random.randint(1, 4)
                status = random.choices(["COMPLETED", "PENDING", "REFUNDED"], weights=[88, 7, 5])[0]

                t = Transaction(
                    product_id=p.id,
                    customer_id=c.id,
                    vendor_id=p.vendor_id,
                    quantity=qty,
                    unit_price=p.price,
                    total_amount=round(p.price * qty, 2),
                    payment_status=status,
                    sales_platform=random.choice(["ShopSense Direct", "Amazon", "Flipkart"]),
                    transaction_date=date,
                )
                db.add(t)
        db.commit()

    # --- Seed Reviews with Sentiment & Pros/Cons ---
    review_count = db.query(ProductReview).count()
    if review_count < 15:
        print("Seeding customer reviews for LLM sentiment analysis...")
        product_map = {p.product_name: p for p in products}

        # Seed the rich curated reviews first
        for item in SAMPLE_REVIEWS:
            p = product_map.get(item["product_name"])
            if not p:
                continue
            for r_data in item["reviews"]:
                cust = random.choice(customers)
                rev = ProductReview(
                    product_id=p.id,
                    vendor_id=p.vendor_id,
                    customer_id=cust.id,
                    reviewer_name=f"{cust.first_name} {cust.last_name}",
                    rating=r_data["rating"],
                    title=r_data["title"],
                    review_text=r_data["text"],
                    sentiment_score=r_data["sentiment_score"],
                    sentiment_label=r_data["sentiment_label"],
                    pros=json.dumps(r_data["pros"]),
                    cons=json.dumps(r_data["cons"]),
                    aspect_scores=json.dumps(r_data["aspects"]),
                    summary=r_data["summary"],
                    created_at=datetime.utcnow() - timedelta(days=random.randint(1, 45)),
                )
                db.add(rev)

        # Also add generalized reviews for other products
        generic_positive_templates = [
            ("Excellent product quality!", "Very well built, matches the description completely. Arrived faster than expected.", 92.0, "POSITIVE", ["High build quality", "Prompt delivery", "Accurate specs"], ["Slightly high price"], 5),
            ("Very satisfied with my purchase", "Works seamlessly as advertised. Good craftsmanship and good customer support.", 88.0, "POSITIVE", ["Reliable performance", "Great usability", "Sleek look"], ["Documentation could be more detailed"], 4),
            ("Solid everyday choice", "Good value for money. Does what it says on the tin without any fuss.", 80.0, "POSITIVE", ["Good value for money", "Easy to use"], ["Average packaging"], 4),
        ]
        generic_negative_templates = [
            ("Average quality, expected better", "The item is okay but finish could be refined. Functions adequately for basic tasks.", 55.0, "NEUTRAL", ["Functional basics", "Decent battery/size"], ["Mediocre materials", "Subpar packaging"], 3),
            ("Not worth the premium price tag", "Product stopped performing at peak after two weeks. Disappointed given the brand claims.", 30.0, "NEGATIVE", ["Decent initial looks"], ["Poor long-term durability", "Slow customer service"], 2),
        ]

        for p in products:
            existing = db.query(ProductReview).filter(ProductReview.product_id == p.id).count()
            if existing < 2:
                # Add 2-3 reviews
                for _ in range(random.randint(2, 4)):
                    tmpl = random.choice(generic_positive_templates if random.random() > 0.3 else generic_negative_templates)
                    cust = random.choice(customers)
                    rev = ProductReview(
                        product_id=p.id,
                        vendor_id=p.vendor_id,
                        customer_id=cust.id,
                        reviewer_name=f"{cust.first_name} {cust.last_name}",
                        rating=tmpl[6],
                        title=tmpl[0],
                        review_text=f"{tmpl[1]} Specifically for {p.product_name}.",
                        sentiment_score=tmpl[2],
                        sentiment_label=tmpl[3],
                        pros=json.dumps(tmpl[4]),
                        cons=json.dumps(tmpl[5]),
                        aspect_scores=json.dumps({"quality": int(tmpl[2]), "value": int(tmpl[2] - 5), "usability": int(tmpl[2] + 3), "durability": int(tmpl[2] - 2)}),
                        summary=f"Customer review evaluating {p.product_name}: highlights {', '.join(tmpl[4])}.",
                        created_at=datetime.utcnow() - timedelta(days=random.randint(1, 50)),
                    )
                    db.add(rev)

        db.commit()

    print("Data seeding and verification complete!")
    print(f"  - Vendors: {db.query(Vendor).count()}")
    print(f"  - Products: {db.query(Product).count()}")
    print(f"  - Customers: {db.query(Customer).count()}")
    print(f"  - Transactions: {db.query(Transaction).count()}")
    print(f"  - Reviews: {db.query(ProductReview).count()}")
    db.close()


if __name__ == "__main__":
    seed_data()
