// test-api-real-data.js
// Execute: node test-api-real-data.js

async function testAPI() {
  console.log('🔍 Testando se a API usa dados reais ou mock...');
  console.log('=' .repeat(60));

  try {
    // 1. Testar endpoint de produtos
    console.log('1. Testando /api/v1/products...');
    const response = await fetch('http://localhost:8000/api/v1/products?limit=10');
    const data = await response.json();
    
    console.log('Status:', response.status);
    
    const products = Array.isArray(data) ? data : data.products || [];
    console.log('Produtos retornados:', products.length);
    
    if (products.length > 0) {
      console.log('\n📦 PRODUTOS DA API:');
      products.slice(0, 5).forEach((p, i) => {
        console.log(`${i + 1}. SKU: ${p.sku || 'N/A'}`);
        console.log(`   Título: ${p.title || 'N/A'}`);
        console.log('');
      });
      
      // Verificar se tem produtos que existem no banco real
      const realSKUs = ['RV0402.0020', 'RV0402.0031', 'RV0402.0305'];
      const hasRealData = products.some(p => realSKUs.includes(p.sku));
      
      console.log('🎯 RESULTADO:');
      if (hasRealData) {
        console.log('✅ API está retornando DADOS REAIS do banco!');
      } else {
        console.log('❌ API está retornando DADOS MOCK/FICTÍCIOS!');
        console.log('   - Deveria ter SKUs como: RV0402.0020, RV0402.0031, etc.');
        console.log('   - Mas tem SKUs como:', products.map(p => p.sku).join(', '));
      }
      
    } else {
      console.log('❌ Nenhum produto retornado pela API');
    }

    // 2. Testar outros endpoints
    console.log('\n2. Testando outros endpoints...');
    const endpoints = [
      '/api/v1/products?limit=50',
      '/api/v1/products?skip=10&limit=10',
      '/health',
      '/docs'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(`http://localhost:8000${endpoint}`);
        console.log(`${endpoint}: ${res.status}`);
      } catch (error) {
        console.log(`${endpoint}: ERRO`);
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testAPI().then(() => {
  console.log('\n' + '=' .repeat(60));
  console.log('💡 PRÓXIMOS PASSOS:');
  console.log('1. Se API retorna dados mock: verificar configuração do banco na API');
  console.log('2. Se API retorna dados reais: problema pode estar no frontend');
  console.log('3. Verificar logs da API: docker logs log-parts-catalog-api-1');
});