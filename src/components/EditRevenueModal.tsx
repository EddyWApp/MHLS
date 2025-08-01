import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Revenue {
  id: string;
  description: string;
  amount: number;
  date: string;
  source: string;
}

interface EditRevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  revenue: Revenue | null;
  onSuccess: () => void;
}

const EditRevenueModal = ({ isOpen, onClose, revenue, onSuccess }: EditRevenueModalProps) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: '',
    source: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (revenue) {
      setFormData({
        description: revenue.description,
        amount: revenue.amount.toString(),
        date: revenue.date,
        source: revenue.source,
      });
    }
  }, [revenue]);

  if (!isOpen || !revenue) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'amount') {
      // Remove tudo que não for número
      const numericValue = value.replace(/\D/g, '');
      
      // Converte para centavos e formata
      const amount = (parseInt(numericValue || '0', 10) / 100).toFixed(2);
      
      setFormData(prev => ({ ...prev, [name]: amount }));
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

    const toastId = toast.loading('Atualizando receita...');

    try {
      const { error } = await supabase
        .from('revenues')
        .update({
          description: formData.description,
          amount: parseFloat(formData.amount),
          date: formData.date,
          source: formData.source,
        })
        .eq('id', revenue.id);

      if (error) throw error;

      toast.success('Receita atualizada com sucesso!', { id: toastId });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating revenue:', error);
      toast.error('Erro ao atualizar receita', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Editar Receita</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              placeholder="Ex: Consulta dermatológica"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Origem
            </label>
            <select
              name="source"
              value={formData.source}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="">Selecione a origem</option>
              <option value="Consulta">Consulta</option>
              <option value="Procedimento Estético">Procedimento Estético</option>
              <option value="Cirurgia">Cirurgia</option>
              <option value="Tratamento">Tratamento</option>
              <option value="Venda de Produto">Venda de Produto</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
              <input
                type="text"
                name="amount"
                value={formatCurrency(formData.amount)}
                onChange={handleInputChange}
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                placeholder="0,00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
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
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRevenueModal;