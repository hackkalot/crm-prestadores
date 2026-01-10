// Coordenadas dos distritos e principais cidades de Portugal
// Usado para geocoding local sem chamadas API

export interface Coordinates {
  lat: number
  lng: number
}

// Coordenadas dos centros dos distritos
export const DISTRICT_COORDINATES: Record<string, Coordinates> = {
  'Aveiro': { lat: 40.6405, lng: -8.6538 },
  'Beja': { lat: 38.0154, lng: -7.8633 },
  'Braga': { lat: 41.5503, lng: -8.4200 },
  'Braganca': { lat: 41.8061, lng: -6.7567 },
  'Bragança': { lat: 41.8061, lng: -6.7567 },
  'Castelo Branco': { lat: 39.8197, lng: -7.4908 },
  'Coimbra': { lat: 40.2033, lng: -8.4103 },
  'Evora': { lat: 38.5714, lng: -7.9135 },
  'Évora': { lat: 38.5714, lng: -7.9135 },
  'Faro': { lat: 37.0194, lng: -7.9304 },
  'Guarda': { lat: 40.5373, lng: -7.2675 },
  'Leiria': { lat: 39.7495, lng: -8.8077 },
  'Lisboa': { lat: 38.7223, lng: -9.1393 },
  'Portalegre': { lat: 39.2967, lng: -7.4306 },
  'Porto': { lat: 41.1496, lng: -8.6109 },
  'Santarem': { lat: 39.2369, lng: -8.6870 },
  'Santarém': { lat: 39.2369, lng: -8.6870 },
  'Setubal': { lat: 38.5244, lng: -8.8882 },
  'Setúbal': { lat: 38.5244, lng: -8.8882 },
  'Viana do Castelo': { lat: 41.6918, lng: -8.8344 },
  'Vila Real': { lat: 41.2959, lng: -7.7469 },
  'Viseu': { lat: 40.6610, lng: -7.9097 },
  // Regioes autonomas
  'Acores': { lat: 37.7412, lng: -25.6756 },
  'Açores': { lat: 37.7412, lng: -25.6756 },
  'Madeira': { lat: 32.6669, lng: -16.9241 },
  // Ilhas dos Acores
  'Ponta Delgada': { lat: 37.7412, lng: -25.6756 },
  'Angra do Heroismo': { lat: 38.6567, lng: -27.2167 },
  'Angra do Heroísmo': { lat: 38.6567, lng: -27.2167 },
  'Horta': { lat: 38.5333, lng: -28.6333 },
}

