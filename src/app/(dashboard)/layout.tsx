import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="lg:pl-64">
        <Header />

        <main>{children}</main>
      </div>
    </div>
  );
}