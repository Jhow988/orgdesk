// ATENÇÃO: Este algoritmo é específico para o layout NFS-e do Município de Taubaté.
// Já foi testado em produção. NÃO ALTERAR.

function limparCnpj(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function extrairCnpjDaPagina(texto: string, paginaNum: number): string | null {
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

export function extrairCnpjBoleto(textoCompleto: string, cnpjsIgnore: string[] = []): string | null {
  // Localiza bloco "Pagador"
  const mPagador = textoCompleto.match(/Pagador[:\s]*/i)
  if (mPagador && mPagador.index !== undefined) {
    const bloco = textoCompleto.slice(mPagador.index, mPagador.index + 400)
    const blocoFiltrado = bloco.split(/Benefici[áa]rio/i)[0]
    const matches = blocoFiltrado.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g)
    if (matches) {
      for (const raw of matches) {
        const cnpj = limparCnpj(raw)
        if (cnpj.length === 14 && !cnpjsIgnore.includes(cnpj)) return cnpj
      }
    }
  }

  // Fallback: varre todo o texto
  const allMatches = textoCompleto.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g)
  if (allMatches) {
    for (const raw of allMatches) {
      const cnpj = limparCnpj(raw)
      if (cnpj.length === 14 && !cnpjsIgnore.includes(cnpj)) return cnpj
    }
  }

  return null
}
