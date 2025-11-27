'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button, Card, Input } from '@/components/ui';
import { SparklesIcon, ClockIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface UserInfo {
  name: string;
  email: string;
  age: number;
  gender: 'female' | 'male';
}

interface QuizWelcomeProps {
  onStart: (userInfo: UserInfo) => void;
}

export function QuizWelcome({ onStart }: QuizWelcomeProps) {
  const [step, setStep] = useState<'intro' | 'form'>('intro');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    gender: '' as 'female' | 'male' | ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Ingresa tu nombre';
    if (!formData.email.trim()) newErrors.email = 'Ingresa tu correo';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ingresa un correo válido';
    }
    if (!formData.age) newErrors.age = 'Ingresa tu edad';
    else if (parseInt(formData.age) < 18 || parseInt(formData.age) > 100) {
      newErrors.age = 'Edad debe ser entre 18 y 100';
    }
    if (!formData.gender) newErrors.gender = 'Selecciona tu género';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onStart({
      name: formData.name,
      email: formData.email,
      age: parseInt(formData.age),
      gender: formData.gender as 'female' | 'male'
    });
  };

  if (step === 'intro') {
    return (
      <div className="text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/images/logo.png"
            alt="Tonic Life - My Wellness Hub"
            width={200}
            height={80}
            priority
            className="h-16 w-auto"
          />
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#003B7A] leading-tight">
          <span className="font-serif italic">Encuentra tu fórmula ideal</span>
          <br />
          <span className="text-[#7AB82E]">de bienestar</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
          Tu bienestar empieza con <strong className="text-[#003B7A]">conocerte</strong>.
          <br />
          Responde unas simples preguntas y descubre qué fórmula natural es ideal para ti.
        </p>

        {/* Features */}
        <div className="mt-10 flex flex-wrap justify-center gap-6">
          <div className="flex items-center gap-2 text-gray-600">
            <ClockIcon className="h-5 w-5 text-[#7AB82E]" />
            <span>Solo 2 minutos</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <SparklesIcon className="h-5 w-5 text-[#7AB82E]" />
            <span>10 preguntas</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <ShieldCheckIcon className="h-5 w-5 text-[#7AB82E]" />
            <span>100% personalizado</span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-12">
          <Button
            size="xl"
            onClick={() => setStep('form')}
            className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            START NOW
          </Button>
        </div>

        {/* Trust Text */}
        <p className="mt-6 text-sm text-gray-500">
          Tu información es privada y nunca será compartida.
        </p>
      </div>
    );
  }

  return (
    <Card className="max-w-xl mx-auto" padding="lg">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-[#7AB82E]/10 text-[#7AB82E] px-4 py-2 rounded-full text-sm font-medium mb-4">
          <SparklesIcon className="h-4 w-4" />
          Pregunta 1
        </div>
        <h2 className="text-2xl font-bold text-[#003B7A]">
          Comencemos conociéndote
        </h2>
        <p className="text-gray-500 mt-2">
          Esta información nos ayuda a personalizar tus recomendaciones
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Nombre Completo"
          placeholder="Tu nombre"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
        />

        <Input
          label="Edad"
          type="number"
          placeholder="Tu edad"
          min={18}
          max={100}
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
          error={errors.age}
        />

        <Input
          label="Correo Electrónico"
          type="email"
          placeholder="tu@correo.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
          helperText="Para enviarte tus resultados"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Género
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, gender: 'female' })}
              className={`
                p-4 rounded-xl border-2 transition-all
                ${formData.gender === 'female'
                  ? 'border-[#7AB82E] bg-[#7AB82E]/10 text-[#7AB82E]'
                  : 'border-gray-200 hover:border-[#7AB82E]/50'
                }
              `}
            >
              <span className="text-2xl mb-2 block">👩</span>
              <span className="font-medium">Mujer</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, gender: 'male' })}
              className={`
                p-4 rounded-xl border-2 transition-all
                ${formData.gender === 'male'
                  ? 'border-[#7AB82E] bg-[#7AB82E]/10 text-[#7AB82E]'
                  : 'border-gray-200 hover:border-[#7AB82E]/50'
                }
              `}
            >
              <span className="text-2xl mb-2 block">👨</span>
              <span className="font-medium">Hombre</span>
            </button>
          </div>
          {errors.gender && (
            <p className="mt-2 text-sm text-red-500">{errors.gender}</p>
          )}
        </div>

        <div className="pt-4">
          <Button type="submit" fullWidth size="lg">
            Continuar
          </Button>
        </div>

        <p className="text-center text-xs text-gray-500">
          Tu información no será compartida. Nunca envíes contraseñas.
        </p>
      </form>
    </Card>
  );
}
