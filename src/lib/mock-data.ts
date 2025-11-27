// ==========================================
// MY WELLNESS HUB - MOCK DATA
// Based on GUIA RAPIDA DE PRODUCTOS TL.pdf
// ==========================================

import { Product, ProductBundle, QuizQuestion, Testimonial, WellnessGoal } from '@/types';

// ==========================================
// PRODUCTS DATA
// ==========================================

export const products: Product[] = [
  // ENERGIA & CONCENTRACION
  {
    id: 'tonic-life',
    name: 'Tonic Life',
    slug: 'tonic-life',
    description: 'Suplemento insignia de Tonic Life para fortalecer el sistema inmunológico y aumentar la energía natural del cuerpo.',
    shortDescription: 'Fortalece tu sistema inmune y energía',
    fullDescription: 'Tonic Life es nuestro suplemento insignia, formulado con una mezcla única de ingredientes naturales diseñados para fortalecer tu sistema inmunológico y proporcionar energía sostenida durante todo el día. Con más de 10 años de investigación y desarrollo, este producto ha ayudado a miles de personas a recuperar su vitalidad y bienestar general. Su fórmula avanzada combina extractos herbales de la más alta calidad con vitaminas y minerales esenciales.',
    benefits: [
      'Aumenta la energía natural',
      'Fortalece el sistema inmunológico',
      'Mejora la concentración',
      'Combate el cansancio crónico',
      'Apoya la función celular',
      'Promueve el bienestar general'
    ],
    usage: {
      ideal: 'Tomar 1-1-1. Tomar después de cada alimento con abundante agua.',
      regular: '1-0-1 Tomar 20 ml después del desayuno y cena.',
      notes: 'Disponible en cápsulas y tónico'
    },
    dosage: 'Cápsulas: 1 cápsula 3 veces al día después de cada alimento. Tónico: 20ml después del desayuno y cena.',
    ingredients: [
      'Extracto de Equinácea',
      'Vitamina C',
      'Zinc',
      'Propóleo',
      'Ginseng Siberiano',
      'Vitaminas del complejo B',
      'Selenio',
      'Extracto de Ajo'
    ],
    combinations: ['Energy Gold', 'Hidra Energy', 'Omega 369'],
    category: 'energia',
    tags: ['energía', 'inmunidad', 'bienestar general'],
    price: 45.99,
    compareAtPrice: 55.99,
    originalPrice: 55.99,
    image: '/products/tonic-life.png',
    inStock: true,
    stock: 50,
    rating: 4.8,
    reviews: 234,
    badge: 'Más Vendido',
    featured: true
  },
  {
    id: 'energy-gold',
    name: 'Energy Gold',
    slug: 'energy-gold',
    description: 'Fórmula avanzada con ginseng y coenzima Q10 para potenciar tu energía y rendimiento mental.',
    shortDescription: 'Energía y rendimiento mental',
    benefits: [
      'Potencia la energía celular',
      'Mejora el rendimiento físico',
      'Aumenta la claridad mental',
      'Reduce la fatiga'
    ],
    usage: {
      ideal: 'Tomar 1-1-0. Tomarlo junto con alimentos y abundante agua.',
      notes: 'No tomar en la noche para evitar interferir con el sueño'
    },
    combinations: ['Tonic Life', 'Hidra Energy'],
    category: 'energia',
    tags: ['energía', 'concentración', 'ginseng', 'Q10'],
    price: 39.99,
    image: '/products/energy-gold.png',
    inStock: true,
    featured: true
  },
  {
    id: 'hidra-energy',
    name: 'Hidra Energy',
    slug: 'hidra-energy',
    description: 'Bebida energética en polvo con electrolitos y vitaminas para hidratación y energía instantánea.',
    shortDescription: 'Hidratación energética',
    benefits: [
      'Hidratación con electrolitos',
      'Energía instantánea',
      'Rico en vitaminas',
      'Perfecto para deportistas'
    ],
    usage: {
      ideal: 'Tomar 1-0-0. Agregar 1 sobre en 500 ml de agua. Tomarlo después del desayuno.',
    },
    combinations: ['Tonic Life', 'Energy Gold'],
    category: 'energia',
    tags: ['energía', 'hidratación', 'electrolitos'],
    price: 29.99,
    image: '/products/hidra-energy.png',
    inStock: true
  },

  // DETOX / LIGEREZA
  {
    id: 'lexi-life',
    name: 'Lexi Life',
    slug: 'lexi-life',
    description: 'Potente laxante natural con hojas de sen para una limpieza intestinal efectiva y segura.',
    shortDescription: 'Limpieza intestinal natural',
    benefits: [
      'Limpieza intestinal suave',
      'Elimina toxinas',
      'Reduce la inflamación',
      'Mejora la regularidad'
    ],
    usage: {
      ideal: '1-0-0. Tomarlo en ayunas.',
      regular: '0-0-1. Tomarlo antes de la cena.',
      notes: 'Se puede tomar en cualquier horario si las actividades permiten ir al baño frecuentemente.'
    },
    combinations: ['TNC Clin', 'TBC'],
    category: 'detox',
    tags: ['detox', 'digestión', 'limpieza'],
    price: 34.99,
    image: '/products/lexi-life.png',
    inStock: true,
    featured: true
  },
  {
    id: 'tnc-clin',
    name: 'TNC Clin (Tonic Clean)',
    slug: 'tnc-clin',
    description: 'Fórmula desintoxicante que ayuda a limpiar el hígado y el sistema digestivo de manera natural.',
    shortDescription: 'Desintoxicación del hígado',
    benefits: [
      'Limpia el hígado',
      'Desintoxica el organismo',
      'Mejora la digestión',
      'Reduce colesterol'
    ],
    usage: {
      ideal: 'Tomar 1-1-1. Tomar después de cada alimento.',
      regular: '1-0-1 Tomar 20 ml después del desayuno y cena.',
      notes: 'Disponible en cápsulas, tónico y té'
    },
    combinations: ['Lexi Life', 'TBC', 'Omega 369'],
    category: 'detox',
    tags: ['detox', 'hígado', 'digestión'],
    price: 42.99,
    image: '/products/tnc-clin.png',
    inStock: true
  },
  {
    id: 'tbc',
    name: 'TBC',
    slug: 'tbc',
    description: 'Suplemento con té verde que acelera el metabolismo y ayuda en la quema de grasa.',
    shortDescription: 'Acelera tu metabolismo',
    benefits: [
      'Acelera el metabolismo',
      'Ayuda a quemar grasa',
      'Antioxidante natural',
      'Aumenta la energía'
    ],
    usage: {
      ideal: 'Tomar 1-0-0. Tomar después del desayuno con abundante agua.',
    },
    combinations: ['Lexi Life', 'TNC Clin'],
    category: 'detox',
    tags: ['metabolismo', 'peso', 'té verde'],
    price: 36.99,
    image: '/products/tbc.png',
    inStock: true
  },

  // PIEL / BELLEZA
  {
    id: 'oxifila',
    name: 'Oxifila',
    slug: 'oxifila',
    description: 'Concentrado de clorofila líquida que oxigena las células y mejora la apariencia de la piel.',
    shortDescription: 'Oxigenación celular',
    benefits: [
      'Oxigena las células',
      'Mejora la piel',
      'Desintoxica la sangre',
      'Combate el mal aliento'
    ],
    usage: {
      ideal: 'Tomar 1-1-1. Agregar 20 ml en 500 ml de agua. Tomarlo como agua de uso.',
    },
    combinations: ['Colágeno', 'Tonic Clean'],
    category: 'belleza',
    tags: ['belleza', 'piel', 'clorofila', 'detox'],
    price: 38.99,
    image: '/products/oxifila.png',
    inStock: true,
    featured: true
  },
  {
    id: 'colageno',
    name: 'Colágeno',
    slug: 'colageno',
    description: 'Colágeno hidrolizado premium con jalea real y coenzima Q10 para una piel radiante y articulaciones saludables.',
    shortDescription: 'Piel radiante y articulaciones',
    benefits: [
      'Mejora elasticidad de la piel',
      'Reduce arrugas',
      'Fortalece cabello y uñas',
      'Lubrica articulaciones'
    ],
    usage: {
      ideal: 'Cápsulas: Tomar 1-1-1. Tomarlo antes de alimentos y abundante agua.',
      regular: 'Polvo: 1-0-1 agregar 2 cucharadas soperas de polvo en 250 ml de agua, después de los alimentos.',
      notes: 'Combinación adicional: Proteína y 24 Shake.'
    },
    combinations: ['Oxifila', 'Proteína', '24 Shake'],
    category: 'belleza',
    tags: ['belleza', 'piel', 'colágeno', 'anti-edad'],
    price: 49.99,
    compareAtPrice: 59.99,
    image: '/products/colageno.png',
    inStock: true,
    featured: true
  },

  // ESTRÉS / SUEÑO
  {
    id: 'relife',
    name: 'Re-Life',
    slug: 'relife',
    description: 'Fórmula relajante con pasiflora que ayuda a reducir el estrés y mejorar la calidad del sueño.',
    shortDescription: 'Relajación y mejor sueño',
    benefits: [
      'Reduce el estrés',
      'Mejora calidad del sueño',
      'Calma la ansiedad',
      'Relajante natural'
    ],
    usage: {
      ideal: 'Tónico: Tomar 1-1-1. Tomar 5ml después de cada alimento.',
      notes: 'Disponible en tónico y té. El té se prepara hirviendo 2 cucharadas en 1 litro de agua por 10 minutos.'
    },
    combinations: ['Nerlife', 'Omega 369'],
    category: 'estres',
    tags: ['estrés', 'sueño', 'relajación', 'ansiedad'],
    price: 37.99,
    image: '/products/relife.png',
    inStock: true
  },
  {
    id: 'nerlife',
    name: 'Nerlife',
    slug: 'nerlife',
    description: 'Suplemento con valeriana para calmar los nervios y promover un sueño reparador.',
    shortDescription: 'Calma nervios naturalmente',
    benefits: [
      'Calma los nervios',
      'Combate el insomnio',
      'Reduce la ansiedad',
      'Promueve sueño profundo'
    ],
    usage: {
      ideal: 'Tomar 0-1-2. Tomarlo con abundante agua después de los alimentos.',
      regular: '0-0-2. Tomarlo con abundante agua después de la cena.',
    },
    combinations: ['Re-Life', 'Omega 369'],
    category: 'estres',
    tags: ['sueño', 'nervios', 'valeriana', 'relajación'],
    price: 35.99,
    image: '/products/nerlife.png',
    inStock: true
  },
  {
    id: 'omega-369',
    name: 'Omega 3,6,9',
    slug: 'omega-369',
    description: 'Ácidos grasos esenciales de salmón, oliva y linaza para la salud cardiovascular y cerebral.',
    shortDescription: 'Salud cardiovascular y cerebral',
    benefits: [
      'Mejora salud cardiovascular',
      'Apoya función cerebral',
      'Reduce inflamación',
      'Mejora estado de ánimo'
    ],
    usage: {
      ideal: 'Tomar 1-1-1. Tomar antes de cada alimento y abundante agua.',
    },
    combinations: ['Tonic Life', 'Re-Life', 'Nerlife'],
    category: 'estres',
    tags: ['omega', 'corazón', 'cerebro', 'anti-inflamatorio'],
    price: 44.99,
    image: '/products/omega-369.png',
    inStock: true,
    featured: true
  },

  // HORMONAL / DIGESTIÓN (Femenino)
  {
    id: 'aby-life',
    name: 'Aby Life',
    slug: 'aby-life',
    description: 'Suplemento especial para mujeres que apoya la regulación hormonal y el bienestar femenino.',
    shortDescription: 'Balance hormonal femenino',
    benefits: [
      'Regula ciclo menstrual',
      'Alivia síntomas de menopausia',
      'Balance hormonal',
      'Bienestar femenino'
    ],
    usage: {
      ideal: 'Cápsulas: Tomar 1-1-1. Tomarlo junto con alimento y abundante agua.',
      notes: 'Tónico: Tomar 5ml 1-1-1 después del alimento.'
    },
    combinations: ['Donna Life', 'Lexi Life'],
    category: 'hormonal',
    tags: ['mujer', 'hormonas', 'menopausia', 'ciclo'],
    price: 41.99,
    image: '/products/aby-life.png',
    inStock: true
  },
  {
    id: 'donna-life',
    name: 'Donna Life',
    slug: 'donna-life',
    description: 'Fórmula con raíz de ñame para el bienestar hormonal femenino y la salud reproductiva.',
    shortDescription: 'Salud reproductiva femenina',
    benefits: [
      'Apoya salud reproductiva',
      'Reduce cólicos menstruales',
      'Balance hormonal',
      'Mejora fertilidad'
    ],
    usage: {
      ideal: 'Tomar 1-1-1. Tomarlo con alimentos.',
    },
    combinations: ['Aby Life', 'Lexi Life'],
    category: 'hormonal',
    tags: ['mujer', 'hormonas', 'fertilidad', 'ñame'],
    price: 39.99,
    image: '/products/donna-life.png',
    inStock: true
  },

  // SALUD MASCULINA
  {
    id: 'pmin',
    name: 'PMin',
    slug: 'pmin',
    description: 'Fórmula con saw palmetto diseñada para la salud prostática y vitalidad masculina.',
    shortDescription: 'Salud prostática masculina',
    benefits: [
      'Apoya salud de próstata',
      'Mejora vitalidad masculina',
      'Aumenta energía',
      'Bienestar urinario'
    ],
    usage: {
      ideal: 'Tomar 1-0-2. Tomarlo después de los alimentos.',
      regular: 'Tomar 1-1-1. Tomarlo después de los alimentos.',
    },
    combinations: ['Tonic Life', 'Omega 369'],
    category: 'masculino',
    tags: ['hombre', 'próstata', 'vitalidad', 'saw palmetto'],
    price: 43.99,
    image: '/products/pmin.png',
    inStock: true
  },

  // SISTEMA INMUNE
  {
    id: 'formula-coloidal',
    name: 'Fórmula Coloidal',
    slug: 'formula-coloidal',
    description: 'Plata coloidal de alta pureza con propiedades antibacterianas y antivirales naturales.',
    shortDescription: 'Defensa natural antibacteriana',
    benefits: [
      'Propiedades antibacterianas',
      'Fortalece defensas',
      'Uso tópico disponible',
      'Combate infecciones'
    ],
    usage: {
      ideal: '1-1-1. Tomar 1 cucharada (5ml) antes de los alimentos.',
      notes: 'Se puede usar de forma tópica (directo en la piel) cuantas veces sea necesaria. No estar directo al sol después de colocarla.'
    },
    combinations: ['Oxifila', 'Bronix', 'Tonic Bron'],
    category: 'inmune',
    tags: ['inmunidad', 'plata coloidal', 'antibacteriano'],
    price: 32.99,
    image: '/products/formula-coloidal.png',
    inStock: true
  },
  {
    id: 'zuca-gold',
    name: 'Zuca Gold',
    slug: 'zuca-gold',
    description: 'Suplemento para controlar los niveles de azúcar en sangre de manera natural.',
    shortDescription: 'Control de azúcar en sangre',
    benefits: [
      'Regula glucosa en sangre',
      'Apoya función pancreática',
      'Control de diabetes',
      'Metabolismo saludable'
    ],
    usage: {
      ideal: 'Cápsulas: Tomar 1-1-1. Tomar antes de cada alimento.',
      notes: 'Disponible en cápsulas, tónico y té.'
    },
    combinations: ['Tonic Clean', 'Omega 369'],
    category: 'inmune',
    tags: ['azúcar', 'diabetes', 'glucosa', 'metabolismo'],
    price: 40.99,
    image: '/products/zuca-gold.png',
    inStock: true
  },
  {
    id: 'feb-life',
    name: 'Feb Life',
    slug: 'feb-life',
    description: 'Fórmula con fenogreco y manzanilla para fortalecer el sistema inmunológico y reducir fiebre.',
    shortDescription: 'Fortalece sistema inmune',
    benefits: [
      'Reduce fiebre naturalmente',
      'Fortalece defensas',
      'Propiedades antiinflamatorias',
      'Bienestar general'
    ],
    usage: {
      ideal: 'Tomar 1-1-1. Tomarlo con alimentos.',
    },
    combinations: ['Tonic Life', 'Fórmula Coloidal'],
    category: 'inmune',
    tags: ['fiebre', 'inmunidad', 'fenogreco'],
    price: 33.99,
    image: '/products/feb-life.png',
    inStock: true
  },

  // CIRCULACIÓN Y ARTICULACIONES
  {
    id: 'leg-line',
    name: 'Leg Line',
    slug: 'leg-line',
    description: 'Fórmula con caña de brasil para mejorar la circulación y reducir la pesadez en las piernas.',
    shortDescription: 'Mejora la circulación',
    benefits: [
      'Mejora circulación sanguínea',
      'Reduce piernas cansadas',
      'Disminuye inflamación',
      'Previene várices'
    ],
    usage: {
      ideal: 'Cápsulas: 1-1-1. Tomarlo con alimentos.',
      notes: 'Té: Agregar 2 cucharadas soperas en 1 litro de agua, hervir por 10 minutos, reposar por 5 minutos, colarlo y tomar una taza de 250ml después de los alimentos.'
    },
    combinations: ['G&C', 'OS 436'],
    category: 'circulacion',
    tags: ['circulación', 'piernas', 'várices'],
    price: 36.99,
    image: '/products/leg-line.png',
    inStock: true
  },
  {
    id: 'gc',
    name: 'G&C',
    slug: 'gc',
    description: 'Glucosamina y condroitina para la salud articular y reducción del dolor en articulaciones.',
    shortDescription: 'Salud articular completa',
    benefits: [
      'Lubrica articulaciones',
      'Reduce dolor articular',
      'Regenera cartílago',
      'Mejora movilidad'
    ],
    usage: {
      ideal: 'Tomar 1-0-2. Tomarlo antes de alimentos y abundante agua.',
      regular: 'Tomar 1-0-1. Tomarlo antes de alimentos y abundante agua.',
    },
    combinations: ['Leg Line', 'OS 436', 'Colágeno'],
    category: 'circulacion',
    tags: ['articulaciones', 'glucosamina', 'dolor'],
    price: 47.99,
    image: '/products/gc.png',
    inStock: true
  },
  {
    id: 'os-436',
    name: 'OS 436',
    slug: 'os-436',
    description: 'Fórmula con cúrcuma para reducir la inflamación y el dolor articular.',
    shortDescription: 'Anti-inflamatorio natural',
    benefits: [
      'Potente antiinflamatorio',
      'Reduce dolor',
      'Propiedades antioxidantes',
      'Mejora movilidad'
    ],
    usage: {
      ideal: 'Tomar 1-1-2. Tomarlo junto con alimento y abundante agua.',
    },
    combinations: ['Leg Line', 'G&C', 'Movartic'],
    category: 'circulacion',
    tags: ['inflamación', 'cúrcuma', 'dolor', 'articulaciones'],
    price: 38.99,
    image: '/products/os-436.png',
    inStock: true
  },

  // PESO Y METABOLISMO
  {
    id: 'ability',
    name: 'Ability',
    slug: 'ability',
    description: 'Fórmula con alga afa para acelerar el metabolismo y apoyar la pérdida de peso saludable.',
    shortDescription: 'Acelera pérdida de peso',
    benefits: [
      'Acelera metabolismo',
      'Reduce apetito',
      'Quema grasa corporal',
      'Aumenta energía'
    ],
    usage: {
      ideal: 'Tomar 1-0-1 para personas que necesitan perder más de 50 libras (20kg). Tomarlo junto con el desayuno y la cena.',
      regular: 'Tomar 1-0-0. Tomarlo junto con el desayuno.',
      notes: 'Tratar de siempre tomar también Omega 369 y Tonic Clean.'
    },
    combinations: ['Omega 369', 'Tonic Clean', 'Lexi Life'],
    category: 'peso',
    tags: ['peso', 'metabolismo', 'alga afa', 'grasa'],
    price: 44.99,
    image: '/products/ability.png',
    inStock: true
  },
  {
    id: '24-shake',
    name: '24 Shake',
    slug: '24-shake',
    description: 'Batido nutricional completo con proteínas, vitaminas y minerales para reemplazo de comidas.',
    shortDescription: 'Batido nutricional completo',
    benefits: [
      'Nutrición completa',
      'Control de peso',
      'Construcción muscular',
      'Reemplazo de comida'
    ],
    usage: {
      ideal: '2 cucharadas soperas (25 gramos) 2 veces al día. Siempre acompañarlo de proteína aislada de soya, proteína suero de leche, y colágeno en polvo.',
      regular: '2 cucharadas soperas (25 gramos) 1 vez al día por la mañana.',
      notes: 'Para sobre peso: Sustituye desayuno y cena. Para Nutrición: Junto con desayuno y cena.'
    },
    combinations: ['Proteína', 'Colágeno'],
    category: 'peso',
    tags: ['nutrición', 'batido', 'proteína', 'peso'],
    price: 54.99,
    compareAtPrice: 64.99,
    image: '/products/24-shake.png',
    inStock: true,
    featured: true
  }
];

