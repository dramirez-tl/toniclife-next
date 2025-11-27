'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  UsersIcon,
  ChartBarIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  TrophyIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface NetworkMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  rank: string;
  joinDate: string;
  level: number;
  status: 'active' | 'inactive';
  personalSales: number;
  teamSales: number;
  downlineCount: number;
  children?: NetworkMember[];
}

const mockNetwork: NetworkMember = {
  id: 'me',
  name: 'María González',
  email: 'maria@email.com',
  phone: '+52 123 456 7890',
  rank: 'Gold',
  joinDate: '2024-01-15',
  level: 0,
  status: 'active',
  personalSales: 12500,
  teamSales: 45000,
  downlineCount: 23,
  children: [
    {
      id: '1',
      name: 'Laura Pérez',
      email: 'laura@email.com',
      phone: '+52 111 222 3333',
      rank: 'Silver',
      joinDate: '2024-02-20',
      level: 1,
      status: 'active',
      personalSales: 8500,
      teamSales: 15000,
      downlineCount: 8,
      children: [
        {
          id: '1-1',
          name: 'Ana Martínez',
          email: 'ana@email.com',
          phone: '+52 444 555 6666',
          rank: 'Bronze',
          joinDate: '2024-04-10',
          level: 2,
          status: 'active',
          personalSales: 3200,
          teamSales: 3200,
          downlineCount: 0,
        },
        {
          id: '1-2',
          name: 'José García',
          email: 'jose@email.com',
          phone: '+52 777 888 9999',
          rank: 'Bronze',
          joinDate: '2024-05-15',
          level: 2,
          status: 'active',
          personalSales: 2800,
          teamSales: 2800,
          downlineCount: 0,
        },
      ],
    },
    {
      id: '2',
      name: 'Carlos Rodríguez',
      email: 'carlos@email.com',
      phone: '+52 222 333 4444',
      rank: 'Silver',
      joinDate: '2024-03-01',
      level: 1,
      status: 'active',
      personalSales: 7200,
      teamSales: 12000,
      downlineCount: 5,
      children: [
        {
          id: '2-1',
          name: 'Diana López',
          email: 'diana@email.com',
          phone: '+52 555 666 7777',
          rank: 'Bronze',
          joinDate: '2024-06-20',
          level: 2,
          status: 'active',
          personalSales: 2100,
          teamSales: 2100,
          downlineCount: 0,
        },
      ],
    },
    {
      id: '3',
      name: 'Patricia Sánchez',
      email: 'patricia@email.com',
      phone: '+52 333 444 5555',
      rank: 'Bronze',
      joinDate: '2024-07-10',
      level: 1,
      status: 'inactive',
      personalSales: 1500,
      teamSales: 1500,
      downlineCount: 0,
    },
  ],
};

const rankColors = {
  Diamond: 'text-blue-600 bg-blue-50',
  Platinum: 'text-purple-600 bg-purple-50',
  Gold: 'text-yellow-600 bg-yellow-50',
  Silver: 'text-gray-600 bg-gray-50',
  Bronze: 'text-orange-600 bg-orange-50',
};

