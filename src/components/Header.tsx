"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left */}
        <div className="min-w-0"></div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold text-gray-800">
              Administrator
            </div>
          </div>

          {/* Profile */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-xs font-bold text-white transition hover:bg-gray-800"
              aria-label="Open administrator menu"
              aria-expanded={isOpen}
            >
              AD
            </button>

            {/* Dropdown */}
            {isOpen && (
              <div className="absolute right-0 top-12 z-50 w-44 rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg">
                <div className="border-b border-gray-100 px-3 py-2.5">
                  <p className="text-sm font-semibold text-gray-900">
                    Administrator
                  </p>

                  <p className="mt-0.5 text-xs text-gray-500">
                    Admin Account
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center rounded-md px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}