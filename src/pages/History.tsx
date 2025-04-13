import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  patient_name: string;
  cpf: string;
  procedure: string;
  total_value: number;
  installments: number;
  installment_value: number;
  procedure_date: string;
  next_payment_date: string;
  status: 'pending' | 'paid' | 'overdue';
  installment_number: number;
}

const History = () => {
  const [search, setSearch] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.length >= 3) {
      searchAppointments();
    }
  }, [search]);

  const searchAppointments = async () => {
    setLoading(true);
    try {
      const searchTerm = search.replace(/\D/g, ''); // Remove non-digits for CPF search
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .or(`patient_name.ilike.%${search}%,cpf.eq.${searchTerm}`)
        .order('procedure_date', { ascending: false })
        .order('installment_number', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'overdue':
        return 'Atrasado';
      default:
        return status;
    }
  };

  const groupAppointmentsByProcedure = (appointments: Appointment[]) => {
    const grouped = new Map<string, Appointment[]>();
    
    appointments.forEach(appointment => {
      const key = `${appointment.patient_name}-${appointment.procedure_date}-${appointment.procedure}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)?.push(appointment);
    });

    return Array.from(grouped.values());
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Histórico de Agendamentos</h1>

      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">Carregando...</div>
      ) : appointments.length > 0 ? (
        <div className="space-y-8">
          {groupAppointmentsByProcedure(appointments).map((group, index) => {
            const firstAppointment = group[0];
            return (
              <div
                key={`${firstAppointment.id}-${index}`}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{firstAppointment.patient_name}</h3>
                    <p className="text-gray-600">CPF: {firstAppointment.cpf}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-gray-600">Procedimento:</p>
                  <p className="font-medium">{firstAppointment.procedure}</p>
                </div>

                <div className="mb-4">
                  <p className="text-gray-600">Data do Procedimento:</p>
                  <p className="font-medium">
                    {format(new Date(firstAppointment.procedure_date), 'dd/MM/yyyy')}
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-gray-600">Valor Total:</p>
                  <p className="font-medium">
                    R$ {firstAppointment.total_value.toFixed(2)}
                  </p>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-3">Parcelas:</h4>
                  <div className="grid gap-4">
                    {group.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded"
                      >
                        <div>
                          <p className="font-medium">
                            Parcela {payment.installment_number} de {payment.installments}
                          </p>
                          <p className="text-sm text-gray-600">
                            Vencimento: {format(new Date(payment.next_payment_date), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">R$ {payment.installment_value.toFixed(2)}</p>
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-sm ${getStatusColor(
                              payment.status
                            )}`}
                          >
                            {getStatusText(payment.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : search.length >= 3 ? (
        <div className="text-center py-4 text-gray-600">
          Nenhum resultado encontrado.
        </div>
      ) : null}
    </div>
  );
};

export default History;