import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, History as HistoryIcon, LogOut, PlusCircle, DollarSign } from 'lucide-react';

function Layout() {
  const { signOut } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Calendar },
    { name: 'Novo Agendamento', href: '/appointments/new', icon: PlusCircle },
    { name: 'Histórico', href: '/history', icon: HistoryIcon },
    { name: 'Controle de Caixa', href: '/cash-flow', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <img 
                  src="https://mhlsandoval.com.br/wp-content/uploads/2023/07/cropped-logo_icon_01.webp"
                  alt="MHL Sandoval"
                  className="h-8 w-auto"
                />
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        location.pathname === item.href
                          ? 'border-[#c7a978] text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                    >
                      <Icon className={`h-5 w-5 mr-2 ${location.pathname === item.href ? 'text-[#c7a978]' : ''}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => signOut()}
                className="btn-primary inline-flex items-center"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;