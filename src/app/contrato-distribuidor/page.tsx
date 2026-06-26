'use client';

import { DocumentTextIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// NOTA: el TEXTO LEGAL definitivo del Contrato de Distribuidor está PENDIENTE de
// que el área legal de Tonic Life lo proporcione. Las secciones de abajo son una
// estructura placeholder; reemplazar `content` con el texto oficial cuando esté.
export default function ContratoDistribuidorPage() {
  const sections = [
    {
      title: '1. Objeto del Contrato',
      content: `[PENDIENTE — texto legal] Describe la relación entre Tonic Life y el Distribuidor independiente: alcance de la actividad, naturaleza no laboral de la relación y carácter independiente del Distribuidor.`,
    },
    {
      title: '2. Condición de Distribuidor Independiente',
      content: `[PENDIENTE — texto legal] El Distribuidor actúa por cuenta propia, no es empleado, agente ni representante de Tonic Life, y no genera relación laboral alguna.`,
    },
    {
      title: '3. Plan de Compensación y Comisiones',
      content: `[PENDIENTE — texto legal] Referencia al plan de compensación (rangos, puntos, comisiones por nivel y generación, roll-over) y a las reglas de calificación por periodo.`,
    },
    {
      title: '4. Obligaciones del Distribuidor',
      content: `[PENDIENTE — texto legal] Conducta ética, cumplimiento de políticas y procedimientos, prohibición de declaraciones de ingresos o de salud no autorizadas, y respeto a la red.`,
    },
    {
      title: '5. Obligaciones Fiscales',
      content: `[PENDIENTE — texto legal] Responsabilidad del Distribuidor sobre sus obligaciones fiscales y el régimen aplicable (CFDI, retenciones, etc.).`,
    },
    {
      title: '6. Vigencia y Terminación',
      content: `[PENDIENTE — texto legal] Duración del contrato, causas de terminación, y efectos de la baja o el incumplimiento.`,
    },
    {
      title: '7. Protección de Datos',
      content: `[PENDIENTE — texto legal] Tratamiento de datos personales conforme al Aviso de Privacidad de Tonic Life.`,
    },
    {
      title: '8. Aceptación',
      content: `[PENDIENTE — texto legal] Declaración de que el Distribuidor ha leído, entendido y acepta el presente Contrato al inscribirse.`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#C8DDF2] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <DocumentTextIcon className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">Contrato de Distribuidor</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Términos de la relación como Distribuidor independiente de Tonic Life
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Aviso de contenido pendiente (quitar cuando legal entregue el texto) */}
        <div className="mb-8 flex items-start gap-3 rounded-lg border-2 border-amber-200 bg-amber-50 p-5">
          <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Documento en preparación.</span> El
            texto legal definitivo del Contrato de Distribuidor será publicado por
            el área legal de Tonic Life. El contenido mostrado es preliminar.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-gray-700 mb-8">
              El presente Contrato regula la relación entre Tonic Life y la persona
              que se inscribe como Distribuidor independiente. Léelo cuidadosamente
              antes de aceptarlo.
            </p>

            <div className="space-y-8">
              {sections.map((section, index) => (
                <div key={index} className="border-l-4 border-[#a7c1e2] pl-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {section.title}
                  </h2>
                  <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <p className="text-gray-700 font-medium">
                Al inscribirte como Distribuidor de Tonic Life, reconoces que has
                leído, entendido y aceptas el presente Contrato de Distribuidor.
              </p>
            </div>
          </div>
        </div>

        {/* Related Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/terminos"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-center"
          >
            <h3 className="font-bold text-gray-900 mb-2">Términos y Condiciones</h3>
            <p className="text-gray-600 text-sm">Reglas de uso del sitio</p>
          </a>
          <a
            href="/privacidad"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-center"
          >
            <h3 className="font-bold text-gray-900 mb-2">Aviso de Privacidad</h3>
            <p className="text-gray-600 text-sm">Cómo protegemos tu información</p>
          </a>
        </div>
      </div>
    </div>
  );
}
