# 📋 PLAN DE DESARROLLO - MOCKUPS FRONTEND
## My Wellness Hub by Tonic Life

> **Objetivo**: Crear todos los mockups funcionales del sistema antes de la integración con backend
> **Versión**: 2.0
> **Última actualización**: Enero 2025
> **Total de Rutas**: 72 páginas completadas

> ⚠️ **IMPORTANTE**: Este plan de desarrollo debe implementarse considerando todas las especificaciones detalladas en el archivo [CONSIDERACIONES.md](CONSIDERACIONES.md). Ese documento contiene:
> - Identidad de marca y mensaje ("Made Simple")
> - Modelo de negocio multinivel (MLM) con sistema de distribuidores
> - Health Quiz - Motor de recomendación personalizada
> - Sistema multi-rol con permisos específicos
> - Daily Habit Tracker con gamificación
> - Experiencia de usuario (roadmap emocional en 5 fases)
> - Integraciones necesarias (Stripe, WhatsApp Business, Email, etc.)
> - Compliance y regulaciones (FDA, COFEPRIS, DSA, FTC)
> - Escalabilidad para 10,000+ distribuidores y 100,000+ clientes
>
> **Antes de implementar cualquier funcionalidad, revisar las consideraciones aplicables en CONSIDERACIONES.md**

---

## 🎯 ESTADO ACTUAL DEL PROYECTO

### ✅ Completado (Fase 0 - Fundación)

