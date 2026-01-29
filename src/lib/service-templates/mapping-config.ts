/**
 * Mapping configuration for importing DOCX service templates
 * Maps folder names from "05. Fichas de Serviços" to database clusters
 */

// Map folder names to default cluster (service_group is derived from service_prices)
export const FOLDER_TO_CLUSTER: Record<string, string | null> = {
  'Animais': 'Pete',
  'Empresas': 'Empresas',
  'Engomadoria e lavandaria': 'Casa',
  'Instalação e reparação': 'Casa',
  'Jardinagem': 'Casa',
  'Outros Serviços': 'Casa',
  'Remodelação e Decoração': 'Casa',
  'Saúde e bem-estar': 'Saúde e bem estar',
  'Serviços de limpeza': 'Casa',
  'Serviços energéticos': 'Casa',
  // Subfolders
  'Desinfestação': 'Casa',
  'old': null, // Skip old/archived folders
}

// Manual filename to service_name mapping for edge cases
// (when filename doesn't match database service_name directly)
export const FILENAME_TO_SERVICE_NAME: Record<string, string> = {
  // Animais - serviços de pets (not in service_prices yet)
  'Banho a cães.docx': 'Banho a cães',
  'Banho e Tosquia a Cães.docx': 'Banho e tosquia a cães',
  'Hotel para cães.docx': 'Hotel para cães',
  '20250408- FIXO & Vet Sobre Rodas  .docx': 'Serviços veterinários',

  // Engomadoria
  'Engomadoria com Recolha.docx': 'Engomadoria com recolha',
  'Engomadoria em casa_fev 25.docx': 'Engomadoria em casa',
  'Engomadoria com entrega rápida.docx': 'Engomadoria com entrega rápida',
  'Engomadoria com recolha de camisas e calças.docx': 'Engomadoria com recolha de camisas e calças',
  'Engomadoria com recolha de lençóis e toalhas.docx': 'Engomadoria com recolha de lençóis e toalhas',
  'Lavandaria com recolha.docx': 'Lavandaria com recolha',
  'Lavandaria e engomadoria com recolha.docx': 'Lavandaria e engomadoria com recolha',

  // Instalação e reparação
  'Handyman Faz tudo em casa.docx': 'Handyman - Faz tudo',
  'Eletricista.docx': 'Serviços elétricos',
  'Canalizador.docx': 'Canalizador',
  '20241210- FIXO & GEP  .docx': 'Serviços GEP',
  'Instalação de Painéis Solares.docx': 'Instalação de painéis solares',
  'Instalação de estores e persianas exteriores .docx': 'Instalação de estores exteriores',
  'Instalação de estores interiores.docx': 'Instalação de estores interiores',
  'Instalação de interruptores e tomadas.docx': 'Instalação de interruptores e tomadas',
  'Instalação de termoacumulador.docx': 'Instalação de termoacumuladores',
  'Instalação de tomadas e interruptores.docx': 'Instalação de tomadas e interruptores',
  'Instalação e substituição de eletrodomésticos a gás .docx': 'Instalação e substituição de eletrodomésticos a gás',
  'Instalação ou substituição de chuveiros e colunas de duche.docx': 'Instalação e substituição de chuveiro e coluna de duche',
  'Instalação ou substituição de sanita e autoclismo .docx': 'Instalação e substituição de sanita e autoclismo',
  'Instalações de candeeiros.docx': 'Instalação de candeeiros',
  'Manutenção de termoacumulador.docx': 'Manutenção de termoacumulador',
  'Reparação de eletrodomésticos .docx': 'Reparação de eletrodomésticos',
  'Reparação de estores e persianas.docx': 'Reparação de estores, persianas e portadas',
  'Reparação urgente de eletrodomésticos .docx': 'Reparação urgente de eletrodomésticos',
  'Substituição de torneiras .docx': 'Substituição de torneiras',
  'Abertura de porta e portões.docx': 'Abertura de portas e portões',
  'Falhas de energia elétrica.docx': 'Falhas de energia elétrica',

  // Limpeza
  'Limpeza da casa (jan-26).docx': 'Limpeza da casa',
  'Limpeza da casa com engomadoria (jan 26).docx': 'Limpeza da casa com engomadoria',
  'Limpeza da casa com engomadoria.docx': 'Limpeza da casa com engomadoria',
  'Limpeza de Cabeceiras de cama.docx': 'Limpeza de cabeceiras de cama',
  'Limpeza de chaminés .docx': 'Limpeza de chaminés',
  'Limpeza de vidros e janelas (jan-26).docx': 'Limpeza de vidros e janelas',
  'Limpeza pós-obra (jan-26).docx': 'Limpeza pós-obra',
  'Limpeza profunda (jan-26).docx': 'Limpeza profunda',
  'Limpeza de azulejos.docx': 'Limpeza de azulejos',
  'Impermeabilização de sofás.docx': 'Impermeabilização de sofás',

  // Desinfestação
  'Desinfestação de Ratos.docx': 'Desinfestação de ratos',

  // Jardinagem
  'Jardinagem de exteriores.docx': 'Jardinagem',

  // Peritagem
  'Peritagem à casa.docx': 'Peritagem à casa',

  // Remodelação
  'Pinturas de interiores.docx': 'Pintura de interiores',
  'Fixação à parede.docx': 'Fixação à parede',
  'Montagem de móveis.docx': 'Montagem de artigos',
  'Substituição de dobradiças.docx': 'Substituição de dobradiças',

  // Saúde e bem-estar
  'Enfermagem ao domicílio.docx': 'Enfermagem ao domicílio',
  'Massagens ao domicílio.docx': 'Massagens ao domicílio',
  'Personal trainer ao domicílio.docx': 'Personal trainer ao domicílio',
  'Nutricionista ao domicílio.docx': 'Nutricionista ao domicílio',
  'Osteopata ao domicílio.docx': 'Osteopata ao domicílio',
  'Avaliação de Sinais Vitais ao domicílio.docx': 'Avaliação de sinais vitais ao domicílio',

  // Serviços energéticos
  'Certificação Energética para empresas.docx': 'Certificação energética para empresas',
  'Diagnóstico de eficiência energética.docx': 'Diagnóstico de eficiência energética',

  // Empresas
  'Limpeza de bares e restaurantes.docx': 'Limpeza de bares e restaurantes',
  'Limpeza de escritórios.docx': 'Limpeza de escritórios',
}

// Files to skip during import (duplicates, templates, etc.)
export const FILES_TO_SKIP = [
  '0_Total_Serviços.xlsx',
  'Procedimentos.docx',
  '0000000000000 - Copy.docx',
  '.DS_Store',
]

// Folders to skip entirely
export const FOLDERS_TO_SKIP = [
  'old',
  '.git',
]
