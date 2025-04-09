import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, DollarSign, User, FileText, Hash } from 'lucide-react';
import { addDays, isWeekend, format } from 'date-fns';

const NewAppointment = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    patient_name: '',
    cpf: '',
    procedure: '',
    total_value: '',
    installments: '1',
    procedure_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const calculateInstallmentValue = () => {
    const total = parseFloat(formData.total_value) || 0;
    const installments = parseInt(formData.installments) || 1;
    return (total / installments).toFixed(2);
  };

  const getNextBusinessDay = (date: Date): Date => {
    let nextDay = date;
    while (isWeekend(nextDay)) {
      nextDay = addDays(nextDay, 1);
    }
    return nextDay;
  };

  const calculateInstallmentDates = (startDate: Date, numberOfInstallments: number): Date[] => {
    const dates: Date[] = [];
    let currentDate = startDate;

    for (let i = 0; i < numberOfInstallments; i++) {
      // Add 30 days for each installment
      const nextDate = i === 0 ? currentDate : addDays(currentDate, 30);
      // Ensure it's a business day
      const businessDay = getNextBusinessDay(nextDate);
      dates.push(businessDay);
      currentDate = nextDate;
    }

    return dates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const procedureDate = new Date(formData.procedure_date);
      const nextBusinessDay = getNextBusinessDay(procedureDate);
      const installmentDates = calculateInstallmentDates(
        nextBusinessDay,
        parseInt(formData.installments)
      );

      const appointments = installmentDates.map((date, index) => ({
        patient_name: formData.patient_name,
        cpf: formData.cpf.replace(/\D/g, ''),
        procedure: formData.procedure,
        total_value: parseFloat(formData.total_value),
        installments: parseInt(formData.installments),
        installment_value: parseFloat(calculateInstallmentValue()),
        procedure_date: format(procedureDate, 'yyyy-MM-dd'),
        next_payment_date: format(date, 'yyyy-MM-dd'),
        status: 'pending',
        user_id: user.id,
        installment_number: index + 1
      }));

      const { error: supabaseError } = await supabase
        .from('appointments')
        .insert(appointments);

      if (supabaseError) throw supabaseError;

      navigate('/dashboard');
    } catch (err) {
      setError('Erro ao criar agendamento. Por favor, tente novamente.');
      console.error('Error creating appointment:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Novo Agendamento</h1>

      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Nome do Paciente</span>
            </div>
          </label>
          <input
            type="text"
            name="patient_name"
            value={formData.patient_name}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              <span>CPF</span>
            </div>
          </label>
          <input
            type="text"
            name="cpf"
            value={formData.cpf}
            onChange={handleInputChange}
            required
            placeholder="000.000.000-00"
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Procedimento</span>
            </div>
          </label>
          <input
            type="text"
            name="procedure"
            value={formData.procedure}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Valor Total</span>
              </div>
            </label>
            <input
              type="number"
              name="total_value"
              value={formData.total_value}
              onChange={handleInputChange}
              required
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Número de Parcelas</span>
              </div>
            </label>
            <input
              type="number"
              name="installments"
              value={formData.installments}
              onChange={handleInputChange}
              required
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Data do Procedimento</span>
            </div>
          </label>
          <input
            type="date"
            name="procedure_date"
            value={formData.procedure_date}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {formData.total_value && formData.installments && (
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-600">
              Valor da Parcela: R$ {calculateInstallmentValue()}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar Agendamento'}
        </button>
      </form>
    </div>
  );
};

export default NewAppointment;