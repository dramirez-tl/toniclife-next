'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  AcademicCapIcon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  TrophyIcon,
  BookOpenIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

const mockCourses = [
  {
    id: '1',
    title: 'Introducción a Tonic Life',
    category: 'Fundamentos',
    level: 'Principiante',
    duration: '2 horas',
    lessons: 12,
    progress: 100,
    completed: true,
    rating: 4.9,
    students: 1234,
    instructor: 'María González',
    description: 'Conoce la historia, misión y valores de Tonic Life. Aprende sobre nuestros productos y el plan de compensación.',
    topics: ['Historia de la empresa', 'Productos principales', 'Plan de compensación', 'Cultura organizacional'],
  },
  {
    id: '2',
    title: 'Técnicas de Venta Efectiva',
    category: 'Ventas',
    level: 'Intermedio',
    duration: '3 horas',
    lessons: 18,
    progress: 60,
    completed: false,
    rating: 4.8,
    students: 987,
    instructor: 'Carlos Ramírez',
    description: 'Domina las técnicas de venta consultiva y cierre. Aprende a manejar objeciones y seguimiento de clientes.',
    topics: ['Venta consultiva', 'Manejo de objeciones', 'Técnicas de cierre', 'Seguimiento efectivo'],
  },
  {
    id: '3',
    title: 'Gestión de Red y Liderazgo',
    category: 'Liderazgo',
    level: 'Avanzado',
    duration: '4 horas',
    lessons: 24,
    progress: 0,
    completed: false,
    rating: 4.9,
    students: 756,
    instructor: 'Laura Hernández',
    description: 'Aprende a construir, motivar y liderar equipos de alto rendimiento. Estrategias de duplicación.',
    topics: ['Reclutamiento', 'Motivación de equipo', 'Duplicación', 'Desarrollo de líderes'],
  },
  {
    id: '4',
    title: 'Marketing Digital para Distribuidores',
    category: 'Marketing',
    level: 'Intermedio',
    duration: '3.5 horas',
    lessons: 20,
    progress: 0,
    completed: false,
    rating: 4.7,
    students: 892,
    instructor: 'Ana Martínez',
    description: 'Domina las redes sociales, contenido y publicidad digital para hacer crecer tu negocio online.',
    topics: ['Redes sociales', 'Creación de contenido', 'Facebook Ads', 'Embudo de ventas'],
  },
  {
    id: '5',
    title: 'Conocimiento Profundo de Productos',
    category: 'Productos',
    level: 'Intermedio',
    duration: '5 horas',
    lessons: 30,
    progress: 0,
    completed: false,
    rating: 4.9,
    students: 1123,
    instructor: 'Dr. Roberto López',
    description: 'Conoce a fondo cada producto: ingredientes, beneficios, usos y ciencia detrás de cada fórmula.',
    topics: ['Ingredientes activos', 'Beneficios por producto', 'Casos de uso', 'Estudios científicos'],
  },
  {
    id: '6',
    title: 'Mentoría y Capacitación de Equipo',
    category: 'Liderazgo',
    level: 'Avanzado',
    duration: '3 horas',
    lessons: 15,
    progress: 0,
    completed: false,
    rating: 4.8,
    students: 654,
    instructor: 'Patricia Sánchez',
    description: 'Aprende a entrenar y mentorear a tu equipo para que alcancen su máximo potencial.',
    topics: ['Capacitación efectiva', 'Mentoría 1-a-1', 'Reuniones de equipo', 'Reconocimiento'],
  },
];

const achievements = [
  { name: 'Primera Venta', icon: '🎯', earned: true, date: '2024-02-15' },
  { name: 'Curso Completado', icon: '📚', earned: true, date: '2024-03-20' },
  { name: 'Rango Silver', icon: '🥈', earned: true, date: '2024-05-10' },
  { name: 'Rango Gold', icon: '🥇', earned: true, date: '2024-08-15' },
  { name: '10 Distribuidores', icon: '👥', earned: true, date: '2024-09-20' },
  { name: 'Maestro de Productos', icon: '🎓', earned: false },
  { name: 'Líder de Equipo', icon: '👑', earned: false },
  { name: 'Rango Diamond', icon: '💎', earned: false },
];

