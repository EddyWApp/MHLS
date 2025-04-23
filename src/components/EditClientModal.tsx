import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
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
}

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onUpdate: () => Promise<void>;
}

const EditClientModal = ({ isOpen, onClose, client, onUpdate }: EditClientModalProps) => {
  const [formData, setFormData] = useState({
    patient_name: client?.patient_name || '',
    cpf: client?.cpf || '',
    procedure: client?.procedure || '',
    total_value: client?.total_value?.toString() || '',
    next_payment_date: client?.next_payment_date ? format(parseISO(client.next_payment_date), 'yyyy-MM-dd') : '',
    installment_value: client?.installment_value?.toString() || '',
  });

  const [loading, setLoading] = useState(false);

  if (!isOpen || !client) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'total_value' || name === 'installment_value') {
      // Remove any non-digit characters except decimal point and comma
      let processedValue = value.replace(/[^\d,.]/g, '');
      // Replace comma with dot for internal storage
      processedValue = processedValue.replace(/\./g, '').replace(',', '.');
      setFormData(prev => ({ ...prev, [name]: processedValue }));
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
      const { error } = await supabase
        .from('appointments')
        .update({
          patient_name: formData.patient_name,
          cpf: formData.cpf.replace(/\D/g, ''),
          procedure: formData.procedure,
          total_value: parseFloat(formData.total_value),
          installment_value: parseFloat(formData.installment_value),
          next_payment_date: formData.next_payment_date,
        })
        .eq('id', client.id);

      if (error) throw error;

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
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Vencimento
            </label>
            <input
              type="date"
              name="next_payment_date"
              value={formData.next_payment_date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
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