// Coordenadas de cidades principais (expandir conforme necessario)
export const CITY_COORDINATES: Record<string, Coordinates> = {
  // Lisboa e area metropolitana
  'Lisboa': { lat: 38.7223, lng: -9.1393 },
  'Amadora': { lat: 38.7535, lng: -9.2304 },
  'Sintra': { lat: 38.7979, lng: -9.3896 },
  'Cascais': { lat: 38.6979, lng: -9.4215 },
  'Oeiras': { lat: 38.6910, lng: -9.3108 },
  'Loures': { lat: 38.8304, lng: -9.1685 },
  'Odivelas': { lat: 38.7936, lng: -9.1844 },
  'Vila Franca de Xira': { lat: 38.9559, lng: -8.9897 },
  'Mafra': { lat: 38.9367, lng: -9.3306 },
  'Almada': { lat: 38.6790, lng: -9.1565 },
  'Seixal': { lat: 38.6403, lng: -9.0969 },
  'Barreiro': { lat: 38.6633, lng: -9.0731 },
  'Moita': { lat: 38.6489, lng: -8.9867 },
  'Montijo': { lat: 38.7069, lng: -8.9728 },
  'Alcochete': { lat: 38.7536, lng: -8.9617 },

  // Porto e area metropolitana
  'Porto': { lat: 41.1496, lng: -8.6109 },
  'Vila Nova de Gaia': { lat: 41.1239, lng: -8.6118 },
  'Gaia': { lat: 41.1239, lng: -8.6118 },
  'Matosinhos': { lat: 41.1844, lng: -8.6881 },
  'Maia': { lat: 41.2359, lng: -8.6200 },
  'Gondomar': { lat: 41.1500, lng: -8.5333 },
  'Valongo': { lat: 41.1881, lng: -8.4989 },
  'Paredes': { lat: 41.2000, lng: -8.3333 },
  'Penafiel': { lat: 41.2083, lng: -8.2833 },
  'Pacos de Ferreira': { lat: 41.2778, lng: -8.3856 },
  'Paços de Ferreira': { lat: 41.2778, lng: -8.3856 },
  'Santo Tirso': { lat: 41.3431, lng: -8.4742 },
  'Trofa': { lat: 41.3389, lng: -8.5597 },
  'Vila do Conde': { lat: 41.3517, lng: -8.7431 },
  'Povoa de Varzim': { lat: 41.3833, lng: -8.7667 },
  'Póvoa de Varzim': { lat: 41.3833, lng: -8.7667 },
  'Espinho': { lat: 41.0076, lng: -8.6410 },

  // Braga
  'Braga': { lat: 41.5503, lng: -8.4200 },
  'Guimaraes': { lat: 41.4425, lng: -8.2918 },
  'Guimarães': { lat: 41.4425, lng: -8.2918 },
  'Barcelos': { lat: 41.5333, lng: -8.6167 },
  'Famalicao': { lat: 41.4078, lng: -8.5194 },
  'Famalicão': { lat: 41.4078, lng: -8.5194 },
  'Vila Nova de Famalicao': { lat: 41.4078, lng: -8.5194 },
  'Vila Nova de Famalicão': { lat: 41.4078, lng: -8.5194 },

  // Aveiro
  'Aveiro': { lat: 40.6405, lng: -8.6538 },
  'Ilhavo': { lat: 40.6008, lng: -8.6689 },
  'Ílhavo': { lat: 40.6008, lng: -8.6689 },
  'Ovar': { lat: 40.8608, lng: -8.6264 },
  'Santa Maria da Feira': { lat: 40.9256, lng: -8.5422 },
  'Feira': { lat: 40.9256, lng: -8.5422 },
  'Oliveira de Azemeis': { lat: 40.8394, lng: -8.4772 },
  'Oliveira de Azeméis': { lat: 40.8394, lng: -8.4772 },
  'Sao Joao da Madeira': { lat: 40.9006, lng: -8.4906 },
  'São João da Madeira': { lat: 40.9006, lng: -8.4906 },

  // Coimbra
  'Coimbra': { lat: 40.2033, lng: -8.4103 },
  'Figueira da Foz': { lat: 40.1508, lng: -8.8618 },
  'Cantanhede': { lat: 40.3581, lng: -8.5928 },

  // Leiria
  'Leiria': { lat: 39.7495, lng: -8.8077 },
  'Marinha Grande': { lat: 39.7486, lng: -8.9331 },
  'Pombal': { lat: 39.9147, lng: -8.6286 },
  'Caldas da Rainha': { lat: 39.4028, lng: -9.1397 },
  'Peniche': { lat: 39.3556, lng: -9.3808 },
  'Obidos': { lat: 39.3611, lng: -9.1569 },
  'Óbidos': { lat: 39.3611, lng: -9.1569 },

  // Setubal
  'Setubal': { lat: 38.5244, lng: -8.8882 },
  'Setúbal': { lat: 38.5244, lng: -8.8882 },
  'Palmela': { lat: 38.5667, lng: -8.9000 },
  'Sesimbra': { lat: 38.4444, lng: -9.1017 },

  // Faro (Algarve)
  'Faro': { lat: 37.0194, lng: -7.9304 },
  'Portimao': { lat: 37.1386, lng: -8.5369 },
  'Portimão': { lat: 37.1386, lng: -8.5369 },
  'Lagos': { lat: 37.1028, lng: -8.6731 },
  'Albufeira': { lat: 37.0889, lng: -8.2500 },
  'Loule': { lat: 37.1386, lng: -8.0222 },
  'Loulé': { lat: 37.1386, lng: -8.0222 },
  'Olhao': { lat: 37.0261, lng: -7.8411 },
  'Olhão': { lat: 37.0261, lng: -7.8411 },
  'Tavira': { lat: 37.1267, lng: -7.6506 },
  'Vila Real de Santo Antonio': { lat: 37.1944, lng: -7.4178 },
  'Vila Real de Santo António': { lat: 37.1944, lng: -7.4178 },
  'Silves': { lat: 37.1889, lng: -8.4397 },
  'Lagoa': { lat: 37.1350, lng: -8.4533 },

  // Santarem
  'Santarem': { lat: 39.2369, lng: -8.6870 },
  'Santarém': { lat: 39.2369, lng: -8.6870 },
  'Torres Novas': { lat: 39.4792, lng: -8.5372 },
  'Tomar': { lat: 39.6036, lng: -8.4142 },
  'Abrantes': { lat: 39.4633, lng: -8.1981 },
  'Entroncamento': { lat: 39.4656, lng: -8.4697 },

  // Viseu
  'Viseu': { lat: 40.6610, lng: -7.9097 },
  'Lamego': { lat: 41.0981, lng: -7.8108 },

  // Guarda
  'Guarda': { lat: 40.5373, lng: -7.2675 },
  'Covilha': { lat: 40.2781, lng: -7.5039 },
  'Covilhã': { lat: 40.2781, lng: -7.5039 },

  // Castelo Branco
  'Castelo Branco': { lat: 39.8197, lng: -7.4908 },

  // Portalegre
  'Portalegre': { lat: 39.2967, lng: -7.4306 },
  'Elvas': { lat: 38.8817, lng: -7.1631 },

  // Evora
  'Evora': { lat: 38.5714, lng: -7.9135 },
  'Évora': { lat: 38.5714, lng: -7.9135 },

  // Beja
  'Beja': { lat: 38.0154, lng: -7.8633 },

  // Viana do Castelo
  'Viana do Castelo': { lat: 41.6918, lng: -8.8344 },

  // Vila Real
  'Vila Real': { lat: 41.2959, lng: -7.7469 },
  'Chaves': { lat: 41.7400, lng: -7.4706 },

  // Braganca
  'Braganca': { lat: 41.8061, lng: -6.7567 },
  'Bragança': { lat: 41.8061, lng: -6.7567 },

  // Madeira
  'Funchal': { lat: 32.6669, lng: -16.9241 },

  // Acores
  'Ponta Delgada': { lat: 37.7412, lng: -25.6756 },
}