// ==========================================
// PRODUCT BUNDLES (Based on recommendation map)
// ==========================================

export const productBundles: ProductBundle[] = [
  {
    id: 'bundle-detox',
    name: 'Kit Detox & Ligereza',
    description: 'Limpia tu cuerpo de toxinas y siéntete más ligero con este combo especializado.',
    products: products.filter(p => ['lexi-life', 'tnc-clin', 'tbc'].includes(p.id)),
    originalPrice: 114.97,
    bundlePrice: 99.99,
    discount: 13,
    goal: 'detox'
  },
  {
    id: 'bundle-energia',
    name: 'Kit Energía & Concentración',
    description: 'Aumenta tu energía y mejora tu concentración durante todo el día.',
    products: products.filter(p => ['tonic-life', 'energy-gold', 'hidra-energy'].includes(p.id)),
    originalPrice: 115.97,
    bundlePrice: 99.99,
    discount: 14,
    goal: 'energia'
  },
  {
    id: 'bundle-belleza',
    name: 'Kit Piel & Belleza',
    description: 'Renueva tu piel desde adentro y luce radiante naturalmente.',
    products: products.filter(p => ['oxifila', 'colageno', 'tnc-clin'].includes(p.id)),
    originalPrice: 131.97,
    bundlePrice: 109.99,
    discount: 17,
    goal: 'belleza'
  },
  {
    id: 'bundle-estres',
    name: 'Kit Estrés & Sueño',
    description: 'Reduce el estrés y mejora la calidad de tu sueño de forma natural.',
    products: products.filter(p => ['relife', 'nerlife', 'omega-369'].includes(p.id)),
    originalPrice: 118.97,
    bundlePrice: 99.99,
    discount: 16,
    goal: 'estres'
  },
  {
    id: 'bundle-hormonal',
    name: 'Kit Hormonal & Digestión',
    description: 'Balance hormonal femenino y salud digestiva en un solo combo.',
    products: products.filter(p => ['aby-life', 'donna-life', 'lexi-life'].includes(p.id)),
    originalPrice: 116.97,
    bundlePrice: 99.99,
    discount: 15,
    goal: 'hormonal'
  },
  {
    id: 'bundle-masculino',
    name: 'Kit Salud Masculina',
    description: 'Vitalidad y bienestar masculino para hombres activos.',
    products: products.filter(p => ['pmin', 'tonic-life', 'omega-369'].includes(p.id)),
    originalPrice: 134.97,
    bundlePrice: 114.99,
    discount: 15,
    goal: 'masculino'
  }
];

