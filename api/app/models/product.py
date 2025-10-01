from sqlalchemy import Column, String, Text, Numeric, Integer
from app.core.database import Base

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True)  # Mudança aqui: Integer ao invés de UUID
    sku = Column(String(50))
    title = Column(String(255))
    description = Column(Text)
    brand = Column(String(100))
    category = Column(String(100))
    original_codes = Column(Text)
    image_urls = Column(Text)
    applications = Column(Text)
    
    # Campos para pricing
    base_price = Column(Numeric(10, 2))
    ncm = Column(String(20))
    product_type = Column(String(10))

    def __repr__(self):
        return f"<Product(sku='{self.sku}', title='{self.title}')>"
