// utils/skuNormalizer.ts
export class SKUNormalizer {
  
  /**
   * Normaliza diferentes formatos de SKU para padrão consistente
   */
  static normalize(input: string): string[] {
    if (!input) return [];
    
    const variations: string[] = [];
    const clean = input.trim().toUpperCase();
    
    // Adicionar versão original
    variations.push(clean);
    
    // Padrão RV: RV401031 → RV0401.0031
    if (/^RV\d{7,8}$/.test(clean)) {
      const digits = clean.substring(2);
      
      if (digits.length === 7) {
        // RV401031 → RV0401.0031
        const formatted = `RV${digits.substring(0, 4)}.${digits.substring(4)}`;
        variations.push(formatted);
        
        // Também tentar com zero à esquerda
        const withZero = `RV0${digits.substring(0, 3)}.${digits.substring(3)}`;
        variations.push(withZero);
      }
      
      if (digits.length === 8) {
        // RV04010031 → RV0401.0031
        const formatted = `RV${digits.substring(0, 4)}.${digits.substring(4)}`;
        variations.push(formatted);
      }
    }
    
    // Padrão com pontos: RV0401031 → RV0401.0031
    if (/^RV\d{4}\d{3,4}$/.test(clean)) {
      const digits = clean.substring(2);
      if (digits.length === 7) {
        const formatted = `RV${digits.substring(0, 4)}.${digits.substring(4)}`;
        variations.push(formatted);
      }
    }
    
    // Remover pontos: RV0401.0031 → RV04010031
    if (clean.includes('.')) {
      const withoutDots = clean.replace(/\./g, '');
      variations.push(withoutDots);
    }
    
    // Adicionar pontos se não tiver: RV04010031 → RV0401.0031
    if (/^RV\d{8}$/.test(clean)) {
      const digits = clean.substring(2);
      const withDot = `RV${digits.substring(0, 4)}.${digits.substring(4)}`;
      variations.push(withDot);
    }
    
    // Remover zeros à esquerda extras: RV00401.0031 → RV0401.0031
    const withoutLeadingZeros = clean.replace(/^RV0+(\d)/, 'RV$1');
    if (withoutLeadingZeros !== clean) {
      variations.push(withoutLeadingZeros);
    }
    
    // Adicionar zeros se necessário: RV401.31 → RV0401.0031
    if (/^RV\d{3}\.\d{2,3}$/.test(clean)) {
      const [prefix, suffix] = clean.split('.');
      const paddedPrefix = `RV0${prefix.substring(2)}`;
      const paddedSuffix = suffix.length === 2 ? `00${suffix}` : `0${suffix}`;
      variations.push(`${paddedPrefix}.${paddedSuffix}`);
    }
    
    // Remover duplicatas e retornar
    return [...new Set(variations)];
  }
  
  /**
   * Calcula distância de Levenshtein entre duas strings
   */
  static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1,     // deletion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * Encontra SKUs similares baseado em distância de edição
   */
  static findSimilar(input: string, skuList: string[], maxDistance: number = 3): Array<{sku: string, distance: number}> {
    const results: Array<{sku: string, distance: number}> = [];
    
    for (const sku of skuList) {
      const distance = this.levenshteinDistance(input.toUpperCase(), sku.toUpperCase());
      if (distance <= maxDistance) {
        results.push({ sku, distance });
      }
    }
    
    // Ordenar por distância (mais similar primeiro)
    return results.sort((a, b) => a.distance - b.distance);
  }
  
  /**
   * Gera sugestões de correção para input incorreto
   */
  static generateCorrections(input: string): string[] {
    const corrections: string[] = [];
    const clean = input.trim().toUpperCase();
    
    // Correções comuns de digitação
    const commonErrors = [
      { pattern: /RV(\d)(\d{3})(\d{4})/, replacement: 'RV0$1$2.$3' },  // RV140031 → RV0401.0031
      { pattern: /RV(\d{3})(\d{4})/, replacement: 'RV0$1.$2' },        // RV4010031 → RV0401.0031
      { pattern: /RV(\d{4})(\d{3})/, replacement: 'RV$1.0$2' },        // RV040131 → RV0401.0031
      { pattern: /^(\d{7,8})$/, replacement: 'RV$1' },                 // 4010031 → RV4010031
    ];
    
    for (const error of commonErrors) {
      if (error.pattern.test(clean)) {
        const corrected = clean.replace(error.pattern, error.replacement);
        corrections.push(corrected);
      }
    }
    
    return [...new Set(corrections)];
  }
}