// components/PriceCalculator.tsx - VERSÃO COM API REAL
import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, AlertCircle } from 'lucide-react';
import { 
  TABLE_DESCRIPTIONS, 
  BRAZILIAN_STATES 
} from '../utils/priceCalculatorData';

// Tipos locais
type TableType = 'A' | 'B' | 'C';
type SaleType = 'consumo' | 'revenda';
type StateCode = string;

// URL da API a partir da variável de ambiente
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface PriceCalculationResult {
  basePrice: number;
  tableFactor: number;
  adjustedPrice: number;
  taxType: 'DIFAL' | 'ST' | 'NONE';
  taxRate: number;
  taxAmount: number;
  finalPrice: number;
  breakdown: {
    description: string;
    value: number;
  }[];
}

// Função de formatação local
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

interface PriceCalculatorProps {
  sku: string;
  productTitle?: string;
}

interface ProductPricingData {
  base_price: number;
  product_type: 'NAC' | 'IMP';
  ncm: string;
}

export const PriceCalculator: React.FC<PriceCalculatorProps> = ({ 
  sku, 
  productTitle 
}) => {
  const [tableType, setTableType] = useState<TableType>('A');
  const [state, setState] = useState<StateCode>('SP');
  const [saleType, setSaleType] = useState<SaleType>('revenda');
  const [calculation, setCalculation] = useState<PriceCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [pricingData, setPricingData] = useState<ProductPricingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Buscar dados de precificação quando SKU mudar
  useEffect(() => {
    if (sku) {
      fetchPricingData();
    }
  }, [sku]);

  // Calcular preço sempre que os parâmetros mudarem
  useEffect(() => {
    if (pricingData) {
      calculatePrice();
    }
  }, [tableType, state, saleType, pricingData]);

  const fetchPricingData = async () => {
    setIsCalculating(true);
    setError(null);
    
    try {
      // Buscar dados de precificação da API existente
      const response = await fetch(`${API_URL}/api/v1/pricing/product-pricing/${encodeURIComponent(sku)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Produto não possui dados de precificação configurados');
        }
        throw new Error('Erro ao buscar dados de precificação');
      }
      
      const data = await response.json();
      
      // Ajustar para o formato esperado pelo componente
      setPricingData({
        base_price: data.base_price,
        product_type: data.product_type as 'NAC' | 'IMP',
        ncm: data.ncm
      });
      
    } catch (error) {
      console.error('Erro ao buscar dados de precificação:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      setPricingData(null);
    } finally {
      setIsCalculating(false);
    }
  };

  const calculatePrice = async () => {
    if (!pricingData) return;
    
    setIsCalculating(true);
    setError(null);
    
    try {
      // Usar a API de cálculo existente
      const response = await fetch(`${API_URL}/api/v1/pricing/calculate-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sku: sku,
          table_type: tableType,
          state: state,
          sale_type: saleType
        })
      });
      
      if (!response.ok) {
        throw new Error('Erro ao calcular preço na API');
      }
      
      const apiResult = await response.json();
      
      // Converter resultado da API para o formato do componente
      const result: PriceCalculationResult = {
        basePrice: apiResult.base_price,
        tableFactor: apiResult.table_factor,
        adjustedPrice: apiResult.adjusted_price,
        taxType: apiResult.tax_type as 'DIFAL' | 'ST' | 'NONE',
        taxRate: apiResult.tax_rate,
        taxAmount: apiResult.tax_amount,
        finalPrice: apiResult.final_price,
        breakdown: apiResult.breakdown
      };
      
      setCalculation(result);
    } catch (error) {
      console.error('Erro ao calcular preço:', error);
      setError('Erro ao calcular preço final');
    } finally {
      setIsCalculating(false);
    }
  };

  const getPriceColor = (taxType: string) => {
    switch (taxType) {
      case 'NONE': return 'text-green-600';
      case 'DIFAL': return 'text-blue-600';
      case 'ST': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getTaxTypeDescription = (taxType: string) => {
    switch (taxType) {
      case 'NONE': return 'Sem impostos adicionais';
      case 'DIFAL': return 'Diferencial de Alíquota';
      case 'ST': return 'Substituição Tributária';
      default: return '';
    }
  };

  // Se não há dados de precificação, mostrar aviso
  if (error) {
    return (
      <div className="bg-yellow-50 rounded-xl p-6 mb-6 border border-yellow-200">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <h3 className="font-semibold text-lg text-yellow-800">Precificação Indisponível</h3>
        </div>
        <p className="text-sm text-yellow-700 mb-4">
          {error}
        </p>
        <p className="text-xs text-yellow-600">
          SKU: {sku} - Entre em contato com o setor comercial para mais informações.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-green-50 rounded-xl p-6 mb-6 border border-green-200">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="h-5 w-5" style={{ color: '#8A1618' }} />
        <h3 className="font-semibold text-lg">Calculadora de Preços</h3>
      </div>

      {/* Controles de Configuração */}
      <div className="space-y-4 mb-6">
        {/* Tipo de Tabela */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Cliente
          </label>
          <select
            value={tableType}
            onChange={(e) => setTableType(e.target.value as TableType)}
            disabled={isCalculating || !pricingData}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="A">Tabela A - {TABLE_DESCRIPTIONS.A}</option>
            <option value="B">Tabela B - {TABLE_DESCRIPTIONS.B}</option>
            <option value="C">Tabela C - {TABLE_DESCRIPTIONS.C}</option>
          </select>
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado de Destino
          </label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value as StateCode)}
            disabled={isCalculating || !pricingData}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {BRAZILIAN_STATES.map((stateOption: {code: string, name: string}) => (
              <option key={stateOption.code} value={stateOption.code}>
                {stateOption.name} ({stateOption.code})
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de Venda */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Venda
          </label>
          <select
            value={saleType}
            onChange={(e) => setSaleType(e.target.value as SaleType)}
            disabled={isCalculating || !pricingData}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="revenda">Revenda</option>
            <option value="consumo">Consumo</option>
          </select>
        </div>
      </div>

      {/* Resultado do Cálculo */}
      {isCalculating ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-2 text-sm text-gray-600">
            {pricingData ? 'Calculando preço...' : 'Carregando dados de precificação...'}
          </p>
        </div>
      ) : calculation && pricingData ? (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          {/* Preço Final Destacado */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <DollarSign className="h-6 w-6 text-green-600" />
              <span className="text-sm text-gray-600">Preço Final</span>
            </div>
            <div className={`text-4xl font-bold ${getPriceColor(calculation.taxType)}`}>
              {formatCurrency(calculation.finalPrice)}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {getTaxTypeDescription(calculation.taxType)}
            </p>
          </div>

          {/* Detalhamento do Cálculo */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="font-medium text-gray-900 mb-4">Detalhamento:</h4>
            <div className="space-y-4">
              {calculation.breakdown.map((item: {description: string, value: number}, index: number) => (
                <div 
                  key={index} 
                  className={`flex justify-between items-center py-2 ${
                    item.description === 'TOTAL' 
                      ? 'border-t-2 border-gray-300 pt-4 mt-2 font-bold text-xl' 
                      : 'text-base'
                  }`}
                >
                  <span className={
                    item.description === 'TOTAL' 
                      ? 'text-gray-900 font-bold' 
                      : 'text-gray-700'
                  }>
                    {item.description}
                  </span>
                  <span className={
                    item.description === 'TOTAL' 
                      ? `font-bold text-xl ${getPriceColor(calculation.taxType)}` 
                      : 'text-gray-900 font-medium text-base'
                  }>
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Informações Técnicas */}
          <div className="bg-gray-50 rounded-lg p-5 mt-6">
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-gray-500 text-xs uppercase tracking-wide">NCM:</span>
                <div className="font-mono font-medium text-base">{pricingData.ncm}</div>
              </div>
              <div className="space-y-1">
                <span className="text-gray-500 text-xs uppercase tracking-wide">Origem:</span>
                <div className="font-medium text-base">{pricingData.product_type}</div>
              </div>
              <div className="space-y-1">
                <span className="text-gray-500 text-xs uppercase tracking-wide">Fator Tabela:</span>
                <div className="font-medium text-base">{calculation.tableFactor}x</div>
              </div>
              <div className="space-y-1">
                <span className="text-gray-500 text-xs uppercase tracking-wide">Alíquota:</span>
                <div className="font-medium text-base">
                  {calculation.taxRate > 0 ? `${calculation.taxRate.toFixed(2)}%` : 'Isento'}
                </div>
              </div>
            </div>
          </div>

          {/* Avisos importantes */}
          {calculation.taxType === 'ST' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-orange-800">
                <strong>Substituição Tributária:</strong> Os impostos são recolhidos antecipadamente 
                na cadeia produtiva. O valor já inclui todos os tributos devidos.
              </p>
            </div>
          )}

          {state === 'SP' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800">
                <strong>São Paulo:</strong> Não há cobrança de DIFAL para este estado. 
                Preço final já considera todas as especificidades tributárias.
              </p>
            </div>
          )}
        </div>
      ) : !isCalculating && pricingData ? (
        <div className="text-center py-8 text-gray-500">
          <p>Configure os parâmetros acima para calcular o preço</p>
        </div>
      ) : null}

      {/* Informações do Produto (sempre visível) */}
      {pricingData && (
        <div className="bg-blue-50 rounded-lg p-4 mt-6">
          <h4 className="font-medium text-gray-900 mb-2">Dados de Precificação</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Preço Base:</span>
              <div className="font-medium">{formatCurrency(pricingData.base_price)}</div>
            </div>
            <div>
              <span className="text-gray-500">Tipo:</span>
              <div className="font-medium">{pricingData.product_type}</div>
            </div>
            <div>
              <span className="text-gray-500">NCM:</span>
              <div className="font-mono text-xs">{pricingData.ncm}</div>
            </div>
          </div>
        </div>
      )}

      {/* Botão de recálculo manual */}
      <div className="text-center mt-4">
        <button
          onClick={fetchPricingData}
          disabled={isCalculating}
          className="text-sm text-gray-500 hover:text-gray-700 underline disabled:opacity-50"
        >
          Recarregar dados de precificação
        </button>
      </div>
    </div>
  );
};

export default PriceCalculator;