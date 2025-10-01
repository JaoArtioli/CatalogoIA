import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Zap, Upload, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SEARCH_TYPES } from "@/utils/constants";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (query?: string, type: keyof typeof SEARCH_TYPES = "TEXTO") => {
    const searchTerm = query ?? searchQuery;
    if (!searchTerm.trim()) return;
    
    const params = new URLSearchParams();
    params.set("q", searchTerm.trim());
    params.set("tipo", type);
    
    console.log('🔍 Redirecionando para busca:', { searchTerm, type, url: `/search?${params.toString()}` });
    navigate(`/search?${params.toString()}`);
  };

  const handleImageSearch = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        // Converte a imagem para base64 para enviar para análise
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64Image = event.target?.result as string;
          
          // Mostra loading
          const loadingMessage = `Analisando imagem "${file.name}"...\n\nPor favor, aguarde enquanto nossa IA identifica a peça.`;
          alert(loadingMessage);
          
          try {
            // TODO: Implementar chamada para API de análise de imagem
            // Por enquanto, simula análise com delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Simula resultado da análise de imagem
            const mockAnalysisResult = await simulateImageAnalysis(base64Image, file.name);
            
            if (mockAnalysisResult.identified) {
              // Se identificou algo, faz a busca
              const params = new URLSearchParams();
              params.set("q", mockAnalysisResult.searchTerms.join(' '));
              params.set("tipo", "IMAGEM");
              
              console.log('🖼️ Busca por imagem identificada:', { 
                arquivo: file.name,
                termosIdentificados: mockAnalysisResult.searchTerms,
                confianca: mockAnalysisResult.confidence,
                url: `/search?${params.toString()}` 
              });
              
              navigate(`/search?${params.toString()}`);
            } else {
              // Se não identificou, pede descrição manual
              const description = prompt(
                `Não foi possível identificar automaticamente a peça na imagem.\n\n` +
                `Por favor, descreva o que você vê:\n` +
                `(ex: "alternador", "filtro hidráulico", "bomba d'água", etc.)`
              );
              
              if (description && description.trim()) {
                const params = new URLSearchParams();
                params.set("q", description.trim());
                params.set("tipo", "IMAGEM");
                
                console.log('🖼️ Busca por imagem com descrição manual:', { 
                  arquivo: file.name,
                  descricao: description.trim(),
                  url: `/search?${params.toString()}` 
                });
                
                navigate(`/search?${params.toString()}`);
              }
            }
          } catch (error) {
            console.error('Erro na análise de imagem:', error);
            alert('Erro ao analisar a imagem. Tente novamente.');
          }
        };
        
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // Simula análise de imagem (substituir por API real)
  const simulateImageAnalysis = async (base64Image: string, fileName: string) => {
    // Aqui você integraria com serviços como:
    // - Google Vision API
    // - AWS Rekognition  
    // - Azure Computer Vision
    // - Ou modelo próprio de ML
    
    // Por enquanto, analisa o nome do arquivo e simula alguns resultados
    const lowerFileName = fileName.toLowerCase();
    
    // Palavras-chave que indicam peças específicas
    const keywords = {
      'alternador': ['alternador', 'gerador'],
      'filtro': ['filtro', 'filter'],
      'bomba': ['bomba', 'pump'],
      'vela': ['vela', 'ignição', 'spark'],
      'oleo': ['óleo', 'oil'],
      'agua': ['água', 'water'],
      'hidraulico': ['hidráulico', 'hydraulic'],
      'combustivel': ['combustível', 'fuel'],
      'ar': ['ar', 'air'],
      'freio': ['freio', 'brake'],
      'embreagem': ['embreagem', 'clutch']
    };
    
    const foundKeywords = [];
    
    for (const [key, variants] of Object.entries(keywords)) {
      if (variants.some(variant => lowerFileName.includes(variant))) {
        foundKeywords.push(key);
      }
    }
    
    // Simula análise baseada em padrões do nome
    const hasProductCode = /[A-Z0-9]{4,}/i.test(fileName);
    const hasBrandName = /(hyster|yale|clark|toyota|still)/i.test(lowerFileName);
    
    if (foundKeywords.length > 0 || hasProductCode || hasBrandName) {
      return {
        identified: true,
        confidence: foundKeywords.length > 0 ? 0.8 : 0.6,
        searchTerms: [
          ...foundKeywords,
          ...(hasProductCode ? [fileName.match(/[A-Z0-9]{4,}/i)?.[0] || ''] : []),
          ...(hasBrandName ? [lowerFileName.match(/(hyster|yale|clark|toyota|still)/i)?.[0] || ''] : [])
        ].filter(term => term.length > 0)
      };
    }
    
    return {
      identified: false,
      confidence: 0,
      searchTerms: []
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-white">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src="/LogoLog.png" 
                alt="LogParts Logo" 
                className="h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate("/")}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
          <div className="text-center">
            <div className="mb-12">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                Encontre a peça{" "}
                <span className="relative" style={{ color: '#8A1618' }}>
                  certa
                  <div className="absolute -bottom-2 left-0 right-0 h-1 rounded-full" style={{ backgroundColor: '#8A1618' }}></div>
                </span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Sistema interno de busca inteligente para peças de empilhadeiras. 
                <br className="hidden sm:block" />
                Códigos OEM, SKUs e descrições com resultados precisos.
              </p>
            </div>

            <div className="mb-12 max-w-2xl mx-auto">
              <div className="relative flex items-center shadow-lg rounded-xl">
                <div className="absolute left-4 text-gray-400">
                  <Search className="h-6 w-6" />
                </div>
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Digite o código, SKU ou descrição da peça..."
                  className="w-full pl-12 pr-24 py-6 text-lg border-gray-300 rounded-xl focus:ring-2 focus:border-transparent"
                  style={{ 
                    '--tw-ring-color': '#8A1618',
                    '--tw-ring-opacity': '0.5'
                  } as React.CSSProperties}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#8A1618'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                />
                <div className="absolute right-2">
                  <Button 
                    onClick={() => handleSearch()} 
                    disabled={!searchQuery.trim()} 
                    size="lg"
                    className="text-white px-6 py-3"
                    style={{ backgroundColor: '#8A1618' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9A2F2F'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8A1618'}
                  >
                    Buscar
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-16">
              <button 
                onClick={() => handleSearch(searchQuery, "TEXTO")}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-200 transition-colors"
              >
                <Search className="h-4 w-4" />Busca por Texto
              </button>
              <button 
                onClick={() => handleSearch(searchQuery, "CODIGO")}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-200 transition-colors"
              >
                <Zap className="h-4 w-4" />Códigos OEM/ALT
              </button>
              <button 
                onClick={handleImageSearch}
                className="flex items-center gap-2 px-4 py-2 text-white border rounded-lg transition-colors"
                style={{ backgroundColor: '#8A1618', borderColor: '#8A1618' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#9A2F2F';
                  e.currentTarget.style.borderColor = '#9A2F2F';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#8A1618';
                  e.currentTarget.style.borderColor = '#8A1618';
                }}
              >
                <Upload className="h-4 w-4" />Busca por Imagem
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#8A1618' }}>
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Sistema Interno LogParts</h3>
                <p className="text-gray-600 mb-8">
                  Ferramenta avançada de busca com IA para colaboradores. Encontre peças para empilhadeiras 
                  das principais marcas com tecnologia de ponta.
                </p>
              </div>

              {/* Funcionalidades do Sistema */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#8A1618' }}>
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Busca por Imagem</h4>
                    <p className="text-sm text-gray-600">
                      Tecnologia avançada de reconhecimento visual. Faça upload de fotos da peça 
                      e nossa IA identifica automaticamente o código e especificações.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#8A1618' }}>
                    <Search className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">IA Inteligente</h4>
                    <p className="text-sm text-gray-600">
                      Sistema de busca com inteligência artificial que compreende descrições 
                      parciais e sugere as peças mais relevantes mesmo com informações limitadas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#8A1618' }}>
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Códigos Originais</h4>
                    <p className="text-sm text-gray-600">
                      Base completa de códigos OEM originais das fabricantes. Acesso direto aos 
                      códigos oficiais Hyster, Yale, Clark, Toyota, Still e Paletrans.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#8A1618' }}>
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Códigos Alternativos</h4>
                    <p className="text-sm text-gray-600">
                      Sistema inteligente que sugere códigos equivalentes e alternativos. 
                      Encontre substituições compatíveis com garantia de qualidade.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;