export default function RedPage() {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['me', '1', '2']));
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleInviteMember = () => {
    toast.info('Abriendo formulario de invitación');
  };

  const handleContactMember = (name: string) => {
    toast.success(`Iniciando contacto con ${name}`);
  };

  const renderTreeNode = (member: NetworkMember, isRoot = false) => {
    const isExpanded = expandedNodes.has(member.id);
    const hasChildren = member.children && member.children.length > 0;

    return (
      <div key={member.id} className={isRoot ? '' : 'ml-8'}>
        <Card className={`mb-3 ${member.status === 'inactive' ? 'opacity-60' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Expand/Collapse Button */}
              {hasChildren && (
                <button
                  onClick={() => toggleNode(member.id)}
                  className="mt-1 flex-shrink-0 w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded"
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
              )}

              {/* Member Avatar */}
              <div className="w-12 h-12 bg-gradient-to-br from-[#003B7A] to-[#7AB82E] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {member.name.split(' ').map(n => n[0]).join('')}
              </div>

              {/* Member Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{member.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${rankColors[member.rank as keyof typeof rankColors]}`}>
                        <TrophyIcon className="h-3 w-3 mr-1" />
                        {member.rank}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                      {!isRoot && (
                        <span className="text-xs text-gray-500">Nivel {member.level}</span>
                      )}
                    </div>
                  </div>

                  {!isRoot && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleContactMember(member.name)}
                        className="p-2 hover:bg-gray-100 rounded"
                        title="Enviar email"
                      >
                        <EnvelopeIcon className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleContactMember(member.name)}
                        className="p-2 hover:bg-gray-100 rounded"
                        title="Llamar"
                      >
                        <PhoneIcon className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Ventas Personales</p>
                    <p className="font-semibold text-gray-900">${member.personalSales.toLocaleString('es-MX')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Ventas de Equipo</p>
                    <p className="font-semibold text-gray-900">${member.teamSales.toLocaleString('es-MX')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Downline</p>
                    <p className="font-semibold text-gray-900">{member.downlineCount}</p>
                  </div>
                </div>

                {!isRoot && (
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      Desde {new Date(member.joinDate).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
                    </span>
                    <span>{member.email}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="relative before:absolute before:left-3 before:top-0 before:bottom-0 before:w-px before:bg-gray-300">
            {member.children!.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  const allMembers: NetworkMember[] = [];
  const flattenNetwork = (member: NetworkMember) => {
    allMembers.push(member);
    if (member.children) {
      member.children.forEach(flattenNetwork);
    }
  };
  flattenNetwork(mockNetwork);

  const filteredMembers = allMembers.filter(member => {
    if (searchQuery && !member.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterLevel !== 'all' && member.level.toString() !== filterLevel) {
      return false;
    }
    if (filterStatus !== 'all' && member.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const stats = {
    total: allMembers.length - 1, // Exclude self
    active: allMembers.filter(m => m.status === 'active' && m.id !== 'me').length,
    level1: allMembers.filter(m => m.level === 1).length,
    level2: allMembers.filter(m => m.level === 2).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <UsersIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Mi Red de Distribuidores</h1>
              </div>
              <p className="text-white/80 text-lg">
                {stats.total} miembros en tu red
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/distribuidor">
                <Button variant="secondary">
                  Volver al Dashboard
                </Button>
              </Link>
              <Button
                variant="primary"
                leftIcon={<UserPlusIcon className="h-5 w-5" />}
                onClick={handleInviteMember}
              >
                Invitar Nuevo
              </Button>
            </div>
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
                  <p className="text-sm text-gray-600 mb-1">Total en Red</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <UsersIcon className="h-12 w-12 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Activos</p>
                  <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircleIcon className="h-12 w-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Nivel 1</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.level1}</p>
                </div>
                <ChartBarIcon className="h-12 w-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Nivel 2+</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.level2}</p>
                </div>
                <ChartBarIcon className="h-12 w-12 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & View Toggle */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-wrap gap-3 flex-1">
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                  />
                </div>

                {/* Level Filter */}
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                >
                  <option value="all">Todos los niveles</option>
                  <option value="1">Nivel 1</option>
                  <option value="2">Nivel 2</option>
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('tree')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'tree'
                      ? 'bg-[#003B7A] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  Vista Árbol
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[#003B7A] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  Vista Lista
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Network Display */}
        {viewMode === 'tree' ? (
          <div>
            {renderTreeNode(mockNetwork, true)}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map(member => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#003B7A] to-[#7AB82E] rounded-full flex items-center justify-center text-white font-bold">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{member.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${rankColors[member.rank as keyof typeof rankColors]}`}>
                          {member.rank}
                        </span>
                        <span className="text-xs text-gray-500">Nivel {member.level}</span>
                      </div>
                      <p className="text-sm text-gray-600">{member.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Ventas</p>
                      <p className="font-bold text-gray-900">${member.personalSales.toLocaleString('es-MX')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Help CTA */}
        <Card className="mt-8 bg-gradient-to-r from-[#7AB82E] to-[#7AB82E]/90 text-white">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold mb-4">Haz Crecer tu Red</h3>
            <p className="text-white/90 mb-6">
              Invita a más distribuidores y aumenta tus comisiones. ¡Cada nuevo miembro activo te acerca a tu siguiente rango!
            </p>
            <Button
              variant="secondary"
              size="lg"
              leftIcon={<UserPlusIcon className="h-5 w-5" />}
              onClick={handleInviteMember}
            >
              Invitar Nuevo Distribuidor
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
