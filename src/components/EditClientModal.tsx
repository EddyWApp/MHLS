import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Client {
  id: string;
  patient_name: string;
  cpf: string;
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
  });

  if (!isOpen || !client) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          patient_name: formData.patient_name,
          cpf: formData.cpf.replace(/\D/g, ''),
        })
        .eq('patient_name', client.patient_name);

      if (error) throw error;
      await onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Editar Cliente</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Cliente
            </label>
            <input
              type="text"
              value={formData.patient_name}
              onChange={(e) => setFormData(prev => ({ ...prev, patient_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CPF
            </label>
            <input
              type="text"
              value={formData.cpf}
              onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
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
              className="btn-primary"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditClientModal;