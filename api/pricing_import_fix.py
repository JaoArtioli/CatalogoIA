import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.models.product import Product

def import_pricing_data(file_path: str):
    """Versão simplificada e mais robusta do importador"""
    db = next(get_db())
    
    try:
        # Ler planilha
        df = pd.read_excel(file_path)
        print(f"Carregadas {len(df)} linhas da planilha")
        
        stats = {
            'total_rows': len(df),
            'products_found': 0,
            'products_updated': 0,
            'errors': 0,
            'skipped_skus': []
        }
        
        # Renomear colunas para padrão esperado
        if len(df.columns) >= 4:
            df.columns = ['SKU', 'TIPO', 'PREÇO_BRUTO', 'NCM'] + list(df.columns[4:])
        
        for index, row in df.iterrows():
            try:
                # Extrair dados
                sku = str(row['SKU']).strip().upper()
                product_type = str(row['TIPO']).strip().upper()
                base_price = float(row['PREÇO_BRUTO']) if pd.notna(row['PREÇO_BRUTO']) else 0.0
                ncm = str(row['NCM']).strip() if pd.notna(row['NCM']) else ''
                
                # Validações básicas
                if not sku or sku == 'NAN':
                    stats['errors'] += 1
                    continue
                
                # Buscar produto
                product = db.query(Product).filter(Product.sku == sku).first()
                
                if not product:
                    stats['skipped_skus'].append(sku)
                    continue
                
                stats['products_found'] += 1
                
                # Atualizar dados
                product.base_price = base_price
                product.product_type = product_type
                product.ncm = ncm
                
                # Commit imediatamente para evitar problemas de transação
                db.commit()
                stats['products_updated'] += 1
                
                if stats['products_updated'] % 50 == 0:
                    print(f"Processados {stats['products_updated']} produtos...")
                
            except Exception as e:
                print(f"Erro na linha {index + 2}: {e}")
                stats['errors'] += 1
                db.rollback()  # Rollback apenas desta operação
                continue
        
        print("Importação concluída!")
        print(f"Estatísticas:")
        print(f"- Total de linhas: {stats['total_rows']}")
        print(f"- Produtos encontrados: {stats['products_found']}")
        print(f"- Produtos atualizados: {stats['products_updated']}")
        print(f"- Erros: {stats['errors']}")
        print(f"- SKUs não encontrados: {len(stats['skipped_skus'])}")
        
    except Exception as e:
        print(f"Erro geral: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    file_path = sys.argv[1] if len(sys.argv) > 1 else "/app/uploads/Preco.xlsx"
    import_pricing_data(file_path)