#### Componentes Base
- [x] Sistema de tipos TypeScript completo (`/src/types/index.ts`)
- [x] Componentes UI reutilizables (Button, Card, Badge, Input, Textarea, Select)
- [x] Layout principal (Header con navegación completa + Footer)
- [x] Sistema de colores de marca (#003B7A, #7AB82E)
- [x] Configuración de Tailwind CSS 4
- [x] Integración de logos reales (logo.png, logo-white.png, logo-icon.png, favicon.ico)
- [x] Metadata y SEO básico

#### Páginas Públicas
- [x] **Landing Page** (`/`) - Hero, Productos Destacados, Quiz CTA, Testimonios, Categorías
- [x] **Health Quiz** (`/quiz`) - Welcome, Formulario, 10 Preguntas, Resultados con Recomendaciones
- [x] **Catálogo de Productos** (`/productos`) - Grid/List view, Filtros, Búsqueda
- [x] **Detalle de Producto** (`/productos/[slug]`) - Galería, Tabs, Relacionados, Add to Cart
- [x] **Carrito** (`/carrito`) - Items, Resumen, Cupones, Envío gratis progress
- [x] **Checkout** (`/checkout`) - 3 pasos (Envío, Pago, Confirmación)

#### Portal Distribuidores (Básico)
- [x] **Dashboard Distribuidor** (`/distribuidor`) - Stats, Actividad, Top Performers, Capacitación

#### Data & Mocks
- [x] Mock data completo para productos (20+ productos)
- [x] Mock data para quiz con lógica de recomendaciones
- [x] Mock data para bundles por wellness goal
- [x] Mock data para testimonios

---

## 📦 FASE 1 - E-COMMERCE COMPLETO ✅ COMPLETADA

### 🛒 Páginas de E-commerce

#### 1.1 Autenticación y Cuenta
**Prioridad**: ALTA 🔴 - **COMPLETADO** ✅

- [x] **Login** (`/login`) ✅
  - Formulario de email/password
  - Link a "Olvidé mi contraseña"
  - Opción "Continuar con Google/Facebook"
  - Link a registro
  - Redirección según rol (cliente vs distribuidor)

- [x] **Registro Cliente** (`/registro`) ✅
  - Formulario: Nombre, Email, Password, Confirmación
  - Checkbox de términos y condiciones
  - Opción "Ya tengo cuenta"
  - Email de confirmación (mockup)

- [x] **Recuperar Contraseña** (`/forgot-password`) ✅
  - Input de email
  - Mensaje de confirmación
  - Página de reset con token

- [x] **Mi Cuenta** (`/cuenta`) ✅
  - Dashboard personal
  - Información de perfil
  - Direcciones guardadas
  - Métodos de pago guardados
  - Historial de pedidos
  - Preferencias de comunicación

#### 1.2 Proceso de Compra Mejorado
**COMPLETADO** ✅

- [x] **Wishlist/Favoritos** (`/cuenta/favoritos`) ✅
  - Grid de productos guardados
  - Botón "Mover al carrito"
  - Notificaciones de precio
  - **Modal de compartir con WhatsApp/Email** 🆕
  - **Generación de link único compartible** 🆕

- [x] **Comparador de Productos** (`/comparador`) ✅
  - Tabla comparativa
  - Hasta 4 productos lado a lado
  - Características, precio, beneficios
  - Add to cart desde comparador

- [x] **Búsqueda Avanzada** (`/buscar`) ✅
  - Resultados con filtros avanzados
  - 7 tipos de filtros diferentes
  - Búsqueda por categoría
  - 6 opciones de ordenamiento
  - Contador de filtros activos

#### 1.3 Suscripciones y Membresías
**COMPLETADO** ✅

- [x] **Mi Suscripción** (`/cuenta/suscripciones`) ✅
  - Estado actual
  - Próximo envío
  - Productos incluidos
  - Modificar frecuencia
  - Pausar/Reactivar
  - Cancelar (con motivo)

#### 1.4 Post-Compra
**COMPLETADO** ✅

- [x] **Confirmación de Pedido** (`/confirmacion`) ✅
  - Resumen del pedido
  - Número de tracking (mockup)
  - Tiempo estimado de entrega
  - Botones de compartir en redes
  - Sugerencias de productos relacionados

- [x] **Historial de Pedidos** (`/cuenta/pedidos`) ✅
  - Lista de todos los pedidos
  - Filtros por estado/fecha
  - Detalles rápidos
  - Reordenar rápido
  - Vista de detalle por pedido (`/cuenta/pedidos/[orderId]`) ✅

---

## 🏢 FASE 2 - PORTAL DISTRIBUIDORES COMPLETO ✅ COMPLETADA

### 📊 Centro de Negocio

**Prioridad**: ALTA 🔴 - **COMPLETADO** ✅

**Total de páginas completadas**: 24 páginas del portal distribuidor

#### 2.1 Dashboard y Métricas
**COMPLETADO** ✅

- [x] **Dashboard Principal** (`/distribuidor`) ✅
  - Stats de ventas y comisiones
  - Gráficas de tendencias
  - Comparativa mes vs mes
  - Actividad reciente
  - Top performers del equipo
  - Gráficas de ventas por período
  - Top productos vendidos
  - Tasa de conversión
  - Clientes nuevos vs recurrentes
  - Exportar reportes

#### 2.2 Red y Genealogía
**COMPLETADO** ✅

- [x] **Mi Red** (`/distribuidor/red`) ✅
  - Visualización de árbol genealógico
  - Niveles de profundidad (1-5)
  - Filtros por rango/actividad
  - Búsqueda de distribuidor
  - Estadísticas de red

- [x] **Detalle de Downline** (`/distribuidor/red/[id]`) ✅
  - Información del distribuidor
  - Estadísticas personales
  - Su propia red
  - Historial de actividad
  - Notas privadas

#### 2.3 Comisiones
**COMPLETADO** ✅

- [x] **Resumen de Comisiones** (`/distribuidor/comisiones`) ✅
  - Comisiones del mes actual
  - Histórico por mes
  - Desglose por tipo (personal, equipo, bonos)
  - Proyección de siguiente rango
  - Calendario de pagos

- [x] **Detalle de Comisiones** (`/distribuidor/comisiones/[periodo]`) ✅
  - Lista detallada de transacciones
  - Comisiones por producto
  - Comisiones por distribuidor de equipo
  - Bonos especiales
  - Descargar reporte

- [x] **Requisitos de Rango** (`/distribuidor/rangos`) ✅
  - Rango actual con badge visual
  - Progreso a siguiente rango
  - Requisitos faltantes
  - Beneficios por rango
  - Historia de ascensos

#### 2.4 CRM Interno
**COMPLETADO** ✅

- [x] **Lista de Clientes** (`/distribuidor/clientes`) ✅
  - Tabla con todos los clientes
  - Filtros: Activos, Inactivos, Nuevos
  - Búsqueda
  - Tags personalizados
  - Acciones rápidas (llamar, email, WhatsApp)

- [x] **Detalle de Cliente** (`/distribuidor/clientes/[id]`) ✅
  - Información de contacto
  - Historial de compras
  - Productos favoritos
  - Notas y seguimiento
  - Próxima acción sugerida
  - Línea de tiempo de interacciones

- [x] **Agregar Prospecto** (`/distribuidor/clientes/nuevo`) ✅
  - Formulario de captura
  - Campos personalizables
  - Fuente de contacto
  - Tags iniciales
  - Asignar recordatorio

#### 2.5 Herramientas de Venta
**COMPLETADO** ✅

- [x] **Materiales de Marketing** (`/distribuidor/materiales`) ✅
  - Catálogos descargables (PDF)
  - Imágenes para redes sociales
  - Videos de productos
  - Fichas técnicas
  - Presentaciones
  - Templates de email/WhatsApp

- [x] **Generador de Enlaces** (`/distribuidor/enlaces`) ✅
  - Link personal actual
  - QR code descargable
  - Links por campaña
  - Estadísticas de clics
  - Acortador de URLs

- [x] **Calculadora de Comisiones** (`/distribuidor/calculadora`) ✅
  - Simulador de ventas
  - Proyección de ingresos
  - Cálculo de bonos
  - Escenarios de crecimiento

#### 2.6 Capacitación
**COMPLETADO** ✅

- [x] **Centro de Capacitación** (`/distribuidor/capacitacion`) ✅
  - Cursos disponibles
  - Progreso actual
  - Certificaciones obtenidas
  - Próximos eventos/webinars
  - Biblioteca de recursos

- [x] **Detalle de Curso** (`/distribuidor/capacitacion/[curso-id]`) ✅
  - Módulos del curso
  - Videos/Lecturas
  - Quizzes de evaluación
  - Progreso
  - Certificado al completar

- [x] **Eventos y Webinars** (`/distribuidor/eventos`) ✅
  - Calendario de eventos
  - Registro a eventos
  - Eventos pasados con grabaciones
  - Eventos de comunidad

---

## 📱 FASE 3 - DAILY HABIT TRACKER

**Prioridad**: MEDIA 🟡 - **NO IMPLEMENTADA** ⏸️

### 🎯 Gamificación y Hábitos

- [ ] **Dashboard del Tracker** (`/tracker`)
  - Vista diaria con todos los hábitos
  - Progreso visual (círculos/barras)
  - Streak actual (días consecutivos)
  - Frase motivacional del día
  - Resumen semanal

- [ ] **Hidratación** (`/tracker/agua`)
  - Contador de vasos (8 vasos objetivo)
  - Botones + para agregar
  - Histórico semanal
  - Gráfica de tendencia
  - Recordatorios configurables

- [ ] **Suplementación** (`/tracker/suplementos`)
  - Lista de productos que el usuario compró
  - Checkboxes para marcar como tomado
  - Horarios sugeridos (mañana/tarde/noche)
  - Notificaciones de recordatorio
  - Historial de adherencia

- [ ] **Actividad Física** (`/tracker/ejercicio`)
  - Registro de minutos de actividad
  - Tipo de ejercicio
  - Intensidad (baja/media/alta)
  - Objetivo semanal
  - Gráfica de progreso

- [ ] **Descanso y Sueño** (`/tracker/sueno`)
  - Horas dormidas
  - Calidad del sueño (1-10)
  - Hora de dormir/despertar
  - Patrones de sueño (gráfica semanal)

- [ ] **Bienestar Mental** (`/tracker/animo`)
  - Estado emocional diario
  - Nivel de energía (1-10)
  - Nivel de estrés (1-10)
  - Notas personales
  - Gráfica de tendencias emocionales

- [ ] **Desafíos** (`/tracker/desafios`)
  - Desafíos activos
  - Desafíos disponibles para unirse
  - Progreso en desafío actual
  - Tabla de líderes
  - Recompensas/Badges

- [ ] **Mis Logros** (`/tracker/logros`)
  - Galería de badges obtenidos
  - Próximos logros desbloqueables
  - Historial de rachas
  - Compartir en redes sociales

- [ ] **Reportes de Hábitos** (`/tracker/reportes`)
  - Resumen mensual completo
  - Comparativa mes vs mes
  - Insights personalizados
  - Sugerencias de mejora
  - Exportar PDF

---

## 👥 FASE 4 - COMUNIDAD Y CONTENIDO ✅ COMPLETADA

**Prioridad**: MEDIA 🟡 - **COMPLETADO** ✅

### 🌟 Social Features

- [ ] **Feed de Comunidad** (`/comunidad`) ⏸️
  - Historias de transformación
  - Logros recientes de la comunidad
  - Eventos próximos
  - Anuncios importantes
  - Reacciones y comentarios (mockup)

- [x] **Testimonios** (`/testimonios`) ✅
  - Grid de testimonios verificados
  - Filtros por categoría/producto
  - Antes/Después con imágenes
  - Video testimoniales
  - Sistema de "útil" (upvotes)

- [x] **Historias de Éxito** (`/historias`) ✅
  - Casos de éxito (salud + negocio)
  - Entrevistas con distribuidores top
  - Transformaciones destacadas
  - Filtros y búsqueda

- [x] **Galería de Eventos** (`/eventos/galeria`) ✅
  - Fotos de convenciones
  - Eventos internacionales
  - Reuniones de equipo
  - Filtros por año/país

- [x] **Desafíos Comunitarios** (`/comunidad/desafios`) ✅
  - Reto 90 Días
  - Detox Challenge
  - Reto 10K Pasos
  - Tabla de líderes por desafío
  - Premios y reconocimientos

- [x] **Reconocimientos** (`/reconocimientos`) ✅
  - Líder del Mes
  - Top Vendedores
  - Nuevos rangos alcanzados
  - Aniversarios
  - Wall of Fame

---

## 📚 FASE 5 - CONTENIDO EDUCATIVO ✅ COMPLETADA

**Prioridad**: BAJA 🟢 - **COMPLETADO** ✅

### 📖 Blog y Recursos

- [x] **Blog Principal** (`/blog`) ✅
  - Listado de artículos
  - Categorías (Nutrición, Ejercicio, Bienestar Mental, etc.)
  - Búsqueda y filtros
  - Artículos destacados
  - Newsletter signup

- [x] **Artículo de Blog** (`/blog/[slug]`) ✅
  - Contenido del artículo
  - Autor y fecha
  - Imágenes y formato rico
  - Artículos relacionados
  - Compartir en redes
  - Comentarios (mockup)

- [x] **Recetas Saludables** (`/recetas`) ✅
  - Grid de recetas
  - Filtros (desayuno, comida, cena, snacks)
  - Filtros por objetivo (energía, detox, etc.)
  - Tiempo de preparación
  - Dificultad

- [x] **Detalle de Receta** (`/recetas/[slug]`) ✅
  - Foto del platillo
  - Ingredientes
  - Paso a paso
  - Información nutricional
  - Productos Tonic Life recomendados
  - Guardar en favoritos

- [x] **Videos Educativos** (`/videos`) ✅
  - TL Mini Labs (20-30 seg)
  - Tutoriales de productos
  - Tips de bienestar
  - Testimonios en video
  - Categorías

- [x] **Guías Descargables** (`/recursos`) ✅
  - PDFs de bienestar
  - Planificadores
  - Trackers imprimibles
  - Infografías
  - Wallpapers motivacionales

---

## 🎯 FASE 6 - PÁGINAS INSTITUCIONALES ✅ COMPLETADA

**Prioridad**: MEDIA 🟡 - **COMPLETADO** ✅

### 📄 Páginas Informativas

- [x] **Sobre Nosotros** (`/nosotros`) ✅
  - Historia de Tonic Life (desde 1996)
  - Misión, Visión, Valores
  - Equipo fundador
  - Timeline histórico
  - Certificaciones

- [x] **Cómo Funciona** (`/como-funciona`) ✅
  - Proceso del Quiz
  - Sistema de recomendaciones
  - Proceso de compra
  - Entregas y seguimiento

- [x] **Programa de Distribuidores** (`/distribuidores`) ✅
  - Landing page para nuevos distribuidores
  - Beneficios del programa
  - Proceso de registro
  - Rangos y comisiones
  - Testimonios de distribuidores
  - FAQ de distribuidores

- [x] **Certificaciones y Calidad** (`/certificaciones`) ✅
  - FDA Registration
  - DSA Member
  - BBB A+ Rating
  - COFEPRIS
  - Certificados de calidad
  - Procesos de manufactura

### 📞 Soporte y Contacto

- [x] **Centro de Ayuda** (`/ayuda`) ✅
  - FAQ categorizado
  - Búsqueda de artículos
  - Artículos populares
  - Contacto si no encuentra respuesta

- [x] **FAQ General** (`/faq`) ✅
  - Preguntas frecuentes organizadas
  - Productos, Envíos, Devoluciones, Cuenta
  - Acordeón expandible
  - Búsqueda

- [x] **Contacto** (`/contacto`) ✅
  - Formulario de contacto
  - Razones de contacto (Ventas, Soporte, Distribuidores, etc.)
  - Información de oficinas
  - Horarios de atención
  - Redes sociales

- [x] **Envíos y Devoluciones** (`/envios`) ✅
  - Política de envíos
  - Costos por región
  - Tiempos de entrega
  - Política de devoluciones
  - Proceso de devolución

### ⚖️ Legal

- [x] **Términos y Condiciones** (`/terminos`) ✅
  - Términos de uso del sitio
  - Términos de venta
  - Términos de distribuidores
  - Disclaimers legales

- [x] **Política de Privacidad** (`/privacidad`) ✅
  - Recopilación de datos
  - Uso de información
  - Cookies
  - Derechos del usuario
  - GDPR compliance

- [x] **Política de Cookies** (`/cookies`) ✅
  - Tipos de cookies utilizadas
  - Propósito
  - Gestionar preferencias
  - Aceptar/Rechazar

---

## 🔧 FASE 7 - PANEL ADMINISTRATIVO ⚠️ PARCIALMENTE COMPLETADA

**Prioridad**: MEDIA 🟡 - **PARCIALMENTE COMPLETADO** ⚠️

### 👨‍💼 Admin Dashboard

- [x] **Dashboard Admin** (`/admin`) ✅
  - KPIs principales
  - Ventas del día/semana/mes
  - Nuevos registros
  - Pedidos pendientes
  - Alertas del sistema
  - Accesos rápidos

#### Gestión de Productos

- [x] **Lista de Productos** (`/admin/productos`) ✅
  - Tabla con todos los productos
  - Filtros y búsqueda
  - Estado (activo/inactivo)
  - Stock actual
  - Acciones rápidas (editar, duplicar, eliminar)

- [x] **Crear/Editar Producto** (`/admin/productos/nuevo`) ✅
  - Formulario completo de producto
  - Información básica
  - Precios y descuentos
  - Inventario
  - Ingredientes y beneficios
  - Imágenes
  - SEO metadata

- [ ] **Categorías** (`/admin/categorias`) ⏸️
  - Lista de categorías
  - Crear/Editar/Eliminar
  - Reordenar

#### Gestión de Pedidos

- [x] **Lista de Pedidos** (`/admin/pedidos`) ✅
  - Tabla con todos los pedidos
  - Filtros por estado/fecha
  - Búsqueda por número/cliente
  - Acciones en lote

- [x] **Detalle de Pedido** (`/admin/pedidos/[id]`) ✅
  - Información completa del pedido
  - Cliente
  - Productos
  - Estado de envío
  - Actualizar estado
  - Generar factura
  - Reembolso

#### Gestión de Usuarios

- [x] **Lista de Usuarios** (`/admin/usuarios`) ✅
  - Todos los usuarios (clientes + distribuidores)
  - Filtros por rol/estado
  - Búsqueda
  - Acciones (editar, suspender, eliminar)

- [x] **Detalle de Usuario** (`/admin/usuarios/[id]`) ✅
  - Información personal
  - Historial de pedidos
  - Cambios de rol
  - Notas administrativas
  - Acciones de cuenta

#### Gestión de Distribuidores

- [x] **Lista de Distribuidores** (`/admin/distribuidores`) ✅
  - Todos los distribuidores
  - Filtros por rango/estado
  - Búsqueda
  - Árbol genealógico visual

- [ ] **Detalle de Distribuidor** (`/admin/distribuidores/[id]`) ⏸️
  - Información completa
  - Red de distribuidores
  - Ventas y comisiones
  - Cambiar rango manualmente
  - Suspender/Activar

- [ ] **Comisiones Admin** (`/admin/comisiones`) ⏸️
  - Resumen de comisiones por período
  - Pendientes de pago
  - Pagadas
  - Generar reportes
  - Procesar pagos en lote

#### Contenido y Marketing

- [ ] **Gestión de Blog** (`/admin/blog`) ⏸️
  - Lista de artículos
  - Crear/Editar/Eliminar
  - Categorías
  - Programar publicaciones

- [x] **Cupones y Descuentos** (`/admin/cupones`) ✅
  - Lista de cupones activos
  - Crear nuevo cupón
  - Tipo (%, fijo, envío gratis)
  - Condiciones
  - Uso y estadísticas

- [x] **Banners y Promociones** (`/admin/banners`) ✅
  - Gestión de banners del sitio
  - Hero banner
  - Banners de categoría
  - Pop-ups
  - Programación

#### Reportes

- [ ] **Reportes de Ventas** (`/admin/reportes/ventas`) ⏸️
  - Ventas por período
  - Por producto
  - Por distribuidor
  - Exportar Excel/PDF

- [ ] **Reportes de Usuarios** (`/admin/reportes/usuarios`) ⏸️
  - Nuevos registros
  - Tasa de conversión
  - Churn rate
  - Lifetime value

- [ ] **Reportes de Inventario** (`/admin/reportes/inventario`) ⏸️
  - Stock actual
  - Productos más vendidos
  - Productos con bajo stock
  - Alertas de reabastecimiento

#### Configuración

- [ ] **Configuración General** (`/admin/configuracion`) ⏸️
  - Información de la empresa
  - Contacto
  - Redes sociales
  - Moneda y región

- [ ] **Configuración de Envíos** (`/admin/configuracion/envios`) ⏸️
  - Zonas de envío
  - Costos por zona
  - Tiempos de entrega
  - Couriers integrados

- [ ] **Configuración de Pagos** (`/admin/configuracion/pagos`) ⏸️
  - Stripe keys
  - Métodos de pago activos
  - Configuración de suscripciones

---

## 🎨 FASE 8 - FUNCIONALIDADES INTERACTIVAS AVANZADAS ✅ COMPLETADA

**Prioridad**: BAJA 🟢 - **COMPLETADO** ✅

### 🧩 Funcionalidades Avanzadas

- [x] **Búsqueda Avanzada** (`/buscar`) ✅
  - Resultados con filtros avanzados
  - 7 tipos de filtros diferentes
  - Búsqueda por categoría
  - 6 opciones de ordenamiento
  - Contador de filtros activos
  - (Ver Fase 1 - ya estaba implementado)

- [x] **Comparador de Productos** (`/comparador`) ✅
  - Tabla comparativa lado a lado
  - Hasta 4 productos simultáneos
  - Características, precio, beneficios
  - Agregar/eliminar productos
  - Add to cart y wishlist desde comparador
  - Modal para agregar más productos
  - (Ver Fase 1 - ya estaba implementado)

- [x] **Sistema de Reviews de Productos** (`/productos/[slug]/reviews`) ✅ 🆕
  - 8 reviews mockup con calificaciones
  - Distribución visual de ratings (5 estrellas a 1)
  - Filtros por calificación
  - Ordenamiento (más útil, reciente, rating)
  - Formulario para escribir review
  - Votos de "útil" / "no útil"
  - Respuestas de la empresa
  - Badges de compra verificada

- [x] **Centro de Notificaciones** (`/cuenta/notificaciones`) ✅ 🆕
  - Panel de notificaciones con 10 tipos diferentes
  - Filtros por tipo (pedidos, promociones, comunidad, newsletter)
  - Estado leído/no leído con badge contador
  - Timestamps relativos inteligentes
  - Acciones: marcar como leído, eliminar
  - Panel de preferencias de notificaciones
  - Configuración por canal (Email, Push, SMS)
  - Links a páginas relacionadas

- [x] **Wishlist Compartible** (`/cuenta/favoritos`) ✅ 🆕
  - Generación de link único compartible
  - Modal de compartir con múltiples opciones
  - Compartir vía WhatsApp con mensaje pre-formateado
  - Compartir vía Email con asunto y cuerpo
  - Copiar link al portapapeles
  - (Mejora sobre implementación existente en Fase 1)

### 🧩 Componentes Avanzados (No Implementados)

- [ ] **Constructor de Bundles** ⏸️
  - Permite al usuario crear su propio bundle
  - Cálculo automático de descuento
  - Sugerencias inteligentes
  - Vista previa del paquete

- [ ] **Calculadora de Dosis** ⏸️
  - Input de peso/edad
  - Recomendación personalizada
  - Para cada producto
  - Exportar como PDF

- [ ] **Visualizador 3D de Productos** ⏸️
  - Viewer de producto en 3D (usar imágenes si no hay modelos)
  - Zoom
  - Rotación
  - Vista de ingredientes

- [ ] **Chat en Vivo (UI)** ⏸️
  - Widget de chat flotante
  - Mensajes de ejemplo
  - Estado online/offline
  - Quick replies

---

## 📋 CHECKLIST DE COMPONENTES GLOBALES

### Componentes que faltan por crear:

- [ ] **Breadcrumbs** - Para navegación secundaria
- [ ] **Tabs** - Sistema de pestañas reutilizable
- [ ] **Modal/Dialog** - Sistema de modales
- [ ] **Dropdown Menu** - Menús desplegables avanzados
- [ ] **Toast/Notification** - Sistema de notificaciones (ya tienes Sonner, pero personalizar)
- [ ] **Loading States** - Skeletons y spinners
- [ ] **Empty States** - Estados vacíos con ilustraciones
- [ ] **Error States** - Páginas de error personalizadas (404, 500, etc.)
- [ ] **Pagination** - Componente de paginación
- [ ] **Stepper** - Para procesos multi-paso
- [ ] **Progress Bar** - Barras de progreso
- [ ] **Rating Stars** - Sistema de calificación
- [ ] **Image Gallery** - Galería de imágenes con lightbox
- [ ] **Video Player** - Player personalizado
- [ ] **Carousel/Slider** - Carrusel reutilizable
- [ ] **Accordion** - Acordeón para FAQ
- [ ] **Table** - Tablas con sorting y filtros
- [ ] **Charts** - Gráficas (usar Recharts o Chart.js)

---

## 🎯 PRIORIZACIÓN SUGERIDA PARA PRÓXIMAS SESIONES

### Semana 1-2: E-commerce Core
1. Sistema de autenticación (Login, Registro, Recuperar contraseña)
2. Mi Cuenta (perfil, direcciones, métodos de pago)
3. Wishlist/Favoritos
4. Historial de pedidos completo
5. Tracking de pedidos

### Semana 3-4: Portal Distribuidores Avanzado
1. Mi Red (árbol genealógico)
2. CRM completo (clientes, prospectos)
3. Comisiones detalladas
4. Materiales de marketing
5. Capacitación

### Semana 5-6: Daily Habit Tracker
1. Dashboard del tracker
2. Todos los módulos de hábitos
3. Sistema de desafíos
4. Gamificación y badges

### Semana 7-8: Admin Panel
1. Dashboard admin
2. Gestión de productos
3. Gestión de pedidos
4. Gestión de usuarios/distribuidores
5. Reportes básicos

### Semana 9-10: Contenido y Comunidad
1. Blog y artículos
2. Testimonios y historias
3. Feed de comunidad
4. Recursos educativos

### Semana 11-12: Polish y Optimización
1. Componentes faltantes
2. Responsive completo
3. Optimización de performance
4. Testing de flujos
5. Documentación

---

## 📊 MÉTRICAS DE PROGRESO

### Estado Actual
- **Total de Rutas Implementadas**: 72 rutas ✅
- **Total de Pantallas Planeadas**: ~120 pantallas
- **Completadas**: ~65 pantallas (54%)

### Por Fase:
- **Fase 0 - Fundación**: ✅ 100% Completada
- **Fase 1 - E-commerce Completo**: ✅ 100% Completada (18 pantallas)
- **Fase 2 - Portal Distribuidores**: ✅ 100% Completada (24 pantallas)
- **Fase 3 - Daily Habit Tracker**: ⏸️ No Implementada (0 pantallas)
- **Fase 4 - Comunidad y Contenido**: ✅ ~85% Completada (5/6 pantallas)
- **Fase 5 - Contenido Educativo**: ✅ 100% Completada (6 pantallas)
- **Fase 6 - Páginas Institucionales**: ✅ 100% Completada (11 pantallas)
- **Fase 7 - Panel Administrativo**: ⚠️ ~60% Completada (6/10 secciones principales)
- **Fase 8 - Funcionalidades Avanzadas**: ✅ 100% Completada (5/5 funcionalidades principales)

### Pendientes de Implementar:
- **Fase 3**: 10 pantallas del Daily Habit Tracker
- **Fase 4**: 1 pantalla (Feed de Comunidad)
- **Fase 7**: 4 pantallas admin (Categorías, Detalle Distribuidor, Comisiones Admin, Blog Admin) + 6 pantallas de reportes y configuración
- **Componentes avanzados**: Constructor de Bundles, Calculadora de Dosis, Visualizador 3D, Chat en Vivo

### Estimación de Tiempo
- **Tiempo por pantalla simple**: 2-4 horas
- **Tiempo por pantalla compleja**: 6-8 horas
- **Tiempo invertido hasta ahora**: ~300-400 horas
- **Tiempo restante estimado**: ~150-200 horas de desarrollo frontend

---

## 🎨 GUÍA DE DISEÑO A SEGUIR

### Principios de Diseño
1. **Simple y Clean**: Estilo AG1, Seed, Athletic Greens
2. **Mobile First**: Todo debe funcionar perfecto en móvil primero
3. **Colores Consistentes**: #003B7A (Azul), #7AB82E (Verde)
4. **Espaciado Generoso**: Mucho white space
5. **Tipografía Clara**: Títulos grandes y legibles
6. **Imágenes de Alta Calidad**: Por ahora usar placeholders pero con buena composición
7. **Microinteracciones**: Animaciones sutiles en hover/click
8. **Loading States**: Siempre mostrar feedback de carga
9. **Empty States**: Estados vacíos con ilustraciones amigables
10. **Error Handling**: Mensajes de error claros y accionables

### Componentes Visuales Consistentes
- Botones con estados hover/active/disabled
- Cards con sombras sutiles
- Inputs con estados focus/error/success
- Badges con colores semánticos
- Modales con overlay oscuro
- Toasts con iconos
- Progress bars animados

---

## 🚀 NOTAS FINALES

### ⚠️ Consideraciones Críticas del Proyecto
**OBLIGATORIO**: Antes de continuar con el desarrollo o integración con backend, todo el equipo debe revisar el archivo [CONSIDERACIONES.md](CONSIDERACIONES.md) que contiene:

- **20 secciones de consideraciones fundamentales** del sistema
- Modelo de negocio multinivel (MLM) con comisiones y genealogía
- Sistema multi-rol (Cliente, Distribuidor, Admin, RRHH, Soporte, Finanzas)
- Health Quiz con lógica de recomendación por género y metas
- Daily Habit Tracker con gamificación completa
- Integraciones críticas (Stripe, WhatsApp Business, Email, SMS, Analytics)
- Compliance regulatorio (FDA, COFEPRIS, DSA, FTC, BBB)
- Escalabilidad para 10,000+ distribuidores y 100,000+ clientes
- Roadmap emocional de usuario en 5 experiencias clave
- Priorización MVP (Fase 1, 2, 3)

Este documento es la **guía maestra** para todas las decisiones de arquitectura, diseño y funcionalidad.

### Para el Equipo de Backend
Una vez que el backend esté listo, necesitaremos:

1. **Documentación completa de API** (Swagger/OpenAPI)
2. **Endpoints claramente definidos** con request/response examples
3. **Autenticación** (JWT, OAuth, etc.) con soporte multi-rol
4. **Rate limiting** y manejo de errores
5. **Webhooks** para eventos importantes (nuevo pedido, pago, comisiones calculadas, etc.)
6. **WebSockets** para notificaciones en tiempo real (opcional)
7. **Sistema de comisiones MLM** con cálculo automático por niveles
8. **Motor de recomendación** para Health Quiz
9. **Sistema de genealogía** para árbol de distribuidores
10. **Multi-tenancy** para soporte multi-país y multi-moneda

### Data Mocks a Preparar
Mientras tanto, asegúrate de tener mocks realistas para:
- [ ] ~50 productos completos con todas las propiedades
- [ ] Usuarios de diferentes roles
- [ ] Árbol genealógico de al menos 3 niveles
- [ ] Historial de pedidos variado
- [ ] Comisiones calculadas
- [ ] Eventos y capacitaciones
- [ ] Artículos de blog
- [ ] Testimonios diversos

### Testing
- [ ] Cada pantalla debe ser testeada en mobile/tablet/desktop
- [ ] Probar todos los flujos completos (registro → compra → tracking)
- [ ] Validar formularios
- [ ] Loading states
- [ ] Error states
- [ ] Empty states

---

## 📞 CONTACTO Y SOPORTE

Para cualquier duda sobre este plan de desarrollo:
- **📋 Documentación de referencia crítica**: [CONSIDERACIONES.md](CONSIDERACIONES.md) - **LECTURA OBLIGATORIA**
  - Contiene las 20 consideraciones fundamentales del sistema
  - Modelo de negocio MLM, multi-rol, Health Quiz, gamificación
  - Integraciones, compliance, escalabilidad, y roadmap MVP
- **🎨 Colores de marca**: #003B7A (Azul Principal), #7AB82E (Verde Acento)
- **🔤 Fuentes**: Geist Sans (principal), Geist Mono (código)
- **🎯 Filosofía**: "Made Simple" - Todo debe ser fácil de entender, iniciar y vivir

---

**Última actualización**: Enero 2025
**Versión**: 2.0
**Mantenido por**: Equipo de Desarrollo Frontend Tonic Life
**Total de Rutas**: 72 páginas completadas
**Progreso General**: 54% completado (~65 de ~120 pantallas)
