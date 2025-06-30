"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home", description: "Dashboard & PokePoints" },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 mb-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-blue-600">
              CKB Pokemon
            </Link>
            
            <div className="hidden md:flex space-x-6">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-xs text-gray-500">{item.description}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* Mobile menu - simplified for now */}
          <div className="md:hidden">
            <select
              value={pathname}
              onChange={(e) => window.location.href = e.target.value}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              {navItems.map((item) => (
                <option key={item.href} value={item.href}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </nav>
  );
}