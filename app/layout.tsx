import "./globals.css"; import type { Metadata } from "next";
export const metadata: Metadata={title:"FloodWatch | Smart Flood Monitoring",description:"Public water-level monitoring and calm, tiered flood alerts.",icons:{icon:"/floodwatch-logo.png"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
