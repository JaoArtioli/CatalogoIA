# api/app/services/pricing_import.py

import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, List, Tuple
import logging

from app.core.database import get_db
from app.models.product import Product

logger = logging.getLogger(__name__)

class PricingDataImporter:
    """Importador de dados de precificação via planilha Excel"""
    
    def __init__(self, db: Session):
        self.db = db
        self.stats = {
            'total_rows': 0,
            'products_found': 0,
            'products_not_found': 0,
            'products_updated': 0,
            'errors': 0,
            'skipped_skus': []
        }

    def create_tables_if_not_exist(self):
        """Criar tabelas necessárias se não existirem"""
        
        # Adicionar colunas na tabela products
        alter_products_queries = [
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2)",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS ncm VARCHAR(20)",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(10)"
        ]
        
        # Criar tabela de regras NCM
        create_ncm_table = """
        CREATE TABLE IF NOT EXISTS ncm_tax_rules (
            ncm VARCHAR(20) PRIMARY KEY,
            has_tax BOOLEAN DEFAULT FALSE,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
        )
        """
        
        # Criar tabela de alíquotas por estado
        create_state_table = """
        CREATE TABLE IF NOT EXISTS state_tax_rates (
            state_code VARCHAR(2) PRIMARY KEY,
            state_name VARCHAR(50),
            icms_interno DECIMAL(5,2),
            difal_imp DECIMAL(5,2),
            difal_normal DECIMAL(5,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
        )
        """
        
        try:
            # Executar alterações na tabela products
            for query in alter_products_queries:
                self.db.execute(text(query))
            
            # Criar tabelas
            self.db.execute(text(create_ncm_table))
            self.db.execute(text(create_state_table))
            
            self.db.commit()
            logger.info("Tabelas criadas/atualizadas com sucesso")
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Erro ao criar tabelas: {e}")
            raise

    def validate_excel_format(self, df: pd.DataFrame) -> bool:
        """Validar formato da planilha"""
        expected_columns = ['SKU', 'TIPO', 'PREÇO_BRUTO', 'NCM']
        
        if len(df.columns) < 4:
            raise ValueError(f"Planilha deve ter pelo menos 4 colunas. Encontradas: {len(df.columns)}")
        
        # Renomear colunas para padrão esperado
        if len(df.columns) >= 4:
            df.columns = ['SKU', 'TIPO', 'PREÇO_BRUTO', 'NCM'] + list(df.columns[4:])
        
        return True

    def clean_and_validate_row(self, row: pd.Series) -> Tuple[bool, Dict]:
        """Limpar e validar dados de uma linha"""
        try:
            # Extrair dados
            sku = str(row['SKU']).strip().upper()
            product_type = str(row['TIPO']).strip().upper()
            base_price = float(row['PREÇO_BRUTO']) if pd.notna(row['PREÇO_BRUTO']) else 0.0
            ncm = str(row['NCM']).strip() if pd.notna(row['NCM']) else ''
            
            # Validações
            if not sku or sku == 'NAN':
                return False, {'error': 'SKU vazio ou inválido'}
            
            if product_type not in ['NAC', 'IMP', 'PROD']:
                return False, {'error': f'Tipo inválido: {product_type}. Use NAC, IMP ou PROD'}
            
            if base_price < 0:
                return False, {'error': f'Preço inválido: {base_price}'}
            
            # NCM é opcional, mas se fornecido deve ter formato correto
            if ncm and not ncm.replace('.', '').isdigit():
                logger.warning(f"NCM possivelmente inválido para {sku}: {ncm}")
            
            return True, {
                'sku': sku,
                'product_type': product_type,
                'base_price': base_price,
                'ncm': ncm
            }
            
        except Exception as e:
            return False, {'error': f'Erro ao processar linha: {str(e)}'}

    def import_from_excel(self, file_path: str) -> Dict:
        """Importar dados da planilha Excel"""
        
        logger.info(f"Iniciando importação de {file_path}")
        
        try:
            # Ler planilha
            df = pd.read_excel(file_path)
            self.stats['total_rows'] = len(df)
            
            logger.info(f"Planilha carregada: {len(df)} linhas")
            
            # Validar formato
            self.validate_excel_format(df)
            
            # Processar cada linha
            for index, row in df.iterrows():
                try:
                    # Validar e limpar dados
                    is_valid, data = self.clean_and_validate_row(row)
                    
                    if not is_valid:
                        logger.warning(f"Linha {index + 2} inválida: {data['error']}")
                        self.stats['errors'] += 1
                        continue
                    
                    # Verificar se produto existe no banco
                    product = self.db.query(Product).filter(
                        Product.sku == data['sku']
                    ).first()
                    
                    if not product:
                        logger.info(f"SKU {data['sku']} não encontrado no banco - ignorando")
                        self.stats['products_not_found'] += 1
                        self.stats['skipped_skus'].append(data['sku'])
                        continue
                    
                    self.stats['products_found'] += 1
                    
                    # Atualizar dados do produto
                    product.base_price = data['base_price']
                    product.product_type = data['product_type']
                    product.ncm = data['ncm']
                    
                    self.stats['products_updated'] += 1
                    
                    # Commit a cada 100 produtos para evitar perda de dados
                    if self.stats['products_updated'] % 100 == 0:
                        self.db.commit()
                        logger.info(f"Processados {self.stats['products_updated']} produtos")
                
                except Exception as e:
                    logger.error(f"Erro ao processar linha {index + 2}: {str(e)}")
                    self.stats['errors'] += 1
                    continue
            
            # Commit final
            self.db.commit()
            
            # Atualizar regras NCM baseadas nos dados importados
            self._update_ncm_rules()
            
            logger.info("Importação concluída com sucesso")
            
            return {
                'success': True,
                'stats': self.stats,
                'message': 'Importação concluída'
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Erro na importação: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'stats': self.stats
            }

    def _update_ncm_rules(self):
        """Atualizar tabela de regras NCM baseada nos NCMs encontrados"""
        
        # NCMs que sabemos que têm tributação (baseado na planilha original)
        ncms_with_tax = {
            '8544.30.00', '4010.39.00', '8511.90.00', '8511.40.00', '8412.21.10',
            '8511.50.10', '8421.99.99', '9029.20.10', '8421.23.00', '8511.10.00',
            '8482.20.90', '8482.40.00', '8482.50.90', '8501.31.10', '8482.10.90',
            '8708.30.90', '8413.81.00', '8413.30.90', '8501.32.10', '4016.93.00',
            '8484.90.00', '8409.91.90', '8536.90.90', '8541.10.99', '9029.90.90',
            '8536.90.10', '8536.50.90', '8512.20.11', '8483.40.10', '8511.30.10',
            '8511.30.20', '7325.99.90', '6813.89.90', '8482.80.00', '8482.91.90',
            '9029.10.90', '8484.20.00', '8708.80.00', '8504.40.90', '8505.20.90',
            '4009.42.90', '7320.90.00', '8708.91.00', '8483.50.10', '8511.80.90',
            '8421.39.00', '8481.10.00', '8481.20.90', '8481.80.92', '8482.10.10',
            '8482.99.10', '8483.10.90', '8483.90.00', '8512.30.00', '8536.10.00',
            '7009.10.00', '8708.29.99', '4009.31.00', '5909.00.00', '9026.20.90',
            '8512.20.22', '7320.20.10', '9032.10.90', '4010.32.00', '8421.99.10',
            '8421.31.00', '8409.99.99', '8409.91.17', '9030.33.19', '4010.19.00',
            '8539.21.90', '9026.90.90', '9032.89.82', '9032.89.90', '6813.81.90',
            '8421.39.90', '8536.41.00', '8421.29.90', '8414.59.90', '8483.50.90',
            '8708.21.00', '8531.10.90', '8535.90.00', '8547.20.90', '8542.32.21',
            '8413.50.90'
        }
        
        try:
            # Obter todos os NCMs únicos dos produtos atualizados
            result = self.db.execute(text("""
                SELECT DISTINCT ncm 
                FROM products 
                WHERE ncm IS NOT NULL AND ncm != ''
            """))
            
            all_ncms = [row[0] for row in result.fetchall()]
            
            # Inserir/atualizar regras NCM
            for ncm in all_ncms:
                has_tax = ncm in ncms_with_tax
                
                self.db.execute(text("""
                    INSERT INTO ncm_tax_rules (ncm, has_tax) 
                    VALUES (:ncm, :has_tax)
                    ON CONFLICT (ncm) DO UPDATE SET has_tax = EXCLUDED.has_tax
                """), {'ncm': ncm, 'has_tax': has_tax})
            
            self.db.commit()
            logger.info(f"Atualizadas regras para {len(all_ncms)} NCMs")
            
        except Exception as e:
            logger.error(f"Erro ao atualizar regras NCM: {e}")

    def populate_state_rates(self):
        """Popular tabela de alíquotas por estado"""
        
        states_data = [
            {'state_code': 'SP', 'state_name': 'São Paulo', 'icms_interno': 18.0, 'difal_imp': 0.00, 'difal_normal': 0.00},
            {'state_code': 'MG', 'state_name': 'Minas Gerais', 'icms_interno': 18.0, 'difal_imp': 17.07, 'difal_normal': 7.32},
            {'state_code': 'RJ', 'state_name': 'Rio de Janeiro', 'icms_interno': 22.0, 'difal_imp': 23.08, 'difal_normal': 12.82},
            {'state_code': 'AC', 'state_name': 'Acre', 'icms_interno': 19.0, 'difal_imp': 18.52, 'difal_normal': 14.81},
            {'state_code': 'AL', 'state_name': 'Alagoas', 'icms_interno': 19.0, 'difal_imp': 18.52, 'difal_normal': 14.81},
            {'state_code': 'AM', 'state_name': 'Amazonas', 'icms_interno': 20.0, 'difal_imp': 16.00, 'difal_normal': 13.00},
            {'state_code': 'AP', 'state_name': 'Amapá', 'icms_interno': 18.0, 'difal_imp': 14.00, 'difal_normal': 11.00},
            {'state_code': 'BA', 'state_name': 'Bahia', 'icms_interno': 20.5, 'difal_imp': 18.51, 'difal_normal': 16.98},
            {'state_code': 'CE', 'state_name': 'Ceará', 'icms_interno': 20.0, 'difal_imp': 16.00, 'difal_normal': 13.00},
            {'state_code': 'DF', 'state_name': 'Distrito Federal', 'icms_interno': 20.0, 'difal_imp': 16.00, 'difal_normal': 13.00},
            {'state_code': 'MA', 'state_name': 'Maranhão', 'icms_interno': 22.0, 'difal_imp': 18.00, 'difal_normal': 15.00},
            {'state_code': 'MT', 'state_name': 'Mato Grosso', 'icms_interno': 17.0, 'difal_imp': 15.66, 'difal_normal': 12.05},
            {'state_code': 'PA', 'state_name': 'Pará', 'icms_interno': 19.0, 'difal_imp': 18.52, 'difal_normal': 14.81},
            {'state_code': 'PB', 'state_name': 'Paraíba', 'icms_interno': 20.0, 'difal_imp': 20.00, 'difal_normal': 16.25},
            {'state_code': 'PE', 'state_name': 'Pernambuco', 'icms_interno': 20.5, 'difal_imp': 20.75, 'difal_normal': 16.98},
            {'state_code': 'PI', 'state_name': 'Piauí', 'icms_interno': 21.0, 'difal_imp': 21.52, 'difal_normal': 17.72},
            {'state_code': 'PR', 'state_name': 'Paraná', 'icms_interno': 19.5, 'difal_imp': 19.25, 'difal_normal': 9.32},
            {'state_code': 'RR', 'state_name': 'Roraima', 'icms_interno': 20.0, 'difal_imp': 16.00, 'difal_normal': 13.00},
        ]
        
        try:
            for state in states_data:
                self.db.execute(text("""
                    INSERT INTO state_tax_rates (state_code, state_name, icms_interno, difal_imp, difal_normal) 
                    VALUES (:state_code, :state_name, :icms_interno, :difal_imp, :difal_normal)
                    ON CONFLICT (state_code) DO UPDATE SET 
                        state_name = :state_name,
                        icms_interno = :icms_interno,
                        difal_imp = :difal_imp,
                        difal_normal = :difal_normal
                """), state)
            
            self.db.commit()
            logger.info(f"Populados dados de {len(states_data)} estados")
            
        except Exception as e:
            logger.error(f"Erro ao popular dados dos estados: {e}")


