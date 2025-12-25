import Header from '../shared/widgets/header';
import Footer from '../shared/widgets/footer';
import './global.css';
import {Poppins, Roboto} from 'next/font/google';
import Providers from './providers';
import type { ReactNode } from 'react';
export const metadata = {
  title: 'Welcome to NextBuy!',
  description: 'An e-commerce platform built with Next.js and TypeScript',
}
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
  display: 'swap',
})

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-roboto',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} ${poppins.variable}`}>
        <Providers>
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
