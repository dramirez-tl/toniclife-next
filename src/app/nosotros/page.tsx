'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  SparklesIcon,
  HeartIcon,
  UserGroupIcon,
  GlobeAmericasIcon,
  TrophyIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';

export default function NosotrosPage() {
  const values = [
    {
      icon: HeartIcon,
      title: 'Pasión por el Bienestar',
      description: 'Creemos que cada persona merece vivir una vida plena, saludable y llena de energía.'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Calidad Premium',
      description: 'Productos formulados con los más altos estándares de calidad y pureza, respaldados por la ciencia.'
    },
    {
      icon: UserGroupIcon,
      title: 'Comunidad Primero',
      description: 'Construimos una familia global de personas comprometidas con su salud y el éxito de otros.'
    },
    {
      icon: SparklesIcon,
      title: 'Innovación Constante',
      description: 'Siempre a la vanguardia, investigando y desarrollando las mejores soluciones de bienestar.'
    }
  ];

  const timeline = [
    {
      year: '1996',
      title: 'Fundación de Tonic Life',
      description: 'Nace con la visión de transformar la industria del bienestar con productos naturales de la más alta calidad.',
      milestone: true
    },
    {
      year: '2003',
      title: 'Expansión Internacional',
      description: 'Llegamos a 5 países de Latinoamérica, consolidando nuestra presencia en el mercado regional.',
      milestone: false
    },
    {
      year: '2010',
      title: 'Certificación FDA',
      description: 'Obtenemos la certificación FDA, reforzando nuestro compromiso con los más altos estándares de calidad.',
      milestone: true
    },
    {
      year: '2015',
      title: '50,000 Distribuidores',
      description: 'Alcanzamos la cifra de 50,000 distribuidores activos en toda Latinoamérica.',
      milestone: false
    },
    {
      year: '2020',
      title: 'Plataforma Digital',
      description: 'Lanzamos nuestra plataforma digital integral, revolucionando la experiencia del distribuidor.',
      milestone: true
    },
    {
      year: '2024',
      title: 'Líder en Wellness',
      description: 'Consolidados como la marca #1 de bienestar y network marketing en América Latina.',
      milestone: true
    }
  ];

  const certifications = [
    { name: 'FDA Registration', logo: '/placeholder-cert-fda.png' },
    { name: 'DSA Member', logo: '/placeholder-cert-dsa.png' },
    { name: 'BBB A+ Rating', logo: '/placeholder-cert-bbb.png' },
    { name: 'COFEPRIS', logo: '/placeholder-cert-cofepris.png' },
    { name: 'ISO 9001', logo: '/placeholder-cert-iso.png' },
    { name: 'GMP Certified', logo: '/placeholder-cert-gmp.png' }
  ];

  const stats = [
    { number: '28+', label: 'Años de experiencia', icon: TrophyIcon },
    { number: '100K+', label: 'Distribuidores activos', icon: UserGroupIcon },
    { number: '15+', label: 'Países', icon: GlobeAmericasIcon },
    { number: '50+', label: 'Productos premium', icon: SparklesIcon }
  ];

  const team = [
    {
      name: 'Dr. Carlos Mendoza',
      role: 'CEO & Fundador',
      image: '/placeholder-team-1.jpg',
      bio: 'Visionario emprendedor con más de 30 años de experiencia en la industria del bienestar.'
    },
    {
      name: 'Dra. Ana Rodríguez',
      role: 'Directora Científica',
      image: '/placeholder-team-2.jpg',
      bio: 'PhD en Nutrición, lidera nuestro equipo de investigación y desarrollo de productos.'
    },
    {
      name: 'Roberto Silva',
      role: 'VP de Operaciones',
      image: '/placeholder-team-3.jpg',
      bio: 'Experto en logística y cadena de suministro, garantiza la excelencia operativa.'
    },
    {
      name: 'María Torres',
      role: 'Directora de Comunidad',
      image: '/placeholder-team-4.jpg',
      bio: 'Apasionada por el desarrollo de nuestra red de distribuidores y su éxito.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[500px] bg-gradient-to-r from-[#003B7A] to-[#7AB82E]">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-white max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Transformando Vidas Desde 1996
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8">
              Somos más que productos de bienestar. Somos una comunidad global comprometida con ayudar a las personas a alcanzar su máximo potencial de salud y prosperidad.
            </p>
            <Link
              href="/distribuidores"
              className="inline-block px-8 py-4 bg-white text-[#003B7A] font-bold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Únete a Nuestra Comunidad
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-[#003B7A] rounded-full">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-[#003B7A] mb-2">{stat.number}</p>
                  <p className="text-gray-600">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-gradient-to-br from-[#003B7A] to-[#7AB82E] rounded-2xl p-8 text-white">
              <div className="flex items-center gap-3 mb-4">
                <RocketLaunchIcon className="h-10 w-10" />
                <h2 className="text-3xl font-bold">Misión</h2>
              </div>
              <p className="text-lg text-blue-100">
                Empoderar a las personas para que alcancen su máximo potencial de salud, bienestar y éxito financiero a través de productos premium de calidad científicamente respaldada y un sistema de negocio transparente y ético.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#7AB82E] to-[#003B7A] rounded-2xl p-8 text-white">
              <div className="flex items-center gap-3 mb-4">
                <SparklesIcon className="h-10 w-10" />
                <h2 className="text-3xl font-bold">Visión</h2>
              </div>
              <p className="text-lg text-green-100">
                Ser la marca líder de bienestar y desarrollo personal en América Latina, reconocida por transformar millones de vidas y crear oportunidades de prosperidad para nuestras comunidades.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Nuestros Valores</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Los principios que guían cada decisión y acción en Tonic Life
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div key={index} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-[#7AB82E] rounded-full">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-3">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 text-center">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Nuestra Historia</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Más de 28 años de innovación, crecimiento y transformación de vidas
            </p>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-[#7AB82E]" />

            <div className="space-y-12">
              {timeline.map((item, index) => (
                <div key={index} className={`relative flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  {/* Content */}
                  <div className={`w-5/12 ${index % 2 === 0 ? 'text-right pr-8' : 'text-left pl-8'}`}>
                    <div className={`bg-white rounded-lg shadow-lg p-6 ${item.milestone ? 'border-2 border-[#7AB82E]' : ''}`}>
                      <div className={`text-3xl font-bold mb-2 ${item.milestone ? 'text-[#7AB82E]' : 'text-[#003B7A]'}`}>
                        {item.year}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-gray-600">{item.description}</p>
                      {item.milestone && (
                        <div className="mt-3">
                          <CheckBadgeIcon className="h-6 w-6 text-[#7AB82E] inline" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Center Dot */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-6 h-6 bg-[#003B7A] rounded-full border-4 border-white shadow-lg z-10" />

                  {/* Spacer */}
                  <div className="w-5/12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Nuestro Equipo Fundador</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Líderes visionarios comprometidos con tu éxito
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="relative h-64">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-[#7AB82E] font-medium mb-3">{member.role}</p>
                  <p className="text-gray-600 text-sm">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Certificaciones y Reconocimientos</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Respaldados por las instituciones más prestigiosas de la industria
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {certifications.map((cert, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center hover:shadow-lg transition-shadow">
                <div className="relative h-20 w-full mb-3">
                  <Image
                    src={cert.logo}
                    alt={cert.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-sm text-gray-600 text-center font-medium">{cert.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-[#003B7A] to-[#7AB82E]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            Únete a Nuestra Historia de Éxito
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Sé parte de una comunidad que está transformando vidas y construyendo un futuro más saludable y próspero.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/distribuidores"
              className="px-8 py-4 bg-white text-[#003B7A] font-bold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Conviértete en Distribuidor
            </Link>
            <Link
              href="/productos"
              className="px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
            >
              Explora Nuestros Productos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