// ==========================================
// QUIZ QUESTIONS
// ==========================================

export const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    category: 'info',
    question: 'Información Personal',
    options: [] // This is a form question, not multiple choice
  },
  {
    id: 2,
    category: 'energia',
    question: '¿Cómo describirías tu nivel de energía durante el día?',
    options: [
      { id: '2a', text: 'Me siento sin energía la mayor parte del tiempo.', value: 2, triggersCategory: 'energia' },
      { id: '2b', text: 'A veces me da un bajón por la tarde.', value: 1, triggersCategory: 'energia' },
      { id: '2c', text: 'Tengo buena energía la mayor parte del día.', value: 0 }
    ]
  },
  {
    id: 3,
    category: 'digestion',
    question: '¿Cómo está tu digestión?',
    options: [
      { id: '3a', text: 'Tengo inflamación o estreñimiento frecuentemente.', value: 2, triggersCategory: 'detox' },
      { id: '3b', text: 'A veces me cuesta ir al baño o me siento pesado.', value: 1, triggersCategory: 'detox' },
      { id: '3c', text: 'Mi digestión es normal.', value: 0 }
    ]
  },
  {
    id: 4,
    category: 'estres',
    question: '¿Cómo te sientes emocionalmente últimamente?',
    options: [
      { id: '4a', text: 'Muy estresado(a) o con ansiedad.', value: 2, triggersCategory: 'estres' },
      { id: '4b', text: 'Cansado(a), pero logro dormir.', value: 1, triggersCategory: 'estres' },
      { id: '4c', text: 'Tranquilo(a) y relajado(a).', value: 0 }
    ]
  },
  {
    id: 5,
    category: 'peso',
    question: '¿Cuál de estas opciones describe mejor tu meta?',
    options: [
      { id: '5a', text: 'Quiero bajar de peso o eliminar grasa corporal.', value: 2, triggersCategory: 'peso' },
      { id: '5b', text: 'Quiero mantenerme, pero sentirme más ligero(a).', value: 1, triggersCategory: 'detox' },
      { id: '5c', text: 'No busco bajar peso.', value: 0 }
    ]
  },
  {
    id: 6,
    category: 'piel',
    question: '¿Cómo describirías tu piel actualmente?',
    options: [
      { id: '6a', text: 'Apagada, con manchas o acné.', value: 2, triggersCategory: 'belleza' },
      { id: '6b', text: 'Bien, pero quiero mejorar mi brillo y firmeza.', value: 1, triggersCategory: 'belleza' },
      { id: '6c', text: 'Sin problemas.', value: 0 }
    ]
  },
  {
    id: 7,
    category: 'inmune',
    question: '¿Te enfermas con frecuencia o sientes tus defensas bajas?',
    options: [
      { id: '7a', text: 'Sí, fácilmente me resfrío o me da gripe.', value: 2, triggersCategory: 'inmune' },
      { id: '7b', text: 'A veces.', value: 1, triggersCategory: 'inmune' },
      { id: '7c', text: 'Casi nunca.', value: 0 }
    ]
  },
  {
    id: 8,
    category: 'hormonal-female',
    question: '¿Experimentas síntomas hormonales como irregularidad menstrual, bochornos o cambios de humor?',
    options: [
      { id: '8a', text: 'Sí, frecuentemente.', value: 2, triggersCategory: 'hormonal' },
      { id: '8b', text: 'A veces.', value: 1, triggersCategory: 'hormonal' },
      { id: '8c', text: 'No, me siento bien en general.', value: 0 }
    ],
    conditionalDisplay: { questionId: 1, requiredAnswer: 'female' }
  },
  {
    id: 9,
    category: 'hormonal-male',
    question: '¿Cómo describirías tu salud general?',
    options: [
      { id: '9a', text: 'Bajo deseo sexual o poca energía física.', value: 2, triggersCategory: 'masculino' },
      { id: '9b', text: 'Cansancio frecuente o falta de concentración.', value: 1, triggersCategory: 'masculino' },
      { id: '9c', text: 'Me siento bien en general.', value: 0 }
    ],
    conditionalDisplay: { questionId: 1, requiredAnswer: 'male' }
  },
  {
    id: 10,
    category: 'circulacion',
    question: '¿Sientes piernas cansadas, inflamadas o dolor articular?',
    options: [
      { id: '10a', text: 'Sí, frecuentemente.', value: 2, triggersCategory: 'circulacion' },
      { id: '10b', text: 'A veces.', value: 1, triggersCategory: 'circulacion' },
      { id: '10c', text: 'Nunca.', value: 0 }
    ]
  },
  {
    id: 11,
    category: 'metabolico',
    question: '¿Has tenido diagnóstico o síntomas relacionados con hígado graso, colesterol alto o glucosa elevada?',
    options: [
      { id: '11a', text: 'Sí, alguno de los tres.', value: 2, triggersCategory: 'detox' },
      { id: '11b', text: 'Tal vez, no estoy seguro(a).', value: 1, triggersCategory: 'detox' },
      { id: '11c', text: 'Nunca.', value: 0 }
    ]
  },
  {
    id: 12,
    category: 'meta-principal',
    question: '¿Cuál es tu prioridad de salud ahora mismo?',
    options: [
      { id: '12a', text: 'Limpiar mi cuerpo y sentirme más ligero.', value: 0, triggersCategory: 'detox' },
      { id: '12b', text: 'Tener más energía y concentración.', value: 0, triggersCategory: 'energia' },
      { id: '12c', text: 'Mejorar mi piel y cabello.', value: 0, triggersCategory: 'belleza' },
      { id: '12d', text: 'Dormir mejor y reducir estrés.', value: 0, triggersCategory: 'estres' },
      { id: '12e', text: 'Equilibrar mis hormonas o digestión.', value: 0, triggersCategory: 'hormonal' }
    ]
  }
];