// Coordenadas por codigo postal (4 primeiros digitos)
// Fonte: aproximacoes baseadas em centroides de areas postais
export const POSTAL_CODE_COORDINATES: Record<string, Coordinates> = {
  // Lisboa (1000-1999)
  '1000': { lat: 38.7223, lng: -9.1393 }, // Lisboa Centro
  '1050': { lat: 38.7350, lng: -9.1450 }, // Avenidas Novas
  '1070': { lat: 38.7280, lng: -9.1550 }, // Campolide
  '1100': { lat: 38.7150, lng: -9.1300 }, // Baixa/Alfama
  '1150': { lat: 38.7200, lng: -9.1350 }, // Arroios
  '1170': { lat: 38.7250, lng: -9.1250 }, // Penha de Franca
  '1200': { lat: 38.7100, lng: -9.1450 }, // Bairro Alto/Chiado
  '1250': { lat: 38.7180, lng: -9.1600 }, // Estrela
  '1300': { lat: 38.7050, lng: -9.1750 }, // Alcantara
  '1350': { lat: 38.7100, lng: -9.1650 }, // Santos
  '1400': { lat: 38.7000, lng: -9.1950 }, // Belem/Ajuda
  '1500': { lat: 38.7450, lng: -9.1850 }, // Benfica
  '1600': { lat: 38.7550, lng: -9.1650 }, // Carnide/Lumiar
  '1700': { lat: 38.7600, lng: -9.1350 }, // Alvalade
  '1750': { lat: 38.7700, lng: -9.1200 }, // Olivais
  '1800': { lat: 38.7800, lng: -9.1100 }, // Parque das Nacoes
  '1900': { lat: 38.7650, lng: -9.1000 }, // Marvila
  '1950': { lat: 38.7500, lng: -9.1050 }, // Beato
  '1990': { lat: 38.7800, lng: -9.0950 }, // Sacavem

  // Amadora/Queluz/Sintra (2600-2799)
  '2610': { lat: 38.7535, lng: -9.2304 }, // Amadora
  '2614': { lat: 38.7480, lng: -9.2200 }, // Amadora
  '2620': { lat: 38.7600, lng: -9.2450 }, // Ramada/Odivelas
  '2625': { lat: 38.7700, lng: -9.2100 }, // Povoa de Santo Adriao
  '2630': { lat: 38.8000, lng: -9.2700 }, // Arruda dos Vinhos
  '2640': { lat: 38.9100, lng: -9.2800 }, // Mafra
  '2645': { lat: 38.8700, lng: -9.4200 }, // Ericeira
  '2650': { lat: 38.7500, lng: -9.2500 }, // Amadora
  '2660': { lat: 38.8200, lng: -9.1700 }, // Loures/Santo Antonio dos Cavaleiros
  '2670': { lat: 38.8304, lng: -9.1685 }, // Loures
  '2680': { lat: 38.8800, lng: -9.0600 }, // Camarate
  '2685': { lat: 38.7936, lng: -9.1844 }, // Sacavem
  '2690': { lat: 38.8200, lng: -9.0800 }, // Santa Iria
  '2695': { lat: 38.8500, lng: -9.0500 }, // Bobadela
  '2700': { lat: 38.7535, lng: -9.2304 }, // Amadora
  '2710': { lat: 38.7500, lng: -9.3500 }, // Sintra
  '2714': { lat: 38.7979, lng: -9.3896 }, // Sintra
  '2715': { lat: 38.7600, lng: -9.3200 }, // Pero Pinheiro
  '2720': { lat: 38.7535, lng: -9.2304 }, // Amadora
  '2725': { lat: 38.7700, lng: -9.2600 }, // Mem Martins
  '2730': { lat: 38.7800, lng: -9.3100 }, // Barcarena
  '2735': { lat: 38.7600, lng: -9.2900 }, // Cacem
  '2740': { lat: 38.7400, lng: -9.3000 }, // Porto Salvo
  '2745': { lat: 38.7200, lng: -9.3200 }, // Queluz
  '2750': { lat: 38.6979, lng: -9.4215 }, // Cascais
  '2765': { lat: 38.7100, lng: -9.3400 }, // Estoril
  '2770': { lat: 38.7000, lng: -9.3100 }, // Paco de Arcos
  '2775': { lat: 38.6910, lng: -9.3108 }, // Oeiras/Carcavelos
  '2780': { lat: 38.6910, lng: -9.3108 }, // Oeiras
  '2790': { lat: 38.7100, lng: -9.2600 }, // Carnaxide
  '2795': { lat: 38.7200, lng: -9.2400 }, // Linda-a-Velha

  // Setubal/Margem Sul (2800-2999)
  '2800': { lat: 38.6790, lng: -9.1565 }, // Almada
  '2805': { lat: 38.6600, lng: -9.2000 }, // Feijo
  '2810': { lat: 38.6650, lng: -9.1500 }, // Laranjeiro
  '2815': { lat: 38.6500, lng: -9.1300 }, // Sobreda
  '2820': { lat: 38.6300, lng: -9.1400 }, // Charneca da Caparica
  '2825': { lat: 38.6200, lng: -9.2300 }, // Costa da Caparica
  '2829': { lat: 38.6600, lng: -9.2100 }, // Caparica
  '2830': { lat: 38.6633, lng: -9.0731 }, // Barreiro
  '2835': { lat: 38.6200, lng: -9.0500 }, // Baixa da Banheira
  '2840': { lat: 38.6403, lng: -9.0969 }, // Seixal
  '2845': { lat: 38.6100, lng: -9.0800 }, // Amora
  '2855': { lat: 38.6000, lng: -9.1100 }, // Corroios
  '2860': { lat: 38.6489, lng: -8.9867 }, // Moita
  '2865': { lat: 38.6200, lng: -8.9700 }, // Alhos Vedros
  '2870': { lat: 38.7069, lng: -8.9728 }, // Montijo
  '2890': { lat: 38.7536, lng: -8.9617 }, // Alcochete
  '2900': { lat: 38.5244, lng: -8.8882 }, // Setubal
  '2910': { lat: 38.5244, lng: -8.8882 }, // Setubal
  '2925': { lat: 38.4700, lng: -8.9800 }, // Azeitao
  '2950': { lat: 38.5667, lng: -8.9000 }, // Palmela
  '2955': { lat: 38.6000, lng: -8.9200 }, // Pinhal Novo
  '2965': { lat: 38.5500, lng: -8.8500 }, // Palmela
  '2970': { lat: 38.4444, lng: -9.1017 }, // Sesimbra

  // Grande Lisboa Norte (2600-2699)
  '2600': { lat: 38.9559, lng: -8.9897 }, // Vila Franca de Xira
  '2615': { lat: 38.8800, lng: -9.0300 }, // Alverca
  '2626': { lat: 38.8500, lng: -9.0400 }, // Vialonga

  // Porto (4000-4999)
  '4000': { lat: 41.1496, lng: -8.6109 }, // Porto Centro
  '4050': { lat: 41.1450, lng: -8.6200 }, // Cedofeita
  '4100': { lat: 41.1600, lng: -8.6400 }, // Foz do Douro
  '4150': { lat: 41.1550, lng: -8.6500 }, // Nevogilde
  '4200': { lat: 41.1650, lng: -8.5900 }, // Bonfim
  '4250': { lat: 41.1750, lng: -8.5800 }, // Campanha
  '4300': { lat: 41.1700, lng: -8.5700 }, // Paranhos
  '4350': { lat: 41.1800, lng: -8.6000 }, // Rio Tinto (limite)
  '4400': { lat: 41.1239, lng: -8.6118 }, // Vila Nova de Gaia
  '4410': { lat: 41.1100, lng: -8.6200 }, // Canelas
  '4415': { lat: 41.1000, lng: -8.6400 }, // Grijo
  '4420': { lat: 41.1050, lng: -8.5800 }, // Gondomar
  '4425': { lat: 41.1300, lng: -8.5500 }, // Aguiar de Sousa
  '4430': { lat: 41.1239, lng: -8.6118 }, // Vila Nova de Gaia
  '4435': { lat: 41.1000, lng: -8.5600 }, // Rio Tinto
  '4440': { lat: 41.0800, lng: -8.5500 }, // Valongo
  '4445': { lat: 41.0600, lng: -8.5300 }, // Ermesinde
  '4450': { lat: 41.1844, lng: -8.6881 }, // Matosinhos
  '4455': { lat: 41.2000, lng: -8.7000 }, // Leca da Palmeira
  '4460': { lat: 41.2200, lng: -8.7100 }, // Senhora da Hora
  '4465': { lat: 41.2100, lng: -8.6600 }, // S. Mamede Infesta
  '4470': { lat: 41.2359, lng: -8.6200 }, // Maia
  '4475': { lat: 41.2500, lng: -8.6000 }, // Maia
  '4480': { lat: 41.3000, lng: -8.7500 }, // Vila do Conde
  '4485': { lat: 41.2800, lng: -8.7200 }, // Vila do Conde
  '4490': { lat: 41.3833, lng: -8.7667 }, // Povoa de Varzim
  '4495': { lat: 41.3600, lng: -8.7400 }, // Povoa de Varzim
  '4500': { lat: 41.0076, lng: -8.6410 }, // Espinho
  '4505': { lat: 40.9800, lng: -8.6300 }, // Espinho
  '4510': { lat: 40.9500, lng: -8.5800 }, // Gondomar
  '4520': { lat: 40.9256, lng: -8.5422 }, // Santa Maria da Feira
  '4535': { lat: 40.9100, lng: -8.5200 }, // Santa Maria da Feira
  '4540': { lat: 40.8800, lng: -8.5100 }, // Arouca
  '4560': { lat: 41.2000, lng: -8.3333 }, // Penafiel
  '4580': { lat: 41.2778, lng: -8.3856 }, // Pacos de Ferreira
  '4590': { lat: 41.2500, lng: -8.4500 }, // Pacos de Ferreira

  // Braga (4700-4799)
  '4700': { lat: 41.5503, lng: -8.4200 }, // Braga
  '4705': { lat: 41.5400, lng: -8.4000 }, // Braga
  '4710': { lat: 41.5600, lng: -8.4100 }, // Braga
  '4715': { lat: 41.5700, lng: -8.4300 }, // Braga
  '4720': { lat: 41.5300, lng: -8.4400 }, // Amares
  '4730': { lat: 41.6000, lng: -8.4000 }, // Vila Verde
  '4740': { lat: 41.5333, lng: -8.6167 }, // Barcelos
  '4750': { lat: 41.5500, lng: -8.5500 }, // Barcelos
  '4760': { lat: 41.4078, lng: -8.5194 }, // Vila Nova de Famalicao
  '4765': { lat: 41.4000, lng: -8.5000 }, // Vila Nova de Famalicao
  '4770': { lat: 41.3800, lng: -8.5500 }, // Vila Nova de Famalicao
  '4775': { lat: 41.3600, lng: -8.5200 }, // Vila Nova de Famalicao
  '4780': { lat: 41.3431, lng: -8.4742 }, // Santo Tirso
  '4785': { lat: 41.3200, lng: -8.4900 }, // Trofa
  '4795': { lat: 41.3389, lng: -8.5597 }, // Trofa
  '4800': { lat: 41.4425, lng: -8.2918 }, // Guimaraes
  '4805': { lat: 41.4300, lng: -8.3000 }, // Guimaraes
  '4810': { lat: 41.4500, lng: -8.2800 }, // Guimaraes
  '4815': { lat: 41.4700, lng: -8.3100 }, // Guimaraes
  '4820': { lat: 41.5000, lng: -8.3500 }, // Fafe
  '4830': { lat: 41.4800, lng: -8.2000 }, // Povoa de Lanhoso
  '4835': { lat: 41.4600, lng: -8.2500 }, // Guimaraes

  // Aveiro (3800-3899)
  '3800': { lat: 40.6405, lng: -8.6538 }, // Aveiro
  '3810': { lat: 40.6300, lng: -8.6600 }, // Aveiro
  '3830': { lat: 40.6008, lng: -8.6689 }, // Ilhavo
  '3840': { lat: 40.5800, lng: -8.7000 }, // Vagos
  '3850': { lat: 40.5200, lng: -8.6000 }, // Albergaria-a-Velha
  '3860': { lat: 40.4800, lng: -8.5500 }, // Estarreja
  '3870': { lat: 40.6500, lng: -8.5500 }, // Murtosa
  '3880': { lat: 40.8608, lng: -8.6264 }, // Ovar

  // Coimbra (3000-3099)
  '3000': { lat: 40.2033, lng: -8.4103 }, // Coimbra
  '3020': { lat: 40.2100, lng: -8.4200 }, // Coimbra
  '3030': { lat: 40.1900, lng: -8.4000 }, // Coimbra
  '3040': { lat: 40.2200, lng: -8.4500 }, // Coimbra
  '3045': { lat: 40.2400, lng: -8.4300 }, // Coimbra
  '3060': { lat: 40.3581, lng: -8.5928 }, // Cantanhede
  '3070': { lat: 40.3200, lng: -8.5000 }, // Mira
  '3080': { lat: 40.1508, lng: -8.8618 }, // Figueira da Foz
  '3090': { lat: 40.1300, lng: -8.8400 }, // Figueira da Foz

  // Leiria (2400-2499)
  '2400': { lat: 39.7495, lng: -8.8077 }, // Leiria
  '2410': { lat: 39.7300, lng: -8.8200 }, // Leiria
  '2415': { lat: 39.7100, lng: -8.8000 }, // Leiria
  '2420': { lat: 39.7486, lng: -8.9331 }, // Marinha Grande
  '2430': { lat: 39.7600, lng: -8.9500 }, // Marinha Grande
  '2440': { lat: 39.8500, lng: -8.8000 }, // Batalha
  '2450': { lat: 39.8200, lng: -8.9000 }, // Nazare
  '2460': { lat: 39.6300, lng: -8.8500 }, // Alcobaca
  '2475': { lat: 39.6000, lng: -8.9000 }, // Benedita
  '2480': { lat: 39.5700, lng: -8.9500 }, // Porto de Mos
  '2485': { lat: 39.5200, lng: -8.8000 }, // Mira de Aire
  '2490': { lat: 39.4800, lng: -8.7500 }, // Ourem
  '2495': { lat: 39.5000, lng: -8.7000 }, // Fatima
  '2500': { lat: 39.4028, lng: -9.1397 }, // Caldas da Rainha
  '2510': { lat: 39.3611, lng: -9.1569 }, // Obidos
  '2520': { lat: 39.3556, lng: -9.3808 }, // Peniche
  '2530': { lat: 39.3200, lng: -9.3000 }, // Lourinha

  // Santarem (2000-2199)
  '2000': { lat: 39.2369, lng: -8.6870 }, // Santarem
  '2005': { lat: 39.2500, lng: -8.7000 }, // Santarem
  '2025': { lat: 39.3500, lng: -8.5500 }, // Salvaterra de Magos
  '2040': { lat: 39.1500, lng: -8.8000 }, // Rio Maior
  '2050': { lat: 39.0500, lng: -8.7500 }, // Azambuja
  '2060': { lat: 39.0800, lng: -8.6500 }, // Samora Correia
  '2070': { lat: 39.1000, lng: -8.8500 }, // Cartaxo
  '2080': { lat: 39.0600, lng: -8.9000 }, // Almeirim
  '2090': { lat: 39.1200, lng: -8.9500 }, // Alpiarça
  '2100': { lat: 39.3000, lng: -8.6000 }, // Coruche
  '2130': { lat: 39.2000, lng: -8.5000 }, // Benavente
  '2135': { lat: 38.9500, lng: -8.9000 }, // Samora Correia

  // Faro/Algarve (8000-8999)
  '8000': { lat: 37.0194, lng: -7.9304 }, // Faro
  '8005': { lat: 37.0100, lng: -7.9200 }, // Faro
  '8100': { lat: 37.1386, lng: -8.0222 }, // Loule
  '8125': { lat: 37.0500, lng: -8.0500 }, // Quarteira
  '8135': { lat: 37.0600, lng: -8.1000 }, // Almancil
  '8150': { lat: 37.1000, lng: -7.9500 }, // S. Bras de Alportel
  '8200': { lat: 37.0889, lng: -8.2500 }, // Albufeira
  '8300': { lat: 37.1500, lng: -8.5500 }, // Silves
  '8365': { lat: 37.1800, lng: -8.4000 }, // Algoz
  '8400': { lat: 37.1350, lng: -8.4533 }, // Lagoa
  '8500': { lat: 37.1386, lng: -8.5369 }, // Portimao
  '8550': { lat: 37.1200, lng: -8.5800 }, // Monchique
  '8600': { lat: 37.1028, lng: -8.6731 }, // Lagos
  '8650': { lat: 37.0800, lng: -8.8000 }, // Vila do Bispo
  '8670': { lat: 37.0600, lng: -8.7500 }, // Aljezur
  '8700': { lat: 37.0261, lng: -7.8411 }, // Olhao
  '8800': { lat: 37.1267, lng: -7.6506 }, // Tavira
  '8900': { lat: 37.1944, lng: -7.4178 }, // Vila Real de Santo Antonio
  '8950': { lat: 37.2500, lng: -7.5000 }, // Castro Marim

  // Beja (7800-7899)
  '7800': { lat: 38.0154, lng: -7.8633 }, // Beja
  '7830': { lat: 37.9500, lng: -7.9500 }, // Serpa
  '7860': { lat: 38.1000, lng: -7.7500 }, // Moura

  // Evora (7000-7099)
  '7000': { lat: 38.5714, lng: -7.9135 }, // Evora
  '7005': { lat: 38.5600, lng: -7.9000 }, // Evora
  '7050': { lat: 38.6500, lng: -8.0500 }, // Montemor-o-Novo
  '7080': { lat: 38.7500, lng: -8.1000 }, // Vendas Novas

  // Portalegre (7300-7399)
  '7300': { lat: 39.2967, lng: -7.4306 }, // Portalegre
  '7350': { lat: 38.8817, lng: -7.1631 }, // Elvas

  // Viseu (3500-3599)
  '3500': { lat: 40.6610, lng: -7.9097 }, // Viseu
  '3510': { lat: 40.6800, lng: -7.9300 }, // Viseu
  '3520': { lat: 40.7000, lng: -7.8500 }, // Nelas

  // Guarda (6300-6399)
  '6300': { lat: 40.5373, lng: -7.2675 }, // Guarda

  // Castelo Branco (6000-6099)
  '6000': { lat: 39.8197, lng: -7.4908 }, // Castelo Branco
  '6200': { lat: 40.2781, lng: -7.5039 }, // Covilha

  // Vila Real (5000-5099)
  '5000': { lat: 41.2959, lng: -7.7469 }, // Vila Real
  '5400': { lat: 41.7400, lng: -7.4706 }, // Chaves

  // Braganca (5300-5399)
  '5300': { lat: 41.8061, lng: -6.7567 }, // Braganca

  // Viana do Castelo (4900-4999)
  '4900': { lat: 41.6918, lng: -8.8344 }, // Viana do Castelo
  '4905': { lat: 41.7000, lng: -8.8500 }, // Viana do Castelo
  '4910': { lat: 41.7500, lng: -8.8000 }, // Caminha
  '4920': { lat: 41.8000, lng: -8.7500 }, // Vila Nova de Cerveira
  '4930': { lat: 41.8500, lng: -8.4000 }, // Valenca
  '4940': { lat: 41.9000, lng: -8.5000 }, // Paredes de Coura
  '4950': { lat: 41.7500, lng: -8.5500 }, // Monção
  '4960': { lat: 41.8200, lng: -8.3000 }, // Melgaco
  '4970': { lat: 41.6500, lng: -8.6500 }, // Arcos de Valdevez
  '4980': { lat: 41.7000, lng: -8.5000 }, // Ponte da Barca
  '4990': { lat: 41.6800, lng: -8.5800 }, // Ponte de Lima

  // Funchal/Madeira (9000-9099)
  '9000': { lat: 32.6669, lng: -16.9241 }, // Funchal
  '9020': { lat: 32.6500, lng: -16.9100 }, // Funchal
  '9050': { lat: 32.6800, lng: -16.9400 }, // Funchal
  '9060': { lat: 32.7000, lng: -17.0000 }, // Camara de Lobos
  '9100': { lat: 32.7500, lng: -17.0500 }, // Santa Cruz
  '9125': { lat: 32.7200, lng: -16.8000 }, // Canico
  '9200': { lat: 32.7500, lng: -17.2000 }, // Machico
  '9300': { lat: 32.7800, lng: -17.1500 }, // Camara de Lobos
  '9350': { lat: 32.8000, lng: -17.1000 }, // Ribeira Brava
  '9400': { lat: 32.8500, lng: -17.2500 }, // Porto Moniz
  '9360': { lat: 32.6500, lng: -16.9000 }, // Ponta do Sol

  // Acores - Ponta Delgada (9500-9599)
  '9500': { lat: 37.7412, lng: -25.6756 }, // Ponta Delgada
  '9545': { lat: 37.7800, lng: -25.5000 }, // Lagoa
  '9560': { lat: 37.8000, lng: -25.5500 }, // Lagoa
  '9580': { lat: 37.7600, lng: -25.5200 }, // Vila Franca do Campo

  // Acores - Angra do Heroismo (9700-9799)
  '9700': { lat: 38.6567, lng: -27.2167 }, // Angra do Heroismo

  // Acores - Horta (9900-9999)
  '9900': { lat: 38.5333, lng: -28.6333 }, // Horta
}

