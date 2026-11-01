import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ShieldChain Financial | Trade • Invest • Grow',
  description: 'Invest with SF. Understand the risks, know the costs and make informed decisions with ShieldChain Financial.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