# Script de uso
def main():
    """Script principal para importação"""
    import sys
    
    if len(sys.argv) != 2:
        print("Uso: python pricing_import.py <caminho_para_planilha.xlsx>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    # Conectar ao banco
    db = next(get_db())
    
    try:
        importer = PricingDataImporter(db)
        
        # Criar tabelas se necessário
        importer.create_tables_if_not_exist()
        
        # Popular dados de estados
        importer.populate_state_rates()
        
        # Importar dados da planilha
        result = importer.import_from_excel(file_path)
        
        if result['success']:
            print("Importação concluída com sucesso!")
            print(f"Estatísticas:")
            print(f"- Total de linhas: {result['stats']['total_rows']}")
            print(f"- Produtos encontrados: {result['stats']['products_found']}")
            print(f"- Produtos não encontrados: {result['stats']['products_not_found']}")
            print(f"- Produtos atualizados: {result['stats']['products_updated']}")
            print(f"- Erros: {result['stats']['errors']}")
            
            if result['stats']['skipped_skus']:
                print(f"- SKUs ignorados (não encontrados): {len(result['stats']['skipped_skus'])}")
                # Salvar lista de SKUs não encontrados
                with open('skus_nao_encontrados.txt', 'w') as f:
                    for sku in result['stats']['skipped_skus']:
                        f.write(f"{sku}\n")
                print("  Lista salva em 'skus_nao_encontrados.txt'")
        else:
            print(f"Erro na importação: {result['error']}")
            
    except Exception as e:
        print(f"Erro: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()