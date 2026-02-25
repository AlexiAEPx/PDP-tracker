import "./globals.css";

export const metadata = {
  title: "PDP Tracker",
  description: "Control de lecturas de mamografías — Dr. Espinosa",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PDP Tracker",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#e84393" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=localStorage.getItem('pdp-theme')||'auto';var t=p==='auto'?(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):p;document.documentElement.setAttribute('data-theme',t)}catch(e){}})()` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
