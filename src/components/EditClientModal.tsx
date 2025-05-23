import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO, addDays, isWeekend } from 'date-fns';
import InputMask from 'react-input-mask';
import toast from 'react-hot-toast';

interface Client {
  id: string;
  patient_name: string;
  cpf: string;
  procedure: string;
  total_value: number;
  installment_value: number;
  next_payment_date: string;
  payment_method: string;
  installments: number;
  procedure_date: string;
}

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onUpdate: () => Promise<void>;
}

const EditClientModal = ({ isOpen, onClose, client, onUpdate }: EditClientModalProps) => {
  const [formData, setFormData] = useState({
    patient_name: '',
    cpf: '',
    procedure: '',
    total_value: '',
    next_payment_date: '',
    installment_value: '',
    payment_method: 'credit_card',
    installments: '1',
  });

  useEffect(() => {
    if (client) {
      setFormData({
        patient_name: client.patient_name,
        cpf: client.cpf,
        procedure: client.procedure,
        total_value: client.total_value.toString(),
        next_payment_date: client.next_payment_date ? format(parseISO(client.next_payment_date), 'yyyy-MM-dd') : '',
        installment_value: client.installment_value.toString(),
        payment_method: client.payment_method,
        installments: client.installments.toString(),
      });
    }
  }, [client]);

  const [loading, setLoading] = useState(false);

  if (!isOpen || !client) return null;

  const addBusinessDays = (date: Date, days: number): Date => {
    let currentDate = date;
    let remainingDays = days;

    while (remainingDays > 0) {
      currentDate = addDays(currentDate, 1);
      if (!isWeekend(currentDate)) {
        remainingDays--;
      }
    }

    return currentDate;
  };

  const calculateInstallmentDates = (procedureDateStr: string, numberOfInstallments: number): string[] => {
    const dates: string[] = [];
    const procedureDate = parseISO(procedureDateStr);
    
    if (formData.payment_method === 'pix' || formData.payment_method === 'cash') {
      dates.push(format(procedureDate, 'yyyy-MM-dd'));
      return dates;
    }
    
    for (let i = 0; i < numberOfInstallments; i++) {
      const daysToAdd = (i + 1) * 30;
      const nextDate = addBusinessDays(procedureDate, daysToAdd);
      dates.push(format(nextDate, 'yyyy-MM-dd'));
    }

    return dates;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'total_value' || name === 'installment_value') {
      // Remove any non-digit characters except decimal point and comma
      let processedValue = value.replace(/[^\d,.]/g, '');
      // Replace comma with dot for internal storage
      processedValue = processedValue.replace(/\./g, '').replace(',', '.');
      setFormData(prev => ({ ...prev, [name]: processedValue }));
    } else if (name === 'installments') {
      const newInstallments = parseInt(value) || 1;
      const totalValue = parseFloat(formData.total_value);
      const newInstallmentValue = (totalValue / newInstallments).toFixed(2);
      
      setFormData(prev => ({
        ...prev,
        installments: value,
        installment_value: newInstallmentValue
      }));
    } else if (name === 'payment_method') {
      if (value === 'pix' || value === 'cash') {
        setFormData(prev => ({
          ...prev,
          payment_method: value,
          installments: '1',
          installment_value: formData.total_value
        }));
      } else {
        setFormData(prev => ({ ...prev, payment_method: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const formatCurrency = (value: string) => {
    if (!value) return '';
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return '';
    
    return numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Atualizando dados...');

    try {
      const installmentDates = calculateInstallmentDates(
        client.procedure_date,
        parseInt(formData.installments)
      );

      // Delete existing appointments
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('procedure_date', client.procedure_date)
        .eq('patient_name', client.patient_name);

      if (deleteError) throw deleteError;

      // Create new appointments with updated installment information
      const appointments = installmentDates.map((date, index) => ({
        patient_name: formData.patient_name,
        cpf: formData.cpf.replace(/\D/g, ''),
        procedure: formData.procedure,
        total_value: parseFloat(formData.total_value),
        installments: parseInt(formData.installments),
        installment_value: parseFloat(formData.total_value) / parseInt(formData.installments),
        procedure_date: client.procedure_date,
        next_payment_date: date,
        status: formData.payment_method === 'pix' || formData.payment_method === 'cash' ? 'paid' : 'pending',
        installment_number: index + 1,
        payment_method: formData.payment_method
      }));

      const { error: insertError } = await supabase
        .from('appointments')
        .insert(appointments);

      if (insertError) throw insertError;

      await onUpdate();
      toast.success('Dados atualizados com sucesso!', { id: toastId });
      onClose();
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Erro ao atualizar dados.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Editar Dados</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Cliente
            </label>
            <input
              type="text"
              name="patient_name"
              value={formData.patient_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CPF
            </label>
            <InputMask
              mask="999.999.999-99"
              type="text"
              name="cpf"
              value={formData.cpf}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Procedimento
            </label>
            <input
              type="text"
              name="procedure"
              value={formData.procedure}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Forma de Pagamento
            </label>
            <select
              name="payment_method"
              value={formData.payment_method}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="credit_card">Cartão de Crédito</option>
              <option value="pix">PIX</option>
              <option value="cash">Dinheiro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor Total
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
              <input
                type="text"
                name="total_value"
                value={formatCurrency(formData.total_value)}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Parcelas
            </label>
            <input
              type="number"
              name="installments"
              value={formData.installments}
              onChange={handleInputChange}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              disabled={formData.payment_method === 'pix' || formData.payment_method === 'cash'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor da Parcela
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
              <input
                type="text"
                name="installment_value"
                value={formatCurrency(formData.installment_value)}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                required
                disabled
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditClientModal;