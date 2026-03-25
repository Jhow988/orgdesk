// ATENÇÃO: Este algoritmo é específico para o layout NFS-e do Município de Taubaté.
// Já foi testado em produção. NÃO ALTERAR.

function limparCnpj(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function extrairCnpjDaPagina(texto: string, _paginaNum: number): string | null {
  const mTomador = texto.match(/TOMADOR\s+DE\s+SERVI[CÇ]OS/i)
  if (!mTomador) return null

  const textoTomador = texto.slice(mTomador.index)
  const linhas = textoTomador.split('\n')

  // CNPJ na mesma linha que TOMADOR
  const rawsInline = linhas[0].match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g)
  if (rawsInline) return limparCnpj(rawsInline[rawsInline.length - 1])

  for (let j = 1; j < Math.min(20, linhas.length); j++) {
    const l = linhas[j]
    if (/DISCRIMINA[CÇ][AÃ]O\s+DOS\s+SERVI[CÇ]OS|DEDU[CÇ][OÕ]ES|ISSQN\s+RETIDO|ALIQUOTA/i.test(l)) break

    // Prioridade 1: campo CNPJ/CPF explícito — pega o último (direita = tomador)
    const matchesCampo = [...l.matchAll(/CNPJ\s*\/?>\s*CPF\s*[:\s]+(\d{2}[\. ]?\d{3}[\. ]?\d{3}[/ ]+\d{4}[\- ]+\d{2})\b/gi)]
    if (matchesCampo.length) {
      const cnpj = limparCnpj(matchesCampo[matchesCampo.length - 1][1])
      if (cnpj.length === 14) return cnpj
    }

    // Prioridade 2: XX.XXX.XXX/XXXX-XX
    const raws = l.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g)
    if (raws) {
      const cnpj = limparCnpj(raws[raws.length - 1])
      if (cnpj.length === 14) return cnpj
    }

    // Prioridade 3: XXXXXXXX/XXXX-XX
    const raws2 = l.match(/\d{8}\/\d{4}-\d{2}/g)
    if (raws2) {
      const cnpj = limparCnpj(raws2[raws2.length - 1])
      if (cnpj.length === 14) return cnpj
    }
  }

  return null
}

// Normaliza texto removendo espaços ao redor de pontuação CNPJ para facilitar o match.
// Ex: "12 . 345 . 678 / 9012 - 34" → "12.345.678/9012-34"
function normalizarTexto(texto: string): string {
  return texto
    .replace(/(\d)\s*\.\s*(\d)/g, '$1.$2')
    .replace(/(\d)\s*\/\s*(\d)/g, '$1/$2')
    .replace(/(\d)\s*-\s*(\d)/g, '$1-$2')
}

function cnpjsDoBloco(bloco: string, cnpjsIgnore: string[]): string | null {
  // Tenta formato padrão XX.XXX.XXX/XXXX-XX
  const matches = bloco.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g)
  if (matches) {
    for (const raw of matches) {
      const cnpj = limparCnpj(raw)
      if (cnpj.length === 14 && !cnpjsIgnore.includes(cnpj)) return cnpj
    }
  }
  return null
}

export function extrairCnpjBoleto(textoCompleto: string, cnpjsIgnore: string[] = []): string | null {
  const texto = normalizarTexto(textoCompleto)

  // 1. Bloco "Pagador" (layout padrão FEBRABAN)
  const mPagador = texto.match(/Pagador[:\s]*/i)
  if (mPagador?.index !== undefined) {
    const bloco = texto.slice(mPagador.index, mPagador.index + 500)
    const result = cnpjsDoBloco(bloco.split(/Benefici[áa]rio|Sacador/i)[0], cnpjsIgnore)
    if (result) return result
  }

  // 2. Bloco "Sacado" (layout alternativo usado por muitos bancos)
  const mSacado = texto.match(/Sacado[:\s]*/i)
  if (mSacado?.index !== undefined) {
    const bloco = texto.slice(mSacado.index, mSacado.index + 500)
    const result = cnpjsDoBloco(bloco.split(/Cedente|Benefici[áa]rio|Sacador|Avalista/i)[0], cnpjsIgnore)
    if (result) return result
  }

  // 3. Bloco após "CPF/CNPJ" ou "CNPJ/CPF" (encontrado em alguns layouts)
  const mCnpjLabel = texto.match(/CPF\s*\/\s*CNPJ|CNPJ\s*\/\s*CPF/i)
  if (mCnpjLabel?.index !== undefined) {
    const bloco = texto.slice(mCnpjLabel.index, mCnpjLabel.index + 200)
    const result = cnpjsDoBloco(bloco, cnpjsIgnore)
    if (result) return result
  }

  // 4. Fallback: varre todo o texto (ignora CNPJs da lista de ignore)
  return cnpjsDoBloco(texto, cnpjsIgnore)
}
