import React, { useState } from "react";
import { useProducts, Product } from "../hooks/useProducts";

export default function ProductsList(): JSX.Element {
  const [page, setPage] = useState<number>(1);
  const limit = 20;
  const { data, isLoading, isError, error, isFetching } = useProducts(page, limit);

  if (isLoading) return <div className="p-6">Carregando produtos…</div>;
  if (isError) return <div className="p-6 text-red-600">Erro: {error?.message ?? "Erro desconhecido"}</div>;

  // normalize data so TypeScript knows it's an array
  const products: Product[] = Array.isArray(data) ? data : [];

  const handlePreviousPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setPage((prev) => prev + 1);
  };

  // Função para normalizar o brand (pode ser string ou objeto)
  const getBrandName = (brand: Product['brand']): string => {
    if (!brand) return '';
    if (typeof brand === 'string') return brand;
    return brand.name || '';
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Produtos</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.length > 0 ? (
          products.map((product: Product) => (
            <div key={product.id} className="border rounded p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-40 bg-gray-100 mb-3 flex items-center justify-center overflow-hidden rounded">
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

              {product.sku && (
                <div className="text-sm text-gray-600 mb-1">SKU: {product.sku}</div>
              )}
              
              {product.title && (
                <div className="font-medium mb-1 line-clamp-2">{product.title}</div>
              )}

              {getBrandName(product.brand) && (
                <div className="text-sm text-blue-600 mb-2">Marca: {getBrandName(product.brand)}</div>
              )}
              
              {product.description && (
                <div className="text-sm text-gray-700 mt-2 line-clamp-3">{product.description}</div>
              )}

              {product.codes && product.codes.length > 0 && (
                <div className="text-xs text-gray-500 mt-2">
                  Código: {product.codes[0].code}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full p-6 text-center text-gray-600">
            Nenhum produto encontrado.
          </div>
        )}
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-500">
          {isFetching && "Atualizando..."}
          {products.length > 0 && !isFetching && (
            `Mostrando ${products.length} produtos (Página ${page})`
          )}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handlePreviousPage}
            disabled={page === 1 || isFetching}
            className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Anterior
          </button>
          
          <div className="px-4 py-2 border rounded-md bg-blue-50 text-blue-700">
            Página {page}
          </div>
          
          <button 
            onClick={handleNextPage} 
            disabled={isFetching || products.length < limit}
            className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}