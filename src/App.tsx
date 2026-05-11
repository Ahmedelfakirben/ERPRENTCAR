import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './lib/i18n';

import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Fleet from './pages/Fleet';
import VehicleDetail from './pages/VehicleDetail';
import Planning from './pages/Planning';
import Contracts from './pages/Contracts';
import ContractDetail from './pages/ContractDetail';
import ContractCreate from './pages/ContractCreate';
import ContractPrint from './pages/ContractPrint';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Finance from './pages/Finance';
import InvoiceCreate from './pages/InvoiceCreate';
import InvoicePrint from './pages/InvoicePrint';
import Morocco from './pages/Morocco';
import Settings from './pages/Settings';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';

import Preloader from './components/layout/Preloader';

function App() {
  return (
    <BrowserRouter>
      <Preloader />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected Area */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/fleet" element={<Fleet />} />
            <Route path="/fleet/:id" element={<VehicleDetail />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/contracts/new" element={<ContractCreate />} />
            <Route path="/contracts/:id" element={<ContractDetail />} />
            <Route path="/contracts/:id/print" element={<ContractPrint />} />
            <Route path="/crm" element={<Clients />} />
            <Route path="/crm/:id" element={<ClientDetail />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/finance/invoice/new" element={<InvoiceCreate />} />
            <Route path="/invoices/:id/print" element={<InvoicePrint />} />
            <Route path="/morocco" element={<Morocco />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
