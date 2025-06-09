import React, { useEffect, useState } from 'react';
import { Calendar, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import toast from 'react-hot-toast';

ChartJS.register(ArcElement, ChartTooltip, Legend);

const timeZone = 'America/Sao_Paulo';

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

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const Dashboard = () => {
  const [upcomingPayments, setUpcomingPayments] = useState<Appointment[]>([]);
  const [overduePayments, setOverduePayments] = useState<Appointment[]>([]);
  const [monthlyPaidPayments, setMonthlyPaidPayments] = useState<Appointment[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [monthlyPaymentsData, setMonthlyPaymentsData] = useState<MonthlyPayment[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatDateInTimezone = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      const zonedDate = utcToZonedTime(date, timeZone);
      return format(zonedDate, 'dd/MM/yyyy');
    } catch (error) {
      // Fallback para formato simples se houver erro
      return format(parseISO(dateString), 'dd/MM/yyyy');
    }
  };

  const fetchDashboardData = async () => {
    // Usar data atual no fuso horário de São Paulo
    const today = utcToZonedTime(new Date(), timeZone);
    const firstDayOfMonth = startOfMonth(today);
    const lastDayOfMonth = endOfMonth(today);
    const firstDayStr = format(firstDayOfMonth, 'yyyy-MM-dd');
    const lastDayStr = format(lastDayOfMonth, 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');

    try {
      // Fetch upcoming payments
      const { data: upcoming } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'pending')
        .gte('next_payment_date', todayStr)
        .order('next_payment_date')
        .limit(5);

      // Fetch overdue payments
      const { data: overdue } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'pending')
        .lt('next_payment_date', todayStr)
        .order('next_payment_date');

      // Fetch all payments for the current month (regardless of status)
      const { data: allMonthlyPayments } = await supabase
        .from('appointments')
        .select('*')
        .gte('next_payment_date', firstDayStr)
        .lte('next_payment_date', lastDayStr)
        .order('next_payment_date');

      // Fetch paid payments for the current month
      const { data: monthlyPaid } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'paid')
        .gte('next_payment_date', firstDayStr)
        .lte('next_payment_date', lastDayStr)
        .order('next_payment_date');

      // Calculate monthly totals
      const monthlyTotalValue = allMonthlyPayments?.reduce(
        (acc, curr) => acc + Number(curr.installment_value),
        0
      ) || 0;

      const totalPaidValue = monthlyPaid?.reduce(
        (acc, curr) => acc + Number(curr.installment_value),
        0
      ) || 0;

      // Fetch last 6 months of paid payments for the chart
      const sixMonthsAgo = format(subMonths(today, 5), 'yyyy-MM-dd');
      const { data: lastSixMonthsPayments } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'paid')
        .gte('next_payment_date', sixMonthsAgo)
        .lte('next_payment_date', lastDayStr)
        .order('next_payment_date');

      // Process monthly payments data for the pie chart
      const monthlyData = new Map<string, number>();
      
      // Initialize with zero values for last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = format(date, 'MMM/yyyy');
        monthlyData.set(monthKey, 0);
      }

      // Add actual payment data
      lastSixMonthsPayments?.forEach(payment => {
        const date = parseISO(payment.next_payment_date);
        const zonedDate = utcToZonedTime(date, timeZone);
        const monthKey = format(zonedDate, 'MMM/yyyy');
        if (monthlyData.has(monthKey)) {
          monthlyData.set(
            monthKey,
            (monthlyData.get(monthKey) || 0) + Number(payment.installment_value)
          );
        }
      });

      const monthlyPaymentsArray = Array.from(monthlyData.entries())
        .map(([month, total]) => ({
          month,
          total
        }));

      setMonthlyPaymentsData(monthlyPaymentsArray);
      setUpcomingPayments(upcoming || []);
      setOverduePayments(overdue || []);
      setMonthlyPaidPayments(monthlyPaid || []);
      setMonthlyTotal(monthlyTotalValue);
      setTotalPaid(totalPaidValue);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erro ao carregar dados do dashboard');
    }
  };

  const chartData = {
    labels: monthlyPaymentsData.map(data => data.month),
    datasets: [
      {
        data: monthlyPaymentsData.map(data => data.total),
        backgroundColor: [
          '#FF6B6B',
          '#4ECDC4',
          '#45B7D1',
          '#96CEB4',
          '#4A90E2',
          '#9B59B6'
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
            return formatCurrency(context.raw);
          },
        },
      },
    },
  };

  const PaymentCard = ({ payment, isOverdue = false }: { payment: Appointment, isOverdue?: boolean }) => (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{payment.patient_name}</h3>
          <p className="text-sm text-gray-600">CPF: {payment.cpf}</p>
          <p className="text-sm text-gray-600">{payment.procedure}</p>
          <p className="text-sm text-gray-600">Parcela {payment.installment_number} de {payment.installments}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">
            {formatCurrency(payment.installment_value)}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Vencimento: {formatDateInTimezone(payment.next_payment_date)}
          </p>
          <button
            onClick={async () => {
              const toastId = toast.loading('Atualizando status...');
              try {
                const { error } = await supabase
                  .from('appointments')
                  .update({ status: 'paid' })
                  .eq('id', payment.id);

                if (error) throw error;
                await fetchDashboardData();
                toast.success('Status atualizado com sucesso!', { id: toastId });
              } catch (error) {
                console.error('Error updating payment status:', error);
                toast.error('Erro ao atualizar status.', { id: toastId });
              }
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
          <p className="text-3xl font-bold">{formatCurrency(monthlyTotal)}</p>
          <p className="text-sm text-gray-600 mt-2">
            Total de parcelas previstas para este mês
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="w-6 h-6 icon-primary mr-2" />
            <h2 className="text-xl font-semibold">Total Recebido</h2>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalPaid)}</p>
          <p className="text-sm text-gray-600 mt-2">
            Total de parcelas pagas neste mês
          </p>
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
                    <p className="text-sm text-gray-600">{payment.procedure}</p>
                    <p className="text-sm text-gray-600">
                      Parcela {payment.installment_number} de {payment.installments}
                    </p>
                    <p className="text-sm text-gray-600">
                      Pago em: {formatDateInTimezone(payment.next_payment_date)}
                    </p>
                  </div>
                  <p className="font-bold">{formatCurrency(payment.installment_value)}</p>
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
    </div>
  );
};

export default Dashboard;