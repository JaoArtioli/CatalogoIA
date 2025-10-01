import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSearch } from "../hooks/useSearch";
import ProductCard from "../components/product/ProductCard";
import { ArrowLeft } from "lucide-react";

export default function SearchResultsPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<number>(1);

  const query = searchParams.get('q') || searchParams.get('query') || '';
  const tipo = (searchParams.get('tipo') || 'TEXTO') as 'TEXTO' | 'CODIGO' | 'IMAGEM';

  const { data, isLoading, isError, error, isFetching } = useSearch({
    query,
    tipo,
    page,
    limit: 20
  });

  const handleBackToHome = () => {
    navigate('/');
  };

  const handlePreviousPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setPage((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft size={20} />
              Voltar ao início
            </button>
          </div>
          <div className="text-center py-12">
            <div 
              className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full mx-auto mb-4"
              style={{ borderColor: '#8A1618' }}
            />
            <p className="text-gray-600">Buscando produtos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft size={20} />
              Voltar ao início
            </button>
          </div>
          <div className="text-center py-12">
            <div className="mb-4 text-red-500">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-lg font-semibold">Erro na busca</p>
              <p className="text-sm">{error?.message || 'Erro desconhecido'}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-white rounded hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#8A1618' }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Valores padrão para evitar erros de tipagem
  const products = data?.products || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;
  const confidenceStats = data?.confidence_stats || {
    total: 0,
    alto: 0,
    medio: 0,
    baixo: 0
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBackToHome}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Voltar ao início
          </button>

          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Resultados da Busca
            </h1>
            {isFetching && (
              <div 
                className="animate-spin w-5 h-5 border-2 border-t-transparent rounded-full"
                style={{ borderColor: '#8A1618' }}
              />
            )}
          </div>

          {/* Info da busca - REMOVIDO "tipo:" */}
          <div className="mt-4 p-4 bg-white rounded-lg shadow-sm border">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span><strong>Busca:</strong> "{query}"</span>
              <span><strong>Resultados:</strong> {total} produtos encontrados</span>
              
              {/* Estatísticas de Confiança - REMOVIDAS DO CABEÇALHO */}
              {confidenceStats.total > 0 && (
                <div className="text-xs text-gray-500">
                  ({confidenceStats.alto} alta, {confidenceStats.medio} média, {confidenceStats.baixo} baixa confiança)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resultados */}
        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  searchQuery={query}
                />
              ))}
            </div>

            {/* Paginação */}
            <div className="flex items-center justify-between mt-8 bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">
                {isFetching ? (
                  "Atualizando..."
                ) : (
                  `Mostrando ${((page - 1) * 20) + 1}-${Math.min(page * 20, total)} de ${total} produtos`
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={page === 1 || isFetching}
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-75 transition-opacity"
                >
                  Anterior
                </button>

                <div 
                  className="px-4 py-2 border rounded-md text-white"
                  style={{ backgroundColor: '#8A1618', borderColor: '#8A1618' }}
                >
                  Página {page}
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={isFetching || !hasMore}
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-75 transition-opacity"
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Nenhum resultado encontrado */
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold mb-2 text-gray-800">
              Nenhum produto encontrado
            </h2>
            <p className="mb-6 text-gray-600">
              Não foi possível encontrar produtos que correspondam à sua busca "{query}".
            </p>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Sugestões:</p>
              <ul className="text-sm space-y-1 max-w-md mx-auto text-left text-gray-600">
                <li>• Verifique a ortografia</li>
                <li>• Tente termos mais específicos ou mais gerais</li>
                <li>• Use códigos de peças ou SKUs</li>
                <li>• Experimente buscar por marca</li>
                {tipo === 'IMAGEM' && (
                  <>
                    <li>• Para busca por imagem, use nomes de arquivo descritivos</li>
                    <li>• Exemplo: "alternador-hyster.jpg" ou "filtro-oleo-yale.png"</li>
                  </>
                )}
              </ul>
              
              <button
                onClick={handleBackToHome}
                className="mt-4 px-6 py-2 text-white rounded hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#8A1618' }}
              >
                Fazer nova busca
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}