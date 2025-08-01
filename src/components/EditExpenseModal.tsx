import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface ExpenseCategory {
  id: string;
  name: string;
  is_custom: boolean;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  date: string;
  observations?: string;
  category_id: string;
  category_name: string;
}

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  categories: ExpenseCategory[];
  onSuccess: () => void;
  onCategoryAdded: () => void;
}

const EditExpenseModal = ({ isOpen, onClose, expense, categories, onSuccess, onCategoryAdded }: EditExpenseModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    date: '',
    observations: '',
    category_id: '',
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expense) {
      setFormData({
        name: expense.name,
        amount: expense.amount.toString(),
        date: expense.date,
        observations: expense.observations || '',
        category_id: expense.category_id,
      });
    }
  }, [expense]);

  if (!isOpen || !expense) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Digite o nome da categoria');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert([{ name: newCategoryName.trim(), is_custom: true }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Categoria adicionada com sucesso!');
      setNewCategoryName('');
      setShowNewCategory(false);
      setFormData(prev => ({ ...prev, category_id: data.id }));
      onCategoryAdded();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Esta categoria já existe');
      } else {
        toast.error('Erro ao adicionar categoria');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const toastId = toast.loading('Atualizando despesa...');

    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          name: formData.name,
          amount: parseFloat(formData.amount),
          date: formData.date,
          observations: formData.observations || null,
          category_id: formData.category_id,
        })
        .eq('id', expense.id);

      if (error) throw error;

      toast.success('Despesa atualizada com sucesso!', { id: toastId });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Erro ao atualizar despesa', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Editar Despesa</h3>
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
              Nome da Despesa
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              placeholder="Ex: Conta de luz"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria
            </label>
            <div className="flex gap-2">
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} {category.is_custom && '(Personalizada)'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCategory(!showNewCategory)}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showNewCategory && (
            <div className="bg-gray-50 p-3 rounded-md">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nova Categoria
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  placeholder="Nome da nova categoria"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="btn-primary"
                >
                  Adicionar
                </button>
              </div>
            </div>
          )}

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações (opcional)
            </label>
            <textarea
              name="observations"
              value={formData.observations}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              placeholder="Observações adicionais..."
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

export default EditExpenseModal;