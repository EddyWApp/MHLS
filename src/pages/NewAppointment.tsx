import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, DollarSign, User, FileText, Hash, ArrowLeft, CreditCard } from 'lucide-react';
import { addDays, format, parseISO, set, isWeekend } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Tooltip } from '../components/Tooltip';
import InputMask from 'react-input-mask';
import toast from 'react-hot-toast';

const timeZone = 'America/Sao_Paulo';

const NewAppointment = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    patient_name: '',
    cpf: '',
    procedure: '',
    total_value: '',
    installments: '1',
    procedure_date: '',
    payment_method: 'credit_card',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'total_value') {
      // Remove tudo que não for número
      const numericValue = value.replace(/\D/g, '');
      
      // Converte para centavos e formata
      const amount = (parseInt(numericValue || '0', 10) / 100).toFixed(2);
      
      // Armazena o valor numérico para cálculos
      setFormData(prev => ({ ...prev, [name]: amount }));
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
    // Converte para número e formata como moeda brasileira
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return '';
    
    return numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const calculateInstallmentValue = () => {
    const total = parseFloat(formData.total_value) || 0;
    const installments = parseInt(formData.installments) || 1;
    return (total / installments).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const adjustForWeekend = (date: Date): Date => {
    while (isWeekend(date)) {
      date = addDays(date, 1); // Add days until we reach a weekday
    }
    return date;
  };

  const calculateInstallmentDates = (procedureDateStr: string, numberOfInstallments: number, paymentMethod: string): string[] => {
    const dates: string[] = [];
    
    // Set time to noon (12:00) to avoid timezone issues
    const procedureDate = set(parseISO(procedureDateStr), {
      hours: 12,
      minutes: 0,
      seconds: 0,
      milliseconds: 0
    });

    const formatTZDate = (date: Date) => {
      return formatInTimeZone(date, timeZone, "yyyy-MM-dd'T'HH:mm:ssXXX");
    };
    
    if (paymentMethod === 'pix' || paymentMethod === 'cash') {
      dates.push(formatTZDate(procedureDate));
      return dates;
    }
    
    let lastDate = procedureDate;
    for (let i = 0; i < numberOfInstallments; i++) {
      // Add 30 days to the last date
      let nextDate = addDays(lastDate, 30);
      
      // Adjust for weekend if necessary
      nextDate = adjustForWeekend(nextDate);
      
      dates.push(formatTZDate(nextDate));
      lastDate = nextDate; // Use the adjusted date as the base for the next calculation
    }

    return dates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const toastId = toast.loading('Salvando agendamento...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const installmentDates = calculateInstallmentDates(
        formData.procedure_date,
        parseInt(formData.installments),
        formData.payment_method
      );

      // Set procedure date with fixed time to avoid timezone issues
      const procedureDateTime = set(parseISO(formData.procedure_date), {
        hours: 12,
        minutes: 0,
        seconds: 0,
        milliseconds: 0
      });

      const appointments = installmentDates.map((date, index) => ({
        patient_name: formData.patient_name,
        cpf: formData.cpf.replace(/\D/g, ''),
        procedure: formData.procedure,
        total_value: parseFloat(formData.total_value),
        installments: parseInt(formData.installments),
        installment_value: parseFloat(formData.total_value) / parseInt(formData.installments),
        procedure_date: formatInTimeZone(procedureDateTime, timeZone, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        next_payment_date: date,
        status: formData.payment_method === 'pix' || formData.payment_method === 'cash' ? 'paid' : 'pending',
        user_id: user.id,
        installment_number: index + 1,
        payment_method: formData.payment_method
      }));

      const { error: supabaseError } = await supabase
        .from('appointments')
        .insert(appointments);

      if (supabaseError) throw supabaseError;

      toast.success('Agendamento salvo com sucesso!', { id: toastId });
      navigate('/dashboard');
    } catch (err) {
      toast.error('Erro ao criar agendamento. Por favor, tente novamente.', { id: toastId });
      console.error('Error creating appointment:', err);
    } finally {
      setLoading(false);
    }
  };

  const previewInstallments = () => {
    if (!formData.procedure_date || !formData.installments) return null;

    const dates = calculateInstallmentDates(
      formData.procedure_date,
      parseInt(formData.installments),
      formData.payment_method
    );
    const installmentValue = parseFloat(formData.total_value) / parseInt(formData.installments);

    return dates.map((date, index) => (
      <div key={date} className="flex justify-between items-center py-2 border-b last:border-b-0">
        <span>
          {formData.payment_method === 'credit_card' 
            ? `Parcela ${index + 1}` 
            : 'Pagamento à vista'}
        </span>
        <div className="text-right">
          <div className="font-medium">
            {installmentValue.toLocaleString('pt-BR', { 
              style: 'currency', 
              currency: 'BRL' 
            })}
          </div>
          <div className="text-sm text-gray-600">
            {format(parseISO(date), 'dd/MM/yyyy')}
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Novo Agendamento</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                placeholder="Digite o nome completo do paciente"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  <span>CPF</span>
                  <Tooltip content="Digite apenas os números do CPF" />
                </div>
              </label>
              <InputMask
                mask="999.999.999-99"
                type="text"
                name="cpf"
                value={formData.cpf}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                placeholder="000.000.000-00"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                placeholder="Descreva o procedimento"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Forma de Pagamento</span>
                </div>
              </label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              >
                <option value="credit_card">Cartão de Crédito</option>
                <option value="pix">PIX</option>
                <option value="cash">Dinheiro</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Valor Total</span>
                    <Tooltip content="Digite o valor total do procedimento" />
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="text"
                    name="total_value"
                    value={formatCurrency(formData.total_value)}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Número de Parcelas</span>
                    <Tooltip content="Em quantas vezes será dividido o pagamento" />
                  </div>
                </label>
                <input
                  type="number"
                  name="installments"
                  value={formData.installments}
                  onChange={handleInputChange}
                  required
                  min="1"
                  disabled={formData.payment_method === 'pix' || formData.payment_method === 'cash'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Data do Procedimento</span>
                  <Tooltip content="Selecione a data em que o procedimento será realizado" />
                </div>
              </label>
              <input
                type="date"
                name="procedure_date"
                value={formData.procedure_date}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Salvando...' : 'Salvar Agendamento'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Resumo do Pagamento</h2>
            {formData.total_value && formData.installments && formData.procedure_date ? (
              <div className="space-y-4">
                <div className="pb-4 border-b">
                  <div className="text-sm text-gray-600">Valor Total</div>
                  <div className="text-2xl font-bold">
                    R$ {formatCurrency(formData.total_value)}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    Forma de Pagamento: {
                      formData.payment_method === 'credit_card' ? 'Cartão de Crédito' :
                      formData.payment_method === 'pix' ? 'PIX' : 'Dinheiro'
                    }
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">
                    {formData.payment_method === 'credit_card' ? 'Parcelas:' : 'Pagamento:'}
                  </div>
                  <div className="space-y-2">
                    {previewInstallments()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">
                Preencha os campos de valor, número de parcelas e data para ver o resumo do pagamento.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewAppointment;