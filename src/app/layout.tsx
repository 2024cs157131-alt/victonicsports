import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AJ Tips — Football Predictions & VIP Tips',
  description: 'Daily football predictions, free tips, VIP packages and live scores by Victonic Sports.',
  verification: {
    google: 'ca-pub-3677802356093700',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <script src="https://js.paystack.co/v1/inline.js" async />
        <meta name="google-adsense-account" content="ca-pub-3677802356093700" />
      </head>
      <body>{children}</body>
    </html>
  )
}