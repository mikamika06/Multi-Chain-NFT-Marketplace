import Link from 'next/link';

export function Navigation() {
  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/collections', label: 'Collections' },
    { href: '/listings', label: 'Marketplace' },
    { href: '/bridge', label: 'Bridge' },
    { href: '/dashboard', label: 'Dashboard' },
  ];

  return (
    <nav className="flex items-center gap-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm font-medium text-slate-300 transition hover:text-white"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