export default function CapacitacionPage() {
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterLevel, setFilterLevel] = useState('Todos');

  const categories = ['Todas', ...new Set(mockCourses.map(c => c.category))];
  const levels = ['Todos', 'Principiante', 'Intermedio', 'Avanzado'];

  const filteredCourses = mockCourses.filter(course => {
    if (filterCategory !== 'Todas' && course.category !== filterCategory) return false;
    if (filterLevel !== 'Todos' && course.level !== filterLevel) return false;
    return true;
  });

  const handleStartCourse = (courseTitle: string) => {
    toast.success(`Iniciando curso: ${courseTitle}`);
  };

  const handleContinueCourse = (courseTitle: string) => {
    toast.info(`Continuando: ${courseTitle}`);
  };

  const stats = {
    completed: mockCourses.filter(c => c.completed).length,
    inProgress: mockCourses.filter(c => c.progress > 0 && !c.completed).length,
    totalHours: mockCourses.reduce((sum, c) => sum + parseFloat(c.duration), 0),
    certificates: mockCourses.filter(c => c.completed).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <AcademicCapIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Academia de Capacitación</h1>
              </div>
              <p className="text-white/80 text-lg">
                Desarrolla tus habilidades y alcanza el éxito
              </p>
            </div>
            <Link href="/distribuidor">
              <Button variant="secondary">
                Volver al Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Cursos Completados</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircleSolid className="h-12 w-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">En Progreso</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
                </div>
                <BookOpenIcon className="h-12 w-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Horas de Estudio</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.totalHours.toFixed(1)}</p>
                </div>
                <ClockIcon className="h-12 w-12 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Certificados</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.certificates}</p>
                </div>
                <TrophyIcon className="h-12 w-12 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Continue Learning */}
        {stats.inProgress > 0 && (
          <Card className="mb-8 bg-gradient-to-r from-[#7AB82E] to-[#7AB82E]/90 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">Continúa donde lo dejaste</h3>
                  {mockCourses.filter(c => c.progress > 0 && !c.completed).map(course => (
                    <div key={course.id} className="mb-3 last:mb-0">
                      <p className="text-white/90 mb-1">{course.title}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{course.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<PlayIcon className="h-5 w-5" />}
                  onClick={() => handleContinueCourse(mockCourses.find(c => c.progress > 0 && !c.completed)?.title || '')}
                >
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
          >
            {levels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  {/* Course Icon */}
                  <div className="w-20 h-20 bg-gradient-to-br from-[#003B7A] to-[#7AB82E] rounded-lg flex items-center justify-center flex-shrink-0">
                    {course.completed ? (
                      <CheckCircleSolid className="h-10 w-10 text-white" />
                    ) : (
                      <AcademicCapIcon className="h-10 w-10 text-white" />
                    )}
                  </div>

                  {/* Course Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            course.level === 'Principiante' ? 'bg-green-100 text-green-800' :
                            course.level === 'Intermedio' ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {course.level}
                          </span>
                          <span className="text-xs text-gray-500">{course.category}</span>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">{course.title}</h3>
                      </div>
                      {course.completed && (
                        <CheckCircleSolid className="h-6 w-6 text-green-500 flex-shrink-0 ml-2" />
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {course.description}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        {course.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <VideoCameraIcon className="h-3 w-3" />
                        {course.lessons} lecciones
                      </span>
                      <span className="flex items-center gap-1">
                        <StarSolid className="h-3 w-3 text-yellow-400" />
                        {course.rating}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {course.progress > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Progreso</span>
                          <span className="text-xs font-medium text-gray-900">{course.progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#7AB82E] rounded-full transition-all"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      variant={course.completed ? 'outline' : 'primary'}
                      size="sm"
                      className="w-full"
                      leftIcon={course.completed ? <DocumentTextIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                      onClick={() => course.completed ? toast.info('Ver certificado') : course.progress > 0 ? handleContinueCourse(course.title) : handleStartCourse(course.title)}
                    >
                      {course.completed ? 'Ver Certificado' : course.progress > 0 ? 'Continuar Curso' : 'Comenzar Curso'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Achievements Section */}
        <Card>
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrophyIcon className="h-6 w-6 text-yellow-500" />
              Logros y Reconocimientos
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {achievements.map((achievement, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    achievement.earned
                      ? 'border-yellow-300 bg-yellow-50'
                      : 'border-gray-200 bg-gray-50 opacity-50'
                  }`}
                >
                  <div className="text-4xl mb-2">{achievement.icon}</div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">
                    {achievement.name}
                  </p>
                  {achievement.earned && achievement.date && (
                    <p className="text-xs text-gray-500">
                      {new Date(achievement.date).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                  {!achievement.earned && (
                    <p className="text-xs text-gray-500">Bloqueado</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
