export const DEFAULT_SUBJECT = 'Nota Fiscal - {mes_ano}'

export const DEFAULT_BODY = `Prezado(a) {nome_cliente},

Segue em anexo sua Nota Fiscal referente ao período {mes_ano}.
Caso esteja cadastrado, segue em anexo seu boleto referente ao mesmo mês.

A partir do mês de março de 2026, todos os boletos não terão acréscimos de juros, caso venham a passar a data de vencimento. Entendemos que imprevistos podem acontecer e acreditamos assim melhorar ainda mais nossa parceria.

Se desejar cadastrar nosso PIX para futuros pagamentos, seguem os dados:

BANCO INTER
ALLAN CORREA DA SILVA
PIX/CNPJ: 24.347.456/0001-90

Em caso de dúvidas, entre em contato conosco.

Atenciosamente,
Jhonatan Oliveira
WhatsApp: (12) 98868-7056
Departamento Financeiro
Syall Soluções
financeiro@syall.com.br`

export interface EmailTemplateRow {
  id:      string
  name:    string
  subject: string
  body:    string
}
