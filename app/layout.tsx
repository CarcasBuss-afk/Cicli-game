import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Il Giro dei Cicli',
  description: 'Gara di classe a tappe sui cicli for in Python',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
