// components/product/ProductCard.tsx - COM FUNCIONALIDADES DE IMAGEM
import React, { useState } from 'react';
import { X, ThumbsUp, ThumbsDown, Info, Star, Package, Wrench, Tag, ChevronLeft, ChevronRight, Search, Calculator, Copy, ZoomIn, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PriceCalculator from '../PriceCalculator';

export interface Product {
  id: string;
  title?: string;
  description?: string;
  sku?: string;
  brand?: string | { name: string };
  images?: Array<{ url: string }>;
  image_urls?: string;
  codes?: Array<{ code: string; type?: string }>;
  original_codes?: string;
  _confidence_score?: number;
  _confidence_level?: 'alto' | 'medio' | 'baixo';
  _match_reasons?: string[];
}

interface ProductCardProps {
  product: Product;
  searchQuery?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, searchQuery = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageCopied, setImageCopied] = useState<number | null>(null);

  const confidenceColors = {
    alto: { bg: '#10B981', text: 'text-green-800', border: 'border-green-500' },
    medio: { bg: '#F59E0B', text: 'text-yellow-800', border: 'border-yellow-500' },
    baixo: { bg: '#EF4444', text: 'text-red-800', border: 'border-red-500' }
  };

  const confidenceLabels = {
    alto: 'Alta Confiança',
    medio: 'Média Confiança', 
    baixo: 'Baixa Confiança'
  };

  // Função para baixar imagem real (versão otimizada)
  const downloadImageReal = async (imageUrl: string, imageIndex: number) => {
    try {
      // Primeiro tentar fetch direto para verificar se a imagem é acessível
      const response = await fetch(imageUrl, { mode: 'cors' });
      
      if (response.ok) {
        // Se fetch funcionou, usar blob direto
        const blob = await response.blob();
        downloadBlob(blob, imageIndex);
      } else {
        throw new Error('Fetch falhou, usando canvas');
      }
    } catch (fetchError) {
      console.log('Fetch direto falhou, usando canvas:', fetchError);
      // Fallback para método canvas
      downloadViaCanvas(imageUrl, imageIndex);
    }
  };

  // Download direto do blob
  const downloadBlob = (blob: Blob, imageIndex: number) => {
    const blobUrl = URL.createObjectURL(blob);
    const fileName = `${product.sku || 'produto'}-imagem-${imageIndex + 1}.png`;
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    
    // Usar requestAnimationFrame para evitar bloqueio
    requestAnimationFrame(() => {
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar URL do blob após um delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    });
    
    setImageCopied(imageIndex);
    setTimeout(() => setImageCopied(null), 2000);
    
    console.log(`Download direto: ${fileName}`);
  };

  // Download via canvas (fallback)
  const downloadViaCanvas = (imageUrl: string, imageIndex: number) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('Context 2D não disponível');
        fallbackDownload(imageUrl, imageIndex);
        return;
      }
      
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, imageIndex);
        } else {
          console.error('Erro ao criar blob do canvas');
          fallbackDownload(imageUrl, imageIndex);
        }
      }, 'image/png', 0.95);
    };
    
    img.onerror = () => {
      console.error('Erro ao carregar imagem para canvas');
      fallbackDownload(imageUrl, imageIndex);
    };
    
    img.src = imageUrl;
  };

  // Fallback final: download direto da URL
  const fallbackDownload = (imageUrl: string, imageIndex: number) => {
    const fileName = `${product.sku || 'produto'}-imagem-${imageIndex + 1}`;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    link.target = '_blank';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setImageCopied(imageIndex);
    setTimeout(() => setImageCopied(null), 2000);
    
    console.log(`Download fallback: ${fileName}`);
  };

  // Função de normalização igual ao useSearch.ts
  const normalizeCode = (code: string): string => {
    if (!code) return '';
    return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  };

  const getBrandName = (brand: Product['brand']): string => {
    if (!brand) return '';
    if (typeof brand === 'string') return brand;
    return brand.name || '';
  };

  // Função para converter string de códigos em array
  const parseOriginalCodes = (originalCodesString?: string): string[] => {
    if (!originalCodesString || originalCodesString.trim() === '') return [];
    return originalCodesString.split(' / ').map(code => code.trim()).filter(code => code.length > 0);
  };

  const getMatchReasons = (): string[] => {
    if (product._match_reasons && product._match_reasons.length > 0) {
      return product._match_reasons;
    }
    
    const reasons: string[] = [];
    const query = searchQuery.toLowerCase();
    
    if (product.sku?.toLowerCase().includes(query)) {
      reasons.push(`SKU contém "${searchQuery}"`);
    }
    if (product.title?.toLowerCase().includes(query)) {
      reasons.push(`Título contém "${searchQuery}"`);
    }
    
    // Verificar códigos originais (string separada por " / ")
    const originalCodes = parseOriginalCodes(product.original_codes);
    if (originalCodes.some(code => code.toLowerCase().includes(query))) {
      reasons.push(`Código OEM contém "${searchQuery}"`);
    }
    
    if (getBrandName(product.brand).toLowerCase().includes(query)) {
      reasons.push(`Marca contém "${searchQuery}"`);
    }
    if (product.description?.toLowerCase().includes(query)) {
      reasons.push(`Descrição contém "${searchQuery}"`);
    }
    
    return reasons.length > 0 ? reasons : ['Correspondência encontrada'];
  };

  // Função para identificar códigos que cruzaram com a busca - VERSÃO MELHORADA
  const getCrossedCodes = (): Array<{code: string, reason: string}> => {
    const query = searchQuery.toLowerCase().trim();
    const crossedCodes: Array<{code: string, reason: string}> = [];
    
    // Verifica SKU
    if (product.sku) {
      const sku = product.sku.toLowerCase();
      
      // 1. Match exato
      if (sku === query) {
        crossedCodes.push({code: product.sku, reason: 'Match exato'});
      }
      // 2. SKU contém busca
      else if (sku.includes(query)) {
        crossedCodes.push({code: product.sku, reason: 'SKU contém busca'});
      }
      // 3. Busca contém SKU (busca reversa)
      else if (query.includes(sku)) {
        crossedCodes.push({code: product.sku, reason: 'Busca contém SKU'});
      }
      // 4. Match normalizado
      else {
        const normalizedSku = normalizeCode(product.sku);
        const normalizedQuery = normalizeCode(searchQuery);
        
        if (normalizedSku === normalizedQuery) {
          crossedCodes.push({code: product.sku, reason: 'Match normalizado exato'});
        } else if (normalizedSku.includes(normalizedQuery)) {
          crossedCodes.push({code: product.sku, reason: 'Match normalizado parcial'});
        } else if (normalizedQuery.includes(normalizedSku) && normalizedSku.length >= 6) {
          crossedCodes.push({code: product.sku, reason: 'Match normalizado reverso'});
        }
      }
    }
    
    // Verifica códigos originais (string separada por " / ")
    const originalCodes = parseOriginalCodes(product.original_codes);
    originalCodes.forEach(code => {
      const lowerCode = code.toLowerCase();
      
      // 1. Match exato
      if (lowerCode === query) {
        crossedCodes.push({code, reason: 'Código OEM exato'});
      }
      // 2. Código contém busca
      else if (lowerCode.includes(query)) {
        crossedCodes.push({code, reason: 'Código OEM contém busca'});
      }
      // 3. Busca contém código (busca reversa)
      else if (query.includes(lowerCode)) {
        crossedCodes.push({code, reason: 'Busca contém código OEM'});
      }
      // 4. Match normalizado exato
      else {
        const normalizedCode = normalizeCode(code);
        const normalizedQuery = normalizeCode(searchQuery);
        
        if (normalizedCode === normalizedQuery) {
          crossedCodes.push({code, reason: 'Match normalizado exato'});
        }
        // 5. Match normalizado parcial (código contém busca)
        else if (normalizedCode.includes(normalizedQuery)) {
          crossedCodes.push({code, reason: 'Match normalizado parcial'});
        }
        // 6. Match normalizado reverso (busca contém código)
        else if (normalizedQuery.includes(normalizedCode) && normalizedCode.length >= 6) {
          crossedCodes.push({code, reason: 'Match normalizado reverso'});
        }
      }
    });
    
    return crossedCodes;
  };

  const handleFeedback = async (isCorrect: boolean) => {
    try {
      // TODO: Enviar feedback para API
      console.log('Feedback enviado:', {
        productId: product.id,
        query: searchQuery,
        confidence: product._confidence_level,
        isCorrect,
        score: product._confidence_score
      });
      
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
    }
  };

  const nextImage = () => {
    if (product.images && product.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % product.images!.length);
    }
  };

  const previousImage = () => {
    if (product.images && product.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + product.images!.length) % product.images!.length);
    }
  };

  const confidence = product._confidence_level || 'baixo';
  const confidenceStyle = confidenceColors[confidence];
  const hasMultipleImages = product.images && product.images.length > 1;

  return (
    <>
      {/* Card do Produto */}
      <div 
        className="border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white"
        onClick={() => setIsModalOpen(true)}
      >
        {/* Bolinha de Confiança */}
        <div className="relative">
          <div 
            className="absolute top-2 right-2 w-4 h-4 rounded-full border-2 z-10"
            style={{ 
              backgroundColor: confidenceStyle.bg,
              borderColor: confidenceStyle.bg
            }}
            title={`${confidenceLabels[confidence]} (${product._confidence_score || 0} pontos)`}
          />
          
          {/* Imagem do Produto */}
          <div className="h-40 bg-gray-100 mb-3 flex items-center justify-center overflow-hidden rounded-lg">
            {product.images && product.images.length > 0 ? (
              <img 
                src={product.images[0].url} 
                alt={product.title || 'Produto'} 
                className="object-contain h-full w-full"
                loading="lazy"
              />
            ) : (
              <span className="text-sm text-gray-500">Sem imagem</span>
            )}
          </div>
        </div>

        {/* Informações do Produto */}
        {product.sku && (
          <div className="text-sm text-gray-600 mb-1 font-mono">SKU: {product.sku}</div>
        )}
        
        {product.title && (
          <div className="font-medium mb-1 line-clamp-2">{product.title}</div>
        )}

        {getBrandName(product.brand) && (
          <div className="text-sm mb-2" style={{ color: '#8A1618' }}>
            Marca: {getBrandName(product.brand)}
          </div>
        )}
        
        {product.description && (
          <div className="text-sm text-gray-700 mt-2 line-clamp-3">{product.description}</div>
        )}

        {/* Exibir primeiro código original ou fallback */}
        {parseOriginalCodes(product.original_codes).length > 0 ? (
          <div className="text-xs text-gray-500 mt-2">
            Código: {parseOriginalCodes(product.original_codes)[0]}
          </div>
        ) : product.codes && product.codes.length > 0 ? (
          <div className="text-xs text-gray-500 mt-2">
            Código: {product.codes[0].code}
          </div>
        ) : null}
      </div>

      {/* Modal do Produto */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setIsModalOpen(false)} // Fechar ao clicar no backdrop
        >
          <div 
            className="bg-white rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()} // Impedir fechamento ao clicar no conteúdo
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {product.title || product.sku || 'Produto'}
                </h2>
                <div 
                  className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: `${confidenceStyle.bg}20`,
                    color: confidenceStyle.bg,
                    border: `1px solid ${confidenceStyle.bg}`
                  }}
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: confidenceStyle.bg }}
                  />
                  {confidenceLabels[confidence]}
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Coluna 1: Carrossel de Imagens e Info Básica */}
                <div>
                  {/* Carrossel de Imagens MELHORADO */}
                  <div className="relative h-80 bg-gray-100 mb-4 flex items-center justify-center overflow-hidden rounded-xl group">
                    {product.images && product.images.length > 0 ? (
                      <>
                        <img 
                          src={product.images[currentImageIndex].url} 
                          alt={product.title || 'Produto'} 
                          className={`object-contain transition-transform duration-300 ${
                            isZoomed ? 'scale-150 cursor-zoom-out' : 'h-full w-full cursor-zoom-in'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsZoomed(!isZoomed);
                          }}
                        />
                        
                        {/* Controles de Imagem - aparece no hover */}
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Botão de Zoom */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsZoomed(!isZoomed);
                            }}
                            className="bg-black bg-opacity-70 text-white p-2 rounded-full hover:bg-opacity-90 transition-all"
                            title={isZoomed ? "Reduzir zoom" : "Aumentar zoom"}
                          >
                            <ZoomIn className="h-4 w-4" />
                          </button>
                          
                          {/* Botão de Download */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImageReal(product.images![currentImageIndex].url, currentImageIndex);
                            }}
                            className={`${
                              imageCopied === currentImageIndex 
                                ? 'bg-green-500' 
                                : 'bg-black bg-opacity-70 hover:bg-opacity-90'
                            } text-white p-2 rounded-full transition-all`}
                            title="Baixar imagem"
                          >
                            {imageCopied === currentImageIndex ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        
                        {/* Controles do Carrossel */}
                        {hasMultipleImages && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); previousImage(); }}
                              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); nextImage(); }}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </button>
                            
                            {/* Indicadores */}
                            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
                              {product.images.map((_, index: number) => (
                                <button
                                  key={index}
                                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(index); }}
                                  className={`w-2 h-2 rounded-full transition-all ${
                                    index === currentImageIndex 
                                      ? 'bg-white' 
                                      : 'bg-white bg-opacity-50'
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="text-center text-gray-500">
                        <Package className="h-16 w-16 mx-auto mb-2 opacity-50" />
                        <span>Sem imagem</span>
                      </div>
                    )}
                  </div>

                  {/* Contador de Imagens e Instruções */}
                  {hasMultipleImages && (
                    <div className="text-center text-sm text-gray-500 mb-2">
                      Imagem {currentImageIndex + 1} de {product.images?.length}
                    </div>
                  )}
                  
                  {product.images && product.images.length > 0 && (
                    <div className="text-center text-xs text-gray-400 mb-4">
                      Clique na imagem para aumentar • Passe o mouse para baixar
                    </div>
                  )}

                  {/* Informações Básicas */}
                  <div className="space-y-3">
                    {product.sku && (
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">SKU:</span>
                        <span className="font-mono">{product.sku}</span>
                      </div>
                    )}
                    
                    {getBrandName(product.brand) && (
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Marca:</span>
                        <span style={{ color: '#8A1618' }}>{getBrandName(product.brand)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Coluna 2: CALCULADORA DE PREÇOS */}
                <div>
                  {product.sku && (
                    <PriceCalculator 
                      sku={product.sku}
                      productTitle={product.title}
                    />
                  )}
                </div>

                {/* Coluna 3: Análises e Códigos */}
                <div>
                  {/* Análise de Confiança */}
                  <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Info className="h-5 w-5" style={{ color: '#8A1618' }} />
                      <h3 className="font-semibold text-lg">Análise de Confiança</h3>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: confidenceStyle.bg }}
                        />
                        <span className="font-medium">{confidenceLabels[confidence]}</span>
                        <span className="text-sm text-gray-500">
                          ({product._confidence_score || 0} pontos)
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min((product._confidence_score || 0), 100)}%`,
                            backgroundColor: confidenceStyle.bg
                          }}
                        />
                      </div>
                    </div>

                    {/* Razões do Match */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Por que este produto foi encontrado:
                      </h4>
                      <ul className="space-y-1">
                        {getMatchReasons().map((reason: string, idx: number) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                            <span className="w-1 h-1 bg-gray-400 rounded-full" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Códigos do Produto */}
                  <div className="bg-blue-50 rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Wrench className="h-5 w-5" style={{ color: '#8A1618' }} />
                      <h3 className="font-semibold text-lg">Códigos Disponíveis</h3>
                    </div>
                    
                    {parseOriginalCodes(product.original_codes).length > 0 ? (
                      <div className="space-y-2">
                        {parseOriginalCodes(product.original_codes).map((code: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="font-mono text-sm bg-white px-3 py-1 rounded border">
                              {code}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                              OEM
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : product.codes && product.codes.length > 0 ? (
                      <div className="space-y-2">
                        {product.codes.map((codeObj: {code: string, type?: string}, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="font-mono text-sm bg-white px-3 py-1 rounded border">
                              {codeObj.code}
                            </span>
                            {codeObj.type && (
                              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                {codeObj.type}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">Nenhum código OEM cadastrado</p>
                    )}
                  </div>

                  {/* Códigos Cruzados pela IA */}
                  {getCrossedCodes().length > 0 && (
                    <div className="bg-yellow-50 rounded-xl p-6 mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Search className="h-5 w-5" style={{ color: '#8A1618' }} />
                        <h3 className="font-semibold text-lg">Códigos que Cruzaram</h3>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-3">
                        A IA encontrou correspondência nos seguintes códigos:
                      </p>
                      
                      <div className="space-y-2">
                        {getCrossedCodes().map((item: {code: string, reason: string}, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm bg-yellow-200 px-3 py-1 rounded border">
                                {item.code}
                              </span>
                              <span className="text-xs text-gray-600">
                                ↔ "{searchQuery}"
                              </span>
                            </div>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">
                              {item.reason}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sistema de Feedback */}
                  <div className="bg-green-50 rounded-xl p-6">
                    <h3 className="font-semibold text-lg mb-3">Ajude a melhorar o sistema</h3>
                    <p className="text-sm text-gray-700 mb-4">
                      Este resultado está correto para sua busca "{searchQuery}"?
                    </p>
                    
                    {!feedbackSent ? (
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleFeedback(true)}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Sim, correto
                        </Button>
                        <Button
                          onClick={() => handleFeedback(false)}
                          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                          size="sm"
                        >
                          <ThumbsDown className="h-4 w-4" />
                          Não, incorreto
                        </Button>
                      </div>
                    ) : (
                      <div className="text-green-700 font-medium">
                        ✓ Obrigado pelo feedback!
                      </div>
                    )}
                  </div>

                  {/* Descrição */}
                  {product.description && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-lg mb-3">Descrição</h3>
                      <p className="text-gray-700 leading-relaxed">{product.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Zoom (se necessário para imagens muito grandes) */}
      {isZoomed && product.images && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
          onClick={() => setIsZoomed(false)}
        >
          <img 
            src={product.images[currentImageIndex].url} 
            alt={product.title || 'Produto ampliado'} 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};

export default ProductCard;