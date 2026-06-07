'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  UserGroupIcon,
  ArrowLeftIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useCompareUsers, useTopUsers } from '@/hooks/useAudit';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { RISK_LEVEL_CONFIG, ACTION_CATEGORIES } from '@/types/audit';

export default function CompareUsersPage() {
  const [userId1, setUserId1] = useState<string>('');
  const [userId2, setUserId2] = useState<string>('');
  const [isComparing, setIsComparing] = useState(false);

  // Get top users list for selection
  const { data: topUsers } = useTopUsers(undefined, undefined, 20);

  // Compare users data
  const { data: comparison, isLoading } = useCompareUsers(
    isComparing ? userId1 : '',
    isComparing ? userId2 : ''
  );

  const handleCompare = () => {
    if (userId1 && userId2 && userId1 !== userId2) {
      setIsComparing(true);
    }
  };

  const handleReset = () => {
    setIsComparing(false);
    setUserId1('');
    setUserId2('');
  };

  // Get user info by ID
  const getUserInfo = (userId: string) => {
    return topUsers?.find((u) => u.userId === userId);
  };

  // Get category label
  const getCategoryLabel = (value: string) => {
    return ACTION_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  // Calculate percentage difference
  const percentDiff = (val1: number, val2: number) => {
    if (val2 === 0) return val1 > 0 ? 100 : 0;
    return Math.round(((val1 - val2) / val2) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin/auditoria/superusuario"
                className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Volver al Super Usuario
              </Link>
              <div className="flex items-center gap-3 mb-2">
                <ArrowsRightLeftIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Comparar Usuarios</h1>
              </div>
              <p className="text-white/80 text-lg">
                Analiza diferencias en actividad y comportamiento entre usuarios
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5" />
              Seleccionar Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usuario 1
                </label>
                <SearchableSelect
                  options={topUsers?.map((user) => ({
                    value: user.userId,
                    label: `${user.userName || user.userEmail} (${user.count} acciones)`,
                  })) || []}
                  value={userId1}
                  onChange={(val) => {
                    setUserId1(val);
                    setIsComparing(false);
                  }}
                  allLabel="Seleccionar usuario..."
                  disabled={isComparing}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-center w-12">
                <ArrowsRightLeftIcon className="h-6 w-6 text-gray-400" />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usuario 2
                </label>
                <SearchableSelect
                  options={topUsers
                    ?.filter((u) => u.userId !== userId1)
                    .map((user) => ({
                      value: user.userId,
                      label: `${user.userName || user.userEmail} (${user.count} acciones)`,
                    })) || []}
                  value={userId2}
                  onChange={(val) => {
                    setUserId2(val);
                    setIsComparing(false);
                  }}
                  allLabel="Seleccionar usuario..."
                  disabled={isComparing}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2">
                {isComparing ? (
                  <Button variant="outline" onClick={handleReset}>
                    Reiniciar
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    onClick={handleCompare}
                    disabled={!userId1 || !userId2 || userId1 === userId2}
                  >
                    <MagnifyingGlassIcon className="h-4 w-4" />
                    Comparar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E667D]"></div>
          </div>
        ) : comparison && isComparing ? (
          <>
            {/* User Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* User 1 */}
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-blue-50">
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    {getUserInfo(userId1)?.userName || 'Usuario 1'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <p className="text-sm text-gray-600">Total de Acciones</p>
                    <p className="text-4xl font-bold text-gray-900">
                      {comparison.user1.totalActions.toLocaleString()}
                    </p>
                  </div>

                  {/* Risk Distribution */}
                  <div className="space-y-2">
                    {Object.entries(comparison.user1.byRiskLevel || {}).map(([level, count]) => {
                      const config = RISK_LEVEL_CONFIG[level as keyof typeof RISK_LEVEL_CONFIG];
                      const percentage = Math.round(
                        (count / comparison.user1.totalActions) * 100
                      );

                      return (
                        <div key={level} className="flex items-center gap-2">
                          <span
                            className={`w-20 text-xs font-medium px-2 py-1 rounded ${config?.bgColor} ${config?.color}`}
                          >
                            {config?.label || level}
                          </span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                level === 'critical'
                                  ? 'bg-red-500'
                                  : level === 'high'
                                    ? 'bg-orange-500'
                                    : level === 'medium'
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-16 text-right">
                            {count} ({percentage}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* User 2 */}
              <Card className="border-2 border-purple-200">
                <CardHeader className="bg-purple-50">
                  <CardTitle className="flex items-center gap-2 text-purple-800">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    {getUserInfo(userId2)?.userName || 'Usuario 2'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <p className="text-sm text-gray-600">Total de Acciones</p>
                    <p className="text-4xl font-bold text-gray-900">
                      {comparison.user2.totalActions.toLocaleString()}
                    </p>
                    {comparison.user1.totalActions !== comparison.user2.totalActions && (
                      <p
                        className={`text-sm ${
                          comparison.user2.totalActions > comparison.user1.totalActions
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {percentDiff(comparison.user2.totalActions, comparison.user1.totalActions) > 0
                          ? '+'
                          : ''}
                        {percentDiff(comparison.user2.totalActions, comparison.user1.totalActions)}%
                        vs Usuario 1
                      </p>
                    )}
                  </div>

                  {/* Risk Distribution */}
                  <div className="space-y-2">
                    {Object.entries(comparison.user2.byRiskLevel || {}).map(([level, count]) => {
                      const config = RISK_LEVEL_CONFIG[level as keyof typeof RISK_LEVEL_CONFIG];
                      const percentage = Math.round(
                        (count / comparison.user2.totalActions) * 100
                      );

                      return (
                        <div key={level} className="flex items-center gap-2">
                          <span
                            className={`w-20 text-xs font-medium px-2 py-1 rounded ${config?.bgColor} ${config?.color}`}
                          >
                            {config?.label || level}
                          </span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                level === 'critical'
                                  ? 'bg-red-500'
                                  : level === 'high'
                                    ? 'bg-orange-500'
                                    : level === 'medium'
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-16 text-right">
                            {count} ({percentage}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5" />
                  Comparación por Categoría
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Get all unique categories */}
                  {(() => {
                    const allCategories = new Set([
                      ...Object.keys(comparison.user1.byCategory || {}),
                      ...Object.keys(comparison.user2.byCategory || {}),
                    ]);

                    return Array.from(allCategories).map((category) => {
                      const user1Count = comparison.user1.byCategory?.[category] || 0;
                      const user2Count = comparison.user2.byCategory?.[category] || 0;
                      const maxCount = Math.max(user1Count, user2Count, 1);

                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-900">
                              {getCategoryLabel(category)}
                            </span>
                            <span className="text-sm text-gray-500">
                              {user1Count} vs {user2Count}
                            </span>
                          </div>
                          <div className="flex gap-2 items-center">
                            {/* User 1 bar */}
                            <div className="flex-1 flex justify-end">
                              <div
                                className="h-6 bg-blue-500 rounded-l flex items-center justify-end px-2"
                                style={{ width: `${(user1Count / maxCount) * 100}%` }}
                              >
                                <span className="text-xs text-white font-medium">
                                  {user1Count}
                                </span>
                              </div>
                            </div>

                            {/* Divider */}
                            <div className="w-px h-6 bg-gray-300" />

                            {/* User 2 bar */}
                            <div className="flex-1">
                              <div
                                className="h-6 bg-purple-500 rounded-r flex items-center px-2"
                                style={{ width: `${(user2Count / maxCount) * 100}%` }}
                              >
                                <span className="text-xs text-white font-medium">
                                  {user2Count}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-8 mt-6 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded" />
                    <span className="text-sm text-gray-600">
                      {getUserInfo(userId1)?.userName || 'Usuario 1'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-500 rounded" />
                    <span className="text-sm text-gray-600">
                      {getUserInfo(userId2)?.userName || 'Usuario 2'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="mt-8 flex gap-4 justify-center">
              <Link href={`/admin/auditoria/superusuario/usuario/${userId1}`}>
                <Button variant="outline">
                  Ver perfil de {getUserInfo(userId1)?.userName || 'Usuario 1'}
                </Button>
              </Link>
              <Link href={`/admin/auditoria/superusuario/usuario/${userId2}`}>
                <Button variant="outline">
                  Ver perfil de {getUserInfo(userId2)?.userName || 'Usuario 2'}
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <ArrowsRightLeftIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Selecciona dos usuarios para comparar
            </h2>
            <p className="text-gray-600">
              Analiza diferencias en patrones de actividad, categorías de uso y niveles de riesgo
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
