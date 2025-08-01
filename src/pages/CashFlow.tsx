import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, TrendingUp, TrendingDown, Plus, Calendar, Filter, Edit2, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import ExpenseModal from '../components/ExpenseModal';
import RevenueModal from '../components/RevenueModal';
import EditExpenseModal from '../components/EditExpenseModal';
import EditRevenueModal from '../components/EditRevenueModal';
import Modal from '../components/Modal';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend, ArcElement);

const timeZone = 'America/Sao_Paulo';

interface Expense {
  id: string;
  name: string;
  amount: number;
  date: string;
  observations?: string;
  category_id: string;
  category_name: string;
}

interface Revenue {
  id: string;
  description: string;
  amount: number;
  date: string;
  source: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  is_custom: boolean;
}

const CashFlow = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyRevenues, setMonthlyRevenues] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);
  const [isEditRevenueModalOpen, setIsEditRevenueModalOpen] = useState(false);
  const [isDeleteExpenseModalOpen, setIsDeleteExpenseModalOpen] = useState(false);
  const [isDeleteRevenueModalOpen, setIsDeleteRevenueModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedRevenue, setSelectedRevenue] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
    fetchCategories();
  }, [selectedMonth]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Erro ao carregar categorias');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = utcToZonedTime(new Date(), timeZone);
      const [year, month] = selectedMonth.split('-');
      const firstDay = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      const lastDay = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      const firstDayStr = format(firstDay, 'yyyy-MM-dd');
      const lastDayStr = format(lastDay, 'yyyy-MM-dd');

      // Fetch expenses with category names
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_categories(name)
        `)
        .gte('date', firstDayStr)
        .lte('date', lastDayStr)
        .order('date', { ascending: false });

      if (expensesError) throw expensesError;

      // Fetch revenues
      const { data: revenuesData, error: revenuesError } = await supabase
        .from('revenues')
        .select('*')
        .gte('date', firstDayStr)
        .lte('date', lastDayStr)
        .order('date', { ascending: false });

      if (revenuesError) throw revenuesError;

      // Process expenses data
      const processedExpenses = expensesData?.map(expense => ({
        ...expense,
        category_name: expense.expense_categories?.name || 'Sem categoria'
      })) || [];

      setExpenses(processedExpenses);
      setRevenues(revenuesData || []);

      // Calculate totals
      const totalExpenses = processedExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
      const totalRevenues = revenuesData?.reduce((sum, revenue) => sum + Number(revenue.amount), 0) || 0;

      setMonthlyExpenses(totalExpenses);
      setMonthlyRevenues(totalRevenues);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatDateInTimezone = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      const zonedDate = utcToZonedTime(date, timeZone);
      return format(zonedDate, 'dd/MM/yyyy');
    } catch (error) {
      return format(parseISO(dateString), 'dd/MM/yyyy');
    }
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;

    const toastId = toast.loading('Excluindo despesa...');
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', selectedExpense.id);

      if (error) throw error;

      toast.success('Despesa excluída com sucesso!', { id: toastId });
      await fetchData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Erro ao excluir despesa.', { id: toastId });
    } finally {
      setIsDeleteExpenseModalOpen(false);
      setSelectedExpense(null);
    }
  };

  const handleDeleteRevenue = async () => {
    if (!selectedRevenue) return;

    const toastId = toast.loading('Excluindo receita...');
    try {
      const { error } = await supabase
        .from('revenues')
        .delete()
        .eq('id', selectedRevenue.id);

      if (error) throw error;

      toast.success('Receita excluída com sucesso!', { id: toastId });
      await fetchData();
    } catch (error) {
      console.error('Error deleting revenue:', error);
      toast.error('Erro ao excluir receita.', { id: toastId });
    } finally {
      setIsDeleteRevenueModalOpen(false);
      setSelectedRevenue(null);
    }
  };

  // Prepare chart data for expenses by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const category = expense.category_name;
    acc[category] = (acc[category] || 0) + Number(expense.amount);
    return acc;
  }, {} as Record<string, number>);

  const expensesChartData = {
    labels: Object.keys(expensesByCategory),
    datasets: [
      {
        data: Object.values(expensesByCategory),
        backgroundColor: [
          '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
          '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
          '#10AC84', '#EE5A24', '#0984E3', '#6C5CE7', '#A29BFE'
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  // Prepare chart data for revenue vs expenses comparison
  const comparisonChartData = {
    labels: ['Receitas', 'Despesas'],
    datasets: [
      {
        label: 'Valor (R$)',
        data: [monthlyRevenues, monthlyExpenses],
        backgroundColor: ['#10AC84', '#EE5A24'],
        borderColor: ['#10AC84', '#EE5A24'],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
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

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return formatCurrency(context.raw);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          },
        },
      },
    },
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Controle de Caixa</h1>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
          <button
            onClick={() => setIsRevenueModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Receita
          </button>
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Despesa
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-6 h-6 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold">Receitas do Mês</h2>
          </div>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(monthlyRevenues)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <TrendingDown className="w-6 h-6 text-red-600 mr-2" />
            <h2 className="text-xl font-semibold">Despesas do Mês</h2>
          </div>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(monthlyExpenses)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <DollarSign className="w-6 h-6 icon-primary mr-2" />
            <h2 className="text-xl font-semibold">Saldo do Mês</h2>
          </div>
          <p className={`text-3xl font-bold ${monthlyRevenues - monthlyExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(monthlyRevenues - monthlyExpenses)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Receitas vs Despesas</h3>
          <div className="h-64">
            <Bar data={comparisonChartData} options={barChartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Despesas por Categoria</h3>
          <div className="h-64">
            {Object.keys(expensesByCategory).length > 0 ? (
              <Pie data={expensesChartData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Nenhuma despesa encontrada
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Despesas Recentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Despesa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.slice(0, 10).map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{expense.name}</div>
                        {expense.observations && (
                          <div className="text-sm text-gray-500">{expense.observations}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.category_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedExpense(expense);
                            setIsEditExpenseModalOpen(true);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-full transition-colors"
                          title="Editar despesa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedExpense(expense);
                            setIsDeleteExpenseModalOpen(true);
                          }}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-full transition-colors"
                          title="Excluir despesa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhuma despesa encontrada
              </div>
            )}
          </div>
        </div>

        {/* Revenues Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Receitas Recentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Origem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {revenues.slice(0, 10).map((revenue) => (
                  <tr key={revenue.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {revenue.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {revenue.source}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(revenue.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedRevenue(revenue);
                            setIsEditRevenueModalOpen(true);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-full transition-colors"
                          title="Editar receita"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRevenue(revenue);
                            setIsDeleteRevenueModalOpen(true);
                          }}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-full transition-colors"
                          title="Excluir receita"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {revenues.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhuma receita encontrada
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={fetchData}
        categories={categories}
        onCategoryAdded={fetchCategories}
      />

      <RevenueModal
        isOpen={isRevenueModalOpen}
        onClose={() => setIsRevenueModalOpen(false)}
        onSuccess={fetchData}
      />

      <EditExpenseModal
        isOpen={isEditExpenseModalOpen}
        onClose={() => {
          setIsEditExpenseModalOpen(false);
          setSelectedExpense(null);
        }}
        expense={selectedExpense}
        categories={categories}
        onSuccess={fetchData}
        onCategoryAdded={fetchCategories}
      />

      <EditRevenueModal
        isOpen={isEditRevenueModalOpen}
        onClose={() => {
          setIsEditRevenueModalOpen(false);
          setSelectedRevenue(null);
        }}
        revenue={selectedRevenue}
        onSuccess={fetchData}
      />

      <Modal
        isOpen={isDeleteExpenseModalOpen}
        onClose={() => {
          setIsDeleteExpenseModalOpen(false);
          setSelectedExpense(null);
        }}
        onConfirm={handleDeleteExpense}
        title="Excluir Despesa"
        message="Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita."
      />

      <Modal
        isOpen={isDeleteRevenueModalOpen}
        onClose={() => {
          setIsDeleteRevenueModalOpen(false);
          setSelectedRevenue(null);
        }}
        onConfirm={handleDeleteRevenue}
        title="Excluir Receita"
        message="Tem certeza que deseja excluir esta receita? Esta ação não pode ser desfeita."
      />
    </div>
  );
};

export default CashFlow;