// Centro de Portugal para vista inicial do mapa
export const PORTUGAL_CENTER: Coordinates = {
  lat: 39.5,
  lng: -8.0
}

export const PORTUGAL_BOUNDS = {
  north: 42.2,
  south: 36.8,
  west: -9.6,
  east: -6.1
}

// Extrair os 4 primeiros digitos do codigo postal
function extractPostalCode4(zipCode: string): string | null {
  if (!zipCode) return null
  // Remove espacos e hifen, pega os primeiros 4 digitos
  const cleaned = zipCode.replace(/[\s-]/g, '')
  const match = cleaned.match(/^(\d{4})/)
  return match ? match[1] : null
}

// Funcao para obter coordenadas - prioridade: codigo postal > cidade > distrito
export function getCoordinates(
  city?: string | null,
  district?: string | null,
  zipCode?: string | null
): Coordinates | null {
  // 1. Tentar primeiro pelo codigo postal (mais preciso)
  if (zipCode) {
    const postalCode4 = extractPostalCode4(zipCode)
    if (postalCode4 && POSTAL_CODE_COORDINATES[postalCode4]) {
      return POSTAL_CODE_COORDINATES[postalCode4]
    }
  }

  // 2. Fallback para cidade
  if (city) {
    const normalizedCity = city.trim()
    if (CITY_COORDINATES[normalizedCity]) {
      return CITY_COORDINATES[normalizedCity]
    }
    // Tentar encontrar correspondencia parcial
    const cityLower = normalizedCity.toLowerCase()
    for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
      if (key.toLowerCase() === cityLower) {
        return coords
      }
    }
  }

  // 3. Fallback para distrito
  if (district) {
    const normalizedDistrict = district.trim()
    if (DISTRICT_COORDINATES[normalizedDistrict]) {
      return DISTRICT_COORDINATES[normalizedDistrict]
    }
    // Tentar encontrar correspondencia parcial
    const districtLower = normalizedDistrict.toLowerCase()
    for (const [key, coords] of Object.entries(DISTRICT_COORDINATES)) {
      if (key.toLowerCase() === districtLower) {
        return coords
      }
    }
  }

  return null
}

// Adicionar pequeno offset aleatorio para evitar sobreposicao de pins
export function addJitter(coords: Coordinates, amount: number = 0.005): Coordinates {
  return {
    lat: coords.lat + (Math.random() - 0.5) * amount,
    lng: coords.lng + (Math.random() - 0.5) * amount
  }
}
