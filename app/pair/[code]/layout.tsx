export default function PairLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`* { margin: 0; padding: 0; box-sizing: border-box; } body { background: #0a1628; overflow: hidden; }`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
