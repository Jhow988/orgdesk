'use server'

import { auth } from '@/auth'
import { adminPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// CSV: Nome;E-mail;CNPJ / CPF;E-mail para envio NFe
const CSV = `Nome;E-mail;CNPJ / CPF;E-mail para envio NFe
CLINICA MEDICO-ODONTOLOGICA DE IMAGEM LTDA;cimo@syall.com.br;07229833000178;
DR. ESSENCIAL CLINICA MEDICA LTDA;clinicaessencial@syall.com.br;31113485000153;
Fundacao Valeparaibana de Ensino univap;vlad@univap.br;60191244000120;
AVALMED - Mednet Santo André;financeiro@mednet-sbc.com.br;18412028000100;
Clínica CMS;adm@cmsocupacional.com.br;06900766000109;
MARCOS GLAYDSON DE OLIVEIRA - ME (Despol);despolfinanceiroadm@gmail.com;17525753000113;
INSTITUTO DE PREVIDENCIA DO SERVIDOR MUNICIPAL SAO JOSE DOS CAMPOS;compras@ipsmsjc.sp.gov.br;96490479000160;
Santa Casa Guaratinguetá;nicolas@santacasaguara.com.br;48547806000120;
INSTITUTO ISERBEM;financeiro.institutoiserbem@gmail.com;21851518000109;
SAYMON DE OLIVEIRA PINTO;adm@expressotupa.com.br;29746387000101;
IBGM - INSTITUTO BRASILEIRO DE GESTAO & MARKETING LTDA;telefonia@grupounibra.com;07397220000140;
Doutor Lab;patricia@doutorlab.com.br;24285331000183;
Centro Médico FR S/S LTDA - (FRX);financeiro@centromedicofrx.com.br;04763898000100;
Mednet São José dos Campos;fin01@mednet-sjc.com.br;04950791000171;
Clinica do trabalhador (MICHELON & MICHELON LTDA);clinicadotrabalhador@indesk.com.br;17721626000190;
LSC MEDICINA LABORATORIAL EIRELILSC MEDICINA;clinicalsc@syall.com.br;29247482000160;
ASTRID ISABEL LEMES EPP;clinicadesaudetaubate@hotmail.com;11726986000106;
STELA CYBELE COSTA MOREIRA ME (Mednet Jundiaí);at01@mednet-jund.com.br;14736871000182;
Uro-Renos Clinica Medica Especializada em Urologia LTDA - Clinica Renos;adm@clinicarenos.com.br;10601936000121;
CLINICA ODONTOLOGICA RUBENS GUIMARAES LTDA;contabilidade@institutoodontologico.com.br;10173893000120;
CENTTRALMED Centtralpar - Central de Servicos Especializados de Apoio Administrativos LTDA;marcela.oliveira@centtralmed.com.br;11609386000150;
Associacao Residencial Catagua - Arc;contasapagar@grupounicon.com.br;20855811000181;
ARMAZÉM BMX;armazembmx@oucj.com.br;11560854000149;
Ortocentro;gerencia@ortocentrotaubate.com.br;02180166000162;
SOLDMEC;financeiro@soldmec.com.br;15685181000104;
Banco do Povo;;13902387000113;
kalunga;;43283811000150;
Allan Correa da Silva 38360613842;contato@syall.com.br;24347456000190;
INSTITUTO DE SAUDE FATOR HUMANO LTDA;financeiro@institutofatorhumano.com.br;26176977000158;
Aratu Ambiental Ltda EPP;diego@aratuambiental.com.br;04825937000157;
Odonto Laser Care;contabilidade@institutoodontologico.com.br;40238629000199;
Clinica MEDNET - Piracicaba - SP;fin01@mednet-pir.com.br;11423757000104;
Laboratório Cruzeiro Tatui;darli@deltec.cnt.br;05519134000137;
MARCIO ALVES DOS SANTOS 30050530836 - MEI (SM BOT);;37059267000164;
S M Informática;sminformatica@oucj.com.br;06245736000106;
Refricril Içara;financeiro1@refricril.com.br;01919309000142;
DHR TECNOLOGIA LTDA;;31865369000190;
CARDIOVITA SERVIÇOS MÉDICOS LTDA;sandraregina@clinicacardiovita.com.br;18674947000143;
G DE FARIA e CIA ltda;;00355322000153;
Laboratório Sace serviços de análises clínicas especializada;;60132461000140;
Paddo Ambiental Ltda;;06344228000185;
Passos Cartorio de Registro de Imoveis;contato@ripassos.com.br;20916284000178;
Sicoob Campos do Jordão;contasapagar.5032@sicoob.com.br;71698674000583;
3 Tabelião de notas;;07391654000132;
LABORATORIO EMILIO RIBAS ANALISES CLINICA LTDA;ribastau@terra.com.br;50463553000159;
MEDNET UBERLANDIA - OCUPPARE SERVICOS MEDICOS LTDA;;22962400000110;
WASHMAY SOLUCOES EMPRESARIAIS;;33828719000174;
1° Tabelião de Notas e Protesto de Letras e Títulos de Caçapava;;48408538000166;
Supremus;contato@supremusseguranca.com.br;15707531000196;
ADPLAN;;23353315000118;
KPF Engenharia;;20414529000169;
Medclin;medclin@oucj.com.br;14315066000185;
RMC NEGOCIOS I LTDA ME (Mundo Imobiliário);;10506237000100;
Forte Fino;fortefino@oucj.com.br;20231281000362;
UBS Cumari;;11608994000140;
Sampa Laser;;14397966000119;
Urogineclin;urogineclin@oucj.com.br;04043257000181;
Refricril Porto Alegre;financeiro1@refricril.com.br;01919309001033;
Refricril Blumenau;financeiro1@refricril.com.br;01919309000819;
Refricril Joinville;financeiro1@refricril.com.br;01919309000576;
Refricril Criciúma;financeiro1@refricril.com.br;01919309000908;
Cardiolife;cardiolife@oucj.com.br;19595476000140;
Andrades Veículos;andradesveiculos@oucj.com.br;32039809000113;
Santa Casa de Misericórdia São Vicente de Paulo;financeiro.santacasacb@gmail.com;19128248000160;
Refricril Londrina;refricril@oucj.com.br;01919309000738;
YNOVA TRANSPORTES E LOGISTICA LTDA;ynovapinda@oucj.com.br;21329965000100;
YNOVA TRANSPORTES E LOGISTICA LTDA;ynovamt@oucj.com.br;21329965000607;
Moderna Sofas;modernasofas@oucj.com.br;17830240000116;
Castorzão da Construção;castorzao@uol.com.br;10203140000110;
Alfa Clin;alfa.clin@outlook.com.br;17348695000108;
Centtral Med RJ;centtralmedcruzeiro@oucj.com.br;38449145000147;
Icaro Studio (Caroline Cristina Lima de Almeida 97391891134);icarostudioecidadania@gmail.com;42785441000196;
Policlínica Real;financeiro2@paxreal.com.br;34162378000103;
SICOOB UNIMAIS Porto Ferreira;contasapagar.5032@sicoob.com.br;71698674000907;
Sicoob Taubaté Jardim Das Nações;contasapagar.5032@sicoob.com.br;71698674000150;
Melos Segurança e Medicina Ocupacional;contasapagar@melos.com.br;08059399000198;
Pet Shop Hotel;adm@hvparaisodospets.com.br;17960405000174;
Laboratório Santa Paula;financeiro@santapauladf.com.br;00063263000140;
2 Tabeliao de Notas e de Protesto de Letras e Titulos de Mogi Guacu - Sp;juliano@tabelionatomogiguacu.com.br;50075217000139;
Contabilidade Universal SS LTDA;administrativo@contsal.com.br;65057184000171;
Paulimed Medicina e Seguranca do Trabalho LTDA - MEDNET PAULINIA;gerencia@mednet-paulinia.com.br;27708966000134;
FVL NOBREGA;fulvionobrega01@gmail.com;01884270000175;
Cooper Vale;financeiro@coopervalemt.com.br;21679098000125;
Lucca e Lucca Educacao e Treinamento LTDA;lucasdemoroczka@gmail.com;33746531000187;
MEDNET Brasilia;mednetbrasilia@oucj.com.br;26668916000108;
Valéria Matos Contabilidade;valeriamatoscontabilidade@oucj.com.br;29101007000181;
DD VALE;ddvale@oucj.com.br;71610620000190;
Labore Pinda;financeiro@laboreocupacional.com.br;01010994000190;
MZ MOTOS - new bahia harley davison;financeiro@newbahiahd.com.br;29392513000177;
Cartório de Imóveis Caçapava;cartoriocacapava@oucj.com.br;48408520000164;
Ludos Pro Tecnologia e Aprendizagem Ltda;;40020781000109;
Clinica Fratura Santa Terezinha;financeiro.staterezinha@oulook.com;53316923000113;
Hospital e Maternidade Frei Galvão;informatica@hospitalfreigalvao.com.br;51612828000131;
MEDNET INDAIATUBA - COSTA MOREIRA MEDICINA OCUPACIONAL LTDA;at01@mednet-indaiatuba.com.br;32060280000110;
Drogaria Ultra Popular (Hn drogaria LTDA);drogariaultrapopular@oucj.com.br;37721519000330;
BERTRAN - CLARO;bertrantelecom@gmail.com;23166752000122;
Jhonatan de Oliveira Pinto 36558011816;adm@syall.com.br;20538261000177;
RICARDO DA CONCEICAO LIMA;comercial@rbcdigitall.com.br;36840550000166;
Madeireira Pinhal;;02838114000130;
CEAME CENTRO DE ATENDIMENTO MEDICO LTDA;adm@ceamejacarei.com.br;04101394000125;
Radiograf Radiodiagnostico e Documentacao Odontologica LTDA;radiograf3d@gmail.com;14815797000190;
STAMP-VALLE INDUSTRIA E COMERCIO LTDA ME;;00229213000190;
EBCT;;34028316000103;
Unicon - C&C Assessoria Empresarial Unicom;financeiro.condominio@grupounicon.com.br;01263796000138;
Instituto Cruz Freire;;11708622000195;
IUGU INSTITUICAO DE PAGAMENTO S.A;;15111975000164;
FILETI ARRUDA SERVICOS MEDICOS LTDA (Clínica Crescere);peu_arruda@hotmail.com;31935856000182;
Unicon - Univalle Consultoria Imobiliaria LTDA;adm@univalle.com.br;46355952000129;
Pro humana serviços medicos ltda SALTO Doctor Prime;sara.doctor@outlook.com;05678821000103;
Prime Home Decor;financeiro@primehomedecor.com.br;19753750000162;
Zanini e Tafuri Sociedade de Advogados (Henrique advogados);henrique@zaninitafuri.com.br;21127289000184;
MEDVALE - CLINICA MEDICA E ORTOPEDIA LTDA;financeiro@medvale.com.br;02359736000186;
MERCADOPAGO.COM REPRESENTACOES LTDA;;10573521000191;
EBANX LTDA;;13236697000146;
Clínica Pediátrica e vacinações Dr. Paulo Rosa Ltda - Leve Vida;administracao@levevida.com.br;03260975000147;
Felicita Odontologia Integrada LTDA;felicitaodontologiaintegrada@gmail.com;43211545000150;
A D FURTADO & CIA LTDA - Fillos;financeiro@fillos.com.br;21229477000113;
Habitte Lar;financeiro@habittelar.com.br;11650191000153;
Pro Humana Serviços medicos Ltda Sorocaba Doctor Prime;sara.doctor@outlook.com;05678821000286;
SAINT CLAIR SERVICOS MEDICOS LTDA.;ceciliacostasaintclair@gmail.com;07222356000119;
Tintas Goncalves Brc - Comercio de Tintas LTDA;tgt@tintasgoncalves.com.br;11345316000131;
MEDCO CENTRO CLINICO EIRELI;administrativo@medco.com.br;21021619000152;
Sicoob Unique Br - ELFO MARKETING LTDA;elio@elfotv.com.br;13959080000159;
LIMA SANTOS BIOANALISE LTDA RESOLUTA;bioanalise.canavieiras@gmail.com;14190492000130;
AEROPORTO DE SAO JOSE DOS CAMPOS LTDA;financeiro@sjkairport.com;46411098000170;
JANAINA FERNANDES SOCIEDADE INDIVIDUAL DE ADVOCACIA;financeiro@jfernandes.adv.br;33567233000120;
REFRICRIL - FLORIANOPOLIS;refricril@oucj.com.br;01919309001114;
ORGANISYS SOFTWARE LTDA.;;01056417000139;
Zuleika e Rosemary Doces LTDA;contato@zuleikasdoces.com.br;52918455000275;
DORNA ASSESSORIA CONTABIL LTDA;financeiro@espacodorna.com.br;45379427000180;
Dorna Fisioterapia e Bem Estar LTDA;financeiro@espacodorna.com.br;18295487000142;
M.B DA FONTE SERV COBRA E MANUT DE COMPUTADORES;paulo.almeida@dafontepneus.com.br;03876012000172;
RUBACK SOCIEDADE INDIVIDUAL DE ADVOCACIA;financeiro@rubackadvogados.com.br;27074941000126;
Chronomax LTDA;adm@chronomax.com.br;40436165000125;
INSTITUTO TONIOLO;financeiro@gruppotoniolo.com.br;09019939000172;
ORTHOCLINICA LTDA - ME;orthoclinica.pg@gmail.com;04370580000160;
CLINICA SANTE MEDICINA ESPECIALIZADA LTDA;clinica.sante.ap@gmail.com;10211968000110;
Sicoob Mantiqueira Cooperativa de Crédito de Livre Admissão - SICOOB LIMEIRA;contasapagar.5032@sicoob.com.br;71698674001040;
SICOOB UNIMAIS MANTIQUEIRA COOPERATIVA - SICOOB TAUBATÉ JAQUES;contasapagar.5032@sicoob.com.br;71698674000311;
Reloponto;elisangela@reloponto.com;30435586000188;
SICOOB UNIMAIS MANTIQUEIRA COOPERATIVA - UNIDADE ARARAS;contasapagar.5032@sicoob.com.br;71698674001393;
SICOOB UNIMAIS MANTIQUEIRA COOPERATIVA - UNIDADE 9 DE JULHO;contasapagar.5032@sicoob.com.br;71698674001636;
SICOOB UNIMAIS MANTIQUEIRA COOPERATIVA - PINDAMONHANGABA;contasapagar.5032@sicoob.com.br;71698674000664;
SICOOB UNIMAIS MANTIQUEIRA COOPERATIVA - UNIDADE SÃO JOSÉ DOS CAMPOS;contasapagar.5032@sicoob.com.br;71698674000826;
CLINIFOR - CLINICA DE FRATURAS E ORTOPEDIA S/S LTDA;gclinifor@gmail.com;57534208000108;
RFF Holding Ltda;augusto.gomes@rffenterprises.com;38152076000105;
SESI - DR/AP SERVICO SOCIAL DA INDUSTRIA;;03775620000190;
Pronval Medicina e Diagnostico LTDA;admpronval@gmail.com;51615136000147;
SERVICOS FUNERARIOS MORENO DE IPERO LTDA Lucemi;contasapagar@grupomoreno.com.br;21464711000278;
Click Way Tecnologia e Servicos LTDA;;07809003000110;
Gfx Administracao em Saude LTDA - AGEPLUS;grupofinanceirogfx@gmail.com;14560798000130;
TECHNOSERV INFORMÁTICA LTDA;financeiro@technoserv.com.br;05848836000164;
Saude Prev Educacional do Trabalho LTDA;financeiro@saudeprevocupacional.com.br;53139529000157;
Medvale Seguranca e Medicina do Trabalho LTDA mednet Jacarei;fin01@mednet-jac.com.br;33681158000123;
Lrb Alpha Servicos Medicos Ltda - mednet Barueri;mauricio@mednet-barueri.com.br;43085170000129;
Bej Ocupacional LTDA - mednet RJ Barra da Tijuca;fin01@mednet-rj2.com.br;42066429000121;
Soluções Ocupacionais e Apoio Adm- Mednet RJ Centro;fin01@mednet-rj2.com.br;30217659000165;
Fttf LTDA - mednet Araraquara;contato@mednet-araraquara.com.br;44384620000147;
SICOOB MANTIQUEIRA - LEME;contasapagar.5032@sicoob.com.br;71698674001202;
SICOOB MANTIQUEIRA - CONCHAL;contasapagar.5032@sicoob.com.br;71698674001474;
SICOOB UNIMAIS MANTIQUEIRA COOPERATIVA - PIRASSUNUNGA;contasapagar.5032@sicoob.com.br;71698674001121;
Connexus Consultoria & Sistemas;;08665162000150;
Hospital Santa Casa de Patrocinio;financeiro@hscp.org.br;23406564000124;
Medic Pop Servicos Medicos Ltda;contato@medicpop.com.br;42111483000141;
F P XAVIER ASSESSORIA CONTABIL;FREDERICOQUALITY@GMAIL.COM;15320444000181;
Biolabor Laboratorio de Analises Clinicas Ltda.;atendimento@dsvlabor.com.br;47770425000143;
Centro Medico Rhk LTDA - KATZ IMAGEM;financeiro@katzendo.com.br;05503311000197;
Mpl Prestacoes de Servicos Medicos LTDA - MEDNET RIBEIRÃO PR;fin01@mednet-rp.com.br;26503689000160;
Mf Saude LTDA - Mednet Aparecida de Goiânia;fernando@mednet-apgo.com.br;39968962000174;
HITECH Taubaté Shopping;;21154317000152;
Medseg Servicos Medicos Ltda - Mednet Belo Horizonte;diretor@mednet-bh1.com.br;42359841000130;
Pouso Alegre Servicos e Solucoes Medicas LTDA - Mednet Pouso Alegre;fabio@mednet-pousoalegre.com.br;47359853000188;
Zappelini Medicina e Seguranca do Trabalho LTDA - Mednet Florianópolis;diretor@mednet-floripa.com.br;26875358000151;
Ria Atendimentos Medicos LTDA - Mednet Salvador;alom@mednet-ssa1.com.br;44007740000125;
SERVICO NACIONAL DE APRENDIZAGEM INDUSTRIAL - SENAI PINDAMONHANGABA;compras360@sp.senai.br;03774819005678;
Quintana e Trentin LTDA - Mednet Lucas do Rio Verde;financeiro@mednet-lrv.com.br;27064867000167;
Rubens Vinicius de Aguiar Loberto LTDA Vidrobox;vidroboxpinda@hotmail.com;02971328000180;
AltoProduções - Luana Camarah;aline.altomare@hotmail.com;36951468000109;
Unimed Extremo Sul Cooperativa de Trabalho Medico;financeiro@unimedextremosul.com.br;42043067000153;
Otorrino Clinica LTDA;adm.otorrinoclinica@gmail.com;02011649000133;
Clinica Doctor Total Servicos Medicos LTDA (Doctor Prime Americana);americana@doctorprime.com.br;19323784000206;
Clinica Doctor Total Servicos Medicos LTDA (Doctor Prime Santa Bárbara);supervisaoamericana1@doctorprime.com.br;19323784000117;
Moreira e Costa Medicina e Seguranca do Trabalho LTDA mednet guarulhos;;38904313000147;
Fcm Medicina e Seguranca do Trabalho LTDA - mednet cajamar;;45550263000102;
Vt Medicina LTDA MEDNET TATUAPÃ;;56633838000177;
Leite e Nogueira Servicos Medicos LTDA - MEDNET CORUMBA;fin01@mednet-corumba.com.br;43877617000100;
Reluz Servicos Medicos LTDA - Mednet São Roque;isabel@mednet-saoroque.com.br;44833964000196;
Henriques Servicos Medicos LTDA - Mednet Paraupebas;fin01@mednet-parauapebas.com.br;35222427000119;
Clinica Mais Vida;pedromebendazol@hotmail.com;22123315000169;
JBMED MEDICINA E SEGURANCA DO TRABALHO LTDA - Mednet Itajaí;jbmedocupacional@gmail.com;44852065000130;
Stop Kr Servicos Medicos LTDA - Mednet Itaúna;renato@mednet-itauna.com.br;44844303000166;
Rh Servicos Medicos LTDA - Mednet São José SC;fin01@mednet-saojose.com.br;32543736000100;
Gerdau Acos Longos S.a. - Araçariguama SP;diogo.araujo@gerdau.com.br;07358761004156;
ESCOLA SENAI DE CRUZEIRO CFP 390 SENAI CRUZEIRO;ana.maia@sp.senai.br;03774819007107;
DUQUEMED MEDICINA LTDA mednet duque de caxias;financeiro@mednet-paulinia.com.br;57847644000137;
Allegra Brindes Personalizados Comercio e Importacao LTDA;alegra@alegraplasticos.com.br;17474109000163;
Evoil Lubrificantes Especiais e Bicicletas LTDA;;40908396000194;
PAULIMED MEDICINA LTDA - MEDNET CAMAÇARI;gerencia@mednet-paulinia.com.br;27708966000649;
Nc Ortodontia LTDA - RedeOrto;redeortogestao@gmail.com;12038874000117;
COE Centro de Olhos e Especialidades LTDA;financeiro@coeclinica.med.br;02017241000179;
Barbearia Pena Branca LTDA;Barbearia@bpenabranca.com.br;29178821000102;
Octaverta Importadora de Peças e Equipamentos LTDA;Financeiro@octaverta.com.br;29440795000130;
Grafica Novo Mundo LTDA;Sergio@graficanovomundo.com.br;20690251000152;
Unimed de Caçapava Cooperativa de Trabalho Medico;julianaoliveira@unimedcpv.com.br;48721401001058;
Viver Servicos Medicos LTDA;clinicaviver.financeiro@hotmail.com;10379304000165;
Transcofer Transporte Remocao e Icamento de Cargas LTDA;financeiro@transcoferpinda.com.br;04683600000152;
Iago Fernandes Saude LTDA - Clinica Salus;driagofernandes@gmail.com;48833894000127;
Cedlab PINDAMONHANGABA - Centro de Diagnostico Laboratorial LTDA;gerencia@laboratoriocedlab.com.br;69112894000108;
Companhia Textil de Castanhal;Jacqueline.pastana@castanhal.com.br;05389812000194;
Hospital Oftalmologico Dia Almeida & Crepaldi LTDA - Oftalmoclinica Jacareí;crfin@oftalmoclinicavale.com.br;42109491000153;
Efta Cirurgia e Diagnostico Ocular LTDA - Oftalmoclinica São José dos Campos;crfin@oftalmoclinicavale.com.br;00873159000382;
Hospital Oftalmologico Dia, Almeida & Venancio LTDA - Oftalmoclinica Taubate;crfin@oftalmoclinicavale.com.br;08459902000100;
Municipio de Redencao da Serra;adm@redencaodaserra.sp.gov.br;45167517000108;
Presertec Serviços de Calibração LTDA;fiscal@presertec.com.br;69113322000143;
Carlos Rafael Ferreira Sociedade Individual de Advocacia;elisangela@carlosrafaelferreira.com.br;62297196000185;
CARDIOVALE - CENTRO DE DIAGNOSTICO E TRATAMENTO CARDIOLOGICOS LTDA;silvana.castro@cardiovale.com.br;69111326000192;
Healthclin Centro Medico;;09131534000121;
Castor Consultoria de Imoveis LTDA;fernanda@castorimoveis.com.br;50455203000140;
Integra Sesmt LTDA;financeiro@integrasesmt.com.br;22339849000127;
Fakhir decor comercial ltda;financeiro@primehomedecor.com.br;48371188000100;
CLIC Clínica do Comportamento;clic.comportamento@gmail.com;01808782000152;
Oftalmo Centro Millenium LTDA;atendimentooftalmomillenium@gmail.com;02917625000148;
LRB SANTANA SP SERVICOS MEDICOS LTDA - mednet santana;mauricio@mednet-barueri.com.br;64407215000104;
CARDIOVITA SERVICOS MEDICOS LTDA - EPP caçapava;sandraregina@clinicacardiovita.com.br;18674947000224;`

export interface BulkEmailResult {
  updated:  number
  skipped:  number
  notFound: number
  log:      string[]
}

export async function bulkUpdateEmailsAction(): Promise<BulkEmailResult | { error: string }> {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  const orgId = session.user.orgId as string

  const result: BulkEmailResult = { updated: 0, skipped: 0, notFound: 0, log: [] }

  const lines = CSV.split('\n').slice(1) // skip header

  for (const raw of lines) {
    const cols  = raw.split(';')
    const cnpj  = (cols[2] ?? '').replace(/\D/g, '').trim()
    const email = (cols[1] ?? '').split(',')[0].trim().toLowerCase()

    if (cnpj.length !== 14) { result.skipped++; continue }
    if (!email)              { result.skipped++; continue }

    const client = await adminPrisma.client.findUnique({
      where:  { organization_id_cnpj: { organization_id: orgId, cnpj } },
      select: { id: true, name: true, email: true },
    })

    if (!client) {
      result.notFound++
      continue
    }

    if (client.email?.toLowerCase() === email) {
      result.skipped++
      continue
    }

    const prev = client.email ?? '(vazio)'
    await adminPrisma.client.update({
      where: { id: client.id },
      data:  { email },
    })

    result.updated++
    result.log.push(`✓ ${client.name} (${cnpj}): ${prev} → ${email}`)
  }

  revalidatePath('/clients')
  return result
}