// ==========================================
// TESTIMONIALS
// ==========================================

export const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'María García',
    location: 'Ciudad de México',
    quote: 'Después de usar el Kit Detox por 30 días, perdí 8 kilos y me siento con más energía que nunca. ¡Mi digestión mejoró completamente!',
    rating: 5,
    products: ['lexi-life', 'tnc-clin', 'tbc'],
    date: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Roberto Hernández',
    location: 'Monterrey',
    quote: 'El Tonic Life cambió mi vida. Antes me sentía cansado todo el día, ahora tengo energía para trabajar y hacer ejercicio.',
    rating: 5,
    products: ['tonic-life', 'energy-gold'],
    date: new Date('2024-02-20')
  },
  {
    id: '3',
    name: 'Ana Martínez',
    location: 'Guadalajara',
    quote: 'El colágeno y la Oxifila han hecho maravillas en mi piel. Mis amigas no paran de preguntarme qué estoy usando.',
    rating: 5,
    products: ['colageno', 'oxifila'],
    date: new Date('2024-03-10')
  },
  {
    id: '4',
    name: 'Carlos López',
    location: 'Houston, TX',
    quote: 'Como hombre de 50 años, el PMin me ha ayudado mucho con mi salud prostática. Me siento más joven y vital.',
    rating: 5,
    products: ['pmin', 'tonic-life', 'omega-369'],
    date: new Date('2024-01-28')
  },
  {
    id: '5',
    name: 'Laura Sánchez',
    location: 'Los Angeles, CA',
    quote: 'Sufría de insomnio por años. Con Re-Life y Nerlife finalmente puedo dormir bien y despertar descansada.',
    rating: 5,
    products: ['relife', 'nerlife'],
    date: new Date('2024-02-14')
  },
  {
    id: '6',
    name: 'Patricia Rodríguez',
    location: 'Tijuana',
    quote: 'El balance hormonal que logré con Aby Life y Donna Life es increíble. Ya no sufro de los síntomas de la menopausia.',
    rating: 5,
    products: ['aby-life', 'donna-life'],
    date: new Date('2024-03-01')
  }
];

