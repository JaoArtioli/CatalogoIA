// src/components/LogPartsTheme.tsx - CRIAR este arquivo

import React from 'react';

export const LOG_PARTS_THEME = {
  brand: {
    primary: '#8A1618',
    secondary: '#8B2F2F',
    light: '#CCCCCC',
    dark: '#2D3748',
  },
  confidence: {
    high: '#38A169',
    medium: '#D69E2E',
    low: '#E53E3E',
  },
  gray: {
    50: '#F7FAFC',
    100: '#EDF2F7',
    200: '#E2E8F0',
    300: '#CBD5E0',
    400: '#A0AEC0',
    500: '#718096',
    600: '#4A5568',
    700: '#2D3748',
    800: '#1A202C',
    900: '#171923',
  }
};

interface ConfidenceData {
  level: 'alto' | 'medio' | 'baixo';
  score: number;
  reasons: string[];
}

interface ConfidenceBadgeProps {
  confidence: ConfidenceData;
  showDetails?: boolean;
  className?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ 
  confidence, 
  showDetails = false,
  className = '' 
}) => {
  const getConfidenceConfig = (level: string) => {
    switch (level) {
      case 'alto':
        return {
          color: LOG_PARTS_THEME.confidence.high,
          bgColor: `${LOG_PARTS_THEME.confidence.high}20`,
          borderColor: LOG_PARTS_THEME.confidence.high,
          icon: '✓',
          label: 'Alta Confiança',
          description: 'Correspondência exata ou muito próxima'
        };
      case 'medio':
        return {
          color: LOG_PARTS_THEME.confidence.medium,
          bgColor: `${LOG_PARTS_THEME.confidence.medium}20`,
          borderColor: LOG_PARTS_THEME.confidence.medium,
          icon: '≈',
          label: 'Confiança Média', 
          description: 'Correspondência parcial identificada'
        };
      case 'baixo':
        return {
          color: LOG_PARTS_THEME.confidence.low,
          bgColor: `${LOG_PARTS_THEME.confidence.low}20`,
          borderColor: LOG_PARTS_THEME.confidence.low,
          icon: '?',
          label: 'Baixa Confiança',
          description: 'Correspondência limitada ou sugerida'
        };
      default:
        return {
          color: LOG_PARTS_THEME.gray[500],
          bgColor: `${LOG_PARTS_THEME.gray[500]}20`,
          borderColor: LOG_PARTS_THEME.gray[500],
          icon: '−',
          label: 'Sem Avaliação',
          description: 'Confiança não avaliada'
        };
    }
  };

  const config = getConfidenceConfig(confidence.level);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div 
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border"
        style={{ 
          backgroundColor: config.bgColor, 
          color: config.color,
          borderColor: config.borderColor
        }}
      >
        <span className="text-sm">{config.icon}</span>
        <span>{config.label}</span>
        <span 
          className="font-mono text-xs px-1 py-0.5 rounded"
          style={{ backgroundColor: config.color, color: 'white' }}
        >
          {confidence.score}%
        </span>
      </div>

      {showDetails && (
        <div className="ml-2">
          <div className="text-xs mb-1" style={{ color: LOG_PARTS_THEME.gray[600] }}>
            {config.description}
          </div>
          
          {confidence.reasons.length > 0 && (
            <div className="text-xs">
              <span className="font-medium" style={{ color: LOG_PARTS_THEME.gray[700] }}>
                Motivos:
              </span>
              <ul className="list-disc list-inside ml-2 mt-1" style={{ color: LOG_PARTS_THEME.gray[600] }}>
                {confidence.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ProductCard: React.FC<{
  product: any;
  showConfidence?: boolean;
}> = ({ product, showConfidence = true }) => {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div 
      className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border"
      style={{ borderColor: LOG_PARTS_THEME.gray[200] }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 
            className="font-semibold line-clamp-2"
            style={{ color: LOG_PARTS_THEME.gray[800] }}
          >
            {product.title}
          </h3>
          <p 
            className="text-sm mt-1"
            style={{ color: LOG_PARTS_THEME.gray[600] }}
          >
            SKU: <span className="font-mono">{product.sku}</span>
          </p>
        </div>
        
        {showConfidence && product.confidence && (
          <ConfidenceBadge 
            confidence={product.confidence}
            className="ml-2"
          />
        )}
      </div>

      <div 
        className="h-40 mb-4 flex items-center justify-center overflow-hidden rounded"
        style={{ backgroundColor: LOG_PARTS_THEME.gray[100] }}
      >
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0].url}
            alt={product.title || 'Produto'}
            className="object-contain h-full w-full"
            loading="lazy"
          />
        ) : (
          <span className="text-sm" style={{ color: LOG_PARTS_THEME.gray[500] }}>
            Sem imagem
          </span>
        )}
      </div>

      <div className="space-y-2">
        {product.description && (
          <p 
            className="text-sm line-clamp-2"
            style={{ color: LOG_PARTS_THEME.gray[700] }}
          >
            {product.description}
          </p>
        )}

        {product.brand && (
          <div className="text-sm">
            <strong style={{ color: LOG_PARTS_THEME.brand.primary }}>Marca:</strong>{' '}
            <span style={{ color: LOG_PARTS_THEME.gray[700] }}>
              {typeof product.brand === 'string' ? product.brand : product.brand.name || 'N/A'}
            </span>
          </div>
        )}
      </div>

      {showConfidence && product.confidence && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${LOG_PARTS_THEME.gray[200]}` }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs font-medium hover:opacity-75 transition-opacity"
            style={{ color: LOG_PARTS_THEME.brand.primary }}
          >
            {showDetails ? 'Ocultar detalhes' : 'Por que esta confiança?'}
          </button>
          
          {showDetails && (
            <div 
              className="mt-2 p-3 rounded text-xs"
              style={{ backgroundColor: LOG_PARTS_THEME.gray[50] }}
            >
              <ConfidenceBadge 
                confidence={product.confidence}
                showDetails={true}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};