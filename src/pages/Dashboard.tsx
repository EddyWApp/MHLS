import React, { useEffect, useState } from 'react';
import { Calendar, AlertCircle, CheckCircle, DollarSign, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import Modal from '../components/Modal';
import EditClientModal from '../components/EditClientModal';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, ChartTooltip, Legend);

interface Appointment {
  id: string;
  patient_name: string;
  cpf: string;
  procedure: string;
  total_value: number;
  installments: number;
  installment_value: number;
  next_payment_date: string;
  status: 'pending' | 'paid' | 'overdue';
  installment_number: number;
}

interface MonthlyPayment {
  month: string;
  total: number;
}

const Dashboard = () => {
  const [upcomingPayments, setUpcomingPayments] = useState<Appointment[]>([]);
  const [overduePayments, setOverduePayments] = useState<Appointment[]>([]);
  const [monthlyPaidPayments, setMonthlyPaidPayments] = useState<Appointment[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Appointment | null>(null);
  const [monthlyPaymentsData, setMonthlyPaymentsData] = useState<MonthlyPayment[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const today = new Date();
    const firstDayOfMonth = startOfMonth(today);
    const lastDayOfMonth = endOfMonth(today);
    const firstDayStr = format(firstDayOfMonth, 'yyyy-MM-dd');
    const lastDayStr = format(lastDayOfMonth, 'yyyy-MM-dd');

    try {
      // Fetch upcoming payments
      const { data: upcoming } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'pending')
        .gte('next_payment_date', today.toISOString().split('T')[0])
        .order('next_payment_date')
        .limit(5);

      // Fetch overdue payments
      const { data: overdue } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'pending')
        .lt('next_payment_date', today.toISOString().split('T')[0])
        .order('next_payment_date');

      // Fetch monthly paid payments
      const { data: monthlyPaid } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'paid')
        .gte('next_payment_date', firstDayStr)
        .lte('next_payment_date', lastDayStr)
        .order('next_payment_date');

      // Calculate monthly total (including both paid and pending)
      const { data: monthlyPayments } = await supabase
        .from('appointments')
        .select('installment_value')
        .gte('next_payment_date', firstDayStr)
        .lte('next_payment_date', lastDayStr);

      // Fetch total paid
      const { data: paidPayments } = await supabase
        .from('appointments')
        .select('installment_value')
        .eq('status', 'paid');

      // Fetch last 6 months of payments
      const sixMonthsAgo = subMonths(firstDayOfMonth, 5);
      const sixMonthsAgoStr = format(sixMonthsAgo, 'yyyy-MM-dd');
      
      const { data: lastSixMonthsPayments } = await supabase
        .from('appointments')
        .select('installment_value, next_payment_date')
        .eq('status', 'paid')
        .gte('next_payment_date', sixMonthsAgoStr)
        .lte('next_payment_date', lastDayStr);

      // Process monthly payments data
      const monthlyData = new Map<string, number>();
      
      // Initialize the last 6 months with zero values
      for (let i = 0; i < 6; i++) {
        const date = subMonths(today, i);
        const monthKey = format(date, 'MMM/yyyy');
        monthlyData.set(monthKey, 0);
      }

      // Add the actual payment data
      lastSixMonthsPayments?.forEach(payment => {
        const date = parseISO(payment.next_payment_date);
        const monthKey = format(date, 'MMM/yyyy');
        monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + Number(payment.installment_value));
      });

      const monthlyPaymentsArray = Array.from(monthlyData.entries())
        .map(([month, total]) => ({
          month,
          total
        }))
        .reverse(); // Show months in chronological order

      setMonthlyPaymentsData(monthlyPaymentsArray);
      setUpcomingPayments(upcoming || []);
      setOverduePayments(overdue || []);
      setMonthlyPaidPayments(monthlyPaid || []);
      setMonthlyTotal(
        monthlyPayments?.reduce((acc, curr) => acc + Number(curr.installment_value), 0) || 0
      );
      setTotalPaid(
        paidPayments?.reduce((acc, curr) => acc + Number(curr.installment_value), 0) || 0
      );
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handlePaymentComplete = async () => {
    if (!selectedPayment) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'paid' })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      await fetchDashboardData();
      setIsModalOpen(false);
      setSelectedPayment(null);
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const chartData = {
    labels: monthlyPaymentsData.map(data => data.month),
    datasets: [
      {
        data: monthlyPaymentsData.map(data => data.total),
        backgroundColor: [
          '#c7a978',
          '#d4bc94',
          '#e1ceb0',
          '#eee0cc',
          '#faf2e8',
          '#fff9f2',
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            family: 'Poppins',
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `R$ ${context.raw.toFixed(2)}`;
          },
        },
      },
    },
  };

  const PaymentCard = ({ payment, isOverdue = false }: { payment: Appointment, isOverdue?: boolean }) => (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{payment.patient_name}</h3>
            <button
              onClick={() => {
                setSelectedPayment(payment);
                setIsEditModalOpen(true);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-gray-600">CPF: {payment.cpf}</p>
          <p className="text-sm text-gray-600">{payment.procedure}</p>
          <p className="text-sm text-gray-600">Parcela {payment.installment_number} de {payment.installments}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">
            R$ {payment.installment_value.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Vencimento: {format(parseISO(payment.next_payment_date), 'dd/MM/yyyy')}
          </p>
          <button
            onClick={() => {
              setSelectedPayment(payment);
              setIsModalOpen(true);
            }}
            className={`px-4 py-2 rounded-md text-white transition-colors ${
              isOverdue ? 'bg-red-600 hover:bg-red-700' : 'btn-primary'
            }`}
          >
            Finalizar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Calendar className="w-6 h-6 icon-primary mr-2" />
            <h2 className="text-xl font-semibold">Total do Mês</h2>
          </div>
          <p className="text-3xl font-bold">R$ {monthlyTotal.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="w-6 h-6 icon-primary mr-2" />
            <h2 className="text-xl font-semibold">Total Recebido</h2>
          </div>
          <p className="text-3xl font-bold">R$ {totalPaid.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <DollarSign className="w-6 h-6 icon-primary mr-2" />
            <h2 className="text-xl font-semibold">Parcelas Pagas por Mês</h2>
          </div>
          <div className="h-48">
            <Pie data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center mb-4">
            <DollarSign className="w-6 h-6 icon-primary mr-2" />
            <h2 className="text-xl font-semibold">Próximas 5 Parcelas</h2>
          </div>
          {upcomingPayments.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} />
          ))}
          {upcomingPayments.length === 0 && (
            <p className="text-gray-500 text-center py-4">Nenhuma parcela futura encontrada</p>
          )}
        </div>

        <div>
          <div className="flex items-center mb-4">
            <CheckCircle className="w-6 h-6 icon-primary mr-2" />
            <h2 className="text-xl font-semibold">Parcelas Pagas no Mês</h2>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="space-y-4">
              {monthlyPaidPayments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center border-b pb-4 last:border-b-0 last:pb-0">
                  <div>
                    <p className="font-medium">{payment.patient_name}</p>
                    <p className="text-sm text-gray-600">
                      Parcela {payment.installment_number} de {payment.installments}
                    </p>
                  </div>
                  <p className="font-bold">R$ {payment.installment_value.toFixed(2)}</p>
                </div>
              ))}
              {monthlyPaidPayments.length === 0 && (
                <p className="text-gray-500 text-center py-4">Nenhuma parcela paga este mês</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {overduePayments.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-600 mr-2" />
            <h2 className="text-xl font-semibold">Parcelas em Atraso</h2>
          </div>
          {overduePayments.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} isOverdue />
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPayment(null);
        }}
        onConfirm={handlePaymentComplete}
        title="Confirmar Pagamento"
        message="Essa parcela foi realmente paga?"
      />

      <EditClientModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPayment(null);
        }}
        client={selectedPayment}
        onUpdate={fetchDashboardData}
      />
    </div>
  );
};

export default Dashboard;