import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar fixe */}
      <aside className="fixed inset-y-0 left-0 z-40 w-64">
        <Sidebar />
      </aside>
      
      {/* Contenu principal */}
      <div className="ml-64 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}