import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function TestPage() {
  const { data: members = [], isLoading, isError } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0) { years--; months += 12; }
    if (today.getDate() < birthDate.getDate()) { months--; if (months < 0) { years--; months += 12; } }
    return `${years}y ${months}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">🧪 Test Page</h1>
          <p className="text-gray-500 mt-1">Members database — dev only</p>
        </div>

        {isLoading && (
          <div className="flex items-center gap-3 text-gray-500">
            <div className="animate-spin w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full" />
            Loading members...
          </div>
        )}

        {isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
            Failed to load members. Check your connection or permissions.
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <p className="text-sm text-gray-400 mb-4">{members.length} member{members.length !== 1 ? 's' : ''} found</p>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Name</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Age</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Date of Birth</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Patrol</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Parent</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Join Date</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member, i) => (
                    <tr key={member.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {member.full_name?.charAt(0) ?? '?'}
                          </div>
                          {member.full_name ?? '—'}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{calculateAge(member.date_of_birth)}</td>
                      <td className="px-5 py-3 text-gray-600">{member.date_of_birth ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{member.patrol ?? <span className="text-gray-300 italic">No patrol</span>}</td>
                      <td className="px-5 py-3 text-gray-600">{member.parent_one_name ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{member.join_date ?? '—'}</td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-gray-400 italic">No active members found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