// ==========================================
// PRODUCT CATEGORIES FOR NAVIGATION
// ==========================================

export const productCategories = [
  { id: 'energia', name: 'Energía', icon: 'bolt', description: 'Aumenta tu energía y vitalidad' },
  { id: 'detox', name: 'Detox', icon: 'sparkles', description: 'Limpia tu cuerpo de toxinas' },
  { id: 'belleza', name: 'Belleza', icon: 'star', description: 'Piel radiante y cabello saludable' },
  { id: 'estres', name: 'Estrés & Sueño', icon: 'moon', description: 'Relájate y duerme mejor' },
  { id: 'hormonal', name: 'Salud Femenina', icon: 'heart', description: 'Balance hormonal femenino' },
  { id: 'masculino', name: 'Salud Masculina', icon: 'shield', description: 'Vitalidad masculina' },
  { id: 'inmune', name: 'Inmunidad', icon: 'shield-check', description: 'Fortalece tus defensas' },
  { id: 'circulacion', name: 'Circulación', icon: 'arrow-path', description: 'Mejora tu circulación' },
  { id: 'peso', name: 'Control de Peso', icon: 'scale', description: 'Alcanza tu peso ideal' }
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export function getProductById(id: string): Product | undefined {
  return products.find(p => p.id === id);
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter(p => p.category === category);
}

export function getFeaturedProducts(): Product[] {
  return products.filter(p => p.featured);
}

export function getBundleByGoal(goal: WellnessGoal): ProductBundle | undefined {
  return productBundles.find(b => b.goal === goal);
}

export function getRecommendedBundle(answers: { questionId: number; optionId: string }[]): ProductBundle {
  // Find the last question answer (meta-principal) to determine primary goal
  const metaAnswer = answers.find(a => a.questionId === 12);

  const goalMap: Record<string, WellnessGoal> = {
    '12a': 'detox',
    '12b': 'energia',
    '12c': 'belleza',
    '12d': 'estres',
    '12e': 'hormonal'
  };

  const goal = metaAnswer ? goalMap[metaAnswer.optionId] : 'energia';
  return getBundleByGoal(goal) || productBundles[0];